import { useMemo } from "react";
import { Loader2, Ban } from "lucide-react";
import { MetricKey } from "@/lib/ranking/googleSheets";
import { ValoreCallResp, classificaGenerale, meseRiferimento, nomeSalesInEdge } from "@/lib/ranking/valoreCall";
import { Podium } from "@/components/ranking/Podium";
import { LeaderboardTable } from "@/components/ranking/LeaderboardTable";

interface Props { metric: MetricKey; data: ValoreCallResp | null; memberCode?: string; myName?: string | null; }

/** Classifica con tutte le fonti sommate: quella che vedono i sales. */
const ClassificaGenerale = ({ metric, data: resp, memberCode, myName: myNameProp }: Props) => {
  const myName = useMemo(() => (resp ? nomeSalesInEdge(resp, myNameProp, memberCode) : null), [resp, myNameProp, memberCode]);
  const ranked = useMemo(() => (resp ? classificaGenerale(resp, metric, meseRiferimento(resp)) : []), [resp, metric]);

  if (!resp) return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm">Carico la classifica…</span>
    </div>
  );

  if (ranked.length === 0) return <p className="text-center text-muted-foreground text-sm py-6">Nessuna call in questo periodo.</p>;

  const myRank = myName ? ranked.findIndex((r) => r.name === myName) : -1;
  const podium = ranked.slice(0, 3);
  const fourth = ranked.slice(3, 4);
  const extra = myRank >= 4 ? [ranked[myRank]] : [];

  return (
    <div className="space-y-5">
      {myName && myRank >= 0 && (
        <div className="flex justify-center">
          <span className="text-[13px] font-bold px-3 py-1 rounded-full border border-primary/40 bg-primary/15 text-primary">
            Sei {myRank + 1}° su {ranked.length}
          </span>
        </div>
      )}
      <Podium members={podium} metric={metric} />
      <LeaderboardTable members={[...fourth, ...extra]} metric={metric} highlightName={myName} />
      {myName && myRank < 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          <Ban className="h-4 w-4 shrink-0" />
          <span><span className="font-semibold text-foreground">Tu</span> — nessuna call in questo periodo, non sei in classifica.</span>
        </div>
      )}
    </div>
  );
};

export default ClassificaGenerale;
