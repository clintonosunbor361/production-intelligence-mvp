// @ts-nocheck
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './Providers';
import { DashboardLayout } from '../components/Layout/DashboardLayout';

export const metadata: Metadata = {
  title: 'Maison Couture ERP',
  description: 'Production Intelligence MVP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <DashboardLayout>
            {children}
          </DashboardLayout>
        </Providers>
      </body>
    </html>
  );
}
