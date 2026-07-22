
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
      bgColor: "bg-primary/10",
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
      bgColor: "bg-yellow-500/10",
      loading: isLoading
    }
  ];

  return (
    <section className="animate-fade-in">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
            Performance
          </h2>
          <span className="label-eyebrow">Ultimi 30 giorni</span>
          {isRefreshing && <span className="text-[11px] text-primary animate-pulse">Sync…</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {statsConfig.map((stat) => (
          <Card key={stat.title} className="stat-card">
            <CardContent className="p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <stat.icon className={`h-3.5 w-3.5 ${stat.accentColor}`} />
                <span className="label-eyebrow">{stat.title}</span>
              </div>
              {stat.loading ? (
                <>
                  <Skeleton className="h-7 w-20 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </>
              ) : (
                <>
                  <div className="text-[26px] font-semibold text-foreground num leading-none tracking-tight">
                    {stat.value}
                  </div>
                  {stat.subtitle && (
                    <p className="text-[11px] text-muted-foreground num">{stat.subtitle}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
