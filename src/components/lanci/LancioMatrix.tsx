import { useState, useMemo } from "react";
import { LancioData, LancioRow, ColorRule } from "@/lib/lanci/config";

type Fmt = "eur" | "n" | "pct" | "dec" | "delta";
export interface Metric { label: string; key: keyof LancioRow | string; fmt: Fmt }

export const CALL_METRICS: Metric[] = [
  { label: "Fatturato", key: "fatturato", fmt: "eur" },
  { label: "Incassato", key: "incassato", fmt: "eur" },
  { label: "Chiusure", key: "chiusure", fmt: "n" },
  { label: "Call Totali", key: "call_totali", fmt: "n" },
  { label: "Call da Fare", key: "call_da_fare", fmt: "n" },
  { label: "Call Nette", key: "call_nette", fmt: "n" },
  { label: "Nette su Totali", key: "nette_su_totali", fmt: "pct" },
  { label: "Valore Lead su Fatt.", key: "valore_lead_fatt", fmt: "eur" },
  { label: "Valore Lead su Incass.", key: "valore_lead_inc", fmt: "eur" },
  { label: "Tasso Prenotazione su Lead", key: "tasso_prenotazione", fmt: "pct" },
  { label: "Tasso di chiusura su Call", key: "tasso_chiusura_call", fmt: "pct" },
  { label: "Tasso di chiusura su Call Nette", key: "tasso_chiusura_nette", fmt: "pct" },
];
export const LEAD_METRICS: Metric[] = [
  { label: "Tot. Lead Assegnati", key: "tot_lead", fmt: "n" },
  { label: "Distribuzione", key: "distribuzione", fmt: "pct" },
  { label: "Target", key: "target", fmt: "n" },
  { label: "Distanza dal Target", key: "distanza_target", fmt: "delta" },
  { label: "App + conferma sui lavorati", key: "app_conferma_lavorati", fmt: "pct" },
  { label: "App + Conferma", key: "app_conferma", fmt: "pct" },
  { label: "Media voto (P)", key: "media_voto", fmt: "dec" },
];
// metriche sommabili: il totale è la somma dei sales visibili, non il valore aggregato
const SUM_KEYS = new Set(["fatturato", "incassato", "chiusure", "call_totali", "call_da_fare", "call_nette", "tot_lead", "target", "distanza_target"]);
// La heatmap confronta i sales sulla stessa riga: ha senso solo su volumi e valori assoluti.
// Su percentuali, medie e target il colore ingannerebbe (scale non confrontabili).
const HEAT_KEYS = new Set([
  "fatturato", "incassato", "chiusure", "call_totali", "call_nette", "tot_lead", "valore_lead_fatt", "valore_lead_inc",
]);
// Metriche in cui un valore alto è negativo: la scala colore va invertita.
const LOWER_IS_BETTER = new Set(["call_da_fare", "Non lavorato", "Numero inesistente", "Non partecipa", "Duplicato"]);

/** Colore della cella: rosso per i valori bassi della riga, verde per gli alti,
 *  neutro a metà. Su metriche dove "meno è meglio" la scala si inverte. */
const heatColor = (t: number, invert: boolean): string => {
  const v = invert ? 1 - t : t;
  const d = Math.abs(v - 0.5) * 2;              // 0 al centro, 1 agli estremi
  const alpha = (0.05 + d * 0.22).toFixed(3);   // niente colore sui valori medi
  return v >= 0.5
    ? `hsl(142 71% 45% / ${alpha})`             // verde: sopra la media della riga
    : `hsl(0 72% 51% / ${alpha})`;              // rosso: sotto
};

export const fmt = {
  eur: (v: number) => `€${Math.round(v).toLocaleString("it-IT")}`,
  n: (v: number) => Math.round(v).toLocaleString("it-IT"),
  pct: (v: number) => `${(+v).toLocaleString("it-IT")}%`,
  dec: (v: number) => (+v).toLocaleString("it-IT", { minimumFractionDigits: 2 }),
  delta: (v: number) => `${v > 0 ? "+" : ""}${Math.round(v).toLocaleString("it-IT")}`,
};

export const ruleStyle = (rules: ColorRule[], key: string, v: number): React.CSSProperties => {
  const r = rules.find((x) => x.key === key);
  if (!r || v == null) return {};
  const ok = r.op === "lt" ? v < r.val : r.op === "gt" ? v > r.val : r.op === "lte" ? v <= r.val : v >= r.val;
  return ok ? { color: r.color, fontWeight: 600 } : {};
};

interface Props { data: LancioData; rows: LancioRow[]; rules: ColorRule[]; heatmap: boolean }

