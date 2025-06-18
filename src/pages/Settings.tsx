
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
import { useIsMobile } from "@/hooks/use-mobile";

const Settings = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="container mx-auto px-4 py-8 pt-20">      
      <Tabs defaultValue="attribution" className="w-full" orientation={isMobile ? "vertical" : "horizontal"}>
        <div className={`${isMobile ? 'flex flex-col space-y-4' : 'block'}`}>
          <TabsList className={`${isMobile ? 'flex flex-col h-auto w-full space-y-1 p-1' : 'grid w-full grid-cols-4'} mb-8 border`}>
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
          </TabsList>
          
          <div className={`${isMobile ? 'flex-1' : ''}`}>
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
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default Settings;
