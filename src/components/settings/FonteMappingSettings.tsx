
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, ArrowRight, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface FonteMapping {
  id: string;
  fonte_lead: string;
  fonte_calendario: string;
}

export default function FonteMappingSettings() {
  const [mappings, setMappings] = useState<FonteMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newFonteLead, setNewFonteLead] = useState("");
  const [newFonteCalendario, setNewFonteCalendario] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchMappings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('fonte_mapping')
        .select('*')
        .order('fonte_lead');

      if (error) throw error;
      setMappings((data as FonteMapping[]) || []);
    } catch (error) {
      console.error("Error fetching mappings:", error);
      toast.error("Errore nel caricamento dei mapping");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const addMapping = async () => {
    if (!newFonteLead.trim() || !newFonteCalendario.trim()) {
      toast.error("Compila entrambi i campi");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('fonte_mapping')
        .insert({
          fonte_lead: newFonteLead.trim(),
          fonte_calendario: newFonteCalendario.trim(),
        });

      if (error) {
        if (error.code === '23505') {
          toast.error("Mapping già esistente per questa fonte");
        } else {
          throw error;
        }
        return;
      }

      toast.success("Mapping aggiunto");
      setNewFonteLead("");
      setNewFonteCalendario("");
      fetchMappings();
    } catch (error) {
      console.error("Error adding mapping:", error);
      toast.error("Errore nell'aggiunta del mapping");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMapping = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fonte_mapping')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Mapping rimosso");
      fetchMappings();
    } catch (error) {
      console.error("Error deleting mapping:", error);
      toast.error("Errore nella rimozione del mapping");
    }
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Mapping Fonte Lead ↔ Fonte Calendario</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-80">
                  Quando la fonte del lead e la fonte del calendario hanno nomi diversi 
                  (es. "funnel_video" vs "triage_funnel_video"), aggiungi un mapping 
                  per permettere al sistema di associarli correttamente nei report.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <CardDescription>
            Associa le fonti dei lead alle corrispondenti fonti dei calendari quando i nomi differiscono
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Add new mapping */}
            <div className="flex flex-col sm:flex-row items-end gap-3 p-4 rounded-lg border bg-muted/30">
              <div className="flex-1 w-full">
                <Label htmlFor="fonteLead" className="text-sm">Fonte Lead</Label>
                <Input
                  id="fonteLead"
                  placeholder="es. funnel_video"
                  value={newFonteLead}
                  onChange={(e) => setNewFonteLead(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground hidden sm:block shrink-0 mb-2" />
              <div className="flex-1 w-full">
                <Label htmlFor="fonteCalendario" className="text-sm">Fonte Calendario</Label>
                <Input
                  id="fonteCalendario"
                  placeholder="es. triage_funnel_video"
                  value={newFonteCalendario}
                  onChange={(e) => setNewFonteCalendario(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <Button onClick={addMapping} disabled={isSaving} size="sm" className="shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
            </div>

            {/* Mappings table */}
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Caricamento...</p>
            ) : mappings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nessun mapping configurato. Le fonti con nomi identici non necessitano di mapping.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonte Lead</TableHead>
                    <TableHead className="w-10 text-center">→</TableHead>
                    <TableHead>Fonte Calendario</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-medium">{mapping.fonte_lead}</TableCell>
                      <TableCell className="text-center text-muted-foreground">→</TableCell>
                      <TableCell>{mapping.fonte_calendario}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMapping(mapping.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
