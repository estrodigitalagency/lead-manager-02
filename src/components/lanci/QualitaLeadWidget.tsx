import { useMemo } from "react";
import { QualitaLead, LancioRow } from "@/lib/lanci/config";

const nfmt = (v: number) => Math.round(v).toLocaleString("it-IT");
const eur = (v: number) => `€${Math.round(v).toLocaleString("it-IT")}`;
const pct = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;
const pfmt = (a: number, b: number) => (b > 0 ? pct((a / b) * 100) : "—");

// voti alti = lead già vicini all'acquisto, voti bassi = lead da costruire
const ALTI = new Set(["3 - CP", "4 - ISF", "5 - MM"]);

interface Props { qualita?: QualitaLead; rows: LancioRow[]; votiOrder: string[] }

/**
 * Qualità del lead contro il risultato: il voto 1-5 assegnato nel tab Lead incrociato con
 * l'esito della call. Dice se un venditore chiude solo i lead facili o converte anche i difficili.
 * L'incrocio avviene per nome del lead, quindi copre solo le call che si ritrovano nel tab Lead.
 */
const QualitaLeadWidget = ({ qualita, rows, votiOrder }: Props) => {
  const perSales = useMemo(() => {
    return rows
      .map((r) => {
        const pv = r.per_voto ?? {};
        const acc = { alto: { nette: 0, chius: 0, fatt: 0 }, basso: { nette: 0, chius: 0, fatt: 0 } };
        for (const [voto, v] of Object.entries(pv)) {
          const b = ALTI.has(voto) ? acc.alto : acc.basso;
          b.nette += v.nette; b.chius += v.chiusure; b.fatt += v.fatturato;
        }
        return { venditore: r.venditore, ...acc, abbinate: r.call_abbinate ?? 0 };
      })
      .filter((r) => r.abbinate >= 5)
      .sort((a, b) => {
        const ta = a.basso.nette > 0 ? a.basso.chius / a.basso.nette : -1;
        const tb = b.basso.nette > 0 ? b.basso.chius / b.basso.nette : -1;
        return tb - ta;
      });
  }, [rows]);

  if (!qualita || qualita.call_abbinate === 0) {
    return (
      <div className="p-5 text-sm text-muted-foreground">
        Nessuna call agganciata a un voto: serve la colonna <b>Voto 1-5</b> compilata nel tab Lead e lo
        stesso nome del lead nel tab delle call.
      </div>
    );
  }

  const maxCall = Math.max(...qualita.voti.map((v) => v.call), 1);
  const copertura = qualita.call_totali > 0 ? (qualita.call_abbinate / qualita.call_totali) * 100 : 0;
  const attese = qualita.voti.filter((v) => v.nette > 0);
  const migliore = attese.length ? attese.reduce((a, b) => (b.tasso_nette > a.tasso_nette ? b : a)) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap px-3.5 py-2 border-b border-border">
        <span className="text-[11.5px] text-muted-foreground">
          {nfmt(qualita.call_abbinate)} call su {nfmt(qualita.call_totali)} agganciate a un voto
          <span className={copertura < 60 ? "text-amber-400" : ""}> ({pct(copertura)})</span>
        </span>
        {migliore && (
          <span className="text-[11.5px] text-muted-foreground">
            Converte meglio: <b className="text-foreground/80">{migliore.voto}</b> con {pct(migliore.tasso_nette)} sulle nette
          </span>
        )}
      </div>

      {/* Team: una riga per voto */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead><tr>
            <th className="table-header-cell text-left">Voto del lead</th>
            <th className="table-header-cell text-right whitespace-nowrap">Call</th>
            <th className="table-header-cell text-right whitespace-nowrap">Nette</th>
            <th className="table-header-cell text-right whitespace-nowrap">Chiusure</th>
            <th className="table-header-cell text-right whitespace-nowrap">Chiusura su nette</th>
            <th className="table-header-cell text-right whitespace-nowrap">Fatturato</th>
            <th className="table-header-cell text-right whitespace-nowrap">Ticket medio</th>
          </tr></thead>
          <tbody>
            {qualita.voti.map((v) => (
              <tr key={v.voto} className={v.call === 0 ? "opacity-45" : ""}>
                <td className="table-body-cell font-medium whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <i className="w-1.5 h-4 rounded-sm shrink-0"
                      style={{ background: ALTI.has(v.voto) ? "hsl(142 71% 50%)" : "hsl(38 92% 55%)" }} />
                    {v.voto}
                  </span>
                </td>
                <td className="table-body-cell text-right num">
                  <span className="inline-flex items-center gap-1.5 justify-end">
                    <i className="hidden sm:block h-1.5 rounded-full bg-primary/45"
                      style={{ width: `${Math.max(2, (v.call / maxCall) * 54)}px` }} />
                    {nfmt(v.call)}
                  </span>
                </td>
                <td className="table-body-cell text-right num">{nfmt(v.nette)}</td>
                <td className="table-body-cell text-right num">{nfmt(v.chiusure)}</td>
                <td className="table-body-cell text-right num font-semibold"
                  style={{ color: v.nette === 0 ? undefined : v.tasso_nette >= 20 ? "hsl(142 71% 55%)" : v.tasso_nette >= 10 ? "hsl(38 92% 60%)" : "hsl(0 84% 68%)" }}>
                  {v.nette > 0 ? pct(v.tasso_nette) : "—"}
                </td>
                <td className="table-body-cell text-right num">{v.fatturato > 0 ? eur(v.fatturato) : "—"}</td>
                <td className="table-body-cell text-right num text-muted-foreground">{v.ticket > 0 ? eur(v.ticket) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per sales: chiude anche i lead difficili? */}
      <div className="border-t border-border">
        <div className="label-eyebrow px-3.5 pt-3 pb-1.5">
          Chi converte anche i lead difficili — ordinato per resa sui voti 1-2
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead><tr>
              <th className="table-header-cell text-left">Sales</th>
              <th className="table-header-cell text-right whitespace-nowrap">Nette 3-5</th>
              <th className="table-header-cell text-right whitespace-nowrap">Chiusura 3-5</th>
              <th className="table-header-cell text-right whitespace-nowrap">Nette 1-2</th>
              <th className="table-header-cell text-right whitespace-nowrap">Chiusura 1-2</th>
              <th className="table-header-cell text-right whitespace-nowrap">Fatturato da 1-2</th>
            </tr></thead>
            <tbody>
              {perSales.map((r) => (
                <tr key={r.venditore}>
                  <td className="table-body-cell font-medium whitespace-nowrap">{r.venditore.split(" ")[0]}</td>
                  <td className="table-body-cell text-right num text-muted-foreground">{nfmt(r.alto.nette)}</td>
                  <td className="table-body-cell text-right num">{pfmt(r.alto.chius, r.alto.nette)}</td>
                  <td className="table-body-cell text-right num text-muted-foreground">{nfmt(r.basso.nette)}</td>
                  <td className="table-body-cell text-right num font-semibold"
                    style={{ color: r.basso.nette === 0 ? undefined : r.basso.chius > 0 ? "hsl(142 71% 55%)" : "hsl(0 84% 68%)" }}>
                    {pfmt(r.basso.chius, r.basso.nette)}
                  </td>
                  <td className="table-body-cell text-right num">{r.basso.fatt > 0 ? eur(r.basso.fatt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {perSales.length === 0 && (
          <p className="px-3.5 pb-3.5 text-[12px] text-muted-foreground">
            Nessun venditore ha almeno 5 call agganciate a un voto.
          </p>
        )}
        <p className="text-[11px] text-muted-foreground px-3.5 py-3 border-t border-border">
          Il voto viene dal tab Lead ({votiOrder.join(" · ")}) e l'aggancio alla call avviene per nome del lead:
          le call di lead non presenti nel tab, o senza voto, restano fuori. Percentuali calcolate sulle call nette.
        </p>
      </div>
    </div>
  );
};

export default QualitaLeadWidget;
