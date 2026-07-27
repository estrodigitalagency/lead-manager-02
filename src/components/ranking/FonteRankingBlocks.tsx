import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { generateMemberCode } from "@/lib/ranking/hashUtils";

const SUPA_URL = "https://btcwmuyemmkiteqlopce.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE";

const BUCKET_COLORS: Record<string, string> = {
  "3sfere": "hsl(232 100% 74%)",
  setter_ig: "hsl(280 70% 62%)",
  setter_new: "hsl(180 65% 48%)",
  vsl: "hsl(38 92% 55%)",
};
const colorOf = (id: string) => BUCKET_COLORS[id] || "hsl(232 100% 74%)";

interface MonthData { valore_call: number; }
interface BucketData { bucket: string; label?: string; has_call: boolean; valore_call: number; n_call: number; trend: string; mesi: MonthData[]; }
interface SellerData { venditore: string; data: BucketData[]; }
interface Resp { data: BucketData[]; per_seller: SellerData[]; }

const eur = (n: number) => `€${n.toLocaleString("it-IT")}`;
// Fonti da mostrare (escl outbound), nell'ordine
const FONTI = ["3sfere", "setter_ig", "setter_new", "vsl"];

const TrendMini = ({ t }: { t: string }) => {
  if (t === "asc") return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (t === "desc") return <TrendingDown className="h-3 w-3 text-destructive" />;
  if (t === "stable") return <Minus className="h-3 w-3 text-muted-foreground" />;
  return null;
};

interface Props {
  market?: "IT" | "ES";
  /** codice membro dal link individuale (?m=) — evidenzia la posizione di quel venditore */
  memberCode?: string;
  refreshTrigger?: number;
}

const FonteRankingBlocks = ({ market = "IT", memberCode, refreshTrigger }: Props) => {
  const [resp, setResp] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${SUPA_URL}/functions/v1/valore-call?market=${market}`, { headers: { Authorization: `Bearer ${ANON}` } });
      const j = await r.json();
      if (!j.error) setResp(j);
    } finally {
      setLoading(false);
    }
  }, [market]);

  useEffect(() => { load(); }, [load, refreshTrigger]);

  // Classifiche per fonte: venditori con call su quella fonte, ordinati per valore call desc
  const rankings = useMemo(() => {
    if (!resp) return {} as Record<string, { venditore: string; valore_call: number; n_call: number; trend: string; code: string }[]>;
    const out: Record<string, { venditore: string; valore_call: number; n_call: number; trend: string; code: string }[]> = {};
    for (const fonte of FONTI) {
      const list = resp.per_seller
        .map((s) => {
          const b = s.data.find((x) => x.bucket === fonte);
          return b && b.has_call && b.n_call > 0
            ? { venditore: s.venditore, valore_call: b.valore_call, n_call: b.n_call, trend: b.trend, code: generateMemberCode(s.venditore) }
            : null;
        })
        .filter(Boolean) as any[];
      list.sort((a, b) => b.valore_call - a.valore_call);
      out[fonte] = list;
    }
    return out;
  }, [resp]);

  const labelOf = (fonte: string) => resp?.data.find((b) => b.bucket === fonte)?.label || fonte;

  if (loading && !resp) {
    return <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!resp) return null;

  const medal = (i: number) => (i === 0 ? "hsl(45 93% 58%)" : i === 1 ? "hsl(210 10% 70%)" : i === 2 ? "hsl(25 60% 50%)" : null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {FONTI.map((fonte) => {
        const list = rankings[fonte] || [];
        const myIdx = memberCode ? list.findIndex((x) => x.code === memberCode) : -1;
        return (
          <div key={fonte} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border" style={{ background: `${colorOf(fonte)}12` }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorOf(fonte) }} />
              <span className="font-semibold text-[13px]">{labelOf(fonte)}</span>
              <span className="text-[11px] text-muted-foreground ml-auto">{list.length} sales</span>
            </div>
            <div className="divide-y divide-border/50 max-h-[300px] overflow-auto">
              {list.length === 0 ? (
                <div className="px-3 py-4 text-[12px] text-muted-foreground text-center">Nessun dato</div>
              ) : list.map((r, i) => {
                const isMe = memberCode && r.code === memberCode;
                const m = medal(i);
                return (
                  <div key={r.venditore} className={`flex items-center gap-2 px-3 py-1.5 text-[12.5px] ${isMe ? "bg-primary/15 ring-1 ring-primary/40" : ""}`}>
                    <span className="w-6 text-center font-semibold num shrink-0" style={m ? { color: m } : { color: "hsl(var(--muted-foreground))" }}>
                      {i + 1}
                    </span>
                    <span className={`flex-1 truncate ${isMe ? "font-semibold text-primary" : ""}`}>{r.venditore}{isMe ? " (tu)" : ""}</span>
                    <TrendMini t={r.trend} />
                    <span className="text-[10px] text-muted-foreground num shrink-0">{r.n_call}c</span>
                    <span className="font-semibold num shrink-0 w-16 text-right">{eur(r.valore_call)}</span>
                  </div>
                );
              })}
            </div>
            {myIdx >= 0 && (
              <div className="px-3 py-1.5 border-t border-border bg-primary/8 text-[11px] text-primary flex items-center gap-1.5">
                <Trophy className="h-3 w-3" /> Sei {myIdx + 1}° su {list.length} in {labelOf(fonte)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FonteRankingBlocks;
