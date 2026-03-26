'use client';

import { useEffect } from 'react';
import { useVault } from '@/features/useVault';
import { usePasswordHealth } from '@/features/usePasswordHealth';
import { IVBadge } from '@/components/ui';
import '@/styles/components/password-health.css';

const REASON_LABELS: Record<string, string> = {
  weak: 'Contraseña débil',
  reused: 'Contraseña reutilizada',
};

const STRENGTH_LABELS: Record<string, string> = {
  strong: 'Fuerte',
  medium: 'Media',
  weak: 'Débil',
};

const STRENGTH_VARIANT: Record<string, 'success' | 'warning' | 'danger'> = {
  strong: 'success',
  medium: 'warning',
  weak: 'danger',
};

const REASON_VARIANT: Record<string, 'danger' | 'purple'> = {
  weak: 'danger',
  reused: 'purple',
};

export default function PasswordHealthDashboard() {
  const { entries, loading, error, fetchAndDecryptEntries } = useVault();
  const stats = usePasswordHealth(entries);

  useEffect(() => {
    fetchAndDecryptEntries();
  }, [fetchAndDecryptEntries]);

  const scorePercent = stats.total > 0
    ? Math.round((stats.strong / stats.total) * 100)
    : 0;

  return (
    <div className="health">
      <div className="health__header">
        <h2 className="health__title">Salud de contraseñas</h2>
        <p className="health__subtitle">
          El análisis se realiza localmente — las contraseñas nunca salen de tu dispositivo.
        </p>
      </div>

      {error && <p className="health__error">{error}</p>}

      {loading ? (
        <p className="health__loading">Analizando bóveda...</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="health__stats">
            <div className="health__stat health__stat--score">
              <span className="health__stat-value">{scorePercent}%</span>
              <span className="health__stat-label">Puntuación general</span>
              <div className="health__bar">
                <div
                  className="health__bar-fill"
                  style={{ width: `${scorePercent}%` }}
                  data-level={scorePercent >= 80 ? 'good' : scorePercent >= 50 ? 'medium' : 'bad'}
                />
              </div>
            </div>

            <div className="health__stat health__stat--strong">
              <span className="health__stat-value">{stats.strong}</span>
              <span className="health__stat-label">Fuertes</span>
            </div>

            <div className="health__stat health__stat--medium">
              <span className="health__stat-value">{stats.medium}</span>
              <span className="health__stat-label">Medias</span>
            </div>

            <div className="health__stat health__stat--weak">
              <span className="health__stat-value">{stats.weak}</span>
              <span className="health__stat-label">Débiles</span>
            </div>

            <div className="health__stat health__stat--reused">
              <span className="health__stat-value">{stats.reused}</span>
              <span className="health__stat-label">Reutilizadas</span>
            </div>
          </div>

          {/* Issues list */}
          {stats.total === 0 ? (
            <p className="health__empty">No hay entradas en la bóveda para analizar.</p>
          ) : stats.issues.length === 0 ? (
            <div className="health__all-good">
              <p>Todas las contraseñas son únicas y fuertes.</p>
            </div>
          ) : (
            <div className="health__issues">
              <h3 className="health__issues-title">
                Entradas que requieren atención ({stats.issues.length})
              </h3>
              <div className="health__table-wrapper">
                <table className="health__table">
                  <thead>
                    <tr>
                      <th>Entrada</th>
                      <th>Usuario</th>
                      <th>Fortaleza</th>
                      <th>Problema</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.issues.map((issue) => (
                      <tr key={`${issue.id}-${issue.reason}`}>
                        <td className="health__cell--name">{issue.name}</td>
                        <td className="health__cell--user">{issue.username || '—'}</td>
                        <td>
                          {issue.strength && (
                            <IVBadge variant={STRENGTH_VARIANT[issue.strength]}>
                              {STRENGTH_LABELS[issue.strength]}
                            </IVBadge>
                          )}
                        </td>
                        <td>
                          <IVBadge variant={REASON_VARIANT[issue.reason]}>
                            {REASON_LABELS[issue.reason]}
                          </IVBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
