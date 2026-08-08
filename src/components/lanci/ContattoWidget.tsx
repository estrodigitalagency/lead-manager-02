import { Contatto, LancioRow } from "@/lib/lanci/config";
import { durata } from "./SpeedToLeadWidget";

const C_OK = "hsl(142 71% 50%)";
const C_MID = "hsl(38 92% 55%)";
const C_KO = "hsl(0 72% 55%)";
const BAR = [C_OK, C_OK, C_MID, C_KO, C_KO];

const nfmt = (v: number) => Math.round(v).toLocaleString("it-IT");
const pfmt = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "—");

interface Props { contatto?: Contatto; rows: LancioRow[] }

/**
 * Presa in carico: quanto passa fra il lead che entra nel CRM e il primo messaggio del venditore.
 * Il momento dell'invio arriva dalla colonna "TS Invio" del tab Lead, compilata dal venditore.
 */
const ContattoWidget = ({ contatto, rows }: Props) => {
  if (!contatto || contatto.contattati === 0) {
    return (
      <div className="p-5 text-sm text-muted-foreground">
        Nessun orario di invio nei fogli: la colonna <b>TS Invio</b> del tab Lead è vuota, quindi non si può
        misurare quanto ci mette il venditore a scrivere al lead.
      </div>
    );
  }

  const tracciati = contatto.contattati + contatto.senza_ts;
  const maxSc = Math.max(...contatto.scaglioni.map((s) => s.n), 1);

  // classifica per reattività: chi ha un orario di invio su abbastanza lead
  const classifica = [...rows]
    .filter((r) => (r.contatto?.contattati ?? 0) >= 5)
    .sort((a, b) => (a.contatto!.mediana_sec) - (b.contatto!.mediana_sec));

  const kpi = [
    { k: "Attesa mediana", v: durata(contatto.mediana_sec), s: "dal lead al primo messaggio", c: C_MID },
    { k: "Contattati entro 1 h", v: pfmt(contatto.entro_1h, contatto.contattati), s: `${nfmt(contatto.entro_1h)} lead`, c: C_OK },
    { k: "Contattati entro 24 h", v: pfmt(contatto.entro_24h, contatto.contattati), s: `${nfmt(contatto.entro_24h)} lead`, c: C_OK },
    { k: "Copertura del dato", v: pfmt(contatto.contattati, tracciati), s: `${nfmt(contatto.senza_ts)} senza orario`, c: C_KO },
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr]">
        <div className="p-4 lg:border-r border-b lg:border-b-0 border-border">
          <div className="label-eyebrow mb-2">Quanto ci mette il venditore a scrivere</div>
          <div className="space-y-1.5">
            {contatto.scaglioni.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="w-[54px] shrink-0 text-[11.5px] text-muted-foreground whitespace-nowrap">{s.label}</span>
                <div className="flex-1 h-3.5 rounded bg-secondary/50 overflow-hidden">
                  <i className="block h-full rounded" style={{ width: `${(s.n / maxSc) * 100}%`, background: BAR[i] }} />
                </div>
                <span className="w-[64px] shrink-0 text-right text-[11.5px] num whitespace-nowrap">
                  {nfmt(s.n)} <span className="text-muted-foreground">{pfmt(s.n, contatto.contattati)}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Misurato sulla colonna <b>TS Invio</b> del tab Lead. I lead senza orario non entrano nel conteggio:
            possono essere non ancora contattati oppure contattati senza compilare la colonna.
          </p>
        </div>

        <div className="p-0">
          <div className="label-eyebrow px-4 pt-4 pb-2">Reattività per venditore — dal più veloce</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead><tr>
                <th className="table-header-cell text-left">Sales</th>
                <th className="table-header-cell text-right whitespace-nowrap">Mediana</th>
                <th className="table-header-cell text-right whitespace-nowrap">&lt; 1 h</th>
                <th className="table-header-cell text-right whitespace-nowrap">&lt; 24 h</th>
                <th className="table-header-cell text-right whitespace-nowrap">Con orario</th>
              </tr></thead>
              <tbody>
                {classifica.map((r, i) => {
                  const c = r.contatto!;
                  return (
                    <tr key={r.venditore}>
                      <td className="table-body-cell font-medium whitespace-nowrap">
                        <span className="text-muted-foreground num mr-1.5">{i + 1}</span>{r.venditore.split(" ")[0]}
                      </td>
                      <td className="table-body-cell text-right num whitespace-nowrap"
                        style={{ color: c.mediana_sec < 3600 ? C_OK : c.mediana_sec < 86400 ? C_MID : C_KO }}>
                        {durata(c.mediana_sec)}
                      </td>
                      <td className="table-body-cell text-right num">{pfmt(c.entro_1h, c.contattati)}</td>
                      <td className="table-body-cell text-right num">{pfmt(c.entro_24h, c.contattati)}</td>
                      <td className="table-body-cell text-right num text-muted-foreground whitespace-nowrap">
                        {nfmt(c.contattati)}/{nfmt(c.contattati + c.senza_ts)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {classifica.length === 0 && (
            <p className="px-4 pb-4 text-[12px] text-muted-foreground">
              Nessun venditore ha almeno 5 lead con orario di invio compilato.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContattoWidget;
