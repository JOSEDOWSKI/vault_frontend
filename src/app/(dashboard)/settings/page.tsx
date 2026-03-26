'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/features/useAuth';
import { api } from '@/lib/api';
import type { TrustedDevice, PendingDevice } from '@/types/auth';
import '@/styles/components/settings.css';

function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function SettingsPage() {
  const user = getCurrentUser();
  const esAdmin = user?.org_role === 'org_admin';

  const [dispositivos, setDispositivos] = useState<TrustedDevice[]>([]);
  const [pendientes, setPendientes] = useState<PendingDevice[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const devs = await api<TrustedDevice[]>('/api/auth/devices/');
        setDispositivos(devs);

        if (esAdmin) {
          const pend = await api<PendingDevice[]>('/api/auth/devices/pending/');
          setPendientes(pend);
        }
      } catch {
        setError('Error al cargar los dispositivos.');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, [esAdmin]);

  async function eliminarDispositivo(id: number) {
    try {
      await api(`/api/auth/devices/${id}/`, { method: 'DELETE' });
      setDispositivos((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError('Error al eliminar el dispositivo.');
    }
  }

  async function aprobarDispositivo(id: number) {
    try {
      await api(`/api/auth/devices/${id}/trust/`, { method: 'POST' });
      setPendientes((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError('Error al aprobar el dispositivo.');
    }
  }

  return (
    <div className="settings">
      <div className="settings__header">
        <h2 className="settings__title">Configuración</h2>
      </div>

      {error && <p className="settings__error">{error}</p>}

      {cargando ? (
        <p className="settings__loading">Cargando...</p>
      ) : (
        <>
          {/* Dispositivos de confianza */}
          <section className="settings__section">
            <h3 className="settings__section-title">Mis dispositivos de confianza</h3>
            <p className="settings__section-desc">
              Estos dispositivos tienen acceso a tu cuenta. Si ves uno que no reconoces, elimínalo.
            </p>
            {dispositivos.length === 0 ? (
              <p className="settings__empty">No hay dispositivos registrados.</p>
            ) : (
              <div className="settings__table-wrapper">
                <table className="settings__table">
                  <thead>
                    <tr>
                      <th>Dispositivo</th>
                      <th>IP</th>
                      <th>Última actividad</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispositivos.map((d) => (
                      <tr key={d.id}>
                        <td>{d.device_name || 'Dispositivo desconocido'}</td>
                        <td className="settings__cell--mono">{d.ip_address ?? '—'}</td>
                        <td>{formatearFecha(d.last_seen)}</td>
                        <td>
                          <span className={`settings__badge settings__badge--${d.is_trusted ? 'trusted' : 'pending'}`}>
                            {d.is_trusted ? 'De confianza' : 'Pendiente'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="settings__remove-btn"
                            onClick={() => eliminarDispositivo(d.id)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Dispositivos pendientes (solo org_admin) */}
          {esAdmin && (
            <section className="settings__section">
              <h3 className="settings__section-title">Dispositivos pendientes de aprobación</h3>
              <p className="settings__section-desc">
                Estos dispositivos intentaron acceder a la plataforma pero no están aprobados aún.
              </p>
              {pendientes.length === 0 ? (
                <p className="settings__empty">No hay dispositivos pendientes.</p>
              ) : (
                <div className="settings__table-wrapper">
                  <table className="settings__table">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Dispositivo</th>
                        <th>IP</th>
                        <th>Fecha</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendientes.map((d) => (
                        <tr key={d.id}>
                          <td>{d.user_email}</td>
                          <td>{d.device_name || 'Dispositivo desconocido'}</td>
                          <td className="settings__cell--mono">{d.ip_address ?? '—'}</td>
                          <td>{formatearFecha(d.created_at)}</td>
                          <td className="settings__cell--actions">
                            <button
                              className="settings__approve-btn"
                              onClick={() => aprobarDispositivo(d.id)}
                            >
                              Aprobar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
