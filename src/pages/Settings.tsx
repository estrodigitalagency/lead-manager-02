
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Webhook, ArrowLeft, Users } from "lucide-react";
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
            <Button variant="outline" size="icon" className="neon-border hover:animate-glow">
              <ArrowLeft className="h-4 w-4 text-primary" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold neon-text">Impostazioni</h1>
        </div>
      </div>
      
      <Tabs defaultValue="attribution" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 neon-border">
          <TabsTrigger value="database" className="data-[state=active]:text-primary data-[state=active]:shadow-[0_0_8px_rgba(234,255,85,0.5)]">
            Database
          </TabsTrigger>
          <TabsTrigger value="attribution" className="data-[state=active]:text-primary data-[state=active]:shadow-[0_0_8px_rgba(234,255,85,0.5)]">
            <Webhook className="mr-2 h-4 w-4" />
            Finestre di Attribuzione
          </TabsTrigger>
          <TabsTrigger value="salespeople" className="data-[state=active]:text-primary data-[state=active]:shadow-[0_0_8px_rgba(234,255,85,0.5)]">
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
          <Card className="glass-card">
            <SalespeopleSettings />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
