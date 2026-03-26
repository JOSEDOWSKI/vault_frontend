import type { Metadata } from 'next';
import GroupsDashboard from '@/components/admin/GroupsDashboard';

export const metadata: Metadata = {
  title: 'Groups — IDEMAVault',
};

export default function GroupsPage() {
  return <GroupsDashboard />;
}
