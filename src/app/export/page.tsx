
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, Inbox, FileDown, CalendarIcon, FilterX, Check, ChevronsUpDown } from 'lucide-react';
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
            <div className="flex flex-col h-screen bg-background">
                <Header />
                <div className="flex flex-1 overflow-hidden">
                    <AppSidebar />
                    <main className="flex-1 flex items-center justify-center overflow-y-auto">
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
    const [selectedSector, setSelectedSector] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);

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
            // Ensure 'all' is always an option and appears first.
            const uniqueUsers = Array.from(new Set(fetchedUsers));
            setAllUsers(['all', ...uniqueUsers]);
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
                sector: selectedSector === 'all' ? undefined : selectedSector,
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
    }, [token, selectedUser, selectedSector, dateRange]);
    
    useEffect(() => {
        // Automatically apply filters when they change
        handleFilterChange();
    }, [handleFilterChange]);
    
    const handleClearFilters = () => {
        setSelectedUser('all');
        setSelectedSector('all');
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

    const formatUploadDate = (dateInput: string | number): string => {
        try {
            const date = new Date(dateInput);
            if (isNaN(date.getTime())) {
                return 'Fecha inválida';
            }
            return format(date, 'dd/MM/yyyy HH:mm');
        } catch {
            return 'Fecha inválida';
        }
    };
    
    const hasActiveFilters = selectedUser !== 'all' || selectedSector !== 'all' || dateRange !== undefined;

    return (
        <AuthGuard>
            <ExporterAuthGuard>
                <div className="flex flex-col h-screen w-full">
                    <Header />
                    <div className="flex flex-1 overflow-hidden">
                        <AppSidebar />
                        <main className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 overflow-y-auto bg-background">
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
                                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 items-center gap-4">
                                    <div className="w-full">
                                        <label htmlFor="user-filter" className="text-sm font-medium text-muted-foreground">Usuario</label>
                                         <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={isUserPopoverOpen}
                                                    className="w-full justify-between"
                                                >
                                                    {selectedUser === 'all'
                                                        ? 'Todos los usuarios'
                                                        : selectedUser}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full min-w-[300px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Buscar usuario..." />
                                                    <CommandList>
                                                        <CommandEmpty>No se encontró el usuario.</CommandEmpty>
                                                        <CommandGroup>
                                                            {allUsers.map((email) => (
                                                                <CommandItem
                                                                    key={email}
                                                                    value={email}
                                                                    onSelect={(currentValue) => {
                                                                        setSelectedUser(currentValue === selectedUser ? "" : currentValue)
                                                                        setIsUserPopoverOpen(false)
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            selectedUser === email ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {email === 'all' ? 'Todos los usuarios' : email}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="w-full">
                                        <label htmlFor="sector-filter" className="text-sm font-medium text-muted-foreground">Sector</label>
                                        <Select value={selectedSector} onValueChange={setSelectedSector}>
                                            <SelectTrigger id="sector-filter">
                                                <SelectValue placeholder="Seleccionar sector" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Todos los sectores</SelectItem>
                                                <SelectItem value="comida">Comida</SelectItem>
                                                <SelectItem value="transporte">Transporte</SelectItem>
                                                <SelectItem value="otros">Otros</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-full">
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
                                        <div className="w-full md:self-end">
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
                                                <TableHead className="whitespace-nowrap">Fecha Recibo</TableHead>
                                                <TableHead className="whitespace-nowrap">Fecha Subida</TableHead>
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
                                                    <TableCell className="whitespace-nowrap">{formatUploadDate(receipt.fechaSubida)}</TableCell>
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
