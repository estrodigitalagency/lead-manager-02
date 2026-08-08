import { useMemo } from "react";
import { SpeedToLead } from "@/lib/lanci/config";

const C_ENTRATI = "hsl(220 9% 55%)";
const C_ASSEGNATI = "hsl(174 62% 50%)";
const C_PRENOTATI = "hsl(38 92% 55%)";
const C_ATTESA = "hsl(330 81% 65%)";

const nfmt = (v: number) => Math.round(v).toLocaleString("it-IT");
const pfmt = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "—");

/** Durata leggibile: sotto il minuto i secondi, poi minuti, ore, giorni. */
export const durata = (sec: number): string => {
  if (!isFinite(sec) || sec <= 0) return "—";
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  if (sec < 86400) {
    const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${(sec / 86400).toFixed(1).replace(".", ",")} gg`;
};

const dLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

interface Props { speed?: SpeedToLead; lavorati?: number; totLead?: number }

/**
 * Speed to lead: per ogni giorno d'ingresso mostra quanti lead sono entrati e quanti sono stati
 * assegnati a un venditore, con il tempo di attesa mediano fra le due cose.
 * La lavorazione arriva dai fogli sales, che non hanno una data: resta un totale.
 */

const SpeedToLeadWidget = ({ speed, lavorati, totLead }: Props) => {
  const chart = useMemo(() => {
    if (!speed || speed.days.length === 0) return null;
    const { days, entrati, assegnati, attesa_mediana_sec } = speed;
    const W = 620, H = 168, PL = 30, PR = 34, PB = 20, PT = 8;
    const iw = W - PL - PR, ih = H - PB - PT;
    const max = Math.max(...entrati, 1);
    const maxAtt = Math.max(...attesa_mediana_sec, 1);
    const step = iw / days.length;
    const bw = Math.max(2, Math.min(18, step * 0.62));
    const cx = (i: number) => PL + step * i + step / 2;
    const y = (v: number) => PT + ih - (v / max) * ih;
    // attesa in scala logaritmica: i tempi vanno da pochi secondi a giorni
    const yAtt = (v: number) => PT + ih - (Math.log10(Math.max(v, 1) + 1) / Math.log10(maxAtt + 1)) * ih;
    const line = (vals: number[], f: (v: number) => number) =>
      vals.map((v, i) => `${cx(i).toFixed(1)},${f(v).toFixed(1)}`).join(" L");
    // etichette asse X diradate per non sovrapporsi
    const everyN = Math.ceil(days.length / 8);
    return {
      W, H, PL, PR, PB, PT, ih, step, bw, cx, y, yAtt, max, maxAtt, days,
      entrati, assegnati, attesa: attesa_mediana_sec,
      pathAss: `M${line(assegnati, y)}`,
      pathAtt: `M${line(attesa_mediana_sec, yAtt)}`,
      ticks: days.map((d, i) => (i % everyN === 0 ? { i, d } : null)).filter(Boolean) as { i: number; d: string }[],
    };
  }, [speed]);

  if (!speed || speed.days.length === 0) {
    return (
      <div className="p-5 text-sm text-muted-foreground">
        Nessun dato di assegnazione per questa campagna: serve una campagna collegata al lancio in Impostazioni → Lanci.
      </div>
    );
  }

  const totEntrati = speed.entrati.reduce((s, v) => s + v, 0);
  const totAss = speed.assegnati.reduce((s, v) => s + v, 0);
  const maxScaglione = Math.max(...speed.scaglioni.map((s) => s.n), 1);

  const kpi = [
    { k: "Attesa mediana", v: durata(speed.mediana_sec), s: `media ${durata(speed.media_sec)}`, c: C_ATTESA },
    { k: "Assegnati entro 5 min", v: `${String(speed.entro_5min_perc).replace(".", ",")}%`, s: `su ${nfmt(speed.misurati)} misurati`, c: C_ASSEGNATI },
    { k: "Copertura assegnazione", v: pfmt(totAss, totEntrati), s: `${nfmt(speed.non_assegnati)} mai assegnati`, c: C_ASSEGNATI },
    { k: "Lead lavorati", v: totLead ? pfmt(lavorati ?? 0, totLead) : "—",
      s: totLead ? `${nfmt(lavorati ?? 0)} su ${nfmt(totLead)} nei fogli` : "dai fogli sales", c: C_PRENOTATI },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-border">
        {kpi.map((c, i) => (
          <div key={c.k} className={`p-3 border-border ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b lg:border-b-0" : ""} lg:border-r lg:last:border-r-0`}>
            <div className="label-eyebrow">{c.k}</div>
            <div className="text-lg font-bold num tracking-tight" style={{ color: c.c }}>{c.v}</div>
            <div className="text-[10.5px] text-muted-foreground">{c.s}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
        {/* Andamento giornaliero per coorte d'ingresso */}
        <div className="p-4 lg:border-r border-b lg:border-b-0 border-border">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <span className="label-eyebrow">Per giorno d'ingresso del lead</span>
            <span className="flex gap-2.5 text-[10.5px] text-muted-foreground flex-wrap">
              {[["Entrati", C_ENTRATI], ["Assegnati", C_ASSEGNATI], ["Attesa mediana", C_ATTESA]].map(([l, c]) => (
                <span key={l} className="flex items-center gap-1 whitespace-nowrap">
                  <i className="w-2 h-2 rounded-full" style={{ background: c }} /> {l}
                </span>
              ))}
            </span>
          </div>
          {chart && (
            <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full h-auto block">
              {[0, Math.round(chart.max / 2), chart.max].map((v) => (
                <g key={v}>
                  <line x1={chart.PL} x2={chart.W - chart.PR} y1={chart.y(v)} y2={chart.y(v)} stroke="currentColor" className="text-border" />
                  <text x={chart.PL - 5} y={chart.y(v) + 3} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 8 }}>{nfmt(v)}</text>
                </g>
              ))}
              {chart.entrati.map((v, i) => (
                <rect key={i} x={chart.cx(i) - chart.bw / 2} y={chart.y(v)} width={chart.bw}
                  height={Math.max(0, chart.PT + chart.ih - chart.y(v))} rx={1.5} fill={C_ENTRATI} opacity={0.34} />
              ))}
              <path d={chart.pathAtt} fill="none" stroke={C_ATTESA} strokeWidth={1.4} strokeDasharray="3 3" opacity={0.85} />
              <path d={chart.pathAss} fill="none" stroke={C_ASSEGNATI} strokeWidth={1.8} />
              {chart.ticks.map((t) => (
                <text key={t.d} x={chart.cx(t.i)} y={chart.H - 6} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 8 }}>
                  {dLabel(t.d)}
                </text>
              ))}
              {/* asse destro: scala dell'attesa (logaritmica) */}
              {[chart.maxAtt, chart.maxAtt / 10].map((v, i) => (
                <text key={i} x={chart.W - chart.PR + 5} y={chart.yAtt(v) + 3} className="fill-muted-foreground" style={{ fontSize: 8 }}>
                  {durata(v)}
                </text>
              ))}
              {/* fascia trasparente per il tooltip nativo, giorno per giorno */}
              {chart.days.map((d, i) => (
                <rect key={d} x={chart.PL + chart.step * i} y={chart.PT} width={chart.step} height={chart.ih} fill="transparent">
                  <title>{`${dLabel(d)} · ${chart.entrati[i]} entrati · ${chart.assegnati[i]} assegnati · attesa ${durata(chart.attesa[i])}`}</title>
                </rect>
              ))}
            </svg>
          )}
        </div>

        {/* Distribuzione dei tempi di assegnazione */}
        <div className="p-4">
          <div className="label-eyebrow mb-2">Quanto ci mette il lead a essere assegnato</div>
          <div className="space-y-1.5">
            {speed.scaglioni.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="w-[62px] shrink-0 text-[11.5px] text-muted-foreground whitespace-nowrap">{s.label}</span>
                <div className="flex-1 h-3.5 rounded bg-secondary/50 overflow-hidden">
                  <i className="block h-full rounded" style={{
                    width: `${(s.n / maxScaglione) * 100}%`,
                    background: i <= 1 ? C_ASSEGNATI : i === 2 ? C_PRENOTATI : "hsl(0 72% 55%)",
                  }} />
                </div>
                <span className="w-[64px] shrink-0 text-right text-[11.5px] num whitespace-nowrap">
                  {nfmt(s.n)} <span className="text-muted-foreground">{pfmt(s.n, speed.misurati)}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Tempo fra l'arrivo del lead e il momento in cui l'automazione gli assegna un venditore.
            {speed.non_assegnati > 0 && <> {nfmt(speed.non_assegnati)} lead non hanno mai ricevuto un venditore e restano fuori dal conteggio.</>}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SpeedToLeadWidget;
