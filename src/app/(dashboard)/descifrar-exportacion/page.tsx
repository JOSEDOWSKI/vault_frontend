import type { Metadata } from 'next';
import DescifrarExportacion from '@/components/admin/DescifrarExportacion';

export const metadata: Metadata = {
  title: 'Descifrar exportación — IDEMAVault',
};

export default function DescifrarExportacionPage() {
  return <DescifrarExportacion />;
}
