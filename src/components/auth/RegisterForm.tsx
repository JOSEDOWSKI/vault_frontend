'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/useAuth';
import '@/styles/components/auth-form.css';

export default function RegisterForm() {
  const { register, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (password.length < 12) {
      setLocalError('Master password must be at least 12 characters.');
      return;
    }

    if (password !== confirm) {
      setLocalError('Passwords do not match.');
      return;
    }

    await register(email, username, password);
  }

  const displayError = localError || error;

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {displayError && <div className="auth-form__error">{displayError}</div>}

      <div className="auth-form__field">
        <label className="auth-form__label" htmlFor="email">Email</label>
        <input
          id="email"
          className="auth-form__input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="auth-form__field">
        <label className="auth-form__label" htmlFor="username">Username</label>
        <input
          id="username"
          className="auth-form__input"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Choose a username"
          required
          autoComplete="username"
        />
      </div>

      <div className="auth-form__field">
        <label className="auth-form__label" htmlFor="password">Master Password</label>
        <input
          id="password"
          className="auth-form__input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 12 characters"
          required
          autoComplete="new-password"
        />
      </div>

      <div className="auth-form__field">
        <label className="auth-form__label" htmlFor="confirm">Confirm Password</label>
        <input
          id="confirm"
          className="auth-form__input"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your master password"
          required
          autoComplete="new-password"
        />
      </div>

      <button className="auth-form__submit" type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Create Account'}
      </button>

      <p className="auth-form__link">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
