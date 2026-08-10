import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Play, FlaskConical } from "lucide-react";
import { LancioConfig } from "@/lib/lanci/config";

const SUPA_URL = "https://btcwmuyemmkiteqlopce.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE";

interface Check { area: string; voce: string; stato: "ok" | "avviso" | "errore"; dettaglio: string }
interface Esito {
  lancio: { id: string; nome: string };
  pronto: boolean; errori: number; avvisi: number;
  checks: Check[];
  simulazione: {
    fonte: string;
    venditore_precedente: { venditore: string; data: string } | null;
    passi: { regola: string; esito: string; motivo: string }[];
    esito: string;
  } | null;
}

const ICONA = {
  ok: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
  avviso: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
  errore: <XCircle className="h-4 w-4 text-destructive shrink-0" />,
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lancio: LancioConfig;
  market: string;
}

/**
 * Prova a vuoto della configurazione: controlla l'impianto e simula l'ingresso di un lead
 * senza scrivere niente in database. La decisione su chi prenderebbe il lead arriva dalle
 * stesse funzioni usate dal webhook che assegna davvero.
 */
const LancioTestDialog = ({ open, onOpenChange, lancio, market }: Props) => {
  const [loading, setLoading] = useState(false);
  const [esito, setEsito] = useState<Esito | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [fonte, setFonte] = useState(lancio.campagna || lancio.id);
  const [email, setEmail] = useState("");

  const esegui = async () => {
    setLoading(true); setErr(null);
    try {
      const qs = new URLSearchParams({ lancio: lancio.id, market, fonte, email });
      const r = await fetch(`${SUPA_URL}/functions/v1/lancio-test?${qs}`, {
        headers: { Authorization: `Bearer ${ANON}` },
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setEsito(j as Esito);
    } catch (e: any) {
      setErr(e.message || "Errore durante la prova");
    } finally { setLoading(false); }
  };

  const aree = esito ? [...new Set(esito.checks.map((c) => c.area))] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[86vh] overflow-y-auto top-[6vh] translate-y-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <FlaskConical className="h-4 w-4 text-primary" /> Prova la configurazione — {lancio.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-[11.5px] text-muted-foreground">
            Controlla venditori, fogli, regola di assegnazione e link WhatsApp, poi simula un lead in ingresso.
            Non crea nulla in database e non tocca i contatori.
          </p>

          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[170px]">
              <Label className="text-[11.5px]">Fonte del lead di prova</Label>
              <Input className="h-8 text-[12.5px]" value={fonte} onChange={(e) => setFonte(e.target.value)}
                placeholder="es. workshop_set26_ig" />
            </div>
            <div className="flex-1 min-w-[170px]">
              <Label className="text-[11.5px]">Email <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
              <Input className="h-8 text-[12.5px]" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="di un lead già esistente" />
            </div>
            <Button size="sm" className="h-8" onClick={esegui} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
              {loading ? "Controllo…" : "Esegui"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">
            Con un'email già in database la prova ti dice se quel lead tornerebbe al suo venditore di prima.
          </p>

          {err && <div className="text-[12.5px] text-destructive">{err}</div>}
          {loading && !esito && (
            <p className="text-[12px] text-muted-foreground">Lettura dei fogli in corso, servono una decina di secondi…</p>
          )}

          {esito && (
            <>
              <div className={`rounded-lg border p-3 ${esito.pronto
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-destructive/40 bg-destructive/10"}`}>
                <div className="font-semibold text-[13px]">
                  {esito.pronto ? "Configurazione utilizzabile" : `${esito.errori} problemi da sistemare`}
                </div>
                <div className="text-[11.5px] text-muted-foreground">
                  {esito.errori} errori · {esito.avvisi} avvisi
                  {esito.pronto && esito.avvisi > 0 && " — gli avvisi non bloccano, ma vale la pena leggerli"}
                </div>
              </div>

              {aree.map((area) => (
                <div key={area}>
                  <div className="label-eyebrow mb-1">{area}</div>
                  <div className="space-y-1">
                    {esito.checks.filter((c) => c.area === area).map((c, i) => (
                      <div key={i} className="flex gap-2 items-start text-[12px]">
                        {ICONA[c.stato]}
                        <span className="font-medium w-[128px] shrink-0">{c.voce}</span>
                        <span className="text-muted-foreground flex-1 min-w-0 break-words">{c.dettaglio}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {esito.simulazione && (
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="label-eyebrow mb-1.5">
                    Lead di prova con fonte "{esito.simulazione.fonte}"
                  </div>
                  {esito.simulazione.venditore_precedente && (
                    <p className="text-[11.5px] text-muted-foreground mb-1.5">
                      Questa email risulta già assegnata a <b className="text-foreground/80">
                      {esito.simulazione.venditore_precedente.venditore}</b> il{" "}
                      {new Date(esito.simulazione.venditore_precedente.data).toLocaleDateString("it-IT")}.
                    </p>
                  )}
                  <div className="space-y-1 mb-2">
                    {esito.simulazione.passi.map((p, i) => (
                      <div key={i} className="flex gap-2 text-[12px] items-start">
                        <span className={`w-[74px] shrink-0 ${
                          p.esito === "assegnato" ? "text-emerald-500"
                            : p.esito === "in coda" ? "text-amber-500" : "text-muted-foreground"}`}>
                          {p.esito}
                        </span>
                        <span className="font-medium shrink-0">{p.regola}</span>
                        <span className="text-muted-foreground flex-1 min-w-0 break-words">{p.motivo}</span>
                      </div>
                    ))}
                    {esito.simulazione.passi.length === 0 && (
                      <p className="text-[12px] text-muted-foreground">Nessuna automazione attiva su questo market.</p>
                    )}
                  </div>
                  <div className="text-[12.5px]">
                    <span className="text-muted-foreground">Finirebbe a: </span>
                    <b>{esito.simulazione.esito}</b>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LancioTestDialog;
