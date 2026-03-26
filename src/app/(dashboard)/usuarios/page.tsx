import type { Metadata } from 'next';
import UsersDashboard from '@/components/admin/UsersDashboard';

export const metadata: Metadata = {
  title: 'Usuarios — IDEMAVault',
};

export default function UsuariosPage() {
  return <UsersDashboard />;
}