/** Matrice metriche × sales: come il foglio, con heatmap per riga e sezioni collassabili. */
const LancioMatrix = ({ data, rows, rules, heatmap }: Props) => {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const toggle = (t: string) => setClosed((p) => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n; });

  const agg = (key: string) => SUM_KEYS.has(key)
    ? rows.reduce((s, r) => s + ((r as any)[key] || 0), 0)
    : ((data.totale as any)?.[key] || 0);

  const Cell = ({ k, v, f, pc, range, heat }: { k: string; v: number; f: Fmt; pc?: number; range?: [number, number]; heat?: boolean }) => {
    const style = ruleStyle(rules, k, v);
    const heatOk = heatmap && (heat || HEAT_KEYS.has(k)) && range && range[1] > range[0] && v != null;
    const hm = heatOk ? Math.max(0, Math.min(1, (v - range![0]) / (range![1] - range![0]))) : 0;
    const deltaCls = f === "delta" && v !== 0 && !style.color ? (v > 0 ? "text-emerald-400" : "text-red-400") : "";
    return (
      <td className={`table-body-cell text-right num relative align-middle ${v === 0 ? "text-muted-foreground/40" : ""} ${deltaCls}`} style={style}>
        {heatOk && <b className="absolute inset-0 z-0" style={{ background: heatColor(hm, LOWER_IS_BETTER.has(k)) }} />}
        <span className="relative z-10 flex flex-col items-end leading-tight">
          <span>{fmt[f](v)}</span>
          {pc != null && <span className="text-[10px] text-muted-foreground/70 font-normal">{fmt.pct(pc)}</span>}
        </span>
      </td>
    );
  };

  const rangeOf = (get: (r: LancioRow) => number): [number, number] => {
    const vs = rows.map(get).filter((x) => typeof x === "number");
    return vs.length ? [Math.min(...vs), Math.max(...vs)] : [0, 0];
  };

  const MetricRows = ({ list }: { list: Metric[] }) => (
    <>
      {list.map((m) => {
        const range = rangeOf((r) => (r as any)[m.key]);
        return (
          <tr key={String(m.key)} className="group">
            <th className="table-body-cell sticky left-0 bg-card z-10 text-left font-normal border-r border-border min-w-[230px] group-hover:text-primary">
              {m.label}
            </th>
            <td className="table-body-cell text-right num font-bold bg-secondary/40 border-r border-border">{fmt[m.fmt](agg(String(m.key)))}</td>
            {rows.map((r) => <Cell key={r.venditore} k={String(m.key)} v={(r as any)[m.key]} f={m.fmt} range={range} />)}
          </tr>
        );
      })}
    </>
  );

  const Group = ({ title, items, get, getPerc, totFn }: {
    title: string; items: string[];
    get: (r: LancioRow, it: string) => number;
    getPerc?: (r: LancioRow, it: string) => number | undefined;
    totFn: (it: string) => number;
  }) => (
    <>
      <tr className="bg-secondary/40 cursor-pointer" onClick={() => toggle(title)}>
        <th className="table-body-cell sticky left-0 bg-secondary/40 z-10 text-left label-eyebrow py-2.5">
          {closed.has(title) ? "▸" : "▾"} {title}
        </th>
        <td colSpan={rows.length + 1} className="table-body-cell bg-secondary/40" />
      </tr>
      {!closed.has(title) && items.map((it) => {
        const range = rangeOf((r) => get(r, it));
        return (
          <tr key={it} className="group">
            <th className="table-body-cell sticky left-0 bg-card z-10 text-left font-normal border-r border-border group-hover:text-primary">{it}</th>
            <td className="table-body-cell text-right num font-bold bg-secondary/40 border-r border-border">
              <span className="flex flex-col items-end leading-tight">
                <span>{fmt.n(totFn(it))}</span>
                {getPerc && <span className="text-[10px] text-muted-foreground/70 font-normal">{fmt.pct(getPerc(data.totale, it) ?? 0)}</span>}
              </span>
            </td>
            {rows.map((r) => <Cell key={r.venditore} k={it} v={get(r, it)} f="n" pc={getPerc?.(r, it)} range={range} heat />)}
          </tr>
        );
      })}
    </>
  );

  return (
    <div className="overflow-auto max-h-[74vh] pb-4" style={{ scrollbarGutter: "stable" }}>
      <table className="w-full text-[12.5px] table-colonna-ferma">
        <thead>
          <tr>
            <th className="table-header-cell text-left sticky left-0 top-0 bg-card z-30 min-w-[230px]">Metrica</th>
            <th className="table-header-cell text-right sticky top-0 bg-card z-20">Totale</th>
            {rows.map((r) => (
              <th key={r.venditore} className="table-header-cell text-right sticky top-0 bg-card z-20 min-w-[100px]">{r.venditore}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <MetricRows list={CALL_METRICS} />
          <Group title="Lavorazione lead" items={[]} get={() => 0} totFn={() => 0} />
          {!closed.has("Lavorazione lead") && <MetricRows list={LEAD_METRICS} />}
          <Group
            title="Qualifica lead · n + % sul totale"
            items={data.qualifiche_order ?? []}
            get={(r, q) => r.qualifiche?.[q] ?? 0}
            getPerc={(r, q) => r.qualifiche_perc?.[q]}
            totFn={(q) => rows.reduce((s, r) => s + (r.qualifiche?.[q] ?? 0), 0)}
          />
          <Group
            title="Qualità lead (voto) · n + % sui confermati"
            items={data.voti_order ?? []}
            get={(r, v) => r.voti?.[v] ?? 0}
            getPerc={(r, v) => r.voti_perc?.[v]}
            totFn={(v) => rows.reduce((s, r) => s + (r.voti?.[v] ?? 0), 0)}
          />
        </tbody>
      </table>
    </div>
  );
};

export default LancioMatrix;
