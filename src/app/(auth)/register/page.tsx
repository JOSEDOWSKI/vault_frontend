// Registro deshabilitado — acceso solo por invitación del org_admin
import { redirect } from 'next/navigation';

export default function RegisterPage() {
  redirect('/login');
}
