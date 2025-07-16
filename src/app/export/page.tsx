
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import AppSidebar from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, AlertCircle, Inbox, FileDown, CalendarIcon, FilterX } from 'lucide-react';
import { fetchAllApprovedTickets, fetchAllUsers, type CleanReceipt } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useToken } from '@/contexts/token-context';
import { useToast } from '@/hooks/use-toast';
import { generateCsv } from '@/ai/flows/generate-csv-flow';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

type Receipt = CleanReceipt;

function ExporterAuthGuard({ children }: { children: React.ReactNode }) {
    const { isExporter, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (!loading && !isExporter) {
            toast({
                variant: 'destructive',
                title: 'Acceso Denegado',
                description: 'No tienes permisos para acceder a esta página.',
            });
            router.replace('/');
        }
    }, [isExporter, loading, router, toast]);

    if (loading || !isExporter) {
        return (
            <div className="flex h-screen bg-background">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-w-0">
                    <Header />
                    <main className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </main>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}


function ExportPage() {
    const { token, isTokenLoading } = useToken();
    const { toast } = useToast();

    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [allUsers, setAllUsers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    
    // Filters
    const [selectedUser, setSelectedUser] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const loadInitialData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const [fetchedReceipts, fetchedUsers] = await Promise.all([
                fetchAllApprovedTickets(token),
                fetchAllUsers(token),
            ]);
            setReceipts(fetchedReceipts);
            setAllUsers(['all', ...fetchedUsers]);
        } catch (e: any) {
            setError(e.message || "Error al cargar los datos.");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (!isTokenLoading) {
            loadInitialData();
        }
    }, [isTokenLoading, loadInitialData]);

    const handleFilterChange = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const filters = {
                userEmail: selectedUser === 'all' ? undefined : selectedUser,
                startDate: dateRange?.from,
                endDate: dateRange?.to,
            };
            const data = await fetchAllApprovedTickets(token, filters);
            setReceipts(data);
        } catch (e: any) {
             setError(e.message || "Error al aplicar los filtros.");
        } finally {
            setLoading(false);
        }
    }, [token, selectedUser, dateRange]);
    
    useEffect(() => {
        // Automatically apply filters when they change
        handleFilterChange();
    }, [handleFilterChange]);
    
    const handleClearFilters = () => {
        setSelectedUser('all');
        setDateRange(undefined);
        // The useEffect on handleFilterChange will re-fetch the data
    };

    const handleExport = async () => {
        if (receipts.length === 0) {
            toast({ variant: 'destructive', title: 'Nada que exportar', description: 'No hay recibos que coincidan con los filtros actuales.' });
            return;
        }
        setIsExporting(true);
        try {
            const csvData = await generateCsv(receipts);
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const date = format(new Date(), 'yyyy-MM-dd');
            const uniqueId = Date.now();
            link.setAttribute('download', `export_recibos_${date}-${uniqueId}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
             toast({ title: 'Éxito', description: 'La exportación a CSV se ha completado.' });
        } catch (e: any) {
             toast({ variant: 'destructive', title: 'Fallo al Exportar', description: e.message });
        } finally {
            setIsExporting(false);
        }
    };
    
    const hasActiveFilters = selectedUser !== 'all' || dateRange !== undefined;

    return (
        <AuthGuard>
            <ExporterAuthGuard>
                <div className="flex h-screen w-full bg-background">
                    <AppSidebar />
                    <div className="flex flex-1 flex-col min-w-0 h-screen">
                        <Header />
                        <main className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 overflow-y-auto">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                                <div>
                                    <h1 className="font-headline text-3xl font-bold">Exportar Recibos Aprobados</h1>
                                    <p className="text-muted-foreground">Filtra y exporta los datos a un fichero CSV.</p>
                                </div>
                                <Button onClick={handleExport} disabled={isExporting || loading || receipts.length === 0}>
                                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                    Exportar a CSV
                                </Button>
                            </div>

                            {/* Filter Section */}
                            <Card className="mb-8">
                                <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                                    <div className="w-full md:w-1/3">
                                        <label htmlFor="user-filter" className="text-sm font-medium text-muted-foreground">Usuario</label>
                                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                                            <SelectTrigger id="user-filter">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allUsers.map(email => (
                                                    <SelectItem key={email} value={email}>
                                                        {email === 'all' ? 'Todos los usuarios' : email}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-full md:w-1/3">
                                        <label htmlFor="date-filter" className="text-sm font-medium text-muted-foreground">Rango de Fechas</label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <Button
                                                id="date-filter"
                                                variant={"outline"}
                                                className="w-full justify-start text-left font-normal"
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dateRange?.from ? (
                                                    dateRange.to ? (
                                                        <>
                                                        {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                                                        </>
                                                    ) : (
                                                        format(dateRange.from, "dd/MM/yy")
                                                    )
                                                    ) : (
                                                    <span>Seleccionar rango</span>
                                                )}
                                            </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="range"
                                                    selected={dateRange}
                                                    onSelect={setDateRange}
                                                    locale={es}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    {hasActiveFilters && (
                                        <div className="w-full md:w-auto md:self-end">
                                            <Button variant="ghost" onClick={handleClearFilters}>
                                                <FilterX className="mr-2 h-4 w-4" />
                                                Limpiar Filtros
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {loading && (
                                <div className="flex justify-center items-center h-64">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                </div>
                            )}

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            {!loading && !error && receipts.length === 0 && (
                                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                                    <Inbox className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">No hay recibos</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No se encontraron recibos aprobados que coincidan con los filtros seleccionados.</p>
                                </div>
                            )}

                            {!loading && !error && receipts.length > 0 && (
                                <div className="w-full overflow-x-auto rounded-lg border bg-card">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="whitespace-nowrap">Usuario</TableHead>
                                                <TableHead>Importe</TableHead>
                                                <TableHead className="whitespace-nowrap">Fecha</TableHead>
                                                <TableHead>Sector</TableHead>
                                                <TableHead>Observaciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {receipts.map((receipt) => (
                                                <TableRow key={receipt.id} className={cn(
                                                    receipt.estado !== 'pendiente' && 'bg-muted/50'
                                                )}>
                                                    <TableCell className="font-medium whitespace-nowrap">{receipt.usuario}</TableCell>
                                                    <TableCell className="whitespace-nowrap">€{receipt.importe.toFixed(2)}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{receipt.fecha}</TableCell>
                                                    <TableCell className="capitalize">{receipt.sector}</TableCell>
                                                    <TableCell className="max-w-[200px] truncate">{receipt.observaciones || '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </ExporterAuthGuard>
        </AuthGuard>
    );
}

export default ExportPage;
