import { useMemo } from "react";
import { Loader2, Ban } from "lucide-react";
import { RankedMember, MetricKey } from "@/lib/ranking/googleSheets";
import { BucketData, MonthData, ValoreCallResp, meseRiferimento, nomeSalesInEdge } from "@/lib/ranking/valoreCall";
import { Podium } from "@/components/ranking/Podium";
import { LeaderboardTable } from "@/components/ranking/LeaderboardTable";

const BUCKET_COLORS: Record<string, string> = {
  "3sfere": "hsl(232 100% 74%)", setter_ig: "hsl(280 70% 62%)",
  setter_new: "hsl(180 65% 48%)", vsl: "hsl(38 92% 55%)",
};
const FONTI = ["3sfere", "setter_ig", "setter_new", "vsl"];

// campo dell'edge per la metrica del ranking (totale cumulato)
const FIELD: Record<MetricKey, keyof BucketData> = {
  fatturato: "fatturato",
  incassato: "incassato",
  cr: "cr",
  valoreCall: "valore_call",
};
// campo dentro `mesi` per la stessa metrica (per media + mese corrente)
const MONTH_FIELD: Record<MetricKey, keyof MonthData> = {
  fatturato: "fatturato",
  incassato: "incassato",
  cr: "cr",
  valoreCall: "valore_call",
};

// I dati arrivano sempre dal parent (un solo fetch per tutte le metriche).
interface Props { metric: MetricKey; memberCode?: string; myName?: string | null; data: ValoreCallResp | null; }

const FontePodium = ({ metric, memberCode, myName: myNameProp, data: resp }: Props) => {
  const labelOf = (f: string) => resp?.data.find((b) => b.bucket === f)?.label || f;

  // Nome del sales corrente, risolto al nome esatto usato nell'edge (per highlight/rank).
  const myName = useMemo(() => (resp ? nomeSalesInEdge(resp, myNameProp, memberCode) : null), [myNameProp, memberCode, resp]);

  const meseRif = useMemo(() => (resp ? meseRiferimento(resp) : null), [resp]);

  // Classifica venditori per OGNI fonte → { fonte, ranked, myRank }
  const blocks = useMemo(() => {
    if (!resp) return [];
    const field = FIELD[metric];
    const mfield = MONTH_FIELD[metric];
    return FONTI.map((fonte) => {
      const list = resp.per_seller
        .map((s) => {
          const b = s.data.find((x) => x.bucket === fonte);
          if (!b || !b.has_call) return null;
          // Valore principale = valore del MESE DI RIFERIMENTO (uguale per tutti, così è
          // confrontabile). Sotto: media sui mesi utili del bucket.
          // Per fatturato/incassato la media è somma/n mesi; per valore call e CR il dato
          // aggregato sui 3 mesi è già una media pesata, quindi si usa quello.
          const mesi = b.mesi || [];
          const isSum = metric === "fatturato" || metric === "incassato";
          const tot = Number(b[field]) || 0;
          const mRif = meseRif ? mesi.find((m) => m.mese === meseRif) : null;
          // Nel mese di riferimento questa fonte non ha portato call a questo sales → fuori.
          if (!mRif || (Number(mRif.n_call) || 0) === 0) return null;
          const val = Number(mRif[mfield]) || 0;
          const sub: RankedMember["sub"] | undefined = mesi.length
            ? { avg: isSum ? Math.round(tot / mesi.length) : tot, mese: meseRif || mesi[mesi.length - 1].mese }
            : undefined;
          return { name: s.venditore, val, sub };
        })
        .filter(Boolean) as { name: string; val: number; sub?: RankedMember["sub"] }[];
      list.sort((a, b) => b.val - a.val);
      const ranked: RankedMember[] = list.map((x, i) => ({
        name: x.name,
        rank: i + 1,
        fatturato: metric === "fatturato" ? x.val : 0,
        incassato: metric === "incassato" ? x.val : 0,
        cr: metric === "cr" ? x.val : 0,
        valoreCall: metric === "valoreCall" ? x.val : 0,
        sub: x.sub,
      }));
      const myRank = myName ? ranked.findIndex((r) => r.name === myName) : -1;
      return { fonte, ranked, myRank };
    });
  }, [resp, metric, myName, meseRif]);

  // resp null = dati non ancora arrivati (il fetch valore-call rilegge i fogli, può metterci qualche
  // secondo). Mostra un loading invece del vuoto, così non sembra rotto.
  if (!resp) return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm">Carico i dati per fonte…</span>
    </div>
  );

  // Mostra solo le fonti che hanno avuto call (ranked non vuoto): se un mese una fonte è a zero,
  // il blocco sparisce del tutto invece di mostrare "Nessun dato".
  const visibleBlocks = blocks.filter((b) => b.ranked.length > 0);
  if (visibleBlocks.length === 0) return <p className="text-center text-muted-foreground text-sm py-6">Nessun dato per fonte in questo periodo.</p>;

  return (
    <div className="space-y-10">
      {visibleBlocks.map(({ fonte, ranked, myRank }) => {
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
              {myName && myRank >= 0 && (
                <span className="text-[13px] font-bold px-3 py-1 rounded-full border" style={{ background: `${color}26`, borderColor: `${color}66`, color }}>
                  Sei {myRank + 1}° su {ranked.length}
                </span>
              )}
            </div>

            {ranked.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">Nessun dato per {labelOf(fonte)}.</p>
            ) : (
              <div className="space-y-5">
                <Podium members={podium} metric={metric} />
                <LeaderboardTable members={rest} metric={metric} highlightName={myName} />
                {/* Notice chiaro quando il sales non ha call in questa provenienza */}
                {myName && myRank < 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                    <Ban className="h-4 w-4 shrink-0" />
                    <span><span className="font-semibold text-foreground">Tu</span> — nessuna call da <span className="font-semibold">{labelOf(fonte)}</span> in questo periodo, non sei in classifica qui.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FontePodium;
