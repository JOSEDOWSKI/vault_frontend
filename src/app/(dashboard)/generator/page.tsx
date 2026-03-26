import type { Metadata } from 'next';
import PasswordGenerator from '@/components/generator/PasswordGenerator';

export const metadata: Metadata = {
  title: 'Generator — IDEMAVault',
};

export default function GeneratorPage() {
  return <PasswordGenerator />;
}
