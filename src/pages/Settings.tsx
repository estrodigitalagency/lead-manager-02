
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SalespeopleSettings from "@/components/SalespeopleSettings";
import AttributionWindowSettings from "@/components/AttributionWindowSettings";
import DatabaseManagement from "@/components/DatabaseManagement";

const Settings = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="icon" className="border-primary text-primary hover:bg-primary/10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-primary">Impostazioni</h1>
        </div>
        <Link to="/database">
          <Button variant="outline" className="flex items-center gap-2 border-primary text-primary hover:bg-primary/10">
            <Database size={18} />
            Database Records
          </Button>
        </Link>
      </div>
      
      <Tabs defaultValue="database" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border/30 rounded-xl mb-6">
          <TabsTrigger 
            value="database" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl"
          >
            <Database className="mr-2 h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger 
            value="salespeople"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl"
          >
            <Users className="mr-2 h-4 w-4" />
            Venditori
          </TabsTrigger>
          <TabsTrigger 
            value="attributionWindow"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Finestre di Attribuzione
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="database">
          <DatabaseManagement />
        </TabsContent>
        
        <TabsContent value="salespeople">
          <Card className="rounded-2xl overflow-hidden bg-card">
            <CardHeader className="border-b border-border/30">
              <CardTitle className="text-foreground">Gestione Venditori</CardTitle>
              <CardDescription className="text-muted-foreground">
                Configura i dati dei venditori e le loro impostazioni di Google Sheets
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <SalespeopleSettings />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="attributionWindow">
          <AttributionWindowSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
