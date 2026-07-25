import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle } from "lucide-react";
import { useMarket } from "@/contexts/MarketContext";

const SUPA_URL = "https://btcwmuyemmkiteqlopce.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE";

const BUCKET_LABELS: Record<string, string> = {
  "3sfere": "3Sfere",
  setter_ig: "Setter IG",
  setter_new: "Setter New",
  vsl: "VSL / Funnel",
  outbound: "Outbound",
};

interface MonthData {
  mese: string;
  valore_call: number;
  n_call: number;
  fatturato: number;
  call_nette: number;
  valore_lead: number;
}
interface BucketData {
  bucket: string;
  mesi: MonthData[];
  trend: string;
}
interface Response {
  market: string;
  months: string[];
  sellers_used: number;
  sellers_total: number;
  data: BucketData[];
  unmapped: Record<string, number>;
  errors: string[];
  generated_at: string;
}

const eur = (n: number) => `€${n.toLocaleString("it-IT")}`;
const monthLabel = (mk: string) => {
  const [m, y] = mk.split("/");
  const names = ["", "Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${names[parseInt(m, 10)]} ${y.slice(2)}`;
};

const TrendBadge = ({ t }: { t: string }) => {
  if (t === "asc") return <span className="inline-flex items-center gap-1 text-emerald-500 text-[11px] font-medium"><TrendingUp className="h-3 w-3" /> in crescita</span>;
  if (t === "desc") return <span className="inline-flex items-center gap-1 text-destructive text-[11px] font-medium"><TrendingDown className="h-3 w-3" /> in calo</span>;
  if (t === "stable") return <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px] font-medium"><Minus className="h-3 w-3" /> stabile</span>;
  return <span className="text-muted-foreground text-[11px]">—</span>;
};

const ValoreCallView = () => {
  const { selectedMarket } = useMarket();
  const [resp, setResp] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${SUPA_URL}/functions/v1/valore-call?market=${selectedMarket}`, {
        headers: { Authorization: `Bearer ${ANON}` },
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setResp(j);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedMarket]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[12.5px] text-muted-foreground">
            Valore call = Fatturato / Call fatte, per fonte, ultimi 3 mesi. Dati live dai fogli venditore (tab Analytics Fonte).
          </p>
          {resp && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {resp.sellers_used}/{resp.sellers_total} venditori · aggiornato {new Date(resp.generated_at).toLocaleString("it-IT")}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Aggiorna
        </Button>
      </div>

      {err && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-[12.5px] text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {loading && !resp && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {resp && (
        <>
          {/* Valore call per bucket */}
          <Card>
            <CardHeader>
              <CardTitle>Valore call per fonte</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr>
                    <th className="table-header-cell text-left">Fonte</th>
                    {resp.months.map((mk) => (
                      <th key={mk} className="table-header-cell text-right">{monthLabel(mk)}</th>
                    ))}
                    <th className="table-header-cell text-right">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {resp.data.map((b) => (
                    <tr key={b.bucket}>
                      <td className="table-body-cell font-medium">{BUCKET_LABELS[b.bucket] || b.bucket}</td>
                      {b.mesi.map((m) => (
                        <td key={m.mese} className="table-body-cell text-right num">
                          <span className="font-semibold">{m.valore_call > 0 ? eur(m.valore_call) : "—"}</span>
                          <span className="block text-[10px] text-muted-foreground">{m.n_call} call</span>
                        </td>
                      ))}
                      <td className="table-body-cell text-right"><TrendBadge t={b.trend} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Valore lead (outbound) */}
          <Card>
            <CardHeader>
              <CardTitle>Valore lead — Outbound</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr>
                    <th className="table-header-cell text-left">Metrica</th>
                    {resp.months.map((mk) => (
                      <th key={mk} className="table-header-cell text-right">{monthLabel(mk)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const ob = resp.data.find((d) => d.bucket === "outbound");
                    if (!ob) return null;
                    return (
                      <>
                        <tr>
                          <td className="table-body-cell font-medium">Valore lead</td>
                          {ob.mesi.map((m) => (
                            <td key={m.mese} className="table-body-cell text-right num font-semibold">
                              {m.valore_lead > 0 ? eur(m.valore_lead) : "—"}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="table-body-cell text-muted-foreground">Fatturato</td>
                          {ob.mesi.map((m) => (
                            <td key={m.mese} className="table-body-cell text-right num text-muted-foreground">{eur(m.fatturato)}</td>
                          ))}
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {resp.unmapped && Object.keys(resp.unmapped).length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Fonti non mappate (ignorate): {Object.entries(resp.unmapped).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} (${v})`).join(", ")}
            </p>
          )}
          {resp.errors && resp.errors.length > 0 && (
            <details className="text-[11px] text-muted-foreground">
              <summary className="cursor-pointer">Errori lettura ({resp.errors.length})</summary>
              <ul className="mt-1 space-y-0.5 pl-3">
                {resp.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
};

export default ValoreCallView;
