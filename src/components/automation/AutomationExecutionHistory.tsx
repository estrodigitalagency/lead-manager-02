import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar, Filter, AlertCircle, CheckCircle, XCircle, User, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMarket } from "@/contexts/MarketContext";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface AutomationExecution {
  id: string;
  automation_id: string;
  automation_name: string;
  lead_id: string;
  lead_email: string | null;
  lead_name: string | null;
  trigger_field: string;
  trigger_value: string;
  action_taken: string;
  seller_assigned: string | null;
  seller_id: string | null;
  webhook_sent: boolean;
  webhook_success: boolean;
  result: string;
  error_message: string | null;
  execution_source: string;
  executed_at: string;
  market: string;
}

export function AutomationExecutionHistory() {
  const { selectedMarket } = useMarket();
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    result: '',
    automation_name: '',
    seller: '',
    execution_source: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchExecutions();
  }, [selectedMarket, filters, currentPage]);

  const fetchExecutions = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('automation_executions')
        .select('*')
        .eq('market', selectedMarket)
        .order('executed_at', { ascending: false });

      // Apply filters
      if (filters.result) {
        query = query.eq('result', filters.result);
      }
      if (filters.automation_name) {
        query = query.ilike('automation_name', `%${filters.automation_name}%`);
      }
      if (filters.seller) {
        query = query.ilike('seller_assigned', `%${filters.seller}%`);
      }
      if (filters.execution_source) {
        query = query.eq('execution_source', filters.execution_source);
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching automation executions:', error);
        return;
      }

      setExecutions(data || []);
    } catch (error) {
      console.error('Error in fetchExecutions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'success':
        return <Badge variant="default" className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Successo</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Errore</Badge>;
      case 'no_seller_found':
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Nessun Venditore</Badge>;
      default:
        return <Badge variant="outline">{result}</Badge>;
    }
  };

  const getExecutionSourceBadge = (source: string) => {
    switch (source) {
      case 'webhook':
        return <Badge variant="outline">Webhook</Badge>;
      case 'manual_processing':
        return <Badge variant="outline">Processamento Manuale</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  const clearFilters = () => {
    setFilters({
      result: '',
      automation_name: '',
      seller: '',
      execution_source: ''
    });
    setCurrentPage(1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Storico Esecuzioni Automazioni</CardTitle>
              <CardDescription>
                Visualizza tutte le esecuzioni delle automazioni per il mercato {selectedMarket}
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <Filter className="h-4 w-4 mr-2" />
            Azzera Filtri
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtri */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Select value={filters.result} onValueChange={(value) => setFilters({...filters, result: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Risultato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="success">Successo</SelectItem>
              <SelectItem value="error">Errore</SelectItem>
              <SelectItem value="no_seller_found">Nessun Venditore</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Nome automazione..."
            value={filters.automation_name}
            onChange={(e) => setFilters({...filters, automation_name: e.target.value})}
          />

          <Input
            placeholder="Venditore..."
            value={filters.seller}
            onChange={(e) => setFilters({...filters, seller: e.target.value})}
          />

          <Select value={filters.execution_source} onValueChange={(value) => setFilters({...filters, execution_source: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Sorgente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="webhook">Webhook</SelectItem>
              <SelectItem value="manual_processing">Processamento Manuale</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabella */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Automazione</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Campo/Valore</TableHead>
                <TableHead>Azione</TableHead>
                <TableHead>Venditore</TableHead>
                <TableHead>Risultato</TableHead>
                <TableHead>Sorgente</TableHead>
                <TableHead>Webhook</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Caricamento...
                  </TableCell>
                </TableRow>
              ) : executions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nessuna esecuzione trovata
                  </TableCell>
                </TableRow>
              ) : (
                executions.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell className="text-sm">
                      {format(new Date(execution.executed_at), 'dd MMM yyyy HH:mm', { locale: it })}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {execution.automation_name}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <div className="font-medium">{execution.lead_name}</div>
                        <div className="text-muted-foreground text-xs">{execution.lead_email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <div className="font-medium">{execution.trigger_field}</div>
                        <div className="text-muted-foreground text-xs">{execution.trigger_value}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {execution.action_taken === 'assign_to_seller' ? 'Assegna a Venditore' : 'Assegna a Venditore Precedente'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {execution.seller_assigned ? (
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {execution.seller_assigned}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getResultBadge(execution.result)}
                    </TableCell>
                    <TableCell>
                      {getExecutionSourceBadge(execution.execution_source)}
                    </TableCell>
                    <TableCell className="text-center">
                      {execution.webhook_sent ? (
                        execution.webhook_success ? (
                          <CheckCircle className="h-4 w-4 text-success mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive mx-auto" />
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginazione */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Pagina {currentPage} - {executions.length} risultati
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={executions.length < itemsPerPage}
            >
              Successiva
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}