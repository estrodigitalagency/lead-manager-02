
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        // Data di 30 giorni fa
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

        console.log('📊 Fetching custom stats with 30 days cutoff:', thirtyDaysAgoISO);

        // 1. Lead Generati - Ultimi 30 giorni filtrati per market
        const { count: leadGeneratiCount } = await supabase
          .from('lead_generation')
          .select('id', { count: 'exact' })
          .gte('created_at', thirtyDaysAgoISO)
          .eq('market', selectedMarket);

        // 2. Call Generate - Ultimi 30 giorni (booked_call) filtrate per market
        const { count: callGenerateCount } = await supabase
          .from('booked_call')
          .select('id', { count: 'exact' })
          .gte('created_at', thirtyDaysAgoISO)
          .eq('market', selectedMarket);

        // 3. Tempo medio assegnazione - SOLO per lead degli ultimi 30 giorni con data_assegnazione del market selezionato
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
            return (assignedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // in ore
          });
          
          const sommaTempi = tempiAssegnazione.reduce((acc, tempo) => acc + tempo, 0);
          tempoMedio = Math.round(sommaTempi / tempiAssegnazione.length);
        }

        console.log('📊 Custom stats results:', {
          leadGeneratiCount,
          callGenerateCount,
          tempoMedio
        });

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
  }, [selectedMarket]); // Refetch when market changes

  const statsConfig = [
    {
      title: "Lead Generati",
      value: isLoading ? "..." : customStats.leadGeneratiUltimi30.toString(),
      change: "ultimi 30 giorni",
      icon: Database,
      color: "text-primary"
    },
    {
      title: "Lead Assegnabili", 
      value: isRefreshing ? "..." : stats.assignable.toString(),
      change: "pronti per assegnazione",
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      title: "Call Generate",
      value: isLoading ? "..." : customStats.callGenerateUltimi30.toString(),
      change: "ultimi 30 giorni",
      icon: Users,
      color: "text-accent"
    },
    {
      title: "Tempo Medio Assegnazione",
      value: isLoading ? "..." : `${customStats.tempoMedioAssegnazione}h`,
      change: "ultimi 30 giorni",
      icon: Zap,
      color: "text-blue-600"
    }
  ];

  return (
    <section className="py-24 px-4 pt-32">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Performance Lead</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Dati degli ultimi 30 giorni del tuo database aggiornati in tempo reale
            {isRefreshing && <span className="block text-sm text-blue-600 mt-2">🔄 Aggiornamento in corso...</span>}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsConfig.map((stat, index) => (
            <Card 
              key={stat.title} 
              className="glass-card hover:scale-105 transition-all duration-300 group"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color} group-hover:scale-110 transition-transform`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline space-x-2">
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {stat.change}
                  </div>
                </div>
                <div className="mt-4 h-2 bg-border/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-shimmer"
                    style={{ 
                      width: (isLoading || isRefreshing) ? '0%' : `${Math.min(100, Math.max(20, (index + 1) * 25))}%`,
                      backgroundSize: '200% 100%'
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
