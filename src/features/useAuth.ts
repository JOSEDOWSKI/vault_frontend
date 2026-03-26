'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  generateSalt,
  deriveVerificationHash,
  deriveEncryptionKey,
  generateRsaKeyPair,
  exportPublicKey,
  encryptPrivateKey,
  decryptPrivateKey,
} from '@/lib/crypto';
import type {
  AuthResponse,
  SaltResponse,
  RegisterPayload,
  LoginPayload,
  MeResponse,
} from '@/types/auth';

// Variables efímeras a nivel de módulo — nunca se persisten
let encryptionKey: CryptoKey | null = null;
let rsaPrivateKey: CryptoKey | null = null;
let currentUser: MeResponse | null = null;

export function getEncryptionKey(): CryptoKey | null {
  return encryptionKey;
}

export function getRsaPrivateKey(): CryptoKey | null {
  return rsaPrivateKey;
}

export function getCurrentUser(): MeResponse | null {
  return currentUser;
}

export function clearEncryptionKey(): void {
  encryptionKey = null;
  rsaPrivateKey = null;
  currentUser = null;
  // También limpiar claves de colección en caché
  import('@/features/useVault').then(({ clearCollectionKeys }) => {
    clearCollectionKeys();
  }).catch(() => {});
}

// Intenta restaurar currentUser desde una sesión JWT activa (sin enc_key)
export async function checkAndRestoreSession(): Promise<boolean> {
  try {
    const user = await api<MeResponse>('/api/auth/me/');
    currentUser = user;
    return true;
  } catch {
    return false;
  }
}

export function useAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function register(email: string, username: string, password: string) {
    setLoading(true);
    setError(null);

    try {
      const salt = generateSalt();
      const verificationHash = await deriveVerificationHash(password, salt);

      // Derivar clave de cifrado y generar par de claves RSA
      const encKey = await deriveEncryptionKey(password, salt);
      const keyPair = await generateRsaKeyPair();
      const publicKeyB64 = await exportPublicKey(keyPair.publicKey);
      const { encrypted_private_key, private_key_iv } = await encryptPrivateKey(
        keyPair.privateKey,
        encKey
      );

      const payload: RegisterPayload = {
        email,
        username,
        salt,
        verification_hash: verificationHash,
        public_key: publicKeyB64,
        encrypted_private_key,
        private_key_iv,
      };

      await api<AuthResponse>('/api/auth/register/', { method: 'POST', body: payload });
      router.push('/login');
    } catch (err: unknown) {
      const apiErr = err as { data?: { email?: string[]; username?: string[] } };
      const msg =
        apiErr.data?.email?.[0] ||
        apiErr.data?.username?.[0] ||
        'Error al registrar. Intenta de nuevo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    setLoading(true);
    setError(null);

    try {
      // Paso 1: obtener salt del usuario
      const { salt } = await api<SaltResponse>(`/api/auth/salt/${encodeURIComponent(email)}/`);

      // Paso 2: derivar hash de verificación
      const verificationHash = await deriveVerificationHash(password, salt);

      // Paso 3: generar fingerprint del dispositivo (Zero Trust)
      let deviceFingerprint: string | undefined;
      try {
        const { generateDeviceFingerprint } = await import('@/lib/device');
        deviceFingerprint = await generateDeviceFingerprint();
      } catch {
        // Si falla el fingerprint, continuar sin él (compatibilidad)
      }

      const payload: LoginPayload = {
        email,
        verification_hash: verificationHash,
        device_fingerprint: deviceFingerprint,
      };

      try {
        await api<AuthResponse>('/api/auth/login/', { method: 'POST', body: payload });
      } catch (err: unknown) {
        const apiErr = err as { status?: number; data?: { device_blocked?: boolean; detail?: string } };
        if (apiErr.data?.device_blocked) {
          setError(apiErr.data.detail ?? 'Dispositivo no reconocido. Contacta a tu administrador.');
          return;
        }
        throw err;
      }

      // Paso 4: derivar clave de cifrado (solo en memoria)
      encryptionKey = await deriveEncryptionKey(password, salt);

      // Paso 5: obtener datos del usuario autenticado
      currentUser = await api<MeResponse>('/api/auth/me/');

      // Paso 6: descifrar clave privada RSA o generarla si el usuario no la tiene
      if (currentUser.encrypted_private_key && currentUser.private_key_iv) {
        try {
          rsaPrivateKey = await decryptPrivateKey(
            currentUser.encrypted_private_key,
            currentUser.private_key_iv,
            encryptionKey
          );
        } catch {
          // No bloquear login si falla el descifrado RSA
        }
      } else {
        // Usuario antiguo sin claves RSA — generarlas ahora y guardarlas
        try {
          const keyPair = await generateRsaKeyPair();
          const publicKeyB64 = await exportPublicKey(keyPair.publicKey);
          const { encrypted_private_key, private_key_iv } = await encryptPrivateKey(
            keyPair.privateKey,
            encryptionKey
          );
          await api('/api/auth/keys/', {
            method: 'PATCH',
            body: { public_key: publicKeyB64, encrypted_private_key, private_key_iv },
          });
          currentUser.public_key = publicKeyB64;
          currentUser.encrypted_private_key = encrypted_private_key;
          currentUser.private_key_iv = private_key_iv;
          rsaPrivateKey = keyPair.privateKey;
        } catch {
          // No bloquear login si falla la generación RSA
        }
      }

      router.push('/vault');
    } catch {
      setError('Correo o contraseña maestra incorrectos.');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api<AuthResponse>('/api/auth/logout/', { method: 'POST' });
    } finally {
      clearEncryptionKey();
      router.push('/login');
    }
  }

  return { register, login, logout, loading, error };
}

