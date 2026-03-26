'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useUnlock, getCurrentUser } from '@/features/useAuth';
import '@/styles/layouts/auth-layout.css';
import '@/styles/components/auth-form.css';

interface InlineUnlockFormProps {
  onUnlocked: () => void;
}

export default function InlineUnlockForm({ onUnlocked }: InlineUnlockFormProps) {
  const router = useRouter();
  const { unlock, loading, error } = useUnlock();
  const [password, setPassword] = useState('');
  const email = getCurrentUser()?.email ?? '';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await unlock(password, onUnlocked);
  }

  return (
    <div className="auth-layout">
      <div className="auth-layout__container">
        <h1 className="auth-layout__title">IDEMAVault</h1>
        <p className="auth-layout__subtitle">Gestor de contraseñas zero-knowledge</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form__lock-icon" aria-hidden="true">🔒</div>

          <p className="auth-form__lock-info">
            Sesión activa para <strong>{email}</strong>.<br />
            Ingresa tu contraseña maestra para acceder a la bóveda.
          </p>

          {error && <div className="auth-form__error">{error}</div>}

          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="inline-unlock-password">
              Contraseña maestra
            </label>
            <input
              id="inline-unlock-password"
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
      </div>
    </div>
  );
}
