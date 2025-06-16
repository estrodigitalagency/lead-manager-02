import { useState, useEffect } from "react";
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
import { useAssignabilityVerification } from "@/hooks/useAssignabilityVerification";
import { useLeadSync } from "@/contexts/LeadSyncContext";
import DatabaseAddRecordDialog from "@/components/settings/DatabaseAddRecordDialog";
import DatabaseAddLavoratiDialog from "@/components/settings/DatabaseAddLavoratiDialog";
import DatabaseImportDialog from "@/components/settings/DatabaseImportDialog";
import { filterLeads, getRecentData } from "@/services/databaseService";
import DatabaseTableContainer from "@/components/database/DatabaseTableContainer";
import LeadsTable from "@/components/database/LeadsTable";
import BookingsTable from "@/components/database/BookingsTable";
import LeadLavoratiTable from "@/components/database/LeadLavoratiTable";

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
  const isMobile = useIsMobile();
  const { refreshAllData, isRefreshing } = useLeadSync();
  const {
    verification,
    performVerification,
    isVerifying
  } = useAssignabilityVerification();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [bookings, setBookings] = useState<CalendlyBooking[]>([]);
  const [leadLavorati, setLeadLavorati] = useState<LeadLavorato[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
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

  const fetchLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const data = Object.keys(activeFilters).length > 0 
        ? await filterLeads('lead_generation' as ValidTableName, activeFilters)
        : await getRecentData('lead_generation' as ValidTableName, 1000);
      setLeads((data || []) as Lead[]);
    } catch (error) {
      console.error("Errore nel caricamento dei lead:", error);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const fetchBookings = async () => {
    setIsLoadingBookings(true);
    try {
      const data = Object.keys(activeFilters).length > 0 
        ? await filterLeads('booked_call' as ValidTableName, activeFilters)
        : await getRecentData('booked_call' as ValidTableName, 1000);
      setBookings((data || []) as CalendlyBooking[]);
    } catch (error) {
      console.error("Errore nel caricamento delle prenotazioni:", error);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const fetchLeadLavorati = async () => {
    setIsLoadingLeadLavorati(true);
    try {
      const data = Object.keys(activeFilters).length > 0 
        ? await filterLeads('lead_lavorati' as ValidTableName, activeFilters)
        : await getRecentData('lead_lavorati' as ValidTableName, 1000);
      setLeadLavorati((data || []) as LeadLavorato[]);
    } catch (error) {
      console.error("Errore nel caricamento dei lead lavorati:", error);
    } finally {
      setIsLoadingLeadLavorati(false);
    }
  };

  // OTTIMIZZAZIONE: Verifica automatica più efficiente all'apertura
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log("🔍 Avvio verifica assegnabilità rapida...");
        
        // PRIMA carica i dati immediatamente per UI reattiva
        const initialDataLoad = Promise.all([
          fetchLeads(),
          fetchBookings(),
          fetchLeadLavorati()
        ]);

        // POI esegue la verifica in background
        const verificationPromise = performVerification();
        
        // Attendi il caricamento iniziale, la verifica può finire dopo
        await initialDataLoad;
        
        // Se la verifica finisce dopo, ricarica i dati
        verificationPromise.then(async () => {
          console.log("✅ Verifica completata, aggiornamento finale dati...");
          await Promise.all([
            fetchLeads(),
            fetchBookings(),
            fetchLeadLavorati()
          ]);
        }).catch(error => {
          console.error("❌ Errore durante la verifica:", error);
        });
        
      } catch (error) {
        console.error("❌ Errore durante l'inizializzazione:", error);
        // Fallback: carica i dati anche se la verifica fallisce
        Promise.all([
          fetchLeads(),
          fetchBookings(),
          fetchLeadLavorati()
        ]);
      }
    };

    initializeDatabase();
  }, []);

  // Ricarica dati quando cambiano i filtri
  useEffect(() => {
    if (verification.status !== 'initial') {
      Promise.all([
        fetchLeads(),
        fetchBookings(),
        fetchLeadLavorati()
      ]);
    }
  }, [activeFilters]);

  const handleRefresh = async () => {
    console.log("🔄 Manual refresh requested...");
    // Clear selections on refresh
    setSelectedLeads([]);
    setSelectedBookings([]);
    setSelectedLavorati([]);
    
    // OTTIMIZZAZIONE: Refresh più veloce - prima UI poi verifica
    try {
      // Aggiorna subito i dati per feedback immediato
      await Promise.all([
        fetchLeads(),
        fetchBookings(),
        fetchLeadLavorati()
      ]);
      
      // Poi esegui verifica e refresh globale in background
      await performVerification();
      await refreshAllData();
      
      // Ricarica finale dopo verifica
      await Promise.all([
        fetchLeads(),
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
      
      if (type === 'lead') {
        setLeads(leads.filter(lead => lead.id !== id));
        setSelectedLeads(selectedLeads.filter(item => item !== id));
      } else if (type === 'booking') {
        setBookings(bookings.filter(booking => booking.id !== id));
        setSelectedBookings(selectedBookings.filter(item => item !== id));
      } else if (type === 'lavorato') {
        setLeadLavorati(leadLavorati.filter(lead => lead.id !== id));
        setSelectedLavorati(selectedLavorati.filter(item => item !== id));
      }
      
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
      // Ricarica i lead dopo la verifica
      await fetchLeads();
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

  const handleApplyFilters = (filters: Record<string, any>) => {
    setActiveFilters(filters);
  };

  const anyLoading = isVerifying || isRefreshing;

  return (
    <div className={`container mx-auto px-4 py-8 ${isMobile ? 'px-2 py-4' : ''}`}>
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
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
          <div className="flex items-center gap-3">
            <RefreshCcw className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="text-blue-800 font-medium">
                {isVerifying ? "Verifica assegnabilità in corso..." : "Aggiornamento dati in corso..."}
              </p>
              <p className="text-blue-600 text-sm">
                {isVerifying 
                  ? "Controllo completo del database per garantire stati corretti"
                  : "Sincronizzazione globale dei dati"
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mostra risultato ultima verifica */}
      {verification.status === 'completed' && !anyLoading && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
          <p className="text-green-800 text-sm">
            Ultima verifica: {verification.updated} lead aggiornati su {verification.totalChecked} controllati
            {verification.lastVerified && (
              <span className="ml-2 text-green-600">
                ({new Date(verification.lastVerified).toLocaleTimeString('it-IT')})
              </span>
            )}
          </p>
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
            allItems={leads}
            selectedItems={selectedLeads}
            onSelectionChange={setSelectedLeads}
            onApplyFilters={handleApplyFilters}
            onAddRecord={() => openAddDialog('lead_generation')}
            onImport={() => openImportDialog('lead_generation')}
            onRefresh={handleRefresh}
          >
            <LeadsTable 
              leads={leads}
              isLoading={isLoadingLeads}
              selectedItems={selectedLeads}
              onSelectionChange={setSelectedLeads}
              onDelete={(id) => handleDeleteClick(id, 'lead')}
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
