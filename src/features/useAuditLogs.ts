'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { AuditLog } from '@/types/audit';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async (action?: string, dateFrom?: string, dateTo?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const queryString = params.toString();
      const url = `/api/audit/logs/${queryString ? `?${queryString}` : ''}`;

      // El endpoint puede devolver lista paginada u objeto con results
      const data = await api<PaginatedResponse<AuditLog> | AuditLog[]>(url);

      if (Array.isArray(data)) {
        setLogs(data);
        setTotalCount(data.length);
      } else {
        setLogs(data.results);
        setTotalCount(data.count);
      }
    } catch {
      setError('Error al cargar el registro de auditoría.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { logs, loading, error, fetchLogs, totalCount };
}
