
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Database, Zap } from 'lucide-react';
import { getAnalyticsData, AnalyticsData } from '@/services/analyticsService';

export const RealTimeStatsSection = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    leadGenerati: 0,
    conversioneMedia: 0,
    venditoriAttivi: 0,
    speedToLead: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const data = await getAnalyticsData();
        setAnalyticsData(data);
      } catch (error) {
        console.error('Errore nel caricamento delle analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const stats = [
    {
      title: "Lead Generati (30gg)",
      value: isLoading ? "..." : analyticsData.leadGenerati.toString(),
      change: "+ultimi 30gg",
      icon: Database,
      color: "text-primary"
    },
    {
      title: "Conversione Media",
      value: isLoading ? "..." : `${analyticsData.conversioneMedia}%`,
      change: "prenotati/generati",
      icon: TrendingUp,
      color: "text-accent"
    },
    {
      title: "Venditori Attivi",
      value: isLoading ? "..." : analyticsData.venditoriAttivi.toString(),
      change: "ultimi 30gg",
      icon: Users,
      color: "text-primary"
    },
    {
      title: "Speed to Lead",
      value: isLoading ? "..." : `${analyticsData.speedToLead}h`,
      change: "tempo medio",
      icon: Zap,
      color: "text-accent"
    }
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Performance Ultimi 30 Giorni</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Dati reali del tuo business aggiornati in tempo reale
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
