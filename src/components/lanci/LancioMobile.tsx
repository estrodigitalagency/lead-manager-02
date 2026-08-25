import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";
import { LancioData, LancioRow, ColorRule } from "@/lib/lanci/config";
import { CALL_METRICS, LEAD_METRICS, fmt, ruleStyle, Metric } from "./LancioMatrix";

// per queste metriche "meglio" significa più basso.
// La distanza dal target non c'è più: adesso è negativa quando si è sotto e positiva quando si
// è sopra, quindi più alta è meglio, come per tutte le altre.
const LOWER_BETTER = new Set(["call_da_fare"]);

/** Intestazione di sezione. Fuori dal componente per non ricreare il tipo a ogni render. */
const Section = ({ title }: { title: string }) => (
  <div className="px-3.5 py-2 bg-secondary/40 border-b border-border label-eyebrow">{title}</div>
);

interface Props { data: LancioData; rows: LancioRow[]; rules: ColorRule[] }

/** Vista mobile: un sales alla volta con confronto alla media team, oppure due sales a confronto. */
const LancioMobile = ({ data, rows, rules }: Props) => {
  const [selA, setSelA] = useState<string | null>(null);
  const [selB, setSelB] = useState<string | null>(null);
  const [cmp, setCmp] = useState(false);

  if (rows.length === 0) return <p className="p-5 text-sm text-muted-foreground">Nessun sales nel lancio.</p>;
  const a = rows.find((r) => r.venditore === selA) ?? rows[0];
  const b = cmp ? (rows.find((r) => r.venditore === selB) ?? rows.find((r) => r.venditore !== a.venditore)) : null;

  const pick = (v: string) => {
    if (!cmp) { setSelA(v); return; }
    if (v === a.venditore) return;
    if (v === b?.venditore) { setSelB(null); return; }
    setSelB(a.venditore); setSelA(v);
  };

  const avg = (k: string) => rows.length ? rows.reduce((s, r) => s + ((r as any)[k] || 0), 0) / rows.length : 0;

  const Row = ({ label, k, f, va, vb, pc }: { label: string; k: string; f: keyof typeof fmt; va: number; vb?: number; pc?: number }) => {
    const style = ruleStyle(rules, k, va);
    if (b && vb !== undefined) {
      const aWin = va !== vb && (LOWER_BETTER.has(k) ? va < vb : va > vb);
      return (
        <div className="flex items-center gap-2.5 px-3.5 py-2 border-b border-border">
          <span className="flex-1 min-w-0 text-[12.5px] text-muted-foreground truncate">{label}</span>
          <span className={`w-[74px] shrink-0 text-right text-[13px] font-bold num whitespace-nowrap ${aWin ? "text-emerald-400" : ""}`} style={style}>{fmt[f](va)}</span>
          <span className={`w-[74px] shrink-0 text-right text-[13px] font-bold num whitespace-nowrap ${!aWin && va !== vb ? "text-emerald-400" : ""}`}>{fmt[f](vb)}</span>
        </div>
      );
    }
    const m = avg(k);
    const d = m > 0 ? Math.round((va / m - 1) * 100) : null;
    return (
      <div className="flex items-center gap-2 px-3.5 py-2 border-b border-border">
        <span className="flex-1 min-w-0 text-[12.5px] text-muted-foreground truncate">{label}</span>
        <span className="text-sm font-bold num shrink-0" style={style}>{fmt[f](va)}</span>
        <span className="w-[52px] shrink-0 text-right text-[10.5px] num whitespace-nowrap"
          style={{ color: pc != null ? undefined : d && d > 0 ? "hsl(142 71% 60%)" : d && d < 0 ? "hsl(0 84% 71%)" : undefined }}>
          {pc != null ? fmt.pct(pc) : d != null && isFinite(d) ? `${d > 0 ? "+" : ""}${d}%` : ""}
        </span>
      </div>
    );
  };

  const metricRows = (list: Metric[]) => list.map((m) => (
    <Row key={String(m.key)} label={m.label} k={String(m.key)} f={m.fmt}
      va={(a as any)[m.key]} vb={b ? (b as any)[m.key] : undefined} />
  ));

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Button size="sm" variant={cmp ? "default" : "outline"} className="h-7 text-[11.5px]" onClick={() => setCmp((v) => !v)}>
          <ArrowLeftRight className="h-3 w-3 mr-1" /> Confronta 2
        </Button>
        <span className="text-[11.5px] text-muted-foreground">
          {cmp ? "tocca i nomi per scegliere i due sales" : "tocca un sales · % = scarto dalla media team"}
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-3 py-2.5 bg-secondary/30 border-b border-border">
        {rows.map((r) => {
          const on = r.venditore === a.venditore || (cmp && r.venditore === b?.venditore);
          const tag = cmp ? (r.venditore === a.venditore ? "A · " : r.venditore === b?.venditore ? "B · " : "") : "";
          return (
            <button key={r.venditore} onClick={() => pick(r.venditore)}
              className={`shrink-0 px-2.5 py-1 rounded-full border text-[12px] transition-colors ${
                on ? "border-primary bg-primary/15 text-primary font-medium" : "border-border bg-card text-muted-foreground"}`}>
              {tag}{r.venditore.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {b && (
        <div className="flex gap-2.5 px-3.5 py-2 bg-secondary/40 border-b border-border label-eyebrow sticky top-0 z-10">
          <span className="flex-1">Metrica</span>
          <span className="w-[74px] shrink-0 text-right truncate">{a.venditore.split(" ")[0]}</span>
          <span className="w-[74px] shrink-0 text-right truncate">{b.venditore.split(" ")[0]}</span>
        </div>
      )}

      {metricRows(CALL_METRICS)}
      <Section title="Lavorazione lead" />
      {metricRows(LEAD_METRICS)}
      <Section title="Qualifica lead" />
      {(data.qualifiche_order ?? []).map((q) => (
        <Row key={q} label={q} k={q} f="n" va={a.qualifiche?.[q] ?? 0}
          vb={b ? (b.qualifiche?.[q] ?? 0) : undefined} pc={b ? undefined : a.qualifiche_perc?.[q]} />
      ))}
      <Section title="Qualità lead (voto)" />
      {(data.voti_order ?? []).map((v) => (
        <Row key={v} label={v} k={v} f="n" va={a.voti?.[v] ?? 0}
          vb={b ? (b.voti?.[v] ?? 0) : undefined} pc={b ? undefined : a.voti_perc?.[v]} />
      ))}
    </div>
  );
};

export default LancioMobile;
