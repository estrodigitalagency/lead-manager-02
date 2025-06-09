
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Database, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const RealTimeStatsSection = () => {
  const [stats, setStats] = useState({
    leadGeneratiUltimi30: 0,
    leadAssegnabili: 0,
    callGenerateUltimi30: 0,
    tempoMedioAssegnazione: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Data di 30 giorni fa
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. Lead Generati - Ultimi 30 giorni
        const { count: leadGeneratiCount } = await supabase
          .from('lead_generation')
          .select('id', { count: 'exact' })
          .gte('created_at', thirtyDaysAgo.toISOString());

        // 2. Lead Assegnabili - tutti quelli con assignable = true
        const { count: leadAssegnabiliCount } = await supabase
          .from('lead_generation')
          .select('id', { count: 'exact' })
          .eq('assignable', true);

        // 3. Call Generate - Ultimi 30 giorni (booked_call)
        const { count: callGenerateCount } = await supabase
          .from('booked_call')
          .select('id', { count: 'exact' })
          .gte('created_at', thirtyDaysAgo.toISOString());

        // 4. Tempo medio assegnazione - calcolo del tempo medio tra created_at e quando vengono assegnati
        const { data: assignedLeads } = await supabase
          .from('lead_generation')
          .select('created_at, updated_at')
          .not('venditore', 'is', null);

        let tempoMedio = 0;
        if (assignedLeads && assignedLeads.length > 0) {
          const tempiAssegnazione = assignedLeads.map(lead => {
            const createdAt = new Date(lead.created_at);
            const assignedAt = new Date(lead.updated_at);
            return (assignedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // in ore
          });
          
          const sommaTempi = tempiAssegnazione.reduce((acc, tempo) => acc + tempo, 0);
          tempoMedio = Math.round(sommaTempi / tempiAssegnazione.length);
        }

        setStats({
          leadGeneratiUltimi30: leadGeneratiCount || 0,
          leadAssegnabili: leadAssegnabiliCount || 0,
          callGenerateUltimi30: callGenerateCount || 0,
          tempoMedioAssegnazione: tempoMedio
        });

      } catch (error) {
        console.error('Errore nel caricamento delle statistiche:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statsConfig = [
    {
      title: "Lead Generati",
      value: isLoading ? "..." : stats.leadGeneratiUltimi30.toString(),
      change: "ultimi 30 giorni",
      icon: Database,
      color: "text-primary"
    },
    {
      title: "Lead Assegnabili", 
      value: isLoading ? "..." : stats.leadAssegnabili.toString(),
      change: "pronti per assegnazione",
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      title: "Call Generate",
      value: isLoading ? "..." : stats.callGenerateUltimi30.toString(),
      change: "ultimi 30 giorni",
      icon: Users,
      color: "text-accent"
    },
    {
      title: "Tempo Medio Assegnazione",
      value: isLoading ? "..." : `${stats.tempoMedioAssegnazione}h`,
      change: "media ore",
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
            Dati reali del tuo database aggiornati in tempo reale
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
                      width: isLoading ? '0%' : `${Math.min(100, Math.max(20, (index + 1) * 25))}%`,
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
