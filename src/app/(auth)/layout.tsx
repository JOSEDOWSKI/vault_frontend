import { IconShield } from '@/components/ui';
import '@/styles/layouts/auth-layout.css';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <div className="auth-layout__container">
        <div className="auth-layout__brand">
          <div className="auth-layout__logo">
            <IconShield size={32} />
          </div>
          <h1 className="auth-layout__title">IDEMAVault</h1>
        </div>
        <p className="auth-layout__subtitle">Gestor de contraseñas zero-knowledge</p>
        {children}
      </div>
    </div>
  );
}
