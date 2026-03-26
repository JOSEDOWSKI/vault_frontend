'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/features/useAuth';
import { IconShieldCheck } from '@/components/ui';
import '@/styles/components/auth-form.css';

export default function LoginForm() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await login(email, password);
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-form__security-badge">
        <IconShieldCheck size={16} />
        <span>Cifrado de extremo a extremo</span>
      </div>

      {error && <div className="auth-form__error">{error}</div>}

      <div className="auth-form__field">
        <label className="auth-form__label" htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          className="auth-form__input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@empresa.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="auth-form__field">
        <label className="auth-form__label" htmlFor="password">Contraseña maestra</label>
        <div className="auth-form__input-wrapper">
          <input
            id="password"
            className="auth-form__input"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa tu contraseña maestra"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="auth-form__toggle-password"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>

      <button className="auth-form__submit" type="submit" disabled={loading}>
        {loading ? (
          <>
            <span className="auth-form__spinner" />
            Abriendo bóveda...
          </>
        ) : (
          'Abrir bóveda'
        )}
      </button>

      <p className="auth-form__footer-note">
        Tu contraseña maestra nunca se envía al servidor.
        <br />
        Solo se usa para derivar tu clave de cifrado local.
      </p>
    </form>
  );
}
