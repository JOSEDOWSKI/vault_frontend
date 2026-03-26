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
} from '@/lib/crypto';
import type {
  InvitationInfo,
  PendingInvitation,
  CompleteInvitationPayload,
} from '@/types/auth';

// --- Hook para completar el registro desde un link de invitación ---

export function useCompleteInvitation(token: string) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete(username: string, password: string) {
    setLoading(true);
    setError(null);

    try {
      const salt = generateSalt();
      const verificationHash = await deriveVerificationHash(password, salt);
      const encKey = await deriveEncryptionKey(password, salt);
      const keyPair = await generateRsaKeyPair();
      const publicKeyB64 = await exportPublicKey(keyPair.publicKey);
      const { encrypted_private_key, private_key_iv } = await encryptPrivateKey(
        keyPair.privateKey,
        encKey
      );

      const payload: CompleteInvitationPayload = {
        username,
        salt,
        verification_hash: verificationHash,
        public_key: publicKeyB64,
        encrypted_private_key,
        private_key_iv,
      };

      await api(`/api/auth/invite/${token}/complete/`, { method: 'POST', body: payload });
      router.push('/login?invited=1');
    } catch (err: unknown) {
      const apiErr = err as { data?: { username?: string[]; detail?: string } };
      const msg =
        apiErr.data?.username?.[0] ||
        apiErr.data?.detail ||
        'Error al completar el registro. Intenta de nuevo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return { complete, loading, error };
}

// --- Hook para gestionar invitaciones desde el panel de admin ---

export function useInvitations() {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);

  async function fetchInvitations() {
    setLoading(true);
    try {
      const data = await api<PendingInvitation[]>('/api/auth/invite/list/');
      setInvitations(data);
    } catch {
      setError('Error al cargar las invitaciones.');
    } finally {
      setLoading(false);
    }
  }

  async function createInvitation(email: string, orgRole: 'org_admin' | 'member') {
    setLoading(true);
    setError(null);
    setNewToken(null);

    try {
      const res = await api<{ token: string; expires_at: string }>('/api/auth/invite/', {
        method: 'POST',
        body: { email, org_role: orgRole },
      });
      setNewToken(res.token);
      await fetchInvitations();
    } catch (err: unknown) {
      const apiErr = err as { data?: { detail?: string } };
      setError(apiErr.data?.detail || 'Error al crear la invitación.');
    } finally {
      setLoading(false);
    }
  }

  async function revokeInvitation(id: number) {
    try {
      await api(`/api/auth/invite/${id}/revoke/`, { method: 'DELETE' });
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch {
      setError('Error al revocar la invitación.');
    }
  }

  function clearNewToken() {
    setNewToken(null);
  }

  return {
    invitations,
    loading,
    error,
    newToken,
    fetchInvitations,
    createInvitation,
    revokeInvitation,
    clearNewToken,
  };
}

// --- Función pública para validar un token (sin hook) ---

export async function validateInvitationToken(token: string): Promise<InvitationInfo | null> {
  try {
    return await api<InvitationInfo>(`/api/auth/invite/${token}/`);
  } catch {
    return null;
  }
}
