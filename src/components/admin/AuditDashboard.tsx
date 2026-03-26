'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/features/useAuth';
import { useAuditLogs } from '@/features/useAuditLogs';
import { IVBadge } from '@/components/ui';
import type { AuditAction } from '@/types/audit';
import '@/styles/components/audit-dashboard.css';

const ETIQUETAS_ACCION: Record<string, string> = {
  view: 'Vista',
  create: 'Creación',
  update: 'Edición',
  delete: 'Eliminación',
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  device_blocked: 'Dispositivo bloqueado',
};

const COLORES_ACCION: Record<string, string> = {
  view: 'neutral',
  create: 'success',
  update: 'warning',
  delete: 'danger',
  login: 'info',
  logout: 'neutral',
  device_blocked: 'danger',
};

const ETIQUETAS_RECURSO: Record<string, string> = {
  vault_entry: 'Entrada de bóveda',
  session: 'Sesión',
  collection: 'Colección',
  group: 'Grupo',
  device_blocked: 'Dispositivo',
};

function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function AuditDashboard() {
  const router = useRouter();
  const user = getCurrentUser();
  const { logs, loading, error, fetchLogs, totalCount } = useAuditLogs();
  const [filtroAccion, setFiltroAccion] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    if (user && user.org_role !== 'org_admin') {
      router.push('/vault');
      return;
    }
    fetchLogs(
      filtroAccion || undefined,
      fechaDesde || undefined,
      fechaHasta || undefined,
    );
  }, [filtroAccion, fechaDesde, fechaHasta]);

  if (!user || user.org_role !== 'org_admin') return null;

  return (
    <div className="audit">
      <div className="audit__header">
        <h2 className="audit__title">Registro de auditoría</h2>
        <div className="audit__filters">
          <select
            className="audit__filter"
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
          >
            <option value="">Todas las acciones</option>
            <option value="login">Inicio de sesión</option>
            <option value="logout">Cierre de sesión</option>
            <option value="create">Creación</option>
            <option value="update">Edición</option>
            <option value="delete">Eliminación</option>
            <option value="view">Vista</option>
          </select>
          <input
            className="audit__filter audit__filter--date"
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            placeholder="Desde"
            title="Fecha desde"
          />
          <input
            className="audit__filter audit__filter--date"
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            placeholder="Hasta"
            title="Fecha hasta"
          />
          {(fechaDesde || fechaHasta || filtroAccion) && (
            <button
              className="audit__clear-btn"
              onClick={() => { setFiltroAccion(''); setFechaDesde(''); setFechaHasta(''); }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {error && <p className="audit__error">{error}</p>}

      {loading ? (
        <p className="audit__loading">Cargando registros...</p>
      ) : logs.length === 0 ? (
        <p className="audit__empty">No hay registros que mostrar.</p>
      ) : (
        <>
          {totalCount > 0 && (
            <p className="audit__count">{totalCount} registro{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}</p>
          )}
          <div className="audit__table-wrapper">
            <table className="audit__table">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Recurso</th>
                  <th>ID</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="audit__cell--date">{formatearFecha(log.timestamp)}</td>
                    <td>{log.user_email ?? '—'}</td>
                    <td>
                      <IVBadge variant={COLORES_ACCION[log.action] as any}>
                        {ETIQUETAS_ACCION[log.action] ?? log.action}
                      </IVBadge>
                    </td>
                    <td>
                      {ETIQUETAS_RECURSO[log.resource_type] ?? log.resource_type}
                    </td>
                    <td className="audit__cell--id">
                      {log.resource_id ? `#${log.resource_id}` : '—'}
                    </td>
                    <td className="audit__cell--ip">{log.ip_address ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
