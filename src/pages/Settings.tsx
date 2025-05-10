
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, Users, Calendar, Rocket } from "lucide-react";
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
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Rocket size={24} className="text-primary" />
            <h1 className="text-3xl font-bold">LeadGen Hero - Impostazioni</h1>
          </div>
        </div>
        <Link to="/database">
          <Button variant="outline" className="flex items-center gap-2">
            <Database size={18} />
            Database Records
          </Button>
        </Link>
      </div>
      
      <Tabs defaultValue="database" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="database">
            <Database className="mr-2 h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="salespeople">
            <Users className="mr-2 h-4 w-4" />
            Venditori
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="database">
          <DatabaseManagement />
        </TabsContent>
        
        <TabsContent value="salespeople">
          <Card>
            <CardHeader>
              <CardTitle>Gestione Venditori</CardTitle>
              <CardDescription>
                Configura i dati dei venditori e le loro impostazioni di Google Sheets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalespeopleSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
