'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  encrypt,
  decrypt,
  unwrapCollectionKey,
  generateCollectionKey,
  wrapCollectionKey,
  importPublicKey,
} from '@/lib/crypto';
import { getEncryptionKey, getRsaPrivateKey, getCurrentUser } from '@/features/useAuth';
import type { VaultEntryEncrypted, VaultEntryDecrypted, VaultEntryFormData, CollectionKeyEncrypted } from '@/types/vault';
import type { PublicKeyResponse } from '@/types/auth';

// Mapa en memoria: collectionId → CryptoKey AES
let collectionKeyCache: Map<number, CryptoKey> = new Map();

export function getCollectionKey(collectionId: number): CryptoKey | undefined {
  return collectionKeyCache.get(collectionId);
}

export function clearCollectionKeys(): void {
  collectionKeyCache = new Map();
}

/** Carga y descifra todas las claves de colección del usuario desde el servidor. */
export async function loadCollectionKeys(): Promise<void> {
  const privateKey = getRsaPrivateKey();
  if (!privateKey) return;

  try {
    const encryptedKeys = await api<CollectionKeyEncrypted[]>('/api/vault/collection-keys/');
    const newCache = new Map<number, CryptoKey>();

    await Promise.allSettled(
      encryptedKeys.map(async (ck) => {
        const aesKey = await unwrapCollectionKey(ck.encrypted_key, privateKey);
        newCache.set(ck.collection, aesKey);
      })
    );

    collectionKeyCache = newCache;
  } catch {
    // No bloquear el vault si falla la carga de claves de colección
    return;
  }

  // Auto-inicializar colecciones que no tienen ninguna clave (fueron creadas sin RSA keys)
  // Solo lo hace el org_admin, que es quien tiene permiso de manage
  const user = getCurrentUser();
  if (user?.org_role !== 'org_admin') return;

  try {
    const { uninitialized } = await api<{ uninitialized: number[] }>(
      '/api/vault/collection-keys/uninitialized/'
    );
    await Promise.allSettled(
      uninitialized.map((collectionId) => createAndDistributeCollectionKey(collectionId))
    );
  } catch {
    // No bloquear si falla la auto-inicialización
  }
}

/** Distribuye la clave de una colección a un usuario por su ID. */
export async function distributeCollectionKey(
  collectionId: number,
  targetUserId: number
): Promise<void> {
  const collectionKey = collectionKeyCache.get(collectionId);
  if (!collectionKey) throw new Error('No tienes la clave de esta colección.');

  const { public_key } = await api<PublicKeyResponse>(`/api/auth/users/${targetUserId}/public-key/`);
  const recipientPublicKey = await importPublicKey(public_key);
  const encryptedKey = await wrapCollectionKey(collectionKey, recipientPublicKey);

  await api('/api/vault/collection-keys/', {
    method: 'POST',
    body: { collection: collectionId, user: targetUserId, encrypted_key: encryptedKey },
  });
}

/** Crea una nueva clave de colección y la distribuye al usuario actual (creador). */
export async function createAndDistributeCollectionKey(collectionId: number): Promise<void> {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('No hay sesión activa.');

  const collectionKey = await generateCollectionKey();
  const { public_key } = await api<PublicKeyResponse>(`/api/auth/users/${currentUser.id}/public-key/`);
  const myPublicKey = await importPublicKey(public_key);
  const encryptedKey = await wrapCollectionKey(collectionKey, myPublicKey);

  await api('/api/vault/collection-keys/', {
    method: 'POST',
    body: { collection: collectionId, user: currentUser.id, encrypted_key: encryptedKey },
  });

  // Guardar en caché local
  collectionKeyCache.set(collectionId, collectionKey);
}

