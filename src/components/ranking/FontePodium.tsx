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

interface Props { metric: MetricKey; memberCode?: string; myName?: string | null; market?: "IT" | "ES"; data?: Resp | null; }

// Match nome sales robusto. I nomi del foglio ranking sono brevi/soprannomi con
// accenti (es. "Desiree", "Rocco", "Vincenzo"), quelli dell'edge valore-call sono
// completi (es. "Desirée Masiero", "Rocco Alicchio"). Serve: togliere accenti +
// confronto esatto → token-set (ordine invertito) → sottoinsieme (nome ⊂ completo).
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
const tokset = (s: string) => new Set(fold(s).split(" ").filter(Boolean));
const resolveSales = (target: string, candidates: string[]): string | null => {
  const ft = fold(target);
  let hit = candidates.find((c) => fold(c) === ft);
  if (hit) return hit;
  const tt = tokset(target);
  hit = candidates.find((c) => { const s = tokset(c); return s.size === tt.size && [...tt].every((x) => s.has(x)); });
  if (hit) return hit;
  // target ⊆ candidate (es. "Rocco" ⊆ "Rocco Alicchio")
  const subs = candidates.filter((c) => { const s = tokset(c); return [...tt].every((x) => s.has(x)); });
  if (subs.length) return subs[0];
  // candidate ⊆ target (es. "Stefania" ⊆ "Rocco Stefania")
  const subs2 = candidates.filter((c) => { const s = tokset(c); return [...s].every((x) => tt.has(x)); });
  return subs2[0] ?? null;
};

const FontePodium = ({ metric, memberCode, myName: myNameProp, market = "IT", data }: Props) => {
  const [respInner, setRespInner] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);
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

  const labelOf = useCallback((f: string) => resp?.data.find((b) => b.bucket === f)?.label || f, [resp]);

  // Nome del sales corrente, risolto al nome esatto usato nell'edge (per highlight/rank).
  const myName = useMemo(() => {
    if (!resp) return null;
    const names = resp.per_seller.map((s) => s.venditore);
    if (myNameProp) return resolveSales(myNameProp, names);
    if (memberCode) return names.find((n) => generateMemberCode(n) === memberCode) || null;
    return null;
  }, [myNameProp, memberCode, resp]);

  // Classifica venditori per OGNI fonte → { fonte, ranked, myRank }
  const blocks = useMemo(() => {
    if (!resp) return [];
    const field = FIELD[metric];
    return FONTI.map((fonte) => {
      const list = resp.per_seller
        .map((s) => {
          const b = s.data.find((x) => x.bucket === fonte);
          if (!b || !b.has_call) return null;
          return { name: s.venditore, val: Number(b[field]) || 0 };
        })
        .filter(Boolean) as { name: string; val: number }[];
      list.sort((a, b) => b.val - a.val);
      const ranked: RankedMember[] = list.map((x, i) => ({
        name: x.name,
        rank: i + 1,
        fatturato: metric === "fatturato" ? x.val : 0,
        incassato: metric === "incassato" ? x.val : 0,
        cr: metric === "cr" ? x.val : 0,
        valoreCall: metric === "valoreCall" ? x.val : 0,
      }));
      const myRank = myName ? ranked.findIndex((r) => r.name === myName) : -1;
      return { fonte, ranked, myRank };
    });
  }, [resp, metric, myName]);

  if (loading && !resp) return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!resp) return null;

  return (
    <div className="space-y-10">
      {blocks.map(({ fonte, ranked, myRank }) => {
        const podium = ranked.slice(0, 3);
        const fourth = ranked.slice(3, 4);
        const extra = myRank >= 4 ? [ranked[myRank]] : [];
        const rest = [...fourth, ...extra];
        const color = BUCKET_COLORS[fonte];
        return (
          <div key={fonte} className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5">
            {/* Intestazione fonte chiara */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                <h4 className="text-base font-bold text-foreground">{labelOf(fonte)}</h4>
              </div>
              {myName && (
                myRank >= 0
                  ? <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>Sei {myRank + 1}° su {ranked.length}</span>
                  : <span className="text-[12px] text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">Nessuna call qui</span>
              )}
            </div>

            {ranked.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">Nessun dato per {labelOf(fonte)}.</p>
            ) : (
              <div className="space-y-5">
                <Podium members={podium} metric={metric} />
                <LeaderboardTable members={rest} metric={metric} highlightName={myName} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FontePodium;
