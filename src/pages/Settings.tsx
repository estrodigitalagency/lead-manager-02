
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Webhook, ArrowLeft, Users, Database, Tag, Zap } from "lucide-react";
import SalespeopleSettings from "@/components/SalespeopleSettings";
import CampaignsSettings from "@/components/CampaignsSettings";
import DatabaseSection from "@/components/settings/DatabaseSection";
import AttributionWindowSettings from "@/components/settings/AttributionWindowSettings";
import WebhookSettings from "@/components/settings/WebhookSettings";
import { AutomationSettings } from "@/components/automation/AutomationSettings";
import { useIsMobile } from "@/hooks/use-mobile";

const Settings = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="w-full min-h-screen px-4 py-8 pt-20 max-w-7xl mx-auto">      
      <Tabs defaultValue="attribution" className="w-full min-w-0" orientation={isMobile ? "vertical" : "horizontal"}>
        <div className={`${isMobile ? 'flex flex-col space-y-4 min-w-0' : 'block min-w-0'}`}>
          <TabsList className={`${isMobile ? 'flex flex-col h-auto w-full space-y-1 p-1' : 'grid w-full grid-cols-6'} mb-8 border`}>
            <TabsTrigger 
              value="database" 
              className={`data-[state=active]:text-primary ${isMobile ? 'w-full justify-start text-left px-4 py-3' : ''}`}
            >
              <Database className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
              Database
            </TabsTrigger>
            <TabsTrigger 
              value="attribution" 
              className={`data-[state=active]:text-primary ${isMobile ? 'w-full justify-start text-left px-4 py-3' : ''}`}
            >
              <Webhook className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
              Finestre di Attribuzione
            </TabsTrigger>
            <TabsTrigger 
              value="webhooks" 
              className={`data-[state=active]:text-primary ${isMobile ? 'w-full justify-start text-left px-4 py-3' : ''}`}
            >
              <Webhook className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
              Webhook
            </TabsTrigger>
            <TabsTrigger 
              value="salespeople" 
              className={`data-[state=active]:text-primary ${isMobile ? 'w-full justify-start text-left px-4 py-3' : ''}`}
            >
              <Users className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
              Venditori
            </TabsTrigger>
            <TabsTrigger 
              value="campaigns" 
              className={`data-[state=active]:text-primary ${isMobile ? 'w-full justify-start text-left px-4 py-3' : ''}`}
            >
              <Tag className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
              Campagne
            </TabsTrigger>
            <TabsTrigger 
              value="automations" 
              className={`data-[state=active]:text-primary ${isMobile ? 'w-full justify-start text-left px-4 py-3' : ''}`}
            >
              <Zap className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
              Automazioni
            </TabsTrigger>
          </TabsList>
          
          <div className={`${isMobile ? 'flex-1 min-w-0 overflow-hidden' : 'min-w-0 overflow-hidden'}`}>
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
            
            <TabsContent value="campaigns">
              <Card className="border">
                <CampaignsSettings />
              </Card>
            </TabsContent>
            
            <TabsContent value="automations">
              <AutomationSettings />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default Settings;
