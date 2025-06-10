
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">Impostazioni</h1>
      </div>
      
      <Tabs defaultValue="attribution" className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} mb-8 border ${isMobile ? 'h-auto' : ''}`}>
          <TabsTrigger value="database" className={`data-[state=active]:text-primary ${isMobile ? 'text-xs px-2 py-3' : ''}`}>
            <Database className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            {isMobile ? 'DB' : 'Database'}
          </TabsTrigger>
          <TabsTrigger value="attribution" className={`data-[state=active]:text-primary ${isMobile ? 'text-xs px-2 py-3' : ''}`}>
            <Webhook className={`mr-2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            {isMobile ? 'Finestre' : 'Finestre di Attribuzione'}
          </TabsTrigger>
          {!isMobile && (
            <>
              <TabsTrigger value="webhooks" className="data-[state=active]:text-primary">
                <Webhook className="mr-2 h-4 w-4" />
                Webhook
              </TabsTrigger>
              <TabsTrigger value="salespeople" className="data-[state=active]:text-primary">
                <Users className="mr-2 h-4 w-4" />
                Venditori
              </TabsTrigger>
            </>
          )}
        </TabsList>
        
        {isMobile && (
          <TabsList className="grid w-full grid-cols-2 mb-8 border h-auto">
            <TabsTrigger value="webhooks" className="data-[state=active]:text-primary text-xs px-2 py-3">
              <Webhook className="mr-2 h-3 w-3" />
              Webhook
            </TabsTrigger>
            <TabsTrigger value="salespeople" className="data-[state=active]:text-primary text-xs px-2 py-3">
              <Users className="mr-2 h-3 w-3" />
              Venditori
            </TabsTrigger>
          </TabsList>
        )}
        
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
