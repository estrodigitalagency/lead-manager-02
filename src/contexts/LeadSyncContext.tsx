import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getOptimizedLeadCounts, checkLeadsAssignability } from '@/services/leadAssignabilityService';
import { getLeadsStats } from '@/services/databaseService';
import { useMarket } from '@/contexts/MarketContext';

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
  performVerification: () => Promise<void>;
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
  const { selectedMarket } = useMarket();
  const [stats, setStats] = useState<LeadStats>({
    total: 0,
    assignable: 0,
    assigned: 0,
    booked: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Lock per evitare operazioni multiple contemporanee
  const operationLockRef = useRef(false);
  const verificationLockRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Funzione centralizzata per la verifica dell'assegnabilità
  const performVerification = useCallback(async () => {
    if (verificationLockRef.current) {
      console.log('🔒 Verification already in progress, skipping...');
      return;
    }

    console.log('🔍 Starting assignability verification...');
    verificationLockRef.current = true;
    setIsVerifying(true);
    
    try {
      await checkLeadsAssignability();
      console.log('✅ Verification completed successfully');
    } catch (error) {
      console.error('❌ Error in verification:', error);
    } finally {
      verificationLockRef.current = false;
      setIsVerifying(false);
    }
  }, []);

  const refreshAllData = useCallback(async () => {
    if (operationLockRef.current) {
      console.log('🔒 Refresh already in progress, skipping...');
      return;
    }

    console.log('🔄 Refreshing all lead data...');
    operationLockRef.current = true;
    setIsRefreshing(true);
    
    try {
      const newStats = await getLeadsStats(selectedMarket);
      console.log('📊 New stats loaded:', newStats);
      setStats(newStats);
    } catch (error) {
      console.error('❌ Error refreshing lead data:', error);
    } finally {
      operationLockRef.current = false;
      setIsRefreshing(false);
    }
  }, [selectedMarket]);

  // Debounced refresh per evitare troppe chiamate consecutive
  const debouncedRefresh = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      console.log('📡 Real-time change detected, refreshing data...');
      refreshAllData();
    }, 1000); // 1 secondo di debounce
  }, [refreshAllData]);

  // Setup iniziale e listeners real-time
  useEffect(() => {
    console.log('🚀 Initializing LeadSyncProvider...');
    
    // Sequenza di inizializzazione: prima verifica, poi refresh
    const initialize = async () => {
      try {
        console.log('🔄 Step 1: Performing initial verification...');
        await performVerification();
        
        console.log('🔄 Step 2: Loading initial data...');
        await refreshAllData();
        
        console.log('✅ Initialization completed');
      } catch (error) {
        console.error('❌ Error during initialization:', error);
      }
    };

    initialize();

    // Setup real-time listeners con debounce
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
        (payload) => {
          console.log('📡 Lead generation change:', payload.eventType);
          debouncedRefresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booked_call'
        },
        (payload) => {
          console.log('📡 Booked call change:', payload.eventType);
          debouncedRefresh();
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up LeadSyncProvider...');
      
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Remove channel
      supabase.removeChannel(channel);
      
      // Reset locks
      operationLockRef.current = false;
      verificationLockRef.current = false;
    };
  }, [selectedMarket, refreshAllData, performVerification]); // Include selectedMarket as dependency

  const value: LeadSyncContextType = {
    stats,
    isRefreshing,
    refreshAllData,
    isVerifying,
    setIsVerifying,
    performVerification
  };

  return (
    <LeadSyncContext.Provider value={value}>
      {children}
    </LeadSyncContext.Provider>
  );
};