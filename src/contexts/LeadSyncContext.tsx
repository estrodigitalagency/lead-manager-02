
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getOptimizedLeadCounts } from '@/services/leadAssignabilityService';
import { getLeadsStats } from '@/services/databaseService';

interface LeadStats {
  total: number;
  assignable: number;
  assigned: number;
  booked: number;
}

interface LeadSyncContextType {
  stats: LeadStats;
  isRefreshing: boolean;
  refreshAllData: () => Promise<void>;
  isVerifying: boolean;
  setIsVerifying: (value: boolean) => void;
}

const LeadSyncContext = createContext<LeadSyncContextType | undefined>(undefined);

export const useLeadSync = () => {
  const context = useContext(LeadSyncContext);
  if (!context) {
    throw new Error('useLeadSync must be used within a LeadSyncProvider');
  }
  return context;
};

export const LeadSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<LeadStats>({
    total: 0,
    assignable: 0,
    assigned: 0,
    booked: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const refreshAllData = useCallback(async () => {
    console.log('🔄 Refreshing all lead data...');
    setIsRefreshing(true);
    
    try {
      // Usa getLeadsStats che è già ottimizzato
      const newStats = await getLeadsStats();
      console.log('📊 New stats:', newStats);
      setStats(newStats);
    } catch (error) {
      console.error('❌ Error refreshing lead data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Setup real-time listeners per aggiornamenti automatici
  useEffect(() => {
    console.log('🔗 Setting up real-time listeners...');
    
    const channel = supabase
      .channel('lead-sync-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_generation'
        },
        () => {
          console.log('📡 Lead data changed, refreshing...');
          refreshAllData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booked_call'
        },
        () => {
          console.log('📡 Booking data changed, refreshing...');
          refreshAllData();
        }
      )
      .subscribe();

    // Caricamento iniziale
    refreshAllData();

    return () => {
      console.log('🔌 Cleaning up real-time listeners...');
      supabase.removeChannel(channel);
    };
  }, [refreshAllData]);

  const value: LeadSyncContextType = {
    stats,
    isRefreshing,
    refreshAllData,
    isVerifying,
    setIsVerifying
  };

  return (
    <LeadSyncContext.Provider value={value}>
      {children}
    </LeadSyncContext.Provider>
  );
};
