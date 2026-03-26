import { Suspense } from 'react';
import UnlockForm from '@/components/auth/UnlockForm';

export default function UnlockPage() {
  return (
    <Suspense fallback={<p style={{ textAlign: 'center', padding: '2rem' }}>Cargando...</p>}>
      <UnlockForm />
    </Suspense>
  );
}
