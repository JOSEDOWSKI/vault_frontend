'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { distributeCollectionKey, createAndDistributeCollectionKey, getCollectionKey, loadCollectionKeys } from '@/features/useVault';
import type { Group, GroupMember, Collection, CollectionAccess } from '@/types/groups';

interface GroupCollectionAccess {
  collection_id: number;
  collection_name: string;
  permission: string;
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionAccesses, setCollectionAccesses] = useState<CollectionAccess[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Group[]>('/api/org/groups/');
      setGroups(data);
    } catch {
      setError('Error al cargar los grupos.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCollections = useCallback(async () => {
    try {
      const data = await api<Collection[]>('/api/org/collections/');
      setCollections(data);
    } catch {
      // No es crítico
    }
  }, []);

  async function selectGroup(group: Group) {
    setSelectedGroup(group);
    setError(null);
    try {
      const membersData = await api<GroupMember[]>(`/api/org/groups/${group.id}/members/`);
      setMembers(membersData);
    } catch {
      setError('Error al cargar los miembros.');
    }
  }

  async function createGroup(name: string, description: string): Promise<boolean> {
    setError(null);
    try {
      const created = await api<Group>('/api/org/groups/', {
        method: 'POST',
        body: { name, description },
      });
      setGroups((prev) => [...prev, created]);
      return true;
    } catch {
      setError('Error al crear el grupo.');
      return false;
    }
  }

  async function deleteGroup(id: number): Promise<void> {
    setError(null);
    try {
      await api(`/api/org/groups/${id}/`, { method: 'DELETE' });
      setGroups((prev) => prev.filter((g) => g.id !== id));
      if (selectedGroup?.id === id) {
        setSelectedGroup(null);
        setMembers([]);
      }
    } catch {
      setError('Error al eliminar el grupo.');
    }
  }

  async function addMember(email: string, role: 'member' | 'admin'): Promise<boolean> {
    if (!selectedGroup) return false;
    setError(null);
    try {
      const newMember = await api<GroupMember>(`/api/org/groups/${selectedGroup.id}/members/add/`, {
        method: 'POST',
        body: { email, role },
      });
      setMembers((prev) => [...prev, newMember]);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroup.id ? { ...g, member_count: g.member_count + 1 } : g
        )
      );

      // Distribuir claves de colección al nuevo miembro
      try {
        // Asegurar que el caché de claves está cargado (puede estar vacío si el admin
        // no visitó /vault antes de /groups en esta sesión)
        await loadCollectionKeys();

        const groupCollections = await api<GroupCollectionAccess[]>(
          `/api/org/groups/${selectedGroup.id}/collections/`
        );
        for (const gc of groupCollections) {
          const collKey = getCollectionKey(gc.collection_id);
          if (collKey) {
            await distributeCollectionKey(gc.collection_id, newMember.user);
          }
        }
      } catch {
        // La distribución de claves falla silenciosamente — el admin puede hacerlo manualmente
      }

      return true;
    } catch (err: unknown) {
      const apiErr = err as { data?: { detail?: string } };
      setError(apiErr.data?.detail ?? 'Error al agregar el miembro.');
      return false;
    }
  }

  async function removeMember(membershipId: number): Promise<void> {
    if (!selectedGroup) return;
    setError(null);
    try {
      await api(`/api/org/groups/${selectedGroup.id}/members/${membershipId}/`, { method: 'DELETE' });
      setMembers((prev) => prev.filter((m) => m.id !== membershipId));
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroup.id ? { ...g, member_count: g.member_count - 1 } : g
        )
      );
    } catch {
      setError('Error al eliminar el miembro.');
    }
  }

  async function createCollection(name: string, description: string): Promise<Collection | null> {
    setError(null);
    try {
      const created = await api<Collection>('/api/org/collections/', {
        method: 'POST',
        body: { name, description },
      });
      setCollections((prev) => [...prev, created]);

      // Crear y distribuir clave de colección para el creador (org_admin)
      try {
        await createAndDistributeCollectionKey(created.id);
      } catch {
        // No bloquear si falla la distribución de clave — puede no tener RSA keys
      }

      return created;
    } catch {
      setError('Error al crear la colección.');
      return null;
    }
  }

  async function grantCollectionAccess(
    collectionId: number,
    groupId: number,
    permission: 'read' | 'write' | 'manage'
  ): Promise<boolean> {
    setError(null);
    try {
      await api(`/api/org/collections/${collectionId}/access/grant/`, {
        method: 'POST',
        body: { group: groupId, permission },
      });

      // Distribuir clave de colección a todos los miembros del grupo
      try {
        // Asegurar que el caché está cargado antes de intentar distribuir
        await loadCollectionKeys();

        const groupMembers = await api<GroupMember[]>(`/api/org/groups/${groupId}/members/`);
        const collKey = getCollectionKey(collectionId);

        if (collKey) {
          await Promise.allSettled(
            groupMembers.map((m) => distributeCollectionKey(collectionId, m.user))
          );
        }
      } catch {
        // No bloquear si falla la distribución
      }

      return true;
    } catch {
      setError('Error al otorgar acceso a la colección.');
      return false;
    }
  }

  return {
    groups,
    members,
    selectedGroup,
    collections,
    collectionAccesses,
    loading,
    error,
    fetchGroups,
    fetchCollections,
    selectGroup,
    createGroup,
    deleteGroup,
    addMember,
    removeMember,
    createCollection,
    grantCollectionAccess,
  };
}
