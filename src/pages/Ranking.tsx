import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Podium } from "@/components/ranking/Podium";
import { LeaderboardTable } from "@/components/ranking/LeaderboardTable";
import { PersonalStats } from "@/components/ranking/PersonalStats";
import { fetchSheetData, rankByMetric, TeamMember, MetricKey, METRIC_LABELS } from "@/lib/ranking/googleSheets";
import { fetchSettings, getDefaultSheetUrl } from "@/lib/ranking/adminConfig";
import { findMemberByCode } from "@/lib/ranking/hashUtils";
import { HallOfFame } from "@/components/ranking/HallOfFame";
import { InfoBox } from "@/components/ranking/InfoBox";
import { FloatingMoney } from "@/components/ranking/FloatingMoney";
import FonteRankingBlocks from "@/components/ranking/FonteRankingBlocks";
import logo from "@/assets/ranking-logo.png";
import { toast } from "sonner";

const Ranking = () => {
  const [searchParams] = useSearchParams();
  const memberCode = searchParams.get("m") || "";
  const memberLegacy = searchParams.get("member") || "";

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [hofImages, setHofImages] = useState<string[]>([]);
  const [infoBox, setInfoBox] = useState("");
  const [maxRank, setMaxRank] = useState(0);
  const [sheetUrl, setSheetUrl] = useState(getDefaultSheetUrl());
  const [isLoading, setIsLoading] = useState(false);
  const [activeMetric, setActiveMetric] = useState<MetricKey>("fatturato");

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        if (s.sheet_url) setSheetUrl(s.sheet_url);
        if (s.max_rank) setMaxRank(parseInt(s.max_rank, 10) || 0);
        if (s.info_box) setInfoBox(s.info_box);
        if (s.hof_images) {
          try { setHofImages(JSON.parse(s.hof_images)); } catch { /* ignore */ }
        }
      })
      .catch(() => { /* use defaults */ });
  }, []);

  const loadData = useCallback(async () => {
    if (!sheetUrl) return;
    setIsLoading(true);
    try {
      const data = await fetchSheetData(sheetUrl);
      setMembers(data);
    } catch (err: any) {
      toast.error(err.message || "Errore nel caricamento dei dati");
    } finally {
      setIsLoading(false);
    }
  }, [sheetUrl]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const limitMembers = (ranked: ReturnType<typeof rankByMetric>) => {
    if (maxRank > 0) return ranked.slice(0, maxRank);
    return ranked;
  };

  return (
    <div className="min-h-screen bg-background">
      <FloatingMoney />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-3 mb-2">
            <img src={logo} alt="Ranking" className="h-12 sm:h-14" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Top Sales Ranking 🏆
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">Classifica commerciale in tempo reale</p>
        </div>

        {members.length > 0 && (
          <Tabs value={activeMetric} onValueChange={(v) => setActiveMetric(v as MetricKey)}>
            <TabsList className="w-full grid grid-cols-4 mb-8 bg-secondary">
              {(Object.keys(METRIC_LABELS) as MetricKey[]).map((key) => (
                <TabsTrigger key={key} value={key} className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <span className="mr-1 hidden sm:inline">{METRIC_LABELS[key].icon}</span>
                  {METRIC_LABELS[key].label}
                </TabsTrigger>
              ))}
            </TabsList>

            {(Object.keys(METRIC_LABELS) as MetricKey[]).map((key) => {
              const fullRanked = rankByMetric(members, key); // classifica completa (per posizione reale)
              const podium = fullRanked.slice(0, 3);
              const fourth = fullRanked.slice(3, 4); // sempre il 4°
              // Se link individuale e il venditore è oltre il 4° → mostra la sua riga sotto
              const myName = memberCode ? findMemberByCode(memberCode, members) : (memberLegacy || null);
              const myIdx = myName ? fullRanked.findIndex((r) => r.name === myName) : -1;
              const extra = myIdx >= 4 ? [fullRanked[myIdx]] : [];
              const rest = [...fourth, ...extra];
              return (
                <TabsContent key={key} value={key} className="space-y-8">
                  <Podium members={podium} metric={key} />
                  <LeaderboardTable members={rest} metric={key} highlightName={myName} />
                </TabsContent>
              );
            })}
          </Tabs>
        )}

        {(() => {
          const resolvedName = memberCode
            ? findMemberByCode(memberCode, members)
            : memberLegacy || null;
          return resolvedName && members.length > 0 ? (
            <PersonalStats memberName={resolvedName} allMembers={members} />
          ) : null;
        })()}

        {/* Classifiche valore call per fonte (escl. outbound) */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-foreground mb-1 text-center">Valore call per fonte 📞</h2>
          <p className="text-muted-foreground text-xs text-center mb-4">Classifica per fonte · ultimi 3 mesi con call</p>
          <FonteRankingBlocks market="IT" memberCode={memberCode} />
        </div>

        <InfoBox text={infoBox} />

        <HallOfFame images={hofImages} />

        {!isLoading && members.length === 0 && (
          <p className="text-center text-muted-foreground mt-8">
            Nessun dato trovato. Configura il foglio Google da Impostazioni → Ranking.
          </p>
        )}
      </div>
    </div>
  );
};

export default Ranking;
