
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";

interface CalendlyBooking {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  data_generazione: string;
}

const DatabasePage = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [bookings, setBookings] = useState<CalendlyBooking[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);

  const fetchLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const { data, error } = await supabase
        .from('lead_generation')
        .select('*')
        .order('data_generazione', { ascending: false });
      
      if (error) throw error;
      setLeads(data || []);
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
        .from('booked_call_calendly')
        .select('*')
        .order('data_generazione', { ascending: false });
      
      if (error) throw error;
      setBookings(data || []);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Database Records</h1>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Aggiorna dati
        </Button>
      </div>
      
      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="leads">
            Lead Generation
          </TabsTrigger>
          <TabsTrigger value="bookings">
            Booked Call Calendly
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="leads" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Database</CardTitle>
              <CardDescription>
                Tutti i lead generati tramite form o webhook
              </CardDescription>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.length > 0 ? (
                        leads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>{formatDate(lead.data_generazione)}</TableCell>
                            <TableCell>{lead.nome}</TableCell>
                            <TableCell>{lead.cognome}</TableCell>
                            <TableCell>{lead.email}</TableCell>
                            <TableCell>{lead.telefono}</TableCell>
                            <TableCell>{lead.campagna || '-'}</TableCell>
                            <TableCell>
                              {lead.assegnato ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                  Assegnato
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  Non assegnato
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{lead.venditore || '-'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
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
              <CardTitle>Booked Call Calendly</CardTitle>
              <CardDescription>
                Tutte le prenotazioni ricevute tramite Calendly
              </CardDescription>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.length > 0 ? (
                        bookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>{formatDate(booking.data_generazione)}</TableCell>
                            <TableCell>{booking.nome}</TableCell>
                            <TableCell>{booking.cognome}</TableCell>
                            <TableCell>{booking.email}</TableCell>
                            <TableCell>{booking.telefono}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
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
    </div>
  );
};

export default DatabasePage;
