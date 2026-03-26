import type { Metadata } from 'next';
import VaultDashboard from '@/components/vault/VaultDashboard';

export const metadata: Metadata = {
  title: 'Vault — IDEMAVault',
};

export default function VaultPage() {
  return <VaultDashboard />;
}
