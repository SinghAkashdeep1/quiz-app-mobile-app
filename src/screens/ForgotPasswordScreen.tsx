import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import client from '../api/client';
import { Mail, Lock, ArrowRight, Key, ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ForgotPasswordScreen = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New Password
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0 && step === 2) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer, step]);

  const startTimer = () => {
    setTimer(120); // 2 minutes
    setCanResend(false);
  };

  const { colors } = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const navigation = useNavigation();

  const handleRequestCode = async () => {
    if (!email) {
      showToast({
        type: 'error',
        title: t('common.error'),
        message: 'Please enter your email address'
      });
      return;
    }

    setLoading(true);
    try {
      await client.post('/users/forgot-password', { email });
      showToast({
        type: 'success',
        title: t('auth.forgot_success_title'),
        message: t('auth.forgot_success_msg')
      });
      setStep(2);
      startTimer();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || 'Failed to send reset code'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    setLoading(true);
    try {
      await client.post('/users/forgot-password', { email });
      showToast({
        type: 'success',
        title: t('auth.resend_success_title'),
        message: t('auth.resend_success_msg')
      });
      startTimer();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || 'Failed to resend code'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      showToast({
        type: 'error',
        title: t('common.error'),
        message: 'Please enter the 6-digit verification code.'
      });
      return;
    }

    setLoading(true);
    try {
      await client.post('/users/verify-code', { email, code });
      setStep(3);
    } catch (error: any) {
      showToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || 'Invalid or expired reset code'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code || !newPassword || !confirmPassword) {
      showToast({
        type: 'error',
        title: t('common.error'),
        message: 'Please fill in all fields'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast({
        type: 'error',
        title: t('common.error'),
        message: 'Passwords do not match'
      });
      return;
    }

    if (newPassword.length < 6) {
      showToast({
        type: 'error',
        title: t('common.error'),
        message: 'Password must be at least 6 characters long'
      });
      return;
    }

    setLoading(true);
    try {
      await client.post('/users/reset-password', { email, code, newPassword });
      showToast({
        type: 'success',
        title: t('auth.reset_success_title'),
        message: t('auth.reset_success_msg')
      });
      navigation.goBack();
    } catch (error: any) {
      showToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || 'Failed to reset password'
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 3) setStep(2);
              else if (step === 2) setStep(1);
              else navigation.goBack();
            }}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Key size={40} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {step === 1 ? t('auth.forgot_password_title') : step === 2 ? t('auth.verify_code_title') : t('auth.set_password_title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {step === 1
                ? t('auth.forgot_password_subtitle')
                : step === 2
                  ? t('auth.verify_code_subtitle')
                  : t('auth.set_password_subtitle')}
            </Text>
          </View>

          <View style={styles.form}>
            {step === 1 && (
              <>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border + '40' }]}
                    placeholder={t('auth.email_placeholder')}
                    placeholderTextColor={colors.textSecondary + '80'}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleRequestCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>{t('auth.send_code_btn')}</Text>
                      <ArrowRight size={20} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <View style={styles.inputWrapper}>
                  <Key size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border + '40' }]}
                    placeholder={t('auth.code_placeholder')}
                    placeholderTextColor={colors.textSecondary + '80'}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={code}
                    onChangeText={setCode}
                  />
                </View>

                <View style={styles.timerContainer}>
                  <Text style={[styles.timerText, { color: colors.textSecondary }]}>
                    {t('auth.otp_expiry')}
                  </Text>
                  {timer > 0 ? (
                    <Text style={[styles.timerCountdown, { color: colors.primary }]}>
                      {t('auth.resend_in', { seconds: timer })}
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
                      <Text style={[styles.resendText, { color: colors.primary }]}>
                        {t('auth.resend_otp')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleVerifyCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>{t('auth.next_btn')}</Text>
                      <ArrowRight size={20} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {step === 3 && (
              <>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border + '40' }]}
                    placeholder={t('auth.new_password_placeholder')}
                    placeholderTextColor={colors.textSecondary + '80'}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border + '40' }]}
                    placeholder={t('auth.confirm_password_placeholder')}
                    placeholderTextColor={colors.textSecondary + '80'}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>{t('auth.reset_password_btn')}</Text>
                      <ArrowRight size={20} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
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
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 8,
    zIndex: 10,
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  timerText: {
    fontSize: 14,
    marginBottom: 4,
  },
  timerCountdown: {
    fontSize: 16,
    fontWeight: '700',
  },
  resendText: {
    fontSize: 16,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default ForgotPasswordScreen;
