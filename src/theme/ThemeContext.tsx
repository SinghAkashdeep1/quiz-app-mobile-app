import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
const AsyncStorage = {
  getItem: async (key: string) => null,
  setItem: async (key: string, value: string) => {},
};
import { lightTheme, darkTheme } from './colors';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  colors: typeof lightTheme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeType>(systemColorScheme === 'light' ? 'light' : 'dark');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      // Robust check for AsyncStorage and its native binding
      if (typeof AsyncStorage !== 'undefined' && AsyncStorage?.getItem) {
        const savedTheme = await AsyncStorage.getItem('user-theme');
        if (savedTheme) {
          setTheme(savedTheme as ThemeType);
        }
      }
    } catch (error) {
      // Silently fail and use default theme
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      if (typeof AsyncStorage !== 'undefined' && AsyncStorage?.setItem) {
        await AsyncStorage.setItem('user-theme', newTheme);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const colors = theme === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
