import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import client from '../api/client';

interface User {
  _id: string;
  username?: string;
  email?: string;
  role: 'guest' | 'user' | 'admin';
  analytics?: any;
  streaks?: any;
  completedLevels?: { categoryId: string, difficulty: string }[];
  favorites?: string[];
  categoryCredits?: { categoryId: string, hearts: number, lastRefillAt?: string }[];
  coins?: number;
}

interface AuthContextType {
  user: User | null;
  guestId: string | null;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('userToken');
      let storedGuestId = await AsyncStorage.getItem('guestId');

      if (!storedGuestId) {
        storedGuestId = 'guest_' + Math.random().toString(36).substring(2, 15);
        await AsyncStorage.setItem('guestId', storedGuestId);
        console.log('AuthContext: Generated new guestId:', storedGuestId);
      }
      setGuestId(storedGuestId);

      // Give storage a moment to settle on some platforms
      if (Platform.OS === 'web') {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (storedToken || storedGuestId) {
        await refreshProfile();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.log('Failed to load auth data:', (error as any).message);
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await client.get('/users/profile');
      setUser(response.data);
    } catch (error: any) {
      console.log('Failed to refresh profile:', error.message);
      // If unauthorized, clear local data
      if (error.response?.status === 401) {
        setUser(null);
        if (await AsyncStorage.getItem('userToken')) {
          await logout();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (token: string, userData: User) => {
    await AsyncStorage.setItem('userToken', token);
    setUser(userData);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('userToken');

    // Generate a new guest ID so we don't automatically log back in 
    // to the account if the old guest ID was converted to a user
    const newGuestId = 'guest_' + Math.random().toString(36).substring(2, 15);
    await AsyncStorage.setItem('guestId', newGuestId);
    setGuestId(newGuestId);

    // Fetch the guest profile to replace the authenticated user in the context
    await refreshProfile();
  };

  const continueAsGuest = async () => {
    // Already handled in loadStorageData, but can be used for explicit guest flow
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, guestId, loading, login, logout, continueAsGuest, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
