'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { validateInvitationToken, useCompleteInvitation } from '@/features/useInvitation';
import type { InvitationInfo } from '@/types/auth';
import '@/styles/components/auth-form.css';

export default function InvitationForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const { complete, loading, error: submitError } = useCompleteInvitation(token);

  useEffect(() => {
    if (!token) {
      setTokenError('Link de invitación inválido.');
      setValidating(false);
      return;
    }
    validateInvitationToken(token).then((result) => {
      if (!result) {
        setTokenError('Esta invitación no es válida o ha expirado.');
      } else {
        setInfo(result);
      }
      setValidating(false);
    });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (password.length < 12) {
      setLocalError('La contraseña maestra debe tener al menos 12 caracteres.');
      return;
    }
    if (password !== confirm) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }

    await complete(username, password);
  }

  if (validating) {
    return (
      <div className="auth-form">
        <p className="auth-form__loading">Validando invitación...</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="auth-form">
        <div className="auth-form__lock-icon">⛔</div>
        <p className="auth-form__lock-info">{tokenError}</p>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-form__lock-icon">🔐</div>
      <p className="auth-form__lock-info">
        Has sido invitado a <strong>IDEMAVault</strong>.<br />
        Cuenta: <strong>{info?.email}</strong>
      </p>

      {(localError || submitError) && (
        <div className="auth-form__error">{localError ?? submitError}</div>
      )}

      <div className="auth-form__field">
        <label className="auth-form__label" htmlFor="username">
          Nombre de usuario
        </label>
        <input
          id="username"
          className="auth-form__input"
          type="text"
          placeholder="tu_nombre"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
        />
      </div>

      <div className="auth-form__field">
        <label className="auth-form__label" htmlFor="password">
          Contraseña maestra
        </label>
        <input
          id="password"
          className="auth-form__input"
          type="password"
          placeholder="Mínimo 12 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      <div className="auth-form__field">
        <label className="auth-form__label" htmlFor="confirm">
          Confirmar contraseña maestra
        </label>
        <input
          id="confirm"
          className="auth-form__input"
          type="password"
          placeholder="Repite la contraseña"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      <button className="auth-form__submit" type="submit" disabled={loading}>
        {loading ? 'Activando cuenta...' : 'Activar cuenta'}
      </button>
    </form>
  );
}
