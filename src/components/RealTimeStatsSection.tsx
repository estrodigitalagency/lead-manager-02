
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users, Database, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLeadSync } from '@/contexts/LeadSyncContext';
import { useMarket } from '@/contexts/MarketContext';

export const RealTimeStatsSection = () => {
  const { selectedMarket } = useMarket();
  const { stats, isRefreshing } = useLeadSync();
  const [customStats, setCustomStats] = useState({
    leadGeneratiUltimi30: 0,
    callGenerateUltimi30: 0,
    tempoMedioAssegnazione: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCustomStats = async () => {
      setIsLoading(true);
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

        const { count: leadGeneratiCount } = await supabase
          .from('lead_generation')
          .select('id', { count: 'exact' })
          .gte('created_at', thirtyDaysAgoISO)
          .eq('market', selectedMarket);

        const { count: callGenerateCount } = await supabase
          .from('booked_call')
          .select('id', { count: 'exact' })
          .gte('created_at', thirtyDaysAgoISO)
          .eq('market', selectedMarket);

        const { data: assignedLeads } = await supabase
          .from('lead_generation')
          .select('created_at, data_assegnazione')
          .not('data_assegnazione', 'is', null)
          .gte('created_at', thirtyDaysAgoISO)
          .eq('market', selectedMarket);

        let tempoMedio = 0;
        if (assignedLeads && assignedLeads.length > 0) {
          const tempiAssegnazione = assignedLeads.map(lead => {
            const createdAt = new Date(lead.created_at);
            const assignedAt = new Date(lead.data_assegnazione!);
            return (assignedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          });
          const sommaTempi = tempiAssegnazione.reduce((acc, tempo) => acc + tempo, 0);
          tempoMedio = Math.round(sommaTempi / tempiAssegnazione.length);
        }

        setCustomStats({
          leadGeneratiUltimi30: leadGeneratiCount || 0,
          callGenerateUltimi30: callGenerateCount || 0,
          tempoMedioAssegnazione: tempoMedio
        });
      } catch (error) {
        console.error('Errore nel caricamento delle statistiche:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomStats();
  }, [selectedMarket]);

  const statsConfig = [
    {
      title: "Lead Generati",
      value: customStats.leadGeneratiUltimi30.toString(),
      subtitle: "ultimi 30 giorni",
      icon: Database,
      accentColor: "text-blue-600",
      bgColor: "bg-blue-50",
      loading: isLoading
    },
    {
      title: "Lead Assegnabili",
      value: stats.assignable.toString(),
      subtitle: "pronti per assegnazione",
      icon: TrendingUp,
      accentColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
      loading: isRefreshing
    },
    {
      title: "Call Generate",
      value: customStats.callGenerateUltimi30.toString(),
      subtitle: "ultimi 30 giorni",
      icon: Users,
      accentColor: "text-violet-600",
      bgColor: "bg-violet-50",
      loading: isLoading
    },
    {
      title: "Tempo Medio",
      value: `${customStats.tempoMedioAssegnazione}h`,
      subtitle: "assegnazione",
      icon: Zap,
      accentColor: "text-amber-600",
      bgColor: "bg-amber-50",
      loading: isLoading
    }
  ];

  return (
    <section className="animate-fade-in">
      <div className="flex items-baseline justify-between mb-4 sm:mb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            Performance
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ultimi 30 giorni
            {isRefreshing && <span className="ml-2 text-primary animate-pulse">Aggiornamento...</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statsConfig.map((stat, i) => (
          <Card key={stat.title} className={`stat-card group stagger-${i + 1} animate-slide-up`}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className={`icon-container-sm ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.accentColor}`} />
                </div>
              </div>
              {stat.loading ? (
                <div className="space-y-2.5">
                  <Skeleton className="h-8 w-16 rounded-lg" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              ) : (
                <>
                  <div className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums tracking-tight">
                    {stat.value}
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 font-medium">
                    {stat.title}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
