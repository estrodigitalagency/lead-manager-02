
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Webhook, ArrowLeft, Users, Database } from "lucide-react";
import SalespeopleSettings from "@/components/SalespeopleSettings";
import DatabaseSection from "@/components/settings/DatabaseSection";
import AttributionWindowSettings from "@/components/settings/AttributionWindowSettings";
import WebhookSettings from "@/components/settings/WebhookSettings";

const Settings = () => {
  const [isTestingLead, setIsTestingLead] = useState(false);
  const [isTestingCalendly, setIsTestingCalendly] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="icon" className="border">
              <ArrowLeft className="h-4 w-4 text-primary" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-primary">Impostazioni</h1>
        </div>
      </div>
      
      <Tabs defaultValue="attribution" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8 border">
          <TabsTrigger value="database" className="data-[state=active]:text-primary">
            <Database className="mr-2 h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="attribution" className="data-[state=active]:text-primary">
            <Webhook className="mr-2 h-4 w-4" />
            Finestre di Attribuzione
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="data-[state=active]:text-primary">
            <Webhook className="mr-2 h-4 w-4" />
            Webhook
          </TabsTrigger>
          <TabsTrigger value="salespeople" className="data-[state=active]:text-primary">
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
        
        <TabsContent value="webhooks">
          <WebhookSettings />
        </TabsContent>
        
        <TabsContent value="salespeople">
          <Card className="border">
            <SalespeopleSettings />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
