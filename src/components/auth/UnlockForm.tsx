'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUnlock, checkAndRestoreSession, getCurrentUser, getEncryptionKey } from '@/features/useAuth';
import '@/styles/components/auth-form.css';

export default function UnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/vault';
  const { unlock, loading, error } = useUnlock();

  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    async function init() {
      if (getEncryptionKey()) {
        router.replace(next);
        return;
      }
      const active = await checkAndRestoreSession();
      if (!active) {
        router.replace('/login');
        return;
      }
      setEmail(getCurrentUser()?.email ?? '');
      setChecking(false);
    }
    init();
  }, [router, next]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await unlock(password, next);
  }

  if (checking) {
    return <p className="auth-form__loading">Verificando sesión...</p>;
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-form__lock-icon" aria-hidden="true">🔒</div>

      <p className="auth-form__lock-info">
        La sesión sigue activa para <strong>{email}</strong>.<br />
        Ingresa tu contraseña maestra para desbloquear la bóveda.
      </p>

      {error && <div className="auth-form__error">{error}</div>}

      <div className="auth-form__field">
        <label className="auth-form__label" htmlFor="password">Contraseña maestra</label>
        <input
          id="password"
          className="auth-form__input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ingresa tu contraseña maestra"
          required
          autoFocus
          autoComplete="current-password"
        />
      </div>

      <button className="auth-form__submit" type="submit" disabled={loading}>
        {loading ? 'Desbloqueando...' : 'Desbloquear bóveda'}
      </button>

      <button
        type="button"
        className="auth-form__secondary"
        onClick={() => router.push('/login')}
      >
        Cerrar sesión e iniciar con otro usuario
      </button>
    </form>
  );
}