export function useUnlock() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock(password: string, onSuccess: string | (() => void) = '/vault') {
    if (!currentUser?.email) {
      router.push('/login');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { salt } = await api<SaltResponse>(`/api/auth/salt/${encodeURIComponent(currentUser.email)}/`);

      // Verificar contraseña maestra antes de derivar la clave de cifrado
      const verificationHash = await deriveVerificationHash(password, salt);
      await api('/api/auth/verify-password/', {
        method: 'POST',
        body: { verification_hash: verificationHash },
      });

      encryptionKey = await deriveEncryptionKey(password, salt);

      // Descifrar clave privada RSA o generarla si el usuario no la tiene
      if (currentUser.encrypted_private_key && currentUser.private_key_iv) {
        try {
          rsaPrivateKey = await decryptPrivateKey(
            currentUser.encrypted_private_key,
            currentUser.private_key_iv,
            encryptionKey
          );
        } catch {
          // No bloquear el unlock si falla RSA
        }
      } else {
        // Usuario antiguo sin claves RSA — generarlas ahora
        try {
          const keyPair = await generateRsaKeyPair();
          const publicKeyB64 = await exportPublicKey(keyPair.publicKey);
          const { encrypted_private_key, private_key_iv } = await encryptPrivateKey(
            keyPair.privateKey,
            encryptionKey
          );
          await api('/api/auth/keys/', {
            method: 'PATCH',
            body: { public_key: publicKeyB64, encrypted_private_key, private_key_iv },
          });
          currentUser.public_key = publicKeyB64;
          currentUser.encrypted_private_key = encrypted_private_key;
          currentUser.private_key_iv = private_key_iv;
          rsaPrivateKey = keyPair.privateKey;
        } catch {
          // No bloquear el unlock si falla la generación RSA
        }
      }

      if (typeof onSuccess === 'function') {
        onSuccess();
      } else {
        router.push(onSuccess);
      }
    } catch {
      setError('Contraseña maestra incorrecta.');
    } finally {
      setLoading(false);
    }
  }

  return { unlock, loading, error };
}
