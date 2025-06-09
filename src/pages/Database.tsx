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
import DatabaseAddRecordDialog from "@/components/settings/DatabaseAddRecordDialog";
import DatabaseAddLavoratiDialog from "@/components/settings/DatabaseAddLavoratiDialog";
import DatabaseImportDialog from "@/components/settings/DatabaseImportDialog";
import { filterLeads, getRecentData } from "@/services/databaseService";
import DatabaseTableContainer from "@/components/database/DatabaseTableContainer";
import LeadsTable from "@/components/database/LeadsTable";
import BookingsTable from "@/components/database/BookingsTable";
import LeadLavoratiTable from "@/components/database/LeadLavoratiTable";
import PersistentNavigation from "@/components/PersistentNavigation";

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
  const [isCheckingLeads, setIsCheckingLeads] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  
  // Bulk selection states
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [selectedLavorati, setSelectedLavorati] = useState<string[]>([]);

  const fetchLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const data = Object.keys(activeFilters).length > 0 
        ? await filterLeads('lead_generation', activeFilters)
        : await getRecentData('lead_generation', 1000);
      setLeads(data as Lead[] || []);
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
        ? await filterLeads('booked_call', activeFilters)
        : await getRecentData('booked_call', 1000);
      setBookings(data as unknown as CalendlyBooking[] || []);
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
        ? await filterLeads('lead_lavorati', activeFilters)
        : await getRecentData('lead_lavorati', 1000);
      setLeadLavorati(data as LeadLavorato[] || []);
    } catch (error) {
      console.error("Errore nel caricamento dei lead lavorati:", error);
    } finally {
      setIsLoadingLeadLavorati(false);
    }
  };

  useEffect(() => {
    Promise.all([
      fetchLeads(),
      fetchBookings(),
      fetchLeadLavorati()
    ]);
  }, [activeFilters]);

  const handleRefresh = () => {
    Promise.all([
      fetchLeads(),
      fetchBookings(),
      fetchLeadLavorati()
    ]);
    // Clear selections on refresh
    setSelectedLeads([]);
    setSelectedBookings([]);
    setSelectedLavorati([]);
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
    } catch (error) {
      console.error("Errore durante l'eliminazione:", error);
      toast.error("Errore durante l'eliminazione del record");
    } finally {
      setIsDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const handleManualLeadCheck = async () => {
    setIsCheckingLeads(true);
    try {
      const response = await fetch('https://btcwmuyemmkiteqlopce.functions.supabase.co/lead-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.getSession()}`
        }
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success(`Controllo completato: aggiornati ${result.updated} lead su ${result.checked} controllati`);
        fetchLeads();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error("Errore durante il controllo dei lead:", error);
      toast.error("Errore durante il controllo dei lead");
    } finally {
      setIsCheckingLeads(false);
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

  return (
    <div className="min-h-screen bg-background">
      <PersistentNavigation />
      
      <div className={`container mx-auto px-4 py-8 pt-24 ${isMobile ? 'px-2 py-4 pt-24' : ''}`}>
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
              disabled={isCheckingLeads}
              className={`flex items-center gap-2 border ${isMobile ? 'w-full justify-center' : ''}`}
            >
              {isCheckingLeads ? (
                <RefreshCcw className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarCheck className="h-4 w-4" />
              )}
              Verifica assegnabilità
            </Button>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              className={`flex items-center gap-2 border ${isMobile ? 'w-full justify-center' : ''}`}
            >
              <RefreshCcw className="h-4 w-4" />
              Aggiorna dati
            </Button>
          </div>
        </div>
        
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
    </div>
  );
};

export default DatabasePage;