export function useVault() {
  const [entries, setEntries] = useState<VaultEntryDecrypted[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAndDecryptEntries = useCallback(async () => {
    const personalKey = getEncryptionKey();
    if (!personalKey) {
      setLoading(false);
      setError('Clave de cifrado no disponible. Por favor, inicia sesión de nuevo.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Cargar claves de colección antes de descifrar entradas
      await loadCollectionKeys();

      const encrypted = await api<VaultEntryEncrypted[]>('/api/vault/entries/');

      const results = await Promise.allSettled(
        encrypted.map(async (entry) => {
          // Elegir la clave correcta: colección o personal
          const key = entry.collection
            ? (collectionKeyCache.get(entry.collection) ?? personalKey)
            : personalKey;

          const data = await decrypt(entry.encrypted_data, entry.iv, key);
          return {
            id: entry.id,
            collection: entry.collection,
            name: data.name as string,
            username: data.username as string,
            password: data.password as string,
            ...(data.url ? { url: data.url as string } : {}),
            ...(data.notes ? { notes: data.notes as string } : {}),
            created_at: entry.created_at,
            updated_at: entry.updated_at,
          } as VaultEntryDecrypted;
        })
      );

      const decrypted = results
        .filter((r): r is PromiseFulfilledResult<VaultEntryDecrypted> => r.status === 'fulfilled')
        .map((r) => r.value);

      const failedCount = results.filter((r) => r.status === 'rejected').length;

      setEntries(decrypted);

      if (failedCount > 0) {
        setError(
          `${failedCount} entrada${failedCount > 1 ? 's' : ''} no pudieron descifrarse.`
        );
      }
    } catch {
      setError('Error al conectar con el servidor. Verifica tu sesión.');
    } finally {
      setLoading(false);
    }
  }, []);

  async function addEntry(formData: VaultEntryFormData) {
    const personalKey = getEncryptionKey();
    if (!personalKey) {
      setError('Clave de cifrado no disponible. Por favor, inicia sesión de nuevo.');
      return;
    }

    setError(null);

    try {
      let key = personalKey;
      if (formData.collection) {
        const collKey = collectionKeyCache.get(formData.collection);
        if (!collKey) {
          setError('No tienes la clave de esta colección. Recarga la página e intenta de nuevo.');
          return;
        }
        key = collKey;
      }

      const { encrypted_data, iv } = await encrypt(formData, key);
      const created = await api<VaultEntryEncrypted>('/api/vault/entries/', {
        method: 'POST',
        body: { encrypted_data, iv, collection: formData.collection ?? null },
      });

      const decrypted: VaultEntryDecrypted = {
        id: created.id,
        collection: created.collection,
        ...formData,
        created_at: created.created_at,
        updated_at: created.updated_at,
      };

      setEntries((prev) => [decrypted, ...prev]);
    } catch {
      setError('Error al crear la entrada.');
    }
  }

  async function updateEntry(id: number, formData: VaultEntryFormData) {
    const personalKey = getEncryptionKey();
    if (!personalKey) {
      setError('Clave de cifrado no disponible. Por favor, inicia sesión de nuevo.');
      return;
    }

    setError(null);

    try {
      let key = personalKey;
      if (formData.collection) {
        const collKey = collectionKeyCache.get(formData.collection);
        if (!collKey) {
          setError('No tienes la clave de esta colección. Recarga la página e intenta de nuevo.');
          return;
        }
        key = collKey;
      }

      const { encrypted_data, iv } = await encrypt(formData, key);
      const updated = await api<VaultEntryEncrypted>(`/api/vault/entries/${id}/`, {
        method: 'PUT',
        body: { encrypted_data, iv, collection: formData.collection ?? null },
      });

      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                id,
                collection: updated.collection,
                ...formData,
                created_at: updated.created_at,
                updated_at: updated.updated_at,
              }
            : e
        )
      );
    } catch {
      setError('Error al actualizar la entrada.');
    }
  }

  async function deleteEntry(id: number) {
    setError(null);

    try {
      await api(`/api/vault/entries/${id}/`, { method: 'DELETE' });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError('Error al eliminar la entrada.');
    }
  }

  return {
    entries,
    loading,
    error,
    fetchAndDecryptEntries,
    addEntry,
    updateEntry,
    deleteEntry,
  };
}
