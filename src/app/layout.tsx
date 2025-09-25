
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { TokenProvider } from '@/contexts/token-context';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar';

export const metadata: Metadata = {
  title: 'LIGAE | ASEPEYO',
  description: 'Gestiona tus recibos de gastos fácilmente.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <TokenProvider>
          <AuthProvider>
            <SidebarProvider>
              {children}
            </SidebarProvider>
            <Toaster />
          </AuthProvider>
        </TokenProvider>
      </body>
    </html>
  );
}
