
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  Trash2, 
  Plus, 
  UploadCloud, 
  CalendarCheck 
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";
import DatabaseAddRecordDialog from "@/components/settings/DatabaseAddRecordDialog";
import DatabaseImportDialog from "@/components/settings/DatabaseImportDialog";

interface CalendlyBooking {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  created_at: string;
  scheduled_at: string;
  note?: string;
}

const DatabasePage = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [bookings, setBookings] = useState<CalendlyBooking[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [recordToDelete, setRecordToDelete] = useState<{ id: string, type: 'lead' | 'booking' } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [activeTableForDialog, setActiveTableForDialog] = useState<'lead_generation' | 'booked_call'>('lead_generation');
  const [isCheckingLeads, setIsCheckingLeads] = useState(false);

  const fetchLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const { data, error } = await supabase
        .from('lead_generation')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('booked_call')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBookings(data as unknown as CalendlyBooking[] || []);
    } catch (error) {
      console.error("Errore nel caricamento delle prenotazioni:", error);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchBookings();
  }, []);

  const handleRefresh = () => {
    fetchLeads();
    fetchBookings();
  };

  const handleDeleteClick = (id: string, type: 'lead' | 'booking') => {
    setRecordToDelete({ id, type });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    
    try {
      const { type, id } = recordToDelete;
      const table = type === 'lead' ? 'lead_generation' : 'booked_call';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success(type === 'lead' 
        ? "Lead eliminato con successo" 
        : "Prenotazione eliminata con successo"
      );
      
      // Refresh the data
      if (type === 'lead') {
        setLeads(leads.filter(lead => lead.id !== id));
      } else {
        setBookings(bookings.filter(booking => booking.id !== id));
      }
    } catch (error) {
      console.error("Errore durante l'eliminazione:", error);
      toast.error("Errore durante l'eliminazione del record");
    } finally {
      setIsDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        // Refresh lead data to show updated status
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

  const openAddDialog = (type: 'lead_generation' | 'booked_call') => {
    setActiveTableForDialog(type);
    setIsAddRecordDialogOpen(true);
  };

  const openImportDialog = (type: 'lead_generation' | 'booked_call') => {
    setActiveTableForDialog(type);
    setIsImportDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="icon" className="border">
              <ArrowLeft className="h-4 w-4 text-primary" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-primary">Database Records</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleManualLeadCheck} 
            variant="outline" 
            disabled={isCheckingLeads}
            className="flex items-center gap-2 border"
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
            className="flex items-center gap-2 border"
          >
            <RefreshCcw className="h-4 w-4" />
            Aggiorna dati
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 border">
          <TabsTrigger value="leads" className="data-[state=active]:text-primary">
            Lead Generation
          </TabsTrigger>
          <TabsTrigger value="bookings" className="data-[state=active]:text-primary">
            Booked Call
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="leads" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lead Database</CardTitle>
                  <CardDescription>
                    Tutti i lead generati tramite form o webhook
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => openAddDialog('lead_generation')}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Aggiungi Record</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => openImportDialog('lead_generation')}
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Importa CSV</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLeads ? (
                <div className="flex justify-center items-center h-32">
                  <span>Caricamento in corso...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Cognome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefono</TableHead>
                        <TableHead>Campagna</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Venditore</TableHead>
                        <TableHead>Chiamata Prenotata</TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.length > 0 ? (
                        leads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>{formatDate(lead.created_at)}</TableCell>
                            <TableCell>{lead.nome}</TableCell>
                            <TableCell>{lead.cognome || '-'}</TableCell>
                            <TableCell>{lead.email}</TableCell>
                            <TableCell>{lead.telefono}</TableCell>
                            <TableCell>{lead.campagna || '-'}</TableCell>
                            <TableCell>
                              {lead.assignable ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                  Assegnabile
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  Non assegnabile
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{lead.venditore || '-'}</TableCell>
                            <TableCell>{lead.booked_call}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteClick(lead.id as string, 'lead')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8">
                            Nessun lead trovato
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bookings" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Booked Call</CardTitle>
                  <CardDescription>
                    Tutte le prenotazioni ricevute tramite Calendly
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => openAddDialog('booked_call')}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Aggiungi Record</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => openImportDialog('booked_call')}
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Importa CSV</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingBookings ? (
                <div className="flex justify-center items-center h-32">
                  <span>Caricamento in corso...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Cognome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefono</TableHead>
                        <TableHead>Data Chiamata</TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.length > 0 ? (
                        bookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>{formatDate(booking.created_at)}</TableCell>
                            <TableCell>{booking.nome}</TableCell>
                            <TableCell>{booking.cognome || '-'}</TableCell>
                            <TableCell>{booking.email}</TableCell>
                            <TableCell>{booking.telefono}</TableCell>
                            <TableCell>{booking.scheduled_at ? formatDate(booking.scheduled_at) : '-'}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteClick(booking.id, 'booking')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Nessuna prenotazione trovata
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
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
      <DatabaseAddRecordDialog 
        isOpen={isAddRecordDialogOpen}
        setIsOpen={setIsAddRecordDialogOpen}
        tableName={activeTableForDialog}
      />
      
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
