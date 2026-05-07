import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { 
  Animated, 
  StyleSheet, 
  Text, 
  View, 
  Dimensions, 
  Platform,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ToastOptions | null>(null);
  
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    Animated.parallel([
      Animated.timing(opacity, { 
        toValue: 0, 
        duration: 300, 
        useNativeDriver: true 
      }),
      Animated.timing(translateY, { 
        toValue: -100, 
        duration: 300, 
        useNativeDriver: true 
      }),
    ]).start(() => {
      setVisible(false);
      setOptions(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback((newOptions: ToastOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    setOptions(newOptions);
    setVisible(true);

    Animated.parallel([
      Animated.timing(opacity, { 
        toValue: 1, 
        duration: 400, 
        useNativeDriver: true 
      }),
      Animated.spring(translateY, { 
        toValue: 0, 
        useNativeDriver: true,
        bounciness: 8
      }),
    ]).start();

    timerRef.current = setTimeout(() => {
      hideToast();
    }, newOptions.duration || 4000);
  }, [opacity, translateY, hideToast]);

  const getIcon = () => {
    if (!options) return null;
    switch (options.type) {
      case 'success': return <CheckCircle2 size={24} color={colors.success} />;
      case 'error': return <AlertCircle size={24} color={colors.error} />;
      default: return <Info size={24} color={colors.primary} />;
    }
  };

  const getBorderColor = () => {
    if (!options) return colors.border;
    switch (options.type) {
      case 'success': return colors.success;
      case 'error': return colors.error;
      default: return colors.primary;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && options && (
        <Animated.View 
          style={[
            styles.toastWrapper, 
            { 
              opacity, 
              transform: [{ translateY }],
              backgroundColor: colors.surface,
              borderColor: getBorderColor(),
              zIndex: 9999,
            }
          ]}
        >
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: getBorderColor() + '15' }]}>
              {getIcon()}
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colors.text }]}>{options.title}</Text>
              {options.message && (
                <Text style={[styles.message, { color: colors.textSecondary }]}>{options.message}</Text>
              )}
            </View>
            <TouchableOpacity onPress={hideToast} style={styles.closeBtn}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
    }),
    elevation: 10,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  }
});
