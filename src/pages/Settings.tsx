
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
import PersistentNavigation from "@/components/PersistentNavigation";

const Settings = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <PersistentNavigation />
      
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Impostazioni</h1>
        </div>
        
        <Tabs defaultValue="attribution" className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 h-20' : 'grid-cols-4'} mb-8 border border-border bg-muted`}>
            <TabsTrigger 
              value="database" 
              className={`data-[state=active]:text-primary data-[state=active]:bg-background ${isMobile ? 'text-xs px-1 py-2 flex flex-col' : 'flex-row'}`}
            >
              <Database className={`${isMobile ? 'h-4 w-4 mb-1' : 'mr-2 h-4 w-4'}`} />
              <span className={isMobile ? 'text-xs' : ''}>{isMobile ? "DB" : "Database"}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="attribution" 
              className={`data-[state=active]:text-primary data-[state=active]:bg-background ${isMobile ? 'text-xs px-1 py-2 flex flex-col' : 'flex-row'}`}
            >
              <Webhook className={`${isMobile ? 'h-4 w-4 mb-1' : 'mr-2 h-4 w-4'}`} />
              <span className={isMobile ? 'text-xs' : ''}>{isMobile ? "Attrib." : "Finestre di Attribuzione"}</span>
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger value="webhooks" className="data-[state=active]:text-primary data-[state=active]:bg-background">
                  <Webhook className="mr-2 h-4 w-4" />
                  Webhook
                </TabsTrigger>
                <TabsTrigger value="salespeople" className="data-[state=active]:text-primary data-[state=active]:bg-background">
                  <Users className="mr-2 h-4 w-4" />
                  Venditori
                </TabsTrigger>
              </>
            )}
          </TabsList>
          
          {isMobile && (
            <TabsList className="grid w-full grid-cols-2 mb-4 border border-border bg-muted h-20">
              <TabsTrigger 
                value="webhooks" 
                className="data-[state=active]:text-primary data-[state=active]:bg-background text-xs px-1 py-2 flex flex-col"
              >
                <Webhook className="h-4 w-4 mb-1" />
                <span className="text-xs">Webhook</span>
              </TabsTrigger>
              <TabsTrigger 
                value="salespeople" 
                className="data-[state=active]:text-primary data-[state=active]:bg-background text-xs px-1 py-2 flex flex-col"
              >
                <Users className="h-4 w-4 mb-1" />
                <span className="text-xs">Venditori</span>
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
            <Card className="border border-border bg-card">
              <SalespeopleSettings />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
