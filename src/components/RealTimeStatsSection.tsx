
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Database, Zap } from 'lucide-react';
import { getAnalyticsData, AnalyticsData } from '@/services/analyticsService';
import { supabase } from '@/integrations/supabase/client';

export const RealTimeStatsSection = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    leadGenerati: 0,
    conversioneMedia: 0,
    venditoriAttivi: 0,
    speedToLead: 0
  });
  const [leadStats, setLeadStats] = useState({
    totalLeads: 0,
    assignableLeads: 0,
    assignedLeads: 0,
    unassignedLeads: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        // Fetch analytics data
        const analytics = await getAnalyticsData();
        setAnalyticsData(analytics);

        // Fetch detailed lead stats with debug logging
        const { data: allLeads, error } = await supabase
          .from('lead_generation')
          .select('assignable, venditore');
        
        if (error) throw error;

        console.log(`Debug - Total leads in database: ${allLeads.length}`);
        
        const assignableLeads = allLeads.filter(lead => lead.assignable === true);
        const assignedLeads = allLeads.filter(lead => lead.venditore !== null);
        const unassignedLeads = allLeads.filter(lead => lead.assignable === true && lead.venditore === null);

        console.log(`Debug - Assignable leads: ${assignableLeads.length}`);
        console.log(`Debug - Assigned leads: ${assignedLeads.length}`);
        console.log(`Debug - Unassigned leads: ${unassignedLeads.length}`);

        const stats = {
          totalLeads: allLeads.length,
          assignableLeads: assignableLeads.length,
          assignedLeads: assignedLeads.length,
          unassignedLeads: unassignedLeads.length
        };

        setLeadStats(stats);
      } catch (error) {
        console.error('Errore nel caricamento delle analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const stats = [
    {
      title: "Lead Totali",
      value: isLoading ? "..." : leadStats.totalLeads.toString(),
      change: "tutti i tempi",
      icon: Database,
      color: "text-primary"
    },
    {
      title: "Lead Assegnabili",
      value: isLoading ? "..." : leadStats.assignableLeads.toString(),
      change: "prenotati",
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      title: "Lead Disponibili",
      value: isLoading ? "..." : leadStats.unassignedLeads.toString(),
      change: "per assegnazione",
      icon: Users,
      color: "text-accent"
    },
    {
      title: "Lead Assegnati",
      value: isLoading ? "..." : leadStats.assignedLeads.toString(),
      change: "ai venditori",
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
          {stats.map((stat, index) => (
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
