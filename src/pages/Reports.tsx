import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, LayoutDashboard, RefreshCcw } from "lucide-react";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { toast } from "sonner";
import { getTableCounts, getVendorStats } from "@/services/databaseService";
import { getAnalyticsData, AnalyticsData } from "@/services/analyticsService";
import PersistentNavigation from "@/components/PersistentNavigation";

const COLORS = ['#00bcd4', '#00e5ff', '#4fc3f7', '#29b6f6', '#03a9f4', '#0288d1'];

const ReportsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [leadStats, setLeadStats] = useState({
    total: 0,
    assignable: 0,
    assigned: 0,
    booked: 0
  });
  const [vendorStats, setVendorStats] = useState<{ name: string; value: number }[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    leadGenerati: 0,
    conversioneMedia: 0,
    venditoriAttivi: 0,
    speedToLead: 0
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [counts, vendors, analytics] = await Promise.all([
        getTableCounts(),
        getVendorStats(),
        getAnalyticsData()
      ]);
      
      setLeadStats(counts);
      setVendorStats(vendors);
      setAnalyticsData(analytics);
    } catch (error) {
      console.error("Error loading report data:", error);
      toast.error("Errore nel caricamento dei dati per il report");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  // Prepare data for real-time analytics
  const realTimeData = [
    { name: 'Lead Generati (30gg)', value: analyticsData.leadGenerati },
    { name: 'Venditori Attivi', value: analyticsData.venditoriAttivi },
    { name: 'Conversione %', value: analyticsData.conversioneMedia },
    { name: 'Speed to Lead (h)', value: analyticsData.speedToLead }
  ];

  // Prepare data for status pie chart
  const statusPieData = [
    { name: 'Assegnati', value: leadStats.assigned },
    { name: 'Assegnabili non assegnati', value: Math.max(0, leadStats.assignable - leadStats.assigned) },
    { name: 'Non assegnabili', value: Math.max(0, leadStats.total - leadStats.assignable) }
  ];
  
  // Prepare data for activity bar chart
  const activityBarData = [
    { name: 'Totali', value: leadStats.total },
    { name: 'Assegnabili', value: leadStats.assignable },
    { name: 'Assegnati', value: leadStats.assigned },
    { name: 'Prenotati', value: leadStats.booked }
  ];

  return (
    <div className="min-h-screen bg-background">
      <PersistentNavigation />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold gradient-text">Report Analytics</h1>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            disabled={isLoading}
            className="flex items-center gap-2 border-primary/30 hover:border-primary btn-neon"
          >
            {isLoading ? (
              <RefreshCcw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Aggiorna dati
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-Time Analytics (Ultimi 30 giorni) */}
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="flex items-center gap-2 gradient-text">
                <LayoutDashboard className="h-5 w-5" />
                Analytics Tempo Reale (Ultimi 30 Giorni)
              </CardTitle>
              <CardDescription>Dati reali del tuo business aggiornati in tempo reale</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={realTimeData}>
                  <XAxis dataKey="name" stroke="hsl(var(--primary))" />
                  <YAxis stroke="hsl(var(--primary))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--primary))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="value" fill="hsl(var(--primary))">
                    {realTimeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lead Stats Overview */}
          <Card className="glass-card">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="flex items-center gap-2 gradient-text">
                <LayoutDashboard className="h-5 w-5" />
                Statistiche Lead Totali
              </CardTitle>
              <CardDescription>Panoramica di tutti i lead nel database</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={activityBarData}>
                  <XAxis dataKey="name" stroke="hsl(var(--primary))" />
                  <YAxis stroke="hsl(var(--primary))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--primary))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="value" fill="hsl(var(--primary))">
                    {activityBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lead Status Distribution */}
          <Card className="glass-card">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="gradient-text">Distribuzione Stato Lead</CardTitle>
              <CardDescription>Percentuale di lead per stato</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} lead`, '']} 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--primary))',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lead Assignment by Vendor */}
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="border-b border-primary/20">
              <CardTitle className="gradient-text">Assegnazione Lead per Venditore</CardTitle>
              <CardDescription>Numero di lead assegnati a ciascun venditore</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vendorStats}>
                  <XAxis dataKey="name" stroke="hsl(var(--primary))" />
                  <YAxis stroke="hsl(var(--primary))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--primary))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
