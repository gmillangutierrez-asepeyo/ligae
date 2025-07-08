import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { TokenProvider } from '@/contexts/token-context';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'LIGAE | ASEPEYO',
  description: 'Gestiona tus recibos de gastos fácilmente.',
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
        <AuthProvider>
          <TokenProvider>
            {children}
            <Toaster />
          </TokenProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
