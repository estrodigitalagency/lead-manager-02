
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AssignmentRecord {
  id: string;
  assigned_at: string;
  leads_count: number;
  venditore: string;
  campagna: string | null;
  fonti_escluse: string[] | null;
}

const AssignmentHistory = () => {
  const [history, setHistory] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('assignment_history')
          .select('*')
          .order('assigned_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error("Failed to fetch assignment history:", error);
        } else {
          setHistory(data || []);
        }
      } catch (error) {
        console.error("Failed to fetch assignment history:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAssignment = (record: AssignmentRecord) => {
    let description = `${formatDate(record.assigned_at)} - ${record.leads_count} Lead Assegnati a ${record.venditore}`;
    
    if (record.campagna) {
      description += ` - Campagna ${record.campagna}`;
    }
    
    if (record.fonti_escluse && record.fonti_escluse.length > 0) {
      description += ` - Fonti Escluse: ${record.fonti_escluse.join(', ')}`;
    }
    
    return description;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Caricamento cronologia...</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Nessuna assegnazione trovata.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data e Ora</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Venditore</TableHead>
            <TableHead>Campagna</TableHead>
            <TableHead>Fonti Escluse</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="text-sm">
                {formatDate(record.assigned_at)}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {record.leads_count} Lead
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {record.venditore}
              </TableCell>
              <TableCell>
                {record.campagna ? (
                  <Badge variant="secondary">{record.campagna}</Badge>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                {record.fonti_escluse && record.fonti_escluse.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {record.fonti_escluse.map((fonte, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        {fonte}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  '-'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

export default AssignmentHistory;
