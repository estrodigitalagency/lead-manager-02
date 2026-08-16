import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Loader2 } from "lucide-react";

/**
 * Sblocco delle Impostazioni con un PIN separato dalla password del tool.
 *
 * Serve a separare due mestieri: chi governa il flusso ogni giorno lavora in Lanci →
 * Distribuzione, dove trova pause, percentuali, tetti e contatori; le Impostazioni contengono
 * anche tab dei fogli, campagne, condizioni e anagrafica, dove una modifica distratta a lancio
 * partito non si vede subito e si paga dopo.
 *
 * Il PIN non sta nel codice ma in system_settings, e solo come impronta: cambiarlo non richiede
 * un rilascio e il valore non finisce nella cronologia del repository. Resta comunque una
 * barriera lato browser, come tutto l'accesso di questa applicazione: ferma le distrazioni e
 * chi non deve entrarci, non chi ha voglia di aggirarla.
 */

const CHIAVE_SESSIONE = "impostazioni_sbloccate";

const impronta = async (testo: string): Promise<string> => {
  const dati = new TextEncoder().encode(testo);
  const buf = await crypto.subtle.digest("SHA-256", dati);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const PinImpostazioni = ({ children }: { children: React.ReactNode }) => {
  // Sbloccato per la sessione: chiudendo la scheda si richiude da solo.
  const [sbloccato, setSbloccato] = useState(() => sessionStorage.getItem(CHIAVE_SESSIONE) === "1");
  const [atteso, setAtteso] = useState<string | null | undefined>(undefined);
  const [pin, setPin] = useState("");
  const [errore, setErrore] = useState(false);

  useEffect(() => {
    supabase.from("system_settings").select("value").eq("key", "settings_pin_hash").maybeSingle()
      .then(({ data }) => setAtteso(data?.value ?? null));
  }, []);

  const prova = async (valore: string) => {
    if (!atteso) return;
    if ((await impronta(valore)) === atteso) {
      sessionStorage.setItem(CHIAVE_SESSIONE, "1");
      setSbloccato(true);
    } else {
      setErrore(true);
      setPin("");
    }
  };

  if (atteso === undefined) {
    return <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  // Nessun PIN impostato: le impostazioni restano aperte come prima.
  if (atteso === null || sbloccato) return <>{children}</>;

  return (
    <div className="flex justify-center pt-10">
      <Card className="w-full max-w-[380px]">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-[14px]">Impostazioni protette</h3>
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            Qui si cambiano fogli, campagne, condizioni delle regole e anagrafica: cose che a lancio partito
            conviene non toccare. Per pause, percentuali, tetti e contatori usa{" "}
            <b className="text-foreground/80">Lanci → Distribuzione</b>, che non richiede il PIN.
          </p>
          <div className="flex gap-2">
            <Input
              type="password" inputMode="numeric" autoFocus placeholder="PIN"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setErrore(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") prova(pin); }}
              className={errore ? "border-destructive" : ""}
            />
            <Button onClick={() => prova(pin)} disabled={!pin.trim()}>Sblocca</Button>
          </div>
          {errore && <p className="text-[12px] text-destructive">PIN errato.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default PinImpostazioni;
