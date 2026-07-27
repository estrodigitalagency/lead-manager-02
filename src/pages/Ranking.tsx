import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchSheetData, TeamMember, MetricKey, METRIC_LABELS } from "@/lib/ranking/googleSheets";
import { fetchSettings, getDefaultSheetUrl } from "@/lib/ranking/adminConfig";
import { findMemberByCode } from "@/lib/ranking/hashUtils";
import { HallOfFame } from "@/components/ranking/HallOfFame";
import { InfoBox } from "@/components/ranking/InfoBox";
import { FloatingMoney } from "@/components/ranking/FloatingMoney";
import FontePodium from "@/components/ranking/FontePodium";
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
  const [activeMetric, setActiveMetric] = useState<string>("fatturato");
  const [vcData, setVcData] = useState<any | null>(null); // dati valore-call condivisi (1 solo fetch)

  // Fetch valore-call UNA volta (evita 4 chiamate pesanti, una per tab metrica)
  useEffect(() => {
    const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0Y3dtdXllbW1raXRlcWxvcGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIxMTIsImV4cCI6MjA2MjQ0ODExMn0.NYTXODd9HEglk4b1RKOt1XyrGMiOOs4ltfFyeZknfBE";
    fetch("https://btcwmuyemmkiteqlopce.supabase.co/functions/v1/valore-call?market=IT", { headers: { Authorization: `Bearer ${ANON}` } })
      .then((r) => r.json()).then((j) => { if (!j.error) setVcData(j); }).catch(() => {});
  }, []);

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
          <Tabs value={activeMetric} onValueChange={(v) => setActiveMetric(v as any)}>
            <TabsList className="w-full grid grid-cols-6 mb-8 bg-secondary">
              {(Object.keys(METRIC_LABELS) as MetricKey[]).map((key) => (
                <TabsTrigger key={key} value={key} className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <span className="mr-1 hidden sm:inline">{METRIC_LABELS[key].icon}</span>
                  {METRIC_LABELS[key].label}
                </TabsTrigger>
              ))}
              <TabsTrigger value="hall" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <span className="mr-1 hidden sm:inline">🏆</span> Hall of Fame
              </TabsTrigger>
              <TabsTrigger value="info" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <span className="mr-1 hidden sm:inline">ℹ️</span> Info
              </TabsTrigger>
            </TabsList>

            {(Object.keys(METRIC_LABELS) as MetricKey[]).map((key) => {
              const myName = memberCode ? findMemberByCode(memberCode, members) : (memberLegacy || null);
              return (
                <TabsContent key={key} value={key} className="space-y-8">
                  {/* Classifica per fonte della metrica (niente più generico) */}
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1 text-center">{METRIC_LABELS[key].label} per fonte</h3>
                    <p className="text-muted-foreground text-xs text-center mb-4">Classifica per provenienza · ultimi 3 mesi con call</p>
                    <FontePodium metric={key} memberCode={memberCode} myName={myName} data={vcData} />
                  </div>
                </TabsContent>
              );
            })}

            {/* Tab Hall of Fame */}
            <TabsContent value="hall">
              <HallOfFame images={hofImages} />
            </TabsContent>

            {/* Tab Informazioni importanti */}
            <TabsContent value="info">
              <InfoBox text={infoBox} />
            </TabsContent>
          </Tabs>
        )}

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
