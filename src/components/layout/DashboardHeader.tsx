'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, getCurrentUser } from '@/features/useAuth';
import {
  IconVault,
  IconGenerator,
  IconGroups,
  IconAdmin,
  IconDevices,
  IconShield,
  IconLogout,
  IconUser,
} from '@/components/ui';
import '@/styles/components/dashboard-header.css';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/vault', label: 'Bóveda', icon: <IconVault size={18} /> },
  { href: '/generator', label: 'Generador', icon: <IconGenerator size={18} /> },
  { href: '/groups', label: 'Grupos', icon: <IconGroups size={18} /> },
  { href: '/admin', label: 'Admin', icon: <IconAdmin size={18} />, adminOnly: true },
  { href: '/settings', label: 'Dispositivos', icon: <IconDevices size={18} /> },
];

export default function DashboardHeader() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const user = getCurrentUser();
  const isOrgAdmin = user?.org_role === 'org_admin';

  function navClass(href: string) {
    const isActive = pathname === href || (href === '/admin' && pathname?.startsWith('/admin'));
    return `dashboard-header__link${isActive ? ' dashboard-header__link--active' : ''}`;
  }

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__inner">
        <div className="dashboard-header__left">
          <Link href="/vault" className="dashboard-header__brand">
            <div className="dashboard-header__logo">
              <IconShield size={18} />
            </div>
            <span className="dashboard-header__title">IDEMAVault</span>
          </Link>
          <nav className="dashboard-header__nav">
            {navItems
              .filter((item) => !item.adminOnly || isOrgAdmin)
              .map((item) => (
                <Link key={item.href} href={item.href} className={navClass(item.href)}>
                  {item.icon}
                  <span className="dashboard-header__link-label">{item.label}</span>
                </Link>
              ))
            }
          </nav>
        </div>
        <div className="dashboard-header__right">
          {user && (
            <div className="dashboard-header__user">
              <IconUser size={14} />
              <span className="dashboard-header__user-email">{user.email}</span>
            </div>
          )}
          <button className="dashboard-header__logout" onClick={logout} title="Cerrar sesión">
            <IconLogout size={16} />
            <span className="dashboard-header__logout-label">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
