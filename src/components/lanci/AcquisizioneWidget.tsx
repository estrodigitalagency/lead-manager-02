import { useMemo } from "react";
import { LancioData } from "@/lib/lanci/config";

const FC = ["hsl(232 100% 74%)", "hsl(174 62% 50%)", "hsl(38 92% 55%)", "hsl(330 81% 65%)", "hsl(220 9% 60%)"];
const shortFonte = (k: string) => k.replace(/^[a-z0-9]+_[a-z0-9]+_/i, "");
const nfmt = (v: number) => Math.round(v).toLocaleString("it-IT");

/** Acquisizione lead: andamento giornaliero (area impilata per fonte) + mix per fonte nuovi/vecchi. */
const AcquisizioneWidget = ({ leadgen }: { leadgen: LancioData["leadgen"] }) => {
  const fList = useMemo(() => {
    if (!leadgen) return [];
    return Object.entries(leadgen.per_fonte)
      .sort((a, b) => (b[1].Nuovo + b[1].Vecchio) - (a[1].Nuovo + a[1].Vecchio));
  }, [leadgen]);

  const chart = useMemo(() => {
    if (!leadgen || leadgen.trend.days.length === 0) return null;
    const { days, series } = leadgen.trend;
    const W = 560, H = 136, PL = 32, PB = 18;
    const tot = days.map((_, i) => Object.values(series).reduce((s, a) => s + (a[i] || 0), 0));
    const max = Math.max(...tot, 1);
    const sx = (W - PL - 6) / Math.max(1, days.length - 1);
    const sy = (H - PB - 10) / max;
    let acc = days.map(() => 0);
    const areas: { d: string; color: string }[] = [];
    fList.forEach(([k], idx) => {
      const a = series[k] || [];
      const top = acc.map((v, i) => v + (a[i] || 0));
      const up = top.map((v, i) => `${(PL + i * sx).toFixed(1)},${(H - PB - v * sy).toFixed(1)}`);
      const dn = acc.map((v, i) => `${(PL + i * sx).toFixed(1)},${(H - PB - v * sy).toFixed(1)}`).reverse();
      areas.push({ d: `M${up.join(" L")} L${dn.join(" L")} Z`, color: FC[idx % FC.length] });
      acc = top;
    });
    return { W, H, PL, PB, sx, sy, max, days, areas };
  }, [leadgen, fList]);

  if (!leadgen) {
    return (
      <div className="p-5 text-sm text-muted-foreground">
        Nessuna campagna collegata a questo lancio: impostala in Impostazioni → Lanci per vedere i lead generati.
      </div>
    );
  }

  const nuovi = fList.reduce((s, [, c]) => s + c.Nuovo, 0);
  const vecchi = fList.reduce((s, [, c]) => s + c.Vecchio, 0);
  const maxF = Math.max(...fList.map(([, c]) => c.Nuovo + c.Vecchio), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr]">
      {/* Andamento giornaliero */}
      <div className="p-4 lg:border-r border-b lg:border-b-0 border-border">
        <div className="label-eyebrow mb-2">Lead generati al giorno {chart && `· picco ${nfmt(chart.max)}`}</div>
        {chart && (
          <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full h-auto block">
            {[0, Math.round(chart.max / 2), chart.max].map((v) => {
              const y = chart.H - chart.PB - v * chart.sy;
              return (
                <g key={v}>
                  <line x1={chart.PL} x2={chart.W - 4} y1={y} y2={y} stroke="currentColor" className="text-border" />
                  <text x={chart.PL - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill="currentColor" className="text-muted-foreground">{v}</text>
                </g>
              );
            })}
            {chart.areas.map((a, i) => (
              <path key={i} d={a.d} fill={a.color} fillOpacity={0.5} stroke={a.color} strokeWidth={1.1} />
            ))}
            {[0, Math.floor(chart.days.length / 2), chart.days.length - 1].map((i) => (
              <text key={i} x={chart.PL + i * chart.sx} y={chart.H - 4} fontSize="9" fill="currentColor" className="text-muted-foreground"
                textAnchor={i === 0 ? "start" : i === chart.days.length - 1 ? "end" : "middle"}>
                {chart.days[i].slice(8)}/{chart.days[i].slice(5, 7)}
              </text>
            ))}
          </svg>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10.5px] text-muted-foreground">
          {fList.map(([k], i) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: FC[i % FC.length] }} />{shortFonte(k)}
            </span>
          ))}
        </div>
      </div>

      {/* Mix per fonte */}
      <div className="p-3.5 flex flex-col gap-2.5">
        {fList.map(([k, c], i) => {
          const tt = c.Nuovo + c.Vecchio;
          const pn = tt ? (c.Nuovo / tt) * 100 : 0;
          return (
            <div key={k}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12.5px] font-medium inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: FC[i % FC.length] }} />{shortFonte(k)}
                </span>
                <span className="text-[13px] font-bold num">
                  {nfmt(tt)}
                  <span className="text-[10.5px] text-muted-foreground font-normal ml-1.5">
                    {((tt / leadgen.generati) * 100).toFixed(1).replace(".", ",")}%
                  </span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden flex mt-1" style={{ width: `${(tt / maxF) * 100}%` }}>
                <i style={{ width: `${pn}%`, background: FC[i % FC.length] }} />
                <i style={{ width: `${100 - pn}%`, background: FC[i % FC.length], opacity: 0.32 }} />
              </div>
              <div className="text-[10.5px] text-muted-foreground num mt-0.5">
                {nfmt(c.Nuovo)} nuovi · {nfmt(c.Vecchio)} vecchi
              </div>
            </div>
          );
        })}
        <div className="border-t border-border pt-2 mt-0.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[12.5px] text-muted-foreground">Totale</span>
            <span className="text-[13px] font-bold num">{nfmt(leadgen.generati)}</span>
          </div>
          <div className="text-[10.5px] text-muted-foreground num">{nfmt(nuovi)} nuovi · {nfmt(vecchi)} vecchi</div>
        </div>
      </div>
    </div>
  );
};

export default AcquisizioneWidget;
