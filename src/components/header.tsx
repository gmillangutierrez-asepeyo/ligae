'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Camera, GalleryHorizontal, Settings, LogOut, ClipboardCheck, FileDown } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import ReceiptEuroIcon from '@/components/icons/receipt-euro-icon';

export default function Header() {
  const { user, signOut, isManager, isExporter } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Capturar', icon: Camera, visible: true },
    { href: '/gallery', label: 'Mis Recibos', icon: GalleryHorizontal, visible: true },
    { href: '/approvals', label: 'Aprobaciones', icon: ClipboardCheck, visible: isManager },
    { href: '/export', label: 'Exportación', icon: FileDown, visible: isExporter },
    { href: '/settings', label: 'Ajustes', icon: Settings, visible: true },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <ReceiptEuroIcon className="h-8 w-8 text-primary" />
          <div className="flex flex-col">
            <span className="font-headline text-lg font-bold">LIGAE</span>
            <span className="text-xs text-muted-foreground">ASEPEYO</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          {navLinks.filter(link => link.visible).map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              asChild
              className={cn(
                pathname === link.href ? 'bg-accent text-accent-foreground' : ''
              )}
            >
              <Link href={link.href}>
                <link.icon className="mr-2 h-4 w-4" />
                {link.label}
              </Link>
            </Button>
          ))}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.photoURL ?? ''} alt={user?.displayName ?? 'Usuario'} />
                <AvatarFallback>
                  {user?.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.displayName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="md:hidden">
              {navLinks.filter(link => link.visible).map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href}>
                    <link.icon className="mr-2 h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </div>
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
