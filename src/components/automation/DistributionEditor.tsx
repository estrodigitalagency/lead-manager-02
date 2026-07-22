import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, AlertTriangle, Users } from "lucide-react";
import { DistributionMode, DistributionSlot } from "@/types/automation";

interface Venditore {
  id: string;
  nome: string;
  cognome: string;
  stato: string;
}

interface DistributionEditorProps {
  mode: DistributionMode;
  onModeChange: (mode: DistributionMode) => void;
  slots: DistributionSlot[];
  onSlotsChange: (slots: DistributionSlot[]) => void;
  venditori: Venditore[]; // solo attivi filtrati esternamente
  excludedSellerIds?: string[]; // opzionale: nasconde da dropdown
}

export const DistributionEditor = ({
  mode,
  onModeChange,
  slots,
  onSlotsChange,
  venditori,
  excludedSellerIds = [],
}: DistributionEditorProps) => {
  const activeVenditori = useMemo(() =>
    venditori.filter(v => v.stato === 'attivo' && !excludedSellerIds.includes(v.id))
  , [venditori, excludedSellerIds]);

  const availableForNewSlot = useMemo(() => {
    const used = new Set(slots.map(s => s.venditore_id));
    return activeVenditori.filter(v => !used.has(v.id));
  }, [activeVenditori, slots]);

  const totalWeight = mode === 'percentage'
    ? slots.reduce((s, x) => s + (x.weight ?? 0), 0)
    : 0;
  const totalCount = mode === 'count'
    ? slots.reduce((s, x) => s + (x.count_target ?? 0), 0)
    : 0;

  const weightValid = mode !== 'percentage' || totalWeight === 100;
  const countValid = mode !== 'count' || slots.every(s => (s.count_target ?? 0) > 0);

  const addSlot = () => {
    if (availableForNewSlot.length === 0) return;
    const next: DistributionSlot = {
      venditore_id: availableForNewSlot[0].id,
      weight: mode === 'percentage' ? 0 : null,
      count_target: mode === 'count' ? 100 : null,
      cap: null,
    };
    onSlotsChange([...slots, next]);
  };

  const updateSlot = (idx: number, updates: Partial<DistributionSlot>) => {
    const next = slots.map((s, i) => i === idx ? { ...s, ...updates } : s);
    onSlotsChange(next);
  };

  const removeSlot = (idx: number) => {
    onSlotsChange(slots.filter((_, i) => i !== idx));
  };

  const equalize = () => {
    if (mode !== 'percentage' || slots.length === 0) return;
    const per = Math.floor(100 / slots.length);
    const remainder = 100 - per * slots.length;
    onSlotsChange(slots.map((s, i) => ({ ...s, weight: per + (i === 0 ? remainder : 0) })));
  };

  const venditoreLabel = (id: string) => {
    const v = venditori.find(x => x.id === id);
    return v ? `${v.nome} ${v.cognome}${v.stato !== 'attivo' ? ' (inattivo)' : ''}` : '—';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <Label className="font-semibold">Distribuzione tra venditori</Label>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'percentage' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => onModeChange('percentage')}
        >
          Percentuale (%)
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'count' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => onModeChange('count')}
        >
          Quota assoluta (N lead)
        </Button>
      </div>

      <div className="space-y-2">
        {slots.map((slot, idx) => (
          <Card key={idx} className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={slot.venditore_id}
                  onValueChange={(v) => updateSlot(idx, { venditore_id: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seleziona venditore">
                      {venditoreLabel(slot.venditore_id)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activeVenditori.filter(v => v.id === slot.venditore_id || !slots.some(s => s.venditore_id === v.id)).map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.nome} {v.cognome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {mode === 'percentage' ? (
                <div className="flex items-center gap-1 w-24">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={slot.weight ?? 0}
                    onChange={e => updateSlot(idx, { weight: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })}
                    className="h-8 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 w-28">
                  <Input
                    type="number"
                    min={1}
                    value={slot.count_target ?? 0}
                    onChange={e => updateSlot(idx, { count_target: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">lead</span>
                </div>
              )}
              <Button type="button" size="icon" variant="ghost" onClick={() => removeSlot(idx)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="flex items-center gap-2 pl-1">
              <Label className="text-[11px] text-muted-foreground shrink-0">Tetto max individuale (opzionale):</Label>
              <Input
                type="number"
                min={0}
                placeholder="nessuno"
                value={slot.cap ?? ''}
                onChange={e => updateSlot(idx, { cap: e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0) })}
                className="h-7 text-xs w-28"
              />
              <span className="text-[11px] text-muted-foreground">lead massimi</span>
            </div>
          </Card>
        ))}

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addSlot}
            disabled={availableForNewSlot.length === 0}
            className="flex-1"
          >
            <Plus className="h-3 w-3 mr-1" /> Aggiungi venditore
          </Button>
          {mode === 'percentage' && slots.length > 1 && (
            <Button type="button" size="sm" variant="ghost" onClick={equalize}>
              Bilancia equamente
            </Button>
          )}
        </div>

        {/* Riepilogo + warning */}
        <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/40">
          <span className="text-muted-foreground">
            {mode === 'percentage' ? `Totale: ${totalWeight}%` : `Quote totali: ${totalCount} lead`}
          </span>
          {!weightValid && (
            <span className="text-amber-600 flex items-center gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" /> Somma deve essere 100%
            </span>
          )}
          {!countValid && (
            <span className="text-amber-600 flex items-center gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" /> {"Ogni quota deve essere > 0"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DistributionEditor;
