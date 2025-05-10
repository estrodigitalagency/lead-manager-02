
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Database, Webhook, ArrowLeft, Users } from "lucide-react";
import SalespeopleSettings from "@/components/SalespeopleSettings";
import DatabaseSection from "@/components/settings/DatabaseSection";
import AttributionWindowSettings from "@/components/settings/AttributionWindowSettings";

const Settings = () => {
  const [isTestingLead, setIsTestingLead] = useState(false);
  const [isTestingCalendly, setIsTestingCalendly] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Impostazioni</h1>
        </div>
        <Link to="/database">
          <Button variant="outline" className="flex items-center gap-2">
            <Database size={18} />
            Database Records
          </Button>
        </Link>
      </div>
      
      <Tabs defaultValue="database" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="database">
            <Database className="mr-2 h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="attribution">
            <Webhook className="mr-2 h-4 w-4" />
            Finestre di Attribuzione
          </TabsTrigger>
          <TabsTrigger value="salespeople">
            <Users className="mr-2 h-4 w-4" />
            Venditori
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="database">
          <DatabaseSection />
        </TabsContent>
        
        <TabsContent value="attribution">
          <AttributionWindowSettings />
        </TabsContent>
        
        <TabsContent value="salespeople">
          <Card>
            <SalespeopleSettings />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
