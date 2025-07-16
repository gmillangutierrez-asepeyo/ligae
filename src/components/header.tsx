
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Camera, GalleryHorizontal, ClipboardCheck, FileDown, Settings } from 'lucide-react';

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
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PanelLeft } from 'lucide-react';
import ReceiptEuroIcon from '@/components/icons/receipt-euro-icon';
import { useSidebar } from './ui/sidebar';

export default function Header() {
  const { user, signOut, isManager, isExporter } = useAuth();
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Capturar', icon: Camera, visible: true },
    { href: '/gallery', label: 'Mis Recibos', icon: GalleryHorizontal, visible: true },
    { href: '/approvals', label: 'Aprobaciones', icon: ClipboardCheck, visible: isManager },
    { href: '/export', label: 'Exportación', icon: FileDown, visible: isExporter },
    { href: '/settings', label: 'Ajustes', icon: Settings, visible: true },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="md:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs p-0">
                <div className="flex h-16 items-center justify-between border-b px-4">
                     <Link href="/" className="flex items-center gap-3 font-semibold">
                        <ReceiptEuroIcon className="h-8 w-8 text-primary" />
                        <span>LIGAE</span>
                    </Link>
                    <SheetClose asChild>
                        <Button size="icon" variant="ghost">
                            <PanelLeft className="h-5 w-5" />
                            <span className="sr-only">Cerrar Menú</span>
                        </Button>
                    </SheetClose>
                </div>
              <nav className="grid gap-2 text-lg font-medium p-4">
                {navLinks.filter(l => l.visible).map(link => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-4 px-2.5 py-2 rounded-md ${pathname === link.href ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
                    >
                        <link.icon className="h-5 w-5" />
                        {link.label}
                    </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

            <Button size="icon" variant="outline" className="hidden md:flex" onClick={toggleSidebar}>
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>

            <div className="flex items-center gap-3">
                <ReceiptEuroIcon className="h-8 w-8 text-primary" />
                <div className="flex flex-col">
                    <span className="font-headline text-lg font-bold">LIGAE</span>
                    <span className="text-xs text-muted-foreground">ASEPEYO</span>
                </div>
            </div>
        </div>


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
