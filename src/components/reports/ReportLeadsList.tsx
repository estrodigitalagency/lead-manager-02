
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, List, Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";
import { ReportFilters, ReportLeadDetail, getFilteredLeads } from "@/services/reportsService";

interface ReportLeadsListProps {
  filters: ReportFilters;
  refreshTrigger: number;
}

const PAGE_SIZE = 50;

export default function ReportLeadsList({ filters, refreshTrigger }: ReportLeadsListProps) {
  const { selectedMarket } = useMarket();
  const [leads, setLeads] = useState<ReportLeadDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const filtersWithMarket = { ...filters, market: selectedMarket };
      const data = await getFilteredLeads(filtersWithMarket);
      setLeads(data);
      setCurrentPage(0);
      setLoading(false);
    };
    load();
  }, [selectedMarket, refreshTrigger]);

  const filtered = search.trim()
    ? leads.filter(l => {
        const s = search.toLowerCase();
        return (
          l.nome?.toLowerCase().includes(s) ||
          l.cognome?.toLowerCase().includes(s) ||
          l.email?.toLowerCase().includes(s) ||
          l.telefono?.toLowerCase().includes(s) ||
          l.ultima_fonte?.toLowerCase().includes(s) ||
          l.venditore?.toLowerCase().includes(s)
        );
      })
    : leads;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const isCallBooked = (val: string | null) => {
    if (!val) return false;
    return ["si", "sì"].includes(val.toLowerCase());
  };

  const exportCSV = () => {
    const showFonteCal = filters.callAttributionMode === 'fonte_calendario';
    const header = showFonteCal
      ? "Nome,Cognome,Email,Telefono,Fonte,Fonte Calendario,Call Prenotata,Venditore,Stato,Data Creazione,Data Assegnazione\n"
      : "Nome,Cognome,Email,Telefono,Fonte,Call Prenotata,Venditore,Stato,Data Creazione,Data Assegnazione\n";
    const rows = filtered.map(l => {
      const base = [l.nome, l.cognome || "", l.email || "", l.telefono || "", l.ultima_fonte || ""];
      if (showFonteCal) base.push(l.fonte_calendario || "");
      base.push(l.booked_call || "NO", l.venditore || "", l.stato_del_lead || "", formatDate(l.created_at), formatDate(l.data_assegnazione));
      return base.map(v => `"${v}"`).join(",");
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Dettaglio Lead
            {filtered.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filtered.length.toLocaleString()} risultati)
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nessun lead trovato per i filtri selezionati.</p>
        ) : (
          <>
            <div className="rounded-md border overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Fonte</TableHead>
                    {filters.callAttributionMode === 'fonte_calendario' && (
                      <TableHead>Fonte Calendario</TableHead>
                    )}
                    <TableHead>Call</TableHead>
                    <TableHead>Venditore</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data Creazione</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {lead.nome} {lead.cognome || ""}
                      </TableCell>
                      <TableCell className="text-sm">{lead.email || "-"}</TableCell>
                      <TableCell className="text-sm">{lead.telefono || "-"}</TableCell>
                      <TableCell>
                        {lead.ultima_fonte ? (
                          <Badge variant="outline" className="text-xs">{lead.ultima_fonte}</Badge>
                        ) : "-"}
                      </TableCell>
                      {filters.callAttributionMode === 'fonte_calendario' && (
                        <TableCell>
                          {lead.fonte_calendario ? (
                            <Badge variant="outline" className="text-xs bg-yellow-500/10 border-yellow-500/30 text-yellow-400">{lead.fonte_calendario}</Badge>
                          ) : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        {isCallBooked(lead.booked_call) ? (
                          <Badge className="bg-green-500/15 text-green-400 text-xs">SI</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">NO</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{lead.venditore || "-"}</TableCell>
                      <TableCell className="text-sm">{lead.stato_del_lead || "-"}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatDate(lead.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Pagina {currentPage + 1} di {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
