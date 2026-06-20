import type { ReactNode } from 'react';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata = {
  title: 'Hearthlane — Neighborhood Utilities',
  description: 'Subscribe to trusted local garden care, school transport, and neighborhood goods.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
