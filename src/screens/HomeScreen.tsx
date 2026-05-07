import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  ChevronRight, 
  ChevronLeft, 
  BrainCircuit, 
  Sun, 
  Moon, 
  Zap, 
  User as UserIcon,
  Coins,
  Heart,
  Globe
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import DifficultySelectModal from '../components/DifficultySelectModal';
import CustomAlert from '../components/CustomAlert';
import PuzzleModal from '../components/PuzzleModal';
import LanguagePickerModal from '../components/LanguagePickerModal';
import CustomAlertModal from '../components/CustomAlertModal';
import { MaterialIcons } from '@expo/vector-icons';
import { Alert } from 'react-native';

interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
  isGuestAllowed?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
}

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const PAGE_SIZE = 9;

const HomeScreen = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const navigation = useNavigation<NavigationProp>();
  const { theme, colors, toggleTheme, isDark } = useTheme();
  const { user, logout, refreshProfile, loading: authLoading } = useAuth();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const styles = useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading) {
        fetchCategories();
      }
    }, [authLoading, locale, showFavorites])
  );

  // Re-fetch categories immediately when language changes
  useEffect(() => {
    if (!authLoading) {
      fetchCategories();
    }
  }, [locale]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const uniqueCategories = useMemo(() => {
    const seen = new Set();
    return categories.filter(c => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  }, [categories]);

  const fetchCategories = async () => {
    try {
      const response = await client.get(`/categories?favorite=${showFavorites}&lang=${locale}`);
      // Backend returns categories with names already translated into the requested language.
      setCategories(response.data);
    } catch (error) {
      console.log('Failed to fetch categories:', (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  // useFocusEffect handles showFavorites now

  const toggleFavorite = async (categoryId: string) => {
    try {
      await client.post('/game/favorite', { categoryId });
      await refreshProfile();
      if (showFavorites) {
        fetchCategories();
      }
    } catch (error) {
      console.log('Failed to toggle favorite:', (error as any).message);
    }
  };

  const handleStartQuiz = async (item: Category, inCooldown: boolean = false, needsRefill: boolean = false) => {
    if (inCooldown) return;

    if (needsRefill) {
      setSelectedCategory(item);
      setShowPuzzle(true);
      return;
    }

    const isGuest = !user || user.role === 'guest';
    
    // Client-side check for restricted categories
    if (isGuest && item.isGuestAllowed === false) {
      navigation.navigate('Auth' as any);
      return;
    }

    setSelectedCategory(item);
    setModalVisible(true);
  };

  const handleDifficultySelect = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!selectedCategory) return;
    
    const item = selectedCategory;
    console.log('Difficulty selected:', difficulty, 'for category:', item.name, 'ID:', item._id);

    try {
      // Check access via API
      console.log('Checking access for:', item._id, difficulty);
      const response = await client.post('/game/check-access', { 
        categoryId: item._id,
        difficulty 
      });
      
      console.log('Access check response:', response.data);

      if (response.data.allowed) {
        setModalVisible(false);
        console.log('Navigating to Quiz screen');
        navigation.navigate('Quiz', { 
          categoryId: item._id, 
          categoryName: item.name,
          color: item.color,
          difficulty,
          progressIndex: response.data.progressIndex,
          lifelines: item.lifelines
        });
      }
    } catch (error: any) {
      // console.error('Access check failed:', error);
      setModalVisible(false);
      const { message, code } = error.response?.data || {};
      
      const errorMessage = message || 'Failed to start quiz';
      
      if (code === 'AUTH_REQUIRED') {
        navigation.navigate('Auth' as any);
      } else if (code === 'NO_CREDITS') {
        setAlertConfig({
          visible: true,
          title: t('quiz.out_of_hearts'),
          message: errorMessage,
          confirmText: t('puzzle.solve_to_earn') || 'Refill Hearts',
          cancelText: t('common.maybe_later'),
          type: 'warning',
          onConfirm: () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            setShowPuzzle(true);
          },
          onCancel: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        });
      } else if (code === 'LIMIT_REACHED') {
        setAlertConfig({
          visible: true,
          title: t('quiz.level_locked'),
          message: `${errorMessage}\n\nSign up to continue playing and save your progress!`,
          confirmText: t('auth.signup'),
          cancelText: t('common.maybe_later'),
          type: 'warning',
          onConfirm: () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            navigation.navigate('Auth' as any);
          },
          onCancel: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        });
      } else {
        setAlertConfig({
          visible: true,
          title: t('common.error'),
          message: errorMessage,
          type: 'error',
          onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        });
      }
    }
  };

  const totalPages = Math.ceil(uniqueCategories.length / PAGE_SIZE);
  const paginatedCategories = uniqueCategories.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const renderCategory = (item: Category) => {
    const isGuest = !user || user.role === 'guest';
    const catCredit = user?.categoryCredits?.find(c => c.categoryId.toString() === item._id);
    const hearts = catCredit?.hearts ?? 3;
    const referenceTime = (catCredit as any)?.heartsEmptyAt 
      ? new Date((catCredit as any).heartsEmptyAt) 
      : (catCredit?.lastRefillAt ? new Date(catCredit.lastRefillAt) : new Date(0));
    const timeElapsedMs = now - referenceTime.getTime();
    const cooldownPeriod = item.guestHeartsConfig?.refillCooldownHours || 14;
    const cooldownMs = cooldownPeriod * 3600 * 1000;
    const timeRemainingMs = cooldownMs - timeElapsedMs;
    
    // Check if daily limit exhausted
    const refillsToday = catCredit?.refillsToday ?? 0;
    const lastRefillDay = catCredit?.lastRefillDate ? new Date(catCredit.lastRefillDate).toDateString() : '';
    const today = new Date().toDateString();
    const actualRefillsToday = lastRefillDay === today ? refillsToday : 0;
    const dailyLimit = item.guestHeartsConfig?.dailyRefillLimit || 3;
    const exhaustedRefills = actualRefillsToday >= dailyLimit;

    // Only guest is restricted by hearts and cooldown
    const inCooldown = isGuest && hearts === 0 && exhaustedRefills && timeRemainingMs > 0;
    
    let timerText = '';
    if (inCooldown) {
      const hrs = Math.floor(timeRemainingMs / (1000 * 60 * 60));
      const mins = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((timeRemainingMs % (1000 * 60)) / 1000);
      timerText = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    const isGuestRestricted = isGuest && (item.isGuestAllowed === false);
    const isLocked = isGuestRestricted;
    const lockedMessage = isGuestRestricted ? t('home.signup_to_play') : '';
    const needsRefill = isGuest && hearts === 0 && !inCooldown && !isGuestRestricted;

    return (
      <TouchableOpacity 
        key={item._id}
        style={[
          styles.card, 
          { borderLeftColor: item.color },
          (isLocked || inCooldown) && styles.cardRestricted
        ]}
        onPress={() => handleStartQuiz(item, inCooldown, needsRefill)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name} quiz. ${isLocked ? lockedMessage : (inCooldown ? t('home.cooldown') : '')}`}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.color + (isLocked || inCooldown ? '10' : '20') }]}>
          <MaterialIcons 
            name={(item.icon?.replace(/_/g, '-') as any) || 'help-outline'} 
            size={24} 
            color={isLocked || inCooldown ? colors.textSecondary : item.color} 
          />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, (isLocked || inCooldown) && { color: colors.textSecondary }]}>{item.name}</Text>
          </View>
          {inCooldown && (
            <View style={styles.timelineContainer}>
              <View style={[styles.timelineBg, { backgroundColor: colors.border + '20' }]}>
                <View 
                  style={[
                    styles.timelineFill, 
                    { 
                      backgroundColor: colors.error, 
                      width: `${Math.min(100, (timeElapsedMs / cooldownMs) * 100)}%` 
                    }
                  ]} 
                />
              </View>
            </View>
          )}
          <Text style={[styles.cardSubtitle, (isLocked || inCooldown || needsRefill) && { color: inCooldown ? colors.error : (needsRefill ? '#FF9500' : colors.primary), fontWeight: '600' }]}>
            {isLocked 
              ? lockedMessage 
              : (inCooldown 
                  ? `${t('home.cooldown')}: ${timerText}`
                  : (needsRefill ? t('puzzle.solve_to_earn', 'Solve puzzle to refill hearts') : t('home.test_knowledge', { category: item.name }))
                )
            }
          </Text>
        </View>
        <View style={styles.rightColumn}>
          {user?.role === 'guest' && !isLocked && (
            <View style={[styles.miniHeartBadge, { backgroundColor: hearts === 0 ? '#FF2D5515' : '#FF2D5510', marginBottom: 8 }]}>
              <Heart size={10} color="#FF2D55" fill={hearts === 0 ? 'transparent' : '#FF2D55'} />
              <Text style={[styles.miniHeartText, hearts === 0 && { color: colors.textSecondary }]}>{hearts}</Text>
            </View>
          )}

          {isLocked || inCooldown ? (
            <View style={styles.lockIconContainer}>
              <MaterialIcons name={inCooldown ? "timer" : "lock-outline"} size={20} color={inCooldown ? colors.error : colors.textSecondary} />
            </View>
          ) : needsRefill ? (
            <View style={[styles.lockIconContainer, { backgroundColor: '#FF950015' }]}>
              <MaterialIcons name="extension" size={20} color="#FF9500" />
            </View>
          ) : (
            <View style={styles.cardRight}>
              {user?.role !== 'guest' && (
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item._id);
                  }}
                  style={styles.favBtn}
                >
                  <Heart 
                    size={20} 
                    color={user?.favorites?.includes(item._id as any) ? '#FF2D55' : colors.textSecondary} 
                    fill={user?.favorites?.includes(item._id as any) ? '#FF2D55' : 'transparent'} 
                    strokeWidth={2}
                  />
                </TouchableOpacity>
              )}
              <ChevronRight size={20} color={colors.textSecondary} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
          <Text style={[styles.pageButtonText, page === 0 && styles.pageButtonTextDisabled]}>{t('common.previous')}</Text>
        </TouchableOpacity>

        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>{page + 1} / {totalPages}</Text>
        </View>

        <TouchableOpacity
          style={[styles.pageButton, styles.pageButtonNext, page >= totalPages - 1 && styles.pageButtonDisabled]}
          onPress={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
        >
          <Text style={[styles.pageButtonText, page >= totalPages - 1 && styles.pageButtonTextDisabled]}>{t('common.next')}</Text>
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
          <View style={styles.headerTop}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeTxt}>
                {user?.role === 'user' ? t('home.hello', { name: user.username }) : t('home.welcome_guest')}
              </Text>
              <View style={styles.titleWithFilter}>
                <Text style={styles.headerTitle}>{showFavorites ? t('home.favorites') || 'Favorites' : t('home.choose_quiz')}</Text>
                {user?.role !== 'guest' && (
                  <TouchableOpacity 
                    onPress={() => setShowFavorites(!showFavorites)}
                    style={[styles.filterBtn, showFavorites && { backgroundColor: '#FF2D5520' }]}
                  >
                    <Heart 
                      size={20} 
                      color={showFavorites ? '#FF2D55' : colors.textSecondary} 
                      fill={showFavorites ? '#FF2D55' : 'transparent'} 
                      strokeWidth={2}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            {user?.streaks?.current > 0 && (
              <TouchableOpacity 
                style={styles.streakBadge}
                onPress={() => navigation.navigate(user ? 'Profile' : 'Auth' as any)}
              >
                <Zap size={16} color="#FF9500" fill="#FF9500" />
                <Text style={styles.streakText}>{user.streaks.current}</Text>
              </TouchableOpacity>
            )}
            {user && user.role !== 'guest' && (
              <TouchableOpacity 
                style={[
                  styles.streakBadge, 
                  { backgroundColor: '#FFD60A20' },
                ]}
                onPress={() => navigation.navigate(user ? 'Profile' : 'Auth' as any)}
              >
                <Coins size={16} color="#FFD60A" fill="#FFD60A" />
                <Text style={[styles.streakText, { color: '#FFD60A' }]}>{user.coins}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={() => navigation.navigate(user ? 'Profile' : 'Auth' as any)}
              style={styles.themeToggle}
            >
               <UserIcon size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setLangModalVisible(true)}
              style={styles.themeToggle}
            >
               <Globe size={24} color={colors.primary} />
            </TouchableOpacity>
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
          </View>
        </View>

        {loading || authLoading ? (
          <View style={[styles.container, styles.center]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BrainCircuit size={64} color={colors.textSecondary + '40'} />
            <Text style={styles.emptyTitle}>{t('home.no_quizzes')}</Text>
            <Text style={styles.emptySubtitle}>{t('home.check_back')}</Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={fetchCategories}
            >
              <Text style={styles.refreshButtonText}>{t('common.refresh')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {paginatedCategories.map((item) => renderCategory(item))}
            {renderFooter()}
          </View>
        )}
      </ScrollView>

      <DifficultySelectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleDifficultySelect}
        category={selectedCategory}
      />

      <LanguagePickerModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />

      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        type={alertConfig.type}
      />
      <PuzzleModal
        visible={showPuzzle}
        categoryId={selectedCategory?._id}
        onClose={() => setShowPuzzle(false)}
        onSuccess={async () => {
          setShowPuzzle(false);
          await refreshProfile();
          fetchCategories();
          if (selectedCategory) {
            setTimeout(() => setModalVisible(true), 300);
          }
        }}
      />
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
    paddingTop: 40,
    gap: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeContainer: {
    flex: 1,
  },
  titleWithFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
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
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    } : {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    }),
    elevation: 3,
  },
  welcomeTxt: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -1,
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
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    } : {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    }),
    elevation: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF950040',
    gap: 4,
  },
  streakText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
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
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 6px 12px rgba(0,0,0,0.08)'
    } : {
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    }),
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
    marginRight: 12,
  },
  cardRestricted: {
    opacity: 0.85,
    backgroundColor: colors.surface + 'CC',
  },
  rightColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  lockIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.border + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  favBtn: {
    padding: 6,
    borderRadius: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  miniHeartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    backgroundColor: '#FF2D5515',
  },
  miniHeartText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF2D55',
  },
  timelineContainer: {
    height: 4,
    width: '100%',
    marginVertical: 4,
  },
  timelineBg: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timelineFill: {
    height: '100%',
    borderRadius: 2,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: colors.primary,
    ...(Platform.OS === 'web' ? {
      boxShadow: `0 4px 8px ${colors.primary}33`
    } : {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    }),
    elevation: 4,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
