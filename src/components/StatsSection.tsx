
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Database, Zap } from 'lucide-react';

export const StatsSection = () => {
  const stats = [
    {
      title: "Lead Processati",
      value: "15.847",
      change: "+12.5%",
      icon: Database,
      color: "text-primary"
    },
    {
      title: "Conversione Media",
      value: "24.8%",
      change: "+3.2%",
      icon: TrendingUp,
      color: "text-accent"
    },
    {
      title: "Venditori Attivi",
      value: "42",
      change: "+5",
      icon: Users,
      color: "text-primary"
    },
    {
      title: "Tempo Risposta",
      value: "2.1min",
      change: "-15%",
      icon: Zap,
      color: "text-accent"
    }
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Performance in Tempo Reale</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Monitora le metriche chiave del tuo business con dashboard avanzate
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
                  <div className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-primary' : 'text-accent'}`}>
                    {stat.change}
                  </div>
                </div>
                <div className="mt-4 h-2 bg-border/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-shimmer"
                    style={{ 
                      width: `${Math.random() * 60 + 40}%`,
                      backgroundSize: '200% 100%'
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Interactive chart preview */}
        <div className="mt-16">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-2xl gradient-text">Andamento Lead</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end space-x-2">
                {Array.from({ length: 12 }, (_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-primary/60 to-accent/60 rounded-t-lg animate-glow"
                    style={{ 
                      height: `${Math.random() * 80 + 20}%`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  ></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
