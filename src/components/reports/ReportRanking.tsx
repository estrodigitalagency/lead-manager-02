import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMarket } from "@/contexts/MarketContext";
import { METRIC_LABELS, MetricKey, meseLabel } from "@/lib/ranking/googleSheets";
import { ValoreCallResp, fetchValoreCall, meseRiferimento } from "@/lib/ranking/valoreCall";
import ClassificaGenerale from "@/components/ranking/ClassificaGenerale";
import FontePodium from "@/components/ranking/FontePodium";

/**
 * Vista interna del ranking: la classifica generale che vedono i sales su /ranking,
 * più il dettaglio per fonte che a loro non viene mostrato.
 */
const ReportRanking = () => {
  const { selectedMarket } = useMarket();
  const [data, setData] = useState<ValoreCallResp | null>(null);
  const [errore, setErrore] = useState(false);
  const [metric, setMetric] = useState<MetricKey>("fatturato");

  useEffect(() => {
    let attivo = true;
    setData(null);
    setErrore(false);
    fetchValoreCall(selectedMarket)
      .then((j) => { if (!attivo) return; if (j) setData(j); else setErrore(true); })
      .catch(() => { if (attivo) setErrore(true); });
    return () => { attivo = false; };
  }, [selectedMarket]);

  const mese = data ? meseRiferimento(data) : null;

  if (errore) return <p className="text-sm text-destructive py-6">Non riesco a leggere i dati del ranking. Riprova tra qualche minuto.</p>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        I sales su /ranking vedono solo la classifica generale. Il dettaglio per fonte è visibile solo qui.
        {mese && <> Mese di riferimento: <span className="font-medium text-foreground">{meseLabel(mese)}</span>.</>}
      </p>

      <Tabs value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
        <TabsList className="mb-5">
          {(Object.keys(METRIC_LABELS) as MetricKey[]).map((key) => (
            <TabsTrigger key={key} value={key}>{METRIC_LABELS[key].label}</TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(METRIC_LABELS) as MetricKey[]).map((key) => (
          <TabsContent key={key} value={key} className="mt-0">
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="text-base font-semibold text-foreground">Generale</h3>
                <p className="text-xs text-muted-foreground mb-4">Tutte le fonti insieme · quella che vedono i sales</p>
                <ClassificaGenerale metric={key} data={data} />
              </section>
              <section className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Per fonte</h3>
                  <p className="text-xs text-muted-foreground">Solo interno</p>
                </div>
                <FontePodium metric={key} data={data} />
              </section>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ReportRanking;
