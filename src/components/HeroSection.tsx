import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Users, BarChart3, Zap, Target, TrendingUp } from 'lucide-react';

export const HeroSection = () => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 hero-glow"></div>
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>

      {/* Main content - now empty */}
      <div className="relative z-10 text-center space-y-8 max-w-6xl mx-auto px-4">
        
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-bold">
            <span className="gradient-text">Lead Management</span>
          </h1>
          <h2 className="text-4xl md:text-6xl font-light text-foreground/80">
            Sistema Avanzato
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Gestisci i tuoi lead con tecnologia all'avanguardia. Assegnazione intelligente, 
            tracking avanzato e analytics in tempo reale.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" className="btn-neon text-lg px-8 py-4 rounded-xl">
            <Zap className="mr-2 h-5 w-5" />
            Inizia Ora
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-8 py-4 rounded-xl border-primary/30 hover:border-primary hover:bg-primary/10">
            <BarChart3 className="mr-2 h-5 w-5" />
            Scopri Analytics
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <Card className="floating-card border-primary/20 hover:border-primary/40 transition-all duration-300">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <Database className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Database Intelligente</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Gestione avanzata dei lead con filtri intelligenti e ricerca semantica
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="floating-card border-primary/20 hover:border-primary/40 transition-all duration-300" style={{ animationDelay: '1s' }}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Assegnazione Smart</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Algoritmi avanzati per l'assegnazione ottimale dei lead ai venditori
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="floating-card border-primary/20 hover:border-primary/40 transition-all duration-300" style={{ animationDelay: '2s' }}>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Analytics Avanzati</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Reportistica in tempo reale con metriche di performance dettagliate
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Data flow animation */}
        <div className="relative mt-16 h-2 bg-border/30 rounded-full overflow-hidden">
          <div className="absolute inset-0 data-flow rounded-full"></div>
        </div>
      
      </div>

      {/* Floating elements */}
      <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-primary rounded-full animate-ping"></div>
      <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-accent rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 right-1/6 w-2 h-2 bg-primary rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
    </div>
  );
};
