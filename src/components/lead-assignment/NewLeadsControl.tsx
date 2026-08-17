import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sparkles, Info, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export type NewLeadsMode = 'days' | 'date';
export type NewLeadsDirection = 'newer' | 'older';
/** Da che capo della coda si comincia a servire. */
export type OrdineIngresso = 'recenti' | 'vecchi';

interface NewLeadsControlProps {
  enabled: boolean;
  mode: NewLeadsMode;
  days: number;
  fromDate: string; // ISO YYYY-MM-DD
  direction: NewLeadsDirection;
  ordine: OrdineIngresso;
  onToggleEnabled: () => void;
  onChangeMode: (mode: NewLeadsMode) => void;
  onChangeDays: (n: number) => void;
  onChangeFromDate: (d: string) => void;
  onChangeDirection: (dir: NewLeadsDirection) => void;
  onChangeOrdine: (o: OrdineIngresso) => void;
  disabled?: boolean;
}

export const NewLeadsControl = ({
  enabled,
  mode,
  days,
  fromDate,
  direction,
  ordine,
  onToggleEnabled,
  onChangeMode,
  onChangeDays,
  onChangeFromDate,
  onChangeDirection,
  onChangeOrdine,
  disabled = false,
}: NewLeadsControlProps) => {
  /*
   * Due comandi diversi che prima si somigliavano troppo.
   *
   * Questo riquadro sceglie QUALI lead entrano nel mazzo: quelli entrati di recente oppure
   * quelli fermi da tempo. Il selettore in fondo sceglie CHI viene servito per primo dentro
   * quel mazzo. "Nuovi (>=)" e "Vecchi (<=)" suonavano come un ordinamento e si sovrapponevano
   * al secondo comando, quindi qui si dice a parole cosa fa il taglio.
   */
  const daysPrefix = direction === 'newer' ? 'entrati negli ultimi' : 'entrati da più di';
  const dateLabel = direction === 'newer' ? 'Entrati dal' : 'Entrati fino al';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm sm:text-base font-semibold">Quali lead considerare</h3>
      </div>

      <div className="p-3 sm:p-4 rounded-xl bg-muted/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Switch
              id="new-leads-enabled"
              checked={enabled}
              onCheckedChange={onToggleEnabled}
              disabled={disabled}
            />
            <Label htmlFor="new-leads-enabled" className="text-sm font-medium cursor-pointer">
              Filtra per data di ingresso
            </Label>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <Info className="h-3 w-3 text-primary" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">
                  Restringe il mazzo in base a quando il lead è entrato: solo quelli recenti,
                  oppure solo quelli fermi da tempo. Non decide l'ordine — per quello c'è
                  "Chi assegnare per primo", qui sotto.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {enabled && (
          <>
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={direction === 'newer' ? 'default' : 'outline'}
                className="flex-1 h-8 text-xs flex items-center gap-1"
                onClick={() => onChangeDirection('newer')}
              >
                <ArrowDownToLine className="h-3 w-3" />
                Entrati di recente
              </Button>
              <Button
                type="button"
                size="sm"
                variant={direction === 'older' ? 'default' : 'outline'}
                className="flex-1 h-8 text-xs flex items-center gap-1"
                onClick={() => onChangeDirection('older')}
              >
                <ArrowUpFromLine className="h-3 w-3" />
                Entrati da tempo
              </Button>
            </div>

            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={mode === 'days' ? 'default' : 'outline'}
                className="flex-1 h-8 text-xs"
                onClick={() => onChangeMode('days')}
              >
                Per numero di giorni
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'date' ? 'default' : 'outline'}
                className="flex-1 h-8 text-xs"
                onClick={() => onChangeMode('date')}
              >
                Per data
              </Button>
            </div>

            {mode === 'days' ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">{daysPrefix}</span>
                  <Input
                    id="new-leads-days"
                    type="number"
                    min={1}
                    max={365}
                    value={days}
                    onChange={(e) => onChangeDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8 text-sm w-24"
                  />
                  <span className="text-sm text-muted-foreground">giorni</span>
                </div>
                <div className="flex gap-1">
                  {[1, 7, 14, 30].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={days === d ? 'secondary' : 'ghost'}
                      className="h-6 px-2 text-[10px]"
                      onClick={() => onChangeDays(d)}
                    >
                      {d === 1 ? '24h' : `${d}g`}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="new-leads-from-date" className="text-xs text-muted-foreground">{dateLabel}</Label>
                <Input
                  id="new-leads-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => onChangeFromDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </>
        )}

        {/*
          Ordine di servizio, separato dal filtro perché è un'altra domanda: il filtro dice
          quali lead entrano nel mazzo, questo dice chi viene servito per primo. Prima l'ordine
          era fisso dal più vecchio e il taglio qui sopra sembrava promettere il contrario, quindi vale
          anche a filtro spento.
        */}
        <div className="pt-3 border-t border-border/60 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium">Chi assegnare per primo</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] text-xs">
                  Vale sempre, anche senza filtro per data. Chiedendo 20 lead, decide se prendere
                  i 20 entrati più di recente o i 20 che aspettano da più tempo.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-1.5">
            <Button
              type="button" size="sm" disabled={disabled}
              variant={ordine === 'recenti' ? 'default' : 'outline'}
              className="flex-1 h-8 text-xs gap-1"
              onClick={() => onChangeOrdine('recenti')}
            >
              <ArrowDownToLine className="h-3 w-3" />
              Dal più recente
            </Button>
            <Button
              type="button" size="sm" disabled={disabled}
              variant={ordine === 'vecchi' ? 'default' : 'outline'}
              className="flex-1 h-8 text-xs gap-1"
              onClick={() => onChangeOrdine('vecchi')}
            >
              <ArrowUpFromLine className="h-3 w-3" />
              Dal più vecchio
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {ordine === 'recenti'
              ? "Parte da chi è entrato per ultimo e va indietro: i più caldi per primi."
              : "Parte da chi aspetta da più tempo e va avanti: nessuno resta in fondo alla coda."}
          </p>
        </div>
      </div>
    </div>
  );
};
