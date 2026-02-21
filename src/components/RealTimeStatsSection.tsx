
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        console.error('❌ Errore nel caricamento delle statistiche:', error);
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
      change: "ultimi 30 giorni",
      icon: Database,
      color: "text-primary",
      loading: isLoading
    },
    {
      title: "Lead Assegnabili", 
      value: stats.assignable.toString(),
      change: "pronti per assegnazione",
      icon: TrendingUp,
      color: "text-green-400",
      loading: isRefreshing
    },
    {
      title: "Call Generate",
      value: customStats.callGenerateUltimi30.toString(),
      change: "ultimi 30 giorni",
      icon: Users,
      color: "text-accent",
      loading: isLoading
    },
    {
      title: "Tempo Medio Assegnazione",
      value: `${customStats.tempoMedioAssegnazione}h`,
      change: "ultimi 30 giorni",
      icon: Zap,
      color: "text-blue-400",
      loading: isLoading
    }
  ];

  return (
    <section className="py-6 md:py-12 px-0">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-4xl font-bold mb-2">
            <span className="gradient-text">Performance Lead</span>
          </h2>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Dati degli ultimi 30 giorni aggiornati in tempo reale
            {isRefreshing && <span className="block text-sm text-primary mt-1">🔄 Aggiornamento in corso...</span>}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {statsConfig.map((stat) => (
            <Card 
              key={stat.title} 
              className="glass-card hover:scale-[1.02] transition-all duration-300 group"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color} group-hover:scale-110 transition-transform`} />
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                {stat.loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-7 md:h-9 w-16 md:w-24" />
                    <Skeleton className="h-3 md:h-4 w-20 md:w-32" />
                  </div>
                ) : (
                  <div>
                    <div className="text-xl md:text-3xl font-bold">{stat.value}</div>
                    <div className="text-xs md:text-sm font-medium text-muted-foreground mt-1">
                      {stat.change}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
