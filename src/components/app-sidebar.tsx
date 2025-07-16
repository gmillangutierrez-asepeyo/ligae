
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, GalleryHorizontal, Settings, ClipboardCheck, FileDown, PanelLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import ReceiptEuroIcon from '@/components/icons/receipt-euro-icon';
import { Button } from './ui/button';

// Helper component for sidebar links
function SidebarLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <li>
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        asChild
        className="w-full justify-start"
      >
        <Link href={href}>
          <Icon className="mr-2 h-4 w-4" />
          {label}
        </Link>
      </Button>
    </li>
  );
}

export default function AppSidebar() {
  const { isManager, isExporter } = useAuth();
  
  const navLinks = [
    { href: '/', label: 'Capturar', icon: Camera, visible: true },
    { href: '/gallery', label: 'Mis Recibos', icon: GalleryHorizontal, visible: true },
    { href: '/approvals', label: 'Aprobaciones', icon: ClipboardCheck, visible: isManager },
    { href: '/export', label: 'Exportación', icon: FileDown, visible: isExporter },
    { href: '/settings', label: 'Ajustes', icon: Settings, visible: true },
  ];

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 border-r bg-background p-4">
      <div className="flex items-center gap-3 mb-8">
        <ReceiptEuroIcon className="h-8 w-8 text-primary" />
        <div className="flex flex-col">
          <span className="font-headline text-lg font-bold">LIGAE</span>
          <span className="text-xs text-muted-foreground">ASEPEYO</span>
        </div>
      </div>
      <nav>
        <ul className="space-y-2">
          {navLinks.filter(link => link.visible).map(link => (
            <SidebarLink key={link.href} {...link} />
          ))}
        </ul>
      </nav>
    </aside>
  );
}

    