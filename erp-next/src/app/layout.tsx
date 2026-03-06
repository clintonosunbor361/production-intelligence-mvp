import { AuthProvider } from '@/context/AuthContext'
// @ts-nocheck
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './Providers'

export const metadata: Metadata = {
  title: 'Maison Couture ERP',
  description: 'Production Intelligence MVP',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <Providers>
            {children}
          </Providers>
        </AuthProvider>
      </body>
    </html>
  )
}