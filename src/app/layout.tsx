import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IDEMAVault',
  description: 'Zero-knowledge password manager',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
