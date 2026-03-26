import type { Metadata } from 'next';
import { Suspense } from 'react';
import InvitationForm from '@/components/auth/InvitationForm';

export const metadata: Metadata = {
  title: 'Activar cuenta — IDEMAVault',
};

export default function InvitacionPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <InvitationForm />
    </Suspense>
  );
}
