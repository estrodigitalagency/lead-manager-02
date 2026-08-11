
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import AddSalespersonForm from "./salespeople/AddSalespersonForm";
import SalespersonList from "./salespeople/SalespersonList";

const SalespeopleSettings = () => {
  const { venditori, isLoading, refetch } = useSalespeopleData();

  // Chi puo davvero ricevere lead adesso: sta nella distribuzione di una regola accesa.
  // Segnalare tutti gli attivi darebbe venti nomi su trentadue e nessuno ci farebbe caso.
  const [inDistribuzione, setInDistribuzione] = useState<Set<string>>(new Set());
  useEffect(() => {
    supabase.from("lead_assignment_automations").select("distribution_config").eq("attivo", true)
      .then(({ data }) => setInDistribuzione(new Set(
        (data ?? []).flatMap((a: any) => (a.distribution_config ?? []).map((s: any) => s.venditore_id)))));
  }, []);

  // Senza numero il link WhatsApp non apre la chat: e l'unico contatto che rompe qualcosa.
  const senzaTelefono = useMemo(() => (venditori ?? [])
    .filter((v: any) => v.stato === "attivo" && !v.telefono && inDistribuzione.has(v.id))
    .map((v: any) => `${v.nome} ${v.cognome || ""}`.trim()), [venditori, inDistribuzione]);

  if (isLoading) {
    return <div className="flex justify-center p-8 text-sm text-muted-foreground">Caricamento...</div>;
  }

  return (
    <div className="space-y-4">
      {senzaTelefono.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3.5 py-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-destructive mb-1">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {senzaTelefono.length === 1
              ? "Un venditore che riceve lead non ha il numero"
              : `${senzaTelefono.length} venditori che ricevono lead non hanno il numero`}
          </div>
          <p className="text-[12.5px]">
            {senzaTelefono.join(", ")}
            <span className="text-muted-foreground">
              {" "}— sono in una distribuzione attiva, quindi possono ricevere lead da un momento all'altro:
              chi finisce a loro e clicca sul link WhatsApp trova una pagina di errore invece della chat.
            </span>
          </p>
        </div>
      )}

      <Card className="p-4">
        <AddSalespersonForm onSuccess={refetch} />
      </Card>
      <SalespersonList venditori={venditori} onUpdate={refetch} />
    </div>
  );
};

export default SalespeopleSettings;
