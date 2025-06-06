
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, LayoutDashboard, RefreshCcw } from "lucide-react";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { toast } from "sonner";
import { getTableCounts, getVendorStats } from "@/services/databaseService";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a480cf', '#82ca9d'];

const ReportsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [leadStats, setLeadStats] = useState({
    total: 0,
    assignable: 0,
    assigned: 0,
    booked: 0
  });
  const [vendorStats, setVendorStats] = useState<{ name: string; value: number }[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Use optimized functions for better performance
      const [counts, vendors] = await Promise.all([
        getTableCounts(),
        getVendorStats()
      ]);
      
      setLeadStats(counts);
      setVendorStats(vendors);
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="icon" className="border">
              <ArrowLeft className="h-4 w-4 text-primary" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-primary">Report</h1>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          disabled={isLoading}
          className="flex items-center gap-2 border"
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
        {/* Lead Stats Overview */}
        <Card className="border">
          <CardHeader className="border-b border-border/30">
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Statistiche Lead
            </CardTitle>
            <CardDescription>Panoramica dei lead e del loro stato</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityBarData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#4f46e5">
                  {activityBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Status Distribution */}
        <Card className="border">
          <CardHeader className="border-b border-border/30">
            <CardTitle>Distribuzione Stato Lead</CardTitle>
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
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} lead`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Assignment by Vendor */}
        <Card className="border lg:col-span-2">
          <CardHeader className="border-b border-border/30">
            <CardTitle>Assegnazione Lead per Venditore</CardTitle>
            <CardDescription>Numero di lead assegnati a ciascun venditore</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendorStats}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;
