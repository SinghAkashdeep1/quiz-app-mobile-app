import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  StatusBar,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import client from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import { ChevronRight, ChevronLeft, BrainCircuit, Sun, Moon } from 'lucide-react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
}

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const PAGE_SIZE = 10;

const HomeScreen = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const navigation = useNavigation<NavigationProp>();
  const { theme, colors, toggleTheme, isDark } = useTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await client.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(categories.length / PAGE_SIZE);
  const paginatedCategories = categories.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const renderCategory = (item: Category) => (
    <TouchableOpacity 
      key={item._id}
      style={[styles.card, { borderLeftColor: item.color }]}
      onPress={() => navigation.navigate('Quiz', { 
        categoryId: item._id, 
        categoryName: item.name,
        color: item.color 
      })}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <MaterialIcons 
          name={(item.icon?.replace(/_/g, '-') as any) || 'help-outline'} 
          size={24} 
          color={item.color} 
        />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>Test your knowledge in {item.name}</Text>
      </View>
      <ChevronRight size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (totalPages <= 1) return null;
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageButton, page === 0 && styles.pageButtonDisabled]}
          onPress={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          <ChevronLeft size={18} color={page === 0 ? colors.textSecondary : '#fff'} />
          <Text style={[styles.pageButtonText, page === 0 && styles.pageButtonTextDisabled]}>Previous</Text>
        </TouchableOpacity>

        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>{page + 1} / {totalPages}</Text>
        </View>

        <TouchableOpacity
          style={[styles.pageButton, styles.pageButtonNext, page >= totalPages - 1 && styles.pageButtonDisabled]}
          onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
        >
          <Text style={[styles.pageButtonText, page >= totalPages - 1 && styles.pageButtonTextDisabled]}>Next</Text>
          <ChevronRight size={18} color={page >= totalPages - 1 ? colors.textSecondary : '#fff'} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeTxt}>Welcome Back!</Text>
            <Text style={styles.headerTitle}>Choose a Quiz</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={toggleTheme}
              style={styles.themeToggle}
            >
              {isDark ? (
                <Sun size={24} color={colors.primary} />
              ) : (
                <Moon size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
            <View style={styles.headerIcon}>
               <BrainCircuit size={28} color={colors.primary} />
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching categories...</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {paginatedCategories.map((item) => renderCategory(item))}
            {renderFooter()}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    ...(Platform.OS === 'web' ? { height: '100vh' as any, overflow: 'hidden' as any } : {}),
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeToggle: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border + '20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  welcomeTxt: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  headerIcon: {
    width: 60,
    height: 60,
    backgroundColor: colors.surface,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border + '20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  listContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  pageButtonNext: {
    // same as pageButton
  },
  pageButtonDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  pageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pageButtonTextDisabled: {
    color: colors.textSecondary,
  },
  pageIndicator: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  pageIndicatorText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen;
