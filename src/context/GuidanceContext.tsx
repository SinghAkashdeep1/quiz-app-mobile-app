import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import client from '../api/client';

interface GuidanceContextType {
  onboarding: Record<string, boolean>;
  markAsSeen: (featureKey: string) => Promise<void>;
}

const GuidanceContext = createContext<GuidanceContextType | undefined>(undefined);

export const GuidanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [onboarding, setOnboarding] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      // For registered users, we always trust the backend onboarding state
      // For guests, we use what's available
      const backendOnboarding = (user as any).onboarding || {};

      // If we just converted from guest to user, we might want to refresh.
      // But for now, just ensure the state is synced.
      setOnboarding({ ...backendOnboarding });
    } else {
      setOnboarding({});
    }
  }, [user?._id, user?.role]); // Depend on ID and Role specifically

  const markAsSeen = async (featureKey: string) => {
    try {
      // Optimistic update
      setOnboarding(prev => ({ ...prev, [featureKey]: true }));

      if (user) {
        // Update backend
        await client.patch('/users/onboarding', { featureKey });
      }
    } catch (error) {
      console.error('Failed to update onboarding state:', error);
    }
  };

  return (
    <GuidanceContext.Provider value={{ onboarding, markAsSeen }}>
      {children}
    </GuidanceContext.Provider>
  );
};

export const useGuidance = () => {
  const context = useContext(GuidanceContext);
  if (!context) {
    throw new Error('useGuidance must be used within a GuidanceProvider');
  }
  return context;
};
