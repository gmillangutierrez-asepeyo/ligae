
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, GalleryHorizontal, Settings, ClipboardCheck, FileDown, PanelLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import ReceiptEuroIcon from '@/components/icons/receipt-euro-icon';
import { Button } from './ui/button';
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from './ui/sidebar';

export default function AppSidebar() {
  const pathname = usePathname();
  const { isManager, isExporter } = useAuth();
  
  const navLinks = [
    { href: '/', label: 'Capturar', icon: Camera, visible: true },
    { href: '/gallery', label: 'Mis Recibos', icon: GalleryHorizontal, visible: true },
    { href: '/approvals', label: 'Aprobaciones', icon: ClipboardCheck, visible: isManager },
    { href: '/export', label: 'Exportación', icon: FileDown, visible: isExporter },
    { href: '/settings', label: 'Ajustes', icon: Settings, visible: true },
  ];

  return (
    <Sidebar>
        <SidebarHeader>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                {navLinks.filter(link => link.visible).map(link => (
                    <SidebarMenuItem key={link.href}>
                        <Link href={link.href} passHref>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === link.href}
                                tooltip={link.label}
                            >
                                <div>
                                    <link.icon/>
                                    <span>{link.label}</span>
                                </div>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarContent>
    </Sidebar>
  );
}
