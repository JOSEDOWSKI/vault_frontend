'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/features/useAuth';
import { useInvitations } from '@/features/useInvitation';
import '@/styles/components/users-dashboard.css';

export default function UsersDashboard() {
  const router = useRouter();
  const user = getCurrentUser();

  const {
    invitations,
    loading,
    error,
    newToken,
    fetchInvitations,
    createInvitation,
    revokeInvitation,
    clearNewToken,
  } = useInvitations();

  const [email, setEmail] = useState('');
  const [orgRole, setOrgRole] = useState<'member' | 'org_admin'>('member');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user && user.org_role !== 'org_admin') {
      router.push('/vault');
      return;
    }
    fetchInvitations();
  }, [user]);

  if (!user || user.org_role !== 'org_admin') return null;

  function buildInviteUrl(token: string) {
    return `${window.location.origin}/invitacion?token=${token}`;
  }

  async function handleCopy(token: string) {
    await navigator.clipboard.writeText(buildInviteUrl(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createInvitation(email, orgRole);
    setEmail('');
    setOrgRole('member');
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="users-dashboard">
      <h2 className="users-dashboard__title">Gestión de usuarios</h2>

      {/* Formulario de invitación */}
      <section className="users-dashboard__section">
        <h3 className="users-dashboard__section-title">Invitar nuevo usuario</h3>
        <form className="users-dashboard__invite-form" onSubmit={handleSubmit}>
          <div className="users-dashboard__invite-fields">
            <input
              className="users-dashboard__input"
              type="email"
              placeholder="correo@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select
              className="users-dashboard__select"
              value={orgRole}
              onChange={(e) => setOrgRole(e.target.value as 'member' | 'org_admin')}
            >
              <option value="member">Miembro</option>
              <option value="org_admin">Administrador</option>
            </select>
            <button
              className="users-dashboard__btn users-dashboard__btn--primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Generando...' : 'Generar invitación'}
            </button>
          </div>
        </form>

        {error && <p className="users-dashboard__error">{error}</p>}

        {/* Link generado */}
        {newToken && (
          <div className="users-dashboard__link-box">
            <p className="users-dashboard__link-label">
              Link generado — válido 48 horas. Compártelo con el usuario.
            </p>
            <div className="users-dashboard__link-row">
              <code className="users-dashboard__link-code">{buildInviteUrl(newToken)}</code>
              <button
                className="users-dashboard__btn users-dashboard__btn--copy"
                type="button"
                onClick={() => handleCopy(newToken)}
              >
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            <button
              className="users-dashboard__dismiss"
              type="button"
              onClick={clearNewToken}
            >
              Cerrar
            </button>
          </div>
        )}
      </section>

      {/* Invitaciones pendientes */}
      <section className="users-dashboard__section">
        <h3 className="users-dashboard__section-title">Invitaciones pendientes</h3>
        {invitations.length === 0 ? (
          <p className="users-dashboard__empty">No hay invitaciones activas.</p>
        ) : (
          <table className="users-dashboard__table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Rol</th>
                <th>Expira</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.email}</td>
                  <td>
                    <span className={`users-dashboard__badge users-dashboard__badge--${inv.org_role}`}>
                      {inv.org_role === 'org_admin' ? 'Administrador' : 'Miembro'}
                    </span>
                  </td>
                  <td className="users-dashboard__date">{formatDate(inv.expires_at)}</td>
                  <td>
                    <button
                      className="users-dashboard__btn users-dashboard__btn--danger"
                      onClick={() => revokeInvitation(inv.id)}
                    >
                      Revocar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
