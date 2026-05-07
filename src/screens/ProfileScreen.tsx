import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import {
  Zap,
  Trophy,
  Target,
  Clock,
  LogOut,
  LogIn,
  ChevronLeft,
  Calendar as CalendarIcon,
  Globe,
  Coins
} from 'lucide-react-native';
import LanguagePickerModal from '../components/LanguagePickerModal';

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
    await AsyncStorage.getItem('userLanguage'); // Just to trigger something if needed
    await AsyncStorage.setItem('userLanguage', lng);
  };

  const analyticsCards = [
    { label: t('profile.total_games', 'Total Games'), value: user?.analytics?.totalGamesPlayed || 0, icon: Trophy, color: '#FFD700' },
    { label: t('profile.avg_accuracy', 'Avg Accuracy'), value: `${Math.round(user?.analytics?.accuracy || 0)}%`, icon: Target, color: '#FF2D55' },
    { label: t('profile.total_questions', 'Total Questions'), value: user?.analytics?.totalQuestionsAttempted || 0, icon: Zap, color: '#5856D6' },
    { label: t('profile.coins', 'Coins'), value: user?.coins || 0, icon: Coins, color: '#FFD60A' },
  ];

  // Simple "Calendar" logic (showing last 7 days)
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const hasPlayed = user?.streaks?.history?.some((date: string) =>
        new Date(date).toDateString() === d.toDateString()
      );
      days.push({
        date: d.getDate(),
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        active: hasPlayed
      });
    }
    return days;
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigation.navigate('Home' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.profileInfo}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarTxt, { color: colors.primary }]}>
              {user?.username?.charAt(0).toUpperCase() || 'G'}
            </Text>
          </View>
          <Text style={[styles.username, { color: colors.text }]}>
            {user?.username || t('common.guest')}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            {user?.email || t('profile.upgrade_msg')}
          </Text>
        </View>

        <View style={[styles.streakCard, { backgroundColor: colors.surface }]}>
          <View style={styles.streakHeader}>
            <Zap size={24} color="#FF9500" fill="#FF9500" />
            <Text style={[styles.streakTitle, { color: colors.text }]}>{t('profile.active_streak')}</Text>
          </View>
          <View style={styles.streakContent}>
            <View style={styles.streakItem}>
              <Text style={[styles.streakValue, { color: colors.text }]}>{user?.streaks?.current || 0}</Text>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>{t('profile.current_days')}</Text>
            </View>
            <View style={[styles.streakDivider, { backgroundColor: colors.border + '40' }]} />
            <View style={styles.streakItem}>
              <Text style={[styles.streakValue, { color: colors.text }]}>{user?.streaks?.longest || 0}</Text>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>{t('profile.best_streak')}</Text>
            </View>
          </View>

          <View style={styles.calendarContainer}>
            <Text style={[styles.calendarTitle, { color: colors.text }]}>{t('profile.recent_activity')}</Text>
            <View style={styles.daysRow}>
              {last7Days.map((d, i) => (
                <View key={i} style={styles.dayCol}>
                  <Text style={[styles.dayName, { color: colors.textSecondary }]}>{d.day}</Text>
                  <View style={[
                    styles.dayCircle,
                    { backgroundColor: d.active ? '#FF9500' : colors.border + '20' }
                  ]}>
                    <Text style={[styles.dayDate, { color: d.active ? '#fff' : colors.textSecondary }]}>{d.date}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.analyticsGrid}>
          {analyticsCards.map((card, i) => (
            <View key={i} style={[styles.analyticsCard, { backgroundColor: colors.surface }]}>
              <card.icon size={24} color={card.color} />
              <Text style={[styles.analyticsValue, { color: colors.text }]}>{card.value}</Text>
              <Text style={[styles.analyticsLabel, { color: colors.textSecondary }]}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.languageSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.language')}</Text>
          <TouchableOpacity
            style={[styles.langBtn, { backgroundColor: colors.surface, borderColor: colors.border + '40' }]}
            onPress={() => setLangModalVisible(true)}
          >
            <View style={styles.langBtnContent}>
              <Globe size={20} color={colors.primary} />
              <Text style={[styles.langBtnText, { color: colors.text }]}>
                {i18n.language === 'en' ? 'English' :
                  i18n.language === 'hi' ? 'हिन्दी' :
                    i18n.language === 'es' ? 'Español' : 'Français'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <LanguagePickerModal
          visible={langModalVisible}
          onClose={() => setLangModalVisible(false)}
        />

        {user?.role === 'guest' ? (
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]}
            onPress={() => navigation.navigate('Auth' as any)}
          >
            <LogIn size={20} color={colors.primary} />
            <Text style={[styles.logoutTxt, { color: colors.primary }]}>{t('auth.login')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.error + '40' }]}
            onPress={handleLogout}
          >
            <LogOut size={20} color={colors.error} />
            <Text style={[styles.logoutTxt, { color: colors.error }]}>{t('common.logout')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  backBtn: {
    padding: 10,
    backgroundColor: '#00000008',
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
    }),
    elevation: 8,
  },
  avatarTxt: {
    fontSize: 40,
    fontWeight: '900',
  },
  username: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  email: {
    fontSize: 15,
    fontWeight: '500',
  },
  streakCard: {
    borderRadius: 32,
    padding: 28,
    marginBottom: 28,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
    }),
    elevation: 8,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  streakTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakDivider: {
    width: 1,
    height: 48,
  },
  calendarContainer: {
    borderTopWidth: 1,
    borderTopColor: '#00000010',
    paddingTop: 24,
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 10,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDate: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  analyticsCard: {
    width: '48%',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    gap: 10,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
    }),
    elevation: 4,
  },
  analyticsValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  analyticsLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    height: 60,
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 48,
  },
  logoutTxt: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  languageSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  languageGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  langBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    }),
    elevation: 2,
  },
  langBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  langBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});

export default ProfileScreen;
