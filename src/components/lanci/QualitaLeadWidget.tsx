import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { QualitaLead, LancioRow } from "@/lib/lanci/config";

const nfmt = (v: number) => Math.round(v).toLocaleString("it-IT");
const eur = (v: number) => `€${Math.round(v / 100) / 10}k`.replace(".", ",");
const pct = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;
const ratio = (a: number, b: number) => (b > 0 ? (a / b) * 100 : -1);

// voti alti = lead già vicini all'acquisto, voti bassi = lead da costruire
const ALTI = new Set(["3 - CP", "4 - ISF", "5 - MM"]);
const tint = (t: number) => (t < 0 ? "hsl(220 9% 55%)" : t >= 20 ? "hsl(142 71% 55%)" : t >= 10 ? "hsl(38 92% 60%)" : "hsl(0 84% 68%)");

interface Props { qualita?: QualitaLead; rows: LancioRow[] }

/**
 * Qualità del lead contro il risultato: il voto 1-5 del tab Lead incrociato con l'esito della call.
 * Serve a vedere se un venditore chiude solo i lead già caldi o converte anche i difficili.
 * L'incrocio è per nome, quindi copre solo le call che si ritrovano nel tab Lead.
 */
const QualitaLeadWidget = ({ qualita, rows }: Props) => {
  const [apri, setApri] = useState(false);

  const perSales = useMemo(() => rows
    .map((r) => {
      const acc = { alto: { n: 0, c: 0 }, basso: { n: 0, c: 0 } };
      for (const [voto, v] of Object.entries(r.per_voto ?? {})) {
        const b = ALTI.has(voto) ? acc.alto : acc.basso;
        b.n += v.nette; b.c += v.chiusure;
      }
      return { nome: r.venditore.split(" ")[0], ...acc, ab: r.call_abbinate ?? 0 };
    })
    .filter((r) => r.ab >= 5)
    .sort((a, b) => ratio(b.basso.c, b.basso.n) - ratio(a.basso.c, a.basso.n)), [rows]);

  if (!qualita || qualita.call_abbinate === 0) {
    // Senza call non c'e niente da incrociare: dare la colpa al voto manderebbe a cercare
    // nel posto sbagliato.
    const senzaCall = !qualita || qualita.call_totali === 0;
    return (
      <div className="p-5 text-sm text-muted-foreground">
        {senzaCall ? (
          <>Nessuna call in questo lancio: questa vista incrocia il voto del lead con l'esito della sua
          call, quindi si popola quando le call cominciano ad arrivare nei tab del mese.</>
        ) : (
          <>Nessuna delle {qualita.call_totali} call e agganciata a un voto: serve la colonna <b>Voto 1-5</b>{" "}
          compilata nel tab Lead, e il nome del lead scritto allo stesso modo nei due tab.</>
        )}
      </div>
    );
  }

  const cop = ratio(qualita.call_abbinate, qualita.call_totali);
  const attivi = qualita.voti.filter((v) => v.call > 0);

  return (
    <div>
      {/* Una scheda per voto: il tasso di chiusura è il numero che conta */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5">
        {attivi.map((v) => {
          const t = ratio(v.chiusure, v.nette);
          return (
            <div key={v.voto} className="p-3 border-b border-r border-border">
              <div className="flex items-center gap-1.5 mb-1">
                <i className="w-1.5 h-3 rounded-sm shrink-0"
                  style={{ background: ALTI.has(v.voto) ? "hsl(142 71% 50%)" : "hsl(38 92% 55%)" }} />
                <span className="label-eyebrow truncate">{v.voto}</span>
              </div>
              <div className="text-xl font-bold num tracking-tight" style={{ color: tint(t) }}>
                {v.nette > 0 ? pct(t) : "—"}
              </div>
              <div className="text-[10.5px] text-muted-foreground">chiusura su nette</div>
              <div className="text-[10.5px] text-muted-foreground mt-1.5 num">
                {nfmt(v.call)} call · {nfmt(v.chiusure)} chiuse
              </div>
              <div className="text-[10.5px] num" style={{ color: v.ticket ? "hsl(174 62% 55%)" : undefined }}>
                {v.ticket ? `${eur(v.ticket)} ticket medio` : "—"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chi converte anche i difficili */}
      <button type="button" onClick={() => setApri((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-secondary/30 transition-colors">
        <span className="label-eyebrow">Chi converte anche i lead difficili (voti 1-2)</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${apri ? "rotate-180" : ""}`} />
      </button>

      {apri && (
        <div className="px-3.5 pb-3 space-y-1.5">
          <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
            <span className="flex-1" />
            <span className="w-[86px] text-right">Facili 3-5</span>
            <span className="w-[86px] text-right">Difficili 1-2</span>
          </div>
          {perSales.map((r) => {
            const ta = ratio(r.alto.c, r.alto.n), tb = ratio(r.basso.c, r.basso.n);
            const cell = (t: number, n: number, c: number) => (
              <span className="w-[86px] shrink-0 flex items-center gap-1.5 justify-end">
                <i className="h-1.5 rounded-full" style={{ width: `${Math.max(2, Math.min(34, t < 0 ? 0 : t))}px`, background: tint(t) }} />
                <span className="text-[11.5px] num whitespace-nowrap" style={{ color: tint(t) }}>
                  {t < 0 ? "—" : `${Math.round(t)}%`}
                </span>
                <span className="text-[10px] num text-muted-foreground w-[30px] text-right">{c}/{n}</span>
              </span>
            );
            return (
              <div key={r.nome} className="flex items-center gap-2">
                <span className="flex-1 min-w-0 text-[12.5px] truncate">{r.nome}</span>
                {cell(ta, r.alto.n, r.alto.c)}
                {cell(tb, r.basso.n, r.basso.c)}
              </div>
            );
          })}
          {perSales.length === 0 && (
            <p className="text-[12px] text-muted-foreground">Nessun venditore ha almeno 5 call agganciate a un voto.</p>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground px-3.5 py-2.5 border-t border-border">
        Voto dal tab Lead, agganciato alla call per nome del lead: {nfmt(qualita.call_abbinate)} call su {nfmt(qualita.call_totali)}
        <span className={cop < 60 ? "text-amber-400" : ""}> ({pct(cop)})</span>. Percentuali sulle call nette.
        Con pochi lead per voto una sola chiusura sposta molto: leggilo come tendenza, non come voto di merito.
      </p>
    </div>
  );
};

export default QualitaLeadWidget;
