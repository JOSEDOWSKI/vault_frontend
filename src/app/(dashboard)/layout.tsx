'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/layout/DashboardHeader';
import InlineUnlockForm from '@/components/auth/InlineUnlockForm';
import { useSessionTimeout } from '@/features/useSessionTimeout';
import { getCurrentUser, checkAndRestoreSession, getEncryptionKey } from '@/features/useAuth';
import '@/styles/layouts/dashboard-layout.css';

type Estado = 'verificando' | 'desbloqueando' | 'listo';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>('verificando');
  useSessionTimeout();

  useEffect(() => {
    async function init() {
      // 1. Restaurar sesión desde JWT si currentUser no está en memoria
      if (!getCurrentUser()) {
        const activa = await checkAndRestoreSession();
        if (!activa) {
          router.replace('/login');
          return;
        }
      }

      // 2. Verificar clave de cifrado
      if (!getEncryptionKey()) {
        setEstado('desbloqueando');
        return;
      }

      setEstado('listo');
    }
    init();
  }, [router]);

  // Mientras se verifica la sesión
  if (estado === 'verificando') return null;

  // La sesión está activa pero la clave de cifrado no está en memoria (recarga)
  if (estado === 'desbloqueando') {
    return <InlineUnlockForm onUnlocked={() => setEstado('listo')} />;
  }

  return (
    <div className="dashboard-layout">
      <DashboardHeader />
      <main className="dashboard-layout__main">{children}</main>
    </div>
  );
}
