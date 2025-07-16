
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, GalleryHorizontal, Settings, ClipboardCheck, FileDown } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarContent, SidebarHeader } from './ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useSidebar } from './ui/sidebar';

export default function AppSidebar() {
  const pathname = usePathname();
  const { isManager, isExporter } = useAuth();
  const { state: sidebarState } = useSidebar();
  
  const navLinks = [
    { href: '/', label: 'Capturar', icon: Camera, visible: true },
    { href: '/gallery', label: 'Mis Recibos', icon: GalleryHorizontal, visible: true },
    { href: '/approvals', label: 'Aprobaciones', icon: ClipboardCheck, visible: isManager },
    { href: '/export', label: 'Exportación', icon: FileDown, visible: isExporter },
    { href: '/settings', label: 'Ajustes', icon: Settings, visible: true },
  ];

  return (
    <Sidebar>
      <SidebarHeader></SidebarHeader>
      <SidebarContent>
        <TooltipProvider delayDuration={0}>
            <nav className="grid gap-2 text-lg font-medium p-2">
            {navLinks.filter(link => link.visible).map(link => (
                <Tooltip key={link.href}>
                    <TooltipTrigger asChild>
                        <Link
                            href={link.href}
                            className={cn(
                                'flex items-center gap-4 py-2 rounded-md transition-colors',
                                'text-sm font-medium',
                                sidebarState === 'collapsed' ? 'justify-center px-2.5' : 'px-4',
                                pathname === link.href 
                                ? 'bg-accent text-accent-foreground' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                        >
                            <link.icon className={cn('h-5 w-5', sidebarState === 'collapsed' && 'h-6 w-6')} />
                            <span className={cn(sidebarState === 'collapsed' && 'sr-only')}>
                                {link.label}
                            </span>
                        </Link>
                    </TooltipTrigger>
                    {sidebarState === 'collapsed' && (
                         <TooltipContent side="right">
                            {link.label}
                        </TooltipContent>
                    )}
                </Tooltip>
            ))}
            </nav>
        </TooltipProvider>
      </SidebarContent>
    </Sidebar>
  );
}
