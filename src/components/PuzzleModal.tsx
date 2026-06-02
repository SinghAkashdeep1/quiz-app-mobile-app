import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Brain, CheckCircle2, X, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

interface PuzzleModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (newHearts?: number) => void;
  categoryId?: string; // Optional for global coins, required for category hearts
}

const PuzzleModal: React.FC<PuzzleModalProps> = ({ visible, onClose, onSuccess, categoryId }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();

  const [puzzle, setPuzzle] = useState({ q: '', a: 0 });
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | boolean>(false);
  const [success, setSuccess] = useState(false);
  const [isTerminalError, setIsTerminalError] = useState(false);

  useEffect(() => {
    if (visible) {
      generatePuzzle();
      setAnswer('');
      setError(false);
      setSuccess(false);
      setIsTerminalError(false);
    }
  }, [visible]);

  const generatePuzzle = () => {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;
    const ops = ['+', '-'];
    const op = ops[Math.floor(Math.random() * ops.length)];

    let q = `${num1} ${op} ${num2}`;
    let a = op === '+' ? num1 + num2 : num1 - num2;

    setPuzzle({ q, a });
  };

  const handleSubmit = async () => {
    if (parseInt(answer) === puzzle.a) {
      setLoading(true);
      try {
        const response = await client.post('/game/refill', { categoryId });
        await refreshProfile();
        setSuccess(true);
        setTimeout(() => {
          onSuccess(response.data.hearts);
          onClose();
        }, 1500);
      } catch (err: any) {
        console.log('Refill attempted but failed:', err.message || 'Unknown error');
        const data = err.response?.data;

        if (data && typeof data === 'object') {
          if (data.code === 'DAILY_LIMIT_REACHED') {
            setError(t('puzzle.daily_limit'));
            setIsTerminalError(true);
          } else if (data.code === 'COOLDOWN_ACTIVE') {
            setError(t('puzzle.cooldown', { hours: data.remaining || 14 }));
            setIsTerminalError(true);
          } else if (data.code === 'REFILL_DISABLED') {
            setError(t('puzzle.disabled'));
            setIsTerminalError(true);
          } else {
            setError(data.message || t('common.error'));
          }
        } else {
          setError(t('common.error'));
        }
      } finally {
        setLoading(false);
      }
    } else {
      setError(true);
      setAnswer('');
      generatePuzzle();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Brain size={40} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {user?.role === 'guest' ? t('puzzle.title_guest') || 'Need Hearts?' : t('puzzle.title_user') || 'Refill Coins'}
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            {t('puzzle.desc') || 'Solve this simple puzzle to refill your balance!'}
          </Text>

          {success ? (
            <View style={styles.resultView}>
              <CheckCircle2 size={48} color={colors.success} />
              <Text style={[styles.successTxt, { color: colors.success }]}>
                {user?.role === 'guest' ? t('puzzle.success_guest') || 'Hearts Refilled!' : t('puzzle.success_user') || '+100 Coins Added!'}
              </Text>
            </View>
          ) : (
            <View style={styles.puzzleView}>
              <View style={[styles.questionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.questionTxt, { color: colors.text }]}>{puzzle.q} = ?</Text>
                <TouchableOpacity onPress={generatePuzzle}>
                  <RefreshCw size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: error ? colors.error : colors.border
                  }
                ]}
                placeholder={t('puzzle.placeholder') || 'Answer'}
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                value={answer}
                onChangeText={(val) => {
                  setAnswer(val);
                  setError(false);
                }}
                autoFocus
              />

              {error && (
                <Text style={[styles.errorTxt, { color: colors.error }]}>
                  {typeof error === 'string' ? error : (t('puzzle.wrong') || 'Wrong answer, try again!')}
                </Text>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: isTerminalError ? colors.textSecondary : colors.primary }]}
                onPress={isTerminalError ? onClose : handleSubmit}
                disabled={loading || (!answer && !isTerminalError)}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitTxt}>{t('common.ok')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  sub: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  puzzleView: {
    width: '100%',
    alignItems: 'center',
  },
  questionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  questionTxt: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  submitBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitTxt: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorTxt: {
    fontSize: 14,
    marginBottom: 12,
  },
  resultView: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successTxt: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
});

export default PuzzleModal;
