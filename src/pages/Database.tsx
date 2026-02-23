import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  RefreshCcw, 
  ArrowLeft, 
  CalendarCheck 
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";
import { LeadLavorato } from "@/types/leadLavorato";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLeadSync } from "@/contexts/LeadSyncContext";
import { useServerPagination } from "@/hooks/useServerPagination";
import DatabaseAddRecordDialog from "@/components/settings/DatabaseAddRecordDialog";
import DatabaseAddLavoratiDialog from "@/components/settings/DatabaseAddLavoratiDialog";
import DatabaseImportDialog from "@/components/settings/DatabaseImportDialog";
import { getPaginatedData } from "@/services/databaseService";
import DatabaseTableContainer from "@/components/database/DatabaseTableContainer";
import LeadsTable from "@/components/database/LeadsTable";
import BookingsTable from "@/components/database/BookingsTable";
import LeadLavoratiTable from "@/components/database/LeadLavoratiTable";
import { useMarket } from "@/contexts/MarketContext";

interface CalendlyBooking {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  created_at: string;
  scheduled_at: string;
  fonte?: string;
  note?: string;
}

type ValidTableName = "lead_generation" | "booked_call" | "lead_assignments" | "lead_lavorati" | "system_settings" | "venditori";

const DatabasePage = () => {
  const { selectedMarket } = useMarket();
  const isMobile = useIsMobile();
  const { refreshAllData, isRefreshing, performVerification, isVerifying } = useLeadSync();

  // Stati per dati non paginati (per compatibilità con i componenti esistenti)
  const [bookings, setBookings] = useState<CalendlyBooking[]>([]);
  const [leadLavorati, setLeadLavorati] = useState<LeadLavorato[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isLoadingLeadLavorati, setIsLoadingLeadLavorati] = useState(true);
  
  const [recordToDelete, setRecordToDelete] = useState<{ id: string, type: 'lead' | 'booking' | 'lavorato' } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [activeTableForDialog, setActiveTableForDialog] = useState<'lead_generation' | 'booked_call' | 'lead_lavorati'>('lead_generation');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  
  // Bulk selection states
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [selectedLavorati, setSelectedLavorati] = useState<string[]>([]);

  // Add a ref to prevent multiple initialization calls
  const isInitializedRef = useRef<boolean>(false);

  // Aggiungi stato per i dati dei lead
  const [leadsData, setLeadsData] = useState<Lead[]>([]);

  // Funzioni per caricare bookings e lead lavorati (manteniamo la logica esistente ma filtriamo per market)
  const fetchBookings = async () => {
    setIsLoadingBookings(true);
    try {
      const result = await getPaginatedData<CalendlyBooking>(
        'booked_call',
        1,
        1000, // Carica molti record per ora, poi si può paginare anche questi
        { ...activeFilters },
        selectedMarket
      );
      setBookings(result.data);
    } catch (error) {
      console.error("Errore nel caricamento delle prenotazioni:", error);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const fetchLeadLavorati = async () => {
    setIsLoadingLeadLavorati(true);
    try {
      const result = await getPaginatedData<LeadLavorato>(
        'lead_lavorati',
        1,
        1000, // Carica molti record per ora, poi si può paginare anche questi
        { ...activeFilters },
        selectedMarket
      );
      setLeadLavorati(result.data);
    } catch (error) {
      console.error("Errore nel caricamento dei lead lavorati:", error);
    } finally {
      setIsLoadingLeadLavorati(false);
    }
  };

  // Carica dati all'apertura (la verifica è già gestita da LeadSyncProvider)
  useEffect(() => {
    const initializeDatabase = async () => {
      if (isInitializedRef.current) {
        console.log("🚫 Database already initialized, skipping...");
        return;
      }
      isInitializedRef.current = true;
      
      try {
        console.log("📊 Loading database data...");
        await Promise.all([
          fetchBookings(),
          fetchLeadLavorati()
        ]);
      } catch (error) {
        console.error("❌ Errore durante l'inizializzazione:", error);
      }
    };

    initializeDatabase();
  }, []);

  // Ricarica dati quando cambiano i filtri o il market
  useEffect(() => {
    // Skip initial load (handled by initializeDatabase)
    if (isInitializedRef.current) {
      Promise.all([
        fetchBookings(),
        fetchLeadLavorati()
      ]);
    }
  }, [activeFilters, selectedMarket]);

  const handleRefresh = async () => {
    console.log("🔄 Manual refresh requested...");
    setSelectedLeads([]);
    setSelectedBookings([]);
    setSelectedLavorati([]);
    
    try {
      await Promise.all([
        refreshAllData(),
        fetchBookings(),
        fetchLeadLavorati()
      ]);
    } catch (error) {
      console.error("❌ Errore durante il refresh:", error);
    }
  };

  const handleDeleteClick = (id: string, type: 'lead' | 'booking' | 'lavorato') => {
    setRecordToDelete({ id, type });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    
    try {
      const { type, id } = recordToDelete;
      let table: ValidTableName = 'lead_generation';
      
      if (type === 'lead') table = 'lead_generation';
      else if (type === 'booking') table = 'booked_call';
      else if (type === 'lavorato') table = 'lead_lavorati';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success(
        type === 'lead' 
          ? "Lead eliminato con successo" 
          : type === 'booking'
            ? "Prenotazione eliminata con successo"
            : "Lead lavorato eliminato con successo"
      );
      
      if (type === 'booking') {
        setBookings(bookings.filter(booking => booking.id !== id));
        setSelectedBookings(selectedBookings.filter(item => item !== id));
      } else if (type === 'lavorato') {
        setLeadLavorati(leadLavorati.filter(lead => lead.id !== id));
        setSelectedLavorati(selectedLavorati.filter(item => item !== id));
      }
      // Per i lead, il refresh avverrà automaticamente tramite il hook useServerPagination
      
      // Trigger global refresh dopo eliminazione
      await refreshAllData();
    } catch (error) {
      console.error("Errore durante l'eliminazione:", error);
      toast.error("Errore durante l'eliminazione del record");
    } finally {
      setIsDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const handleManualLeadCheck = async () => {
    try {
      await performVerification();
    } catch (error) {
      console.error("Errore durante il controllo dei lead:", error);
    }
  };

  const openAddDialog = (type: 'lead_generation' | 'booked_call' | 'lead_lavorati') => {
    setActiveTableForDialog(type);
    setIsAddRecordDialogOpen(true);
  };

  const openImportDialog = (type: 'lead_generation' | 'booked_call' | 'lead_lavorati') => {
    setActiveTableForDialog(type);
    setIsImportDialogOpen(true);
  };

  const handleApplyFilters = useCallback((filters: Record<string, any>) => {
    setActiveFilters(filters);
  }, []);

  const anyLoading = isVerifying || isRefreshing;

  const handleBulkAction = (action: string) => {
    // Implementa le azioni bulk qui se necessario
    console.log('Bulk action:', action);
  };

  const handleLeadsDataChange = useCallback((data: Lead[]) => {
    setLeadsData(data);
  }, []);

  return (
    <div className={`container mx-auto px-4 py-8 ${isMobile ? 'px-2 py-4 pt-16 pb-24' : ''}`}>
      <div className={`flex justify-between items-center mb-8 ${isMobile ? 'flex-col gap-4' : ''}`}>
        <div className={`flex items-center gap-4 ${isMobile ? 'flex-col text-center' : ''}`}>
          <Link to="/">
            <Button variant="outline" size="icon" className="border">
              <ArrowLeft className="h-4 w-4 text-primary" />
            </Button>
          </Link>
          <h1 className={`text-3xl font-bold text-primary ${isMobile ? 'text-2xl' : ''}`}>Database Records</h1>
        </div>
        <div className={`flex gap-2 ${isMobile ? 'flex-col w-full' : ''}`}>
          <Button 
            onClick={handleManualLeadCheck} 
            variant="outline" 
            disabled={anyLoading}
            className={`flex items-center gap-2 border ${isMobile ? 'w-full justify-center' : ''}`}
          >
            {anyLoading ? (
              <RefreshCcw className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarCheck className="h-4 w-4" />
            )}
            Verifica assegnabilità
          </Button>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            disabled={anyLoading}
            className={`flex items-center gap-2 border ${isMobile ? 'w-full justify-center' : ''}`}
          >
            <RefreshCcw className="h-4 w-4" />
            Aggiorna dati
          </Button>
        </div>
      </div>

      {/* Mostra stato verifica se in corso */}
      {anyLoading && (
        <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 mb-6">
          <div className="flex items-center gap-3">
            <RefreshCcw className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="text-foreground font-medium">
                {isVerifying ? "Verifica assegnabilità in corso..." : "Aggiornamento dati in corso..."}
              </p>
              <p className="text-muted-foreground text-sm">
                {isVerifying 
                  ? "Controllo completo del database per garantire stati corretti"
                  : "Sincronizzazione globale dei dati"
                }
              </p>
            </div>
          </div>
        </div>
      )}

      

      
      <Tabs defaultValue="leads" className="w-full">
        <TabsList className={`grid w-full grid-cols-3 mb-8 border ${isMobile ? 'text-xs' : ''}`}>
          <TabsTrigger value="leads" className="data-[state=active]:text-primary">
            Lead Generation
          </TabsTrigger>
          <TabsTrigger value="bookings" className="data-[state=active]:text-primary">
            Call Prenotate
          </TabsTrigger>
          <TabsTrigger value="lavorati" className="data-[state=active]:text-primary">
            Lead Lavorati
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="leads" className="mt-4">
          <DatabaseTableContainer
            title="Lead Database"
            description="Tutti i lead generati tramite form o webhook"
            tableName="lead_generation"
            allItems={leadsData} // Usa i dati reali invece di array vuoto
            selectedItems={selectedLeads}
            onSelectionChange={setSelectedLeads}
            onApplyFilters={handleApplyFilters}
            onAddRecord={() => openAddDialog('lead_generation')}
            onImport={() => openImportDialog('lead_generation')}
            onRefresh={handleRefresh}
            onBulkAction={handleBulkAction}
          >
            <LeadsTable 
              selectedItems={selectedLeads}
              onSelectionChange={setSelectedLeads}
              onDelete={(id) => handleDeleteClick(id, 'lead')}
              filters={activeFilters}
              onDataChange={handleLeadsDataChange} // Passa la callback
            />
          </DatabaseTableContainer>
        </TabsContent>
        
        <TabsContent value="bookings" className="mt-4">
          <DatabaseTableContainer
            title="Call Prenotate"
            description="Tutte le prenotazioni ricevute tramite Calendly"
            tableName="booked_call"
            allItems={bookings}
            selectedItems={selectedBookings}
            onSelectionChange={setSelectedBookings}
            onApplyFilters={handleApplyFilters}
            onAddRecord={() => openAddDialog('booked_call')}
            onImport={() => openImportDialog('booked_call')}
            onRefresh={handleRefresh}
            onBulkAction={handleBulkAction}
          >
            <BookingsTable 
              bookings={bookings}
              isLoading={isLoadingBookings}
              selectedItems={selectedBookings}
              onSelectionChange={setSelectedBookings}
              onDelete={(id) => handleDeleteClick(id, 'booking')}
            />
          </DatabaseTableContainer>
        </TabsContent>

        <TabsContent value="lavorati" className="mt-4">
          <DatabaseTableContainer
            title="Lead Lavorati"
            description="Tutti i lead che sono stati lavorati dai venditori"
            tableName="lead_lavorati"
            allItems={leadLavorati}
            selectedItems={selectedLavorati}
            onSelectionChange={setSelectedLavorati}
            onApplyFilters={handleApplyFilters}
            onAddRecord={() => openAddDialog('lead_lavorati')}
            onImport={() => openImportDialog('lead_lavorati')}
            onRefresh={handleRefresh}
            onBulkAction={handleBulkAction}
          >
            <LeadLavoratiTable 
              leadLavorati={leadLavorati}
              isLoading={isLoadingLeadLavorati}
              selectedItems={selectedLavorati}
              onSelectionChange={setSelectedLavorati}
              onDelete={(id) => handleDeleteClick(id, 'lavorato')}
            />
          </DatabaseTableContainer>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questo record? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Record Dialog */}
      {activeTableForDialog === 'lead_lavorati' ? (
        <DatabaseAddLavoratiDialog 
          isOpen={isAddRecordDialogOpen}
          setIsOpen={setIsAddRecordDialogOpen}
          tableName={activeTableForDialog}
        />
      ) : (
        <DatabaseAddRecordDialog 
          isOpen={isAddRecordDialogOpen}
          setIsOpen={setIsAddRecordDialogOpen}
          tableName={activeTableForDialog}
        />
      )}
      
      {/* Import CSV Dialog */}
      <DatabaseImportDialog 
        isOpen={isImportDialogOpen}
        setIsOpen={setIsImportDialogOpen}
        tableName={activeTableForDialog} 
      />
    </div>
  );
};

export default DatabasePage;
