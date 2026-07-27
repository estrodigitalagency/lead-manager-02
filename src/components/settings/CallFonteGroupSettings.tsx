import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, ArrowRight, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FonteGroupRule, fetchFonteGroups, saveFonteGroups } from "@/lib/reports/fonteGroups";

const MATCH_LABEL: Record<FonteGroupRule["match"], string> = {
  prefix: "inizia con",
  exact: "uguale a",
  contains: "contiene",
};

export default function CallFonteGroupSettings() {
  const [rules, setRules] = useState<FonteGroupRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pattern, setPattern] = useState("");
  const [gruppo, setGruppo] = useState("");
  const [match, setMatch] = useState<FonteGroupRule["match"]>("prefix");

  useEffect(() => {
    fetchFonteGroups().then((r) => { setRules(r); setIsLoading(false); });
  }, []);

  const persist = async (next: FonteGroupRule[]) => {
    setIsSaving(true);
    const ok = await saveFonteGroups(next);
    setIsSaving(false);
    if (ok) { setRules(next); return true; }
    toast.error("Errore nel salvataggio");
    return false;
  };

  const addRule = async () => {
    if (!pattern.trim() || !gruppo.trim()) { toast.error("Compila pattern e gruppo"); return; }
    const next = [...rules, { pattern: pattern.trim(), gruppo: gruppo.trim(), match }];
    if (await persist(next)) {
      toast.success("Regola aggiunta");
      setPattern(""); setGruppo(""); setMatch("prefix");
    }
  };

  const removeRule = async (i: number) => {
    const next = rules.filter((_, idx) => idx !== i);
    if (await persist(next)) toast.success("Regola rimossa");
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Raggruppa provenienze call</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
              <TooltipContent>
                <p className="w-80">
                  Collassa più provenienze grezze in un'unica colonna cumulata nel report call.
                  Es. tutte le "setter_new nicola / davide / giovanni…" sotto un'unica colonna "setter_new".
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <CardDescription>
            Le regole si applicano ai chip provenienza e al pivot del report call. Match case-insensitive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Aggiungi regola */}
            <div className="flex flex-col sm:flex-row items-end gap-3 p-4 rounded-lg border bg-muted/30">
              <div className="w-full sm:w-[150px]">
                <Label className="text-sm">Criterio</Label>
                <Select value={match} onValueChange={(v) => setMatch(v as FonteGroupRule["match"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prefix">inizia con</SelectItem>
                    <SelectItem value="contains">contiene</SelectItem>
                    <SelectItem value="exact">uguale a</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 w-full">
                <Label className="text-sm">Pattern (provenienza grezza)</Label>
                <Input placeholder="es. setter_new" value={pattern} onChange={(e) => setPattern(e.target.value)} disabled={isSaving} onKeyDown={(e) => e.key === "Enter" && addRule()} />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground hidden sm:block shrink-0 mb-2" />
              <div className="flex-1 w-full">
                <Label className="text-sm">Gruppo (colonna finale)</Label>
                <Input placeholder="es. setter_new" value={gruppo} onChange={(e) => setGruppo(e.target.value)} disabled={isSaving} onKeyDown={(e) => e.key === "Enter" && addRule()} />
              </div>
              <Button onClick={addRule} disabled={isSaving} size="sm" className="shrink-0">
                <Plus className="h-4 w-4 mr-1" /> Aggiungi
              </Button>
            </div>

            {/* Tabella regole */}
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Caricamento…</p>
            ) : rules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nessuna regola. Le provenienze restano separate.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provenienza</TableHead>
                    <TableHead className="w-28">Criterio</TableHead>
                    <TableHead className="w-10 text-center">→</TableHead>
                    <TableHead>Gruppo</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.pattern}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{MATCH_LABEL[r.match]}</TableCell>
                      <TableCell className="text-center text-muted-foreground">→</TableCell>
                      <TableCell>{r.gruppo}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeRule(i)} disabled={isSaving} className="h-8 w-8 text-destructive hover:text-destructive">
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
