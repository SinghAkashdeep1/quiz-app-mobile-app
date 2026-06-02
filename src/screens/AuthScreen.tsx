import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import client from '../api/client';
import { User, Mail, Lock, ArrowRight, UserCircle, LogIn, Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const { colors } = useTheme();
  const { login, guestId } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const navigation = useNavigation();

  const handleAuth = async () => {
    if (!formData.email || !formData.password || (!isLogin && !formData.username)) {
      showToast({
        type: 'error',
        title: t('common.error'),
        message: t('auth.fill_fields') || 'Please fill in all fields'
      });
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/users/login' : '/users/register';
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : { ...formData, guestId }; // Pass guestId to convert guest to user

      const response = await client.post(endpoint, payload);
      await login(response.data.token, response.data);
      showToast({
        type: 'success',
        title: isLogin ? t('auth.login_success') || 'Welcome Back!' : t('auth.signup_success') || 'Account Created!',
      });
      navigation.navigate('Home' as any);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || 'Authentication failed'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <LogIn size={40} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {isLogin ? t('auth.login_welcome') || 'Welcome Back' : t('auth.signup_title') || 'Create Account'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isLogin ? t('auth.login_subtitle') || 'Sign in to sync your progress and streaks' : t('auth.signup_subtitle') || 'Join us to start maintaining your quiz streaks'}
            </Text>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <View style={styles.inputWrapper}>
                <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border + '40' }]}
                  placeholder={t('auth.username')}
                  placeholderTextColor={colors.textSecondary + '80'}
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border + '40' }]}
                placeholder={t('auth.email')}
                placeholderTextColor={colors.textSecondary + '80'}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border + '40', flex: 1, paddingRight: 50 }]}
                placeholder={t('auth.password')}
                placeholderTextColor={colors.textSecondary + '80'}
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 16, height: '100%', justifyContent: 'center' }}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {isLogin && (
              <TouchableOpacity
                style={{ alignSelf: 'flex-end', marginTop: -12 }}
                onPress={() => navigation.navigate('ForgotPassword' as any)}
              >
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
                  {t('auth.forgot_password_link')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>{isLogin ? t('auth.login') : t('auth.signup')}</Text>
                  <ArrowRight size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                {isLogin ? t('auth.no_account') || "Don't have an account? " : t('auth.have_account') || "Already have an account? "}
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                  {isLogin ? t('auth.signup') : t('auth.login')}
                </Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: colors.border + '40' }]} />
              <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
              <View style={[styles.line, { backgroundColor: colors.border + '40' }]} />
            </View>

            <TouchableOpacity
              style={[styles.guestButton, { borderColor: colors.border + '40' }]}
              onPress={() => navigation.navigate('Home' as any)}
            >
              <UserCircle size={20} color={colors.text} />
              <Text style={[styles.guestButtonText, { color: colors.text }]}>{t('auth.continue_guest') || 'Continue as Guest'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
  title: {
    fontSize: 32,
    fontWeight: '800',

    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  inputWrapper: {
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    }),
    elevation: 2,
  },
  inputIcon: {
    position: 'absolute',
    left: 20,
    top: 18,
    zIndex: 1,
  },
  input: {
    height: 60,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 52,
    fontSize: 16,
  },
  button: {
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 16px rgba(0,0,0,0.25)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
    }),
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  switchText: {
    fontSize: 15,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
    gap: 16,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  guestButton: {
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AuthScreen;
