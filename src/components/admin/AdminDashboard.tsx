'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/features/useAuth';
import { IconUsers, IconGroups, IconAudit, IconHealth, IconDecrypt } from '@/components/ui';
import '@/styles/components/admin-dashboard.css';

interface AdminCard {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: 'accent' | 'success' | 'warning' | 'info' | 'danger';
}

const cards: AdminCard[] = [
  {
    href: '/usuarios',
    title: 'Usuarios',
    desc: 'Invitar y gestionar usuarios de la organización',
    icon: <IconUsers size={22} />,
    color: 'accent',
  },
  {
    href: '/groups',
    title: 'Grupos y colecciones',
    desc: 'Gestionar grupos, miembros y permisos',
    icon: <IconGroups size={22} />,
    color: 'info',
  },
  {
    href: '/audit',
    title: 'Registro de auditoría',
    desc: 'Ver accesos y acciones de usuarios',
    icon: <IconAudit size={22} />,
    color: 'warning',
  },
  {
    href: '/health',
    title: 'Salud de contraseñas',
    desc: 'Detectar contraseñas débiles y reutilizadas',
    icon: <IconHealth size={22} />,
    color: 'success',
  },
  {
    href: '/descifrar-exportacion',
    title: 'Descifrar exportación',
    desc: 'Abrir archivos .ivault exportados',
    icon: <IconDecrypt size={22} />,
    color: 'danger',
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const user = getCurrentUser();

  useEffect(() => {
    if (user && user.org_role !== 'org_admin') {
      router.push('/vault');
    }
  }, [user, router]);

  if (!user || user.org_role !== 'org_admin') return null;

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__header">
        <h2 className="admin-dashboard__title">Panel de administración</h2>
        <p className="admin-dashboard__subtitle">
          Gestiona tu organización, usuarios y seguridad
        </p>
      </div>
      <div className="admin-dashboard__cards">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`admin-dashboard__card admin-dashboard__card--${card.color}`}
          >
            <div className={`admin-dashboard__card-icon admin-dashboard__card-icon--${card.color}`}>
              {card.icon}
            </div>
            <div className="admin-dashboard__card-content">
              <h3 className="admin-dashboard__card-title">{card.title}</h3>
              <p className="admin-dashboard__card-desc">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
