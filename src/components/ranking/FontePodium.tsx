import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { generateMemberCode } from "@/lib/ranking/hashUtils";
import { RankedMember, MetricKey } from "@/lib/ranking/googleSheets";
import { Podium } from "@/components/ranking/Podium";
import { LeaderboardTable } from "@/components/ranking/LeaderboardTable";

const SUPA_URL = "https://btcwmuyemmkiteqlopce.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE";

const BUCKET_COLORS: Record<string, string> = {
  "3sfere": "hsl(232 100% 74%)", setter_ig: "hsl(280 70% 62%)",
  setter_new: "hsl(180 65% 48%)", vsl: "hsl(38 92% 55%)",
};
const FONTI = ["3sfere", "setter_ig", "setter_new", "vsl"];

interface BucketData {
  bucket: string; label?: string; has_call: boolean;
  valore_call: number; fatturato: number; incassato: number; cr: number;
}
interface SellerData { venditore: string; data: BucketData[]; }
interface Resp { data: BucketData[]; per_seller: SellerData[]; }

// campo dell'edge per la metrica del ranking
const FIELD: Record<MetricKey, keyof BucketData> = {
  fatturato: "fatturato",
  incassato: "incassato",
  cr: "cr",
  valoreCall: "valore_call",
};

interface Props { metric: MetricKey; memberCode?: string; market?: "IT" | "ES"; data?: Resp | null; }

const FontePodium = ({ metric, memberCode, market = "IT", data }: Props) => {
  const [respInner, setRespInner] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);
  const [fonte, setFonte] = useState<string>("3sfere");
  // Se i dati arrivano dal parent (fetch condiviso), niente fetch qui
  const resp = data !== undefined ? data : respInner;

  const load = useCallback(async () => {
    if (data !== undefined) return; // dati dal parent
    setLoading(true);
    try {
      const r = await fetch(`${SUPA_URL}/functions/v1/valore-call?market=${market}`, { headers: { Authorization: `Bearer ${ANON}` } });
      const j = await r.json();
      if (!j.error) setRespInner(j);
    } finally { setLoading(false); }
  }, [market, data]);
  useEffect(() => { load(); }, [load]);

  const labelOf = (f: string) => resp?.data.find((b) => b.bucket === f)?.label || f;

  // Classifica venditori per (fonte, metrica) → RankedMember[]
  const ranked: RankedMember[] = useMemo(() => {
    if (!resp) return [];
    const field = FIELD[metric];
    const list = resp.per_seller
      .map((s) => {
        const b = s.data.find((x) => x.bucket === fonte);
        if (!b || !b.has_call) return null;
        return { name: s.venditore, val: Number(b[field]) || 0 };
      })
      .filter(Boolean) as { name: string; val: number }[];
    list.sort((a, b) => b.val - a.val);
    return list.map((x, i) => ({
      name: x.name,
      rank: i + 1,
      fatturato: metric === "fatturato" ? x.val : 0,
      incassato: metric === "incassato" ? x.val : 0,
      cr: metric === "cr" ? x.val : 0,
      valoreCall: metric === "valoreCall" ? x.val : 0,
    }));
  }, [resp, fonte, metric]);

  const myName = useMemo(() => {
    if (!memberCode || !resp) return null;
    return resp.per_seller.map((s) => s.venditore).find((n) => generateMemberCode(n) === memberCode) || null;
  }, [memberCode, resp]);

  if (loading && !resp) return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!resp) return null;

  const podium = ranked.slice(0, 3);
  const fourth = ranked.slice(3, 4);
  const myIdx = myName ? ranked.findIndex((r) => r.name === myName) : -1;
  const extra = myIdx >= 4 ? [ranked[myIdx]] : [];
  const rest = [...fourth, ...extra];

  return (
    <div className="pt-2">
      <div className="flex flex-wrap gap-1.5 justify-center mb-5">
        {FONTI.map((f) => (
          <button
            key={f}
            onClick={() => setFonte(f)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[12.5px] transition-colors ${
              fonte === f ? "border-primary bg-primary/15 text-primary font-medium" : "border-border bg-secondary hover:border-border/80"
            }`}
          >
            <span className="w-2 h-2 rounded-sm" style={{ background: BUCKET_COLORS[f] }} />
            {labelOf(f)}
          </button>
        ))}
      </div>

      {ranked.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-6">Nessun dato per {labelOf(fonte)}.</p>
      ) : (
        <div className="space-y-6">
          <Podium members={podium} metric={metric} />
          <LeaderboardTable members={rest} metric={metric} highlightName={myName} />
        </div>
      )}
    </div>
  );
};

export default FontePodium;
