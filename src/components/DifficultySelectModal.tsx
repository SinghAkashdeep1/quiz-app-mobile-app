import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Lock, CheckCircle2, ChevronRight, X, Play } from 'lucide-react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import PuzzleModal from './PuzzleModal';

const { height } = Dimensions.get('window');

interface DifficultySelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (difficulty: 'easy' | 'medium' | 'hard') => void;
  category: {
    _id: string;
    name: string;
    color: string;
    icon: string;
    availableDifficulties?: string[];
    guestAccess?: {
      easy: boolean;
      medium: boolean;
      hard: boolean;
    };
  } | null;
}

const DifficultySelectModal: React.FC<DifficultySelectModalProps> = ({
  visible,
  onClose,
  onSelect,
  category,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);

  if (!category) return null;

  const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];

  const getStatus = (difficulty: 'easy' | 'medium' | 'hard') => {
    // 1. Check if level has questions
    const isAvailable = category.availableDifficulties?.includes(difficulty);
    if (!isAvailable) return 'unavailable';

    // 2. Check if completed
    // Guest restriction check
    if (user?.role === 'guest') {
      const guestAccess = category.guestAccess || { easy: true, medium: false, hard: false };
      if (!(guestAccess as any)[difficulty]) return 'locked';
    }

    const isCompleted = user?.completedLevels?.some(
      (cl) => cl.categoryId === category._id && cl.difficulty === difficulty
    );
    if (isCompleted) return 'completed';

    // 3. Difficulty Progression Logic
    if (user?.role === 'guest') {
      const catCredit = user.categoryCredits?.find(c => c.categoryId === category._id);
      const hearts = catCredit?.hearts ?? 3;
      if (hearts <= 0) return 'locked';
      
      const isAllowedForGuest = (category.guestAccess as any)?.[difficulty] ?? (difficulty === 'easy');
      return isAllowedForGuest ? 'available' : 'locked';
    }

    if (difficulty === 'medium') {
      const easyExists = category.availableDifficulties?.includes('easy');
      if (easyExists) {
        const easyCompleted = user?.completedLevels?.some(
          (cl) => cl.categoryId === category._id && cl.difficulty === 'easy'
        );
        if (!easyCompleted) return 'locked';
      }
    }

    if (difficulty === 'hard') {
      // Check Medium first if exists
      const mediumExists = category.availableDifficulties?.includes('medium');
      if (mediumExists) {
        const mediumCompleted = user?.completedLevels?.some(
          (cl) => cl.categoryId === category._id && cl.difficulty === 'medium'
        );
        if (!mediumCompleted) return 'locked';
      } else {
        // If no Medium, check Easy if exists
        const easyExists = category.availableDifficulties?.includes('easy');
        if (easyExists) {
          const easyCompleted = user?.completedLevels?.some(
            (cl) => cl.categoryId === category._id && cl.difficulty === 'easy'
          );
          if (!easyCompleted) return 'locked';
        }
      }
    }

    return 'available';
  };

  const renderDifficultyItem = (difficulty: 'easy' | 'medium' | 'hard') => {
    const status = getStatus(difficulty);
    const isLocked = status === 'locked';
    const isCompleted = status === 'completed';
    const isUnavailable = status === 'unavailable';

    let diffColor = colors.success;
    if (difficulty === 'medium') diffColor = '#F59E0B'; // Amber
    if (difficulty === 'hard') diffColor = colors.error;

    const catCredit = user?.categoryCredits?.find(c => c.categoryId === category._id);
    const currentHearts = catCredit?.hearts ?? 3;
    const isLockedByCredits = user?.role === 'guest' && currentHearts <= 0;
    
    return (
      <TouchableOpacity
        key={difficulty}
        disabled={isUnavailable || (isLocked && !isLockedByCredits)}
        style={[
          styles.item,
          { backgroundColor: colors.surface, borderColor: colors.border },
          (isLocked || isUnavailable) && { opacity: 0.5 },
        ]}
        onPress={() => {
          if (isLockedByCredits) {
            setPendingDifficulty(difficulty);
            setShowPuzzle(true);
          } else {
            console.log('Difficulty clicked in modal:', difficulty);
            onSelect(difficulty);
          }
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: isUnavailable ? colors.border + '20' : diffColor + '20' }]}>
          {isUnavailable ? (
            <X size={20} color={colors.textSecondary} />
          ) : isLocked ? (
            <Lock size={20} color={colors.textSecondary} />
          ) : isCompleted ? (
            <CheckCircle2 size={20} color={colors.success} />
          ) : (
            <Play size={18} color={diffColor} fill={diffColor + '40'} />
          )}
        </View>

        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: colors.text }]}>
            {t(`difficulty.${difficulty}`)}
          </Text>
          <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
            {isUnavailable 
              ? t('difficulty.unavailable') 
              : isLocked 
                ? (user?.role === 'guest' 
                    ? (currentHearts <= 0 ? t('quiz.out_of_hearts') : t('difficulty.signup_unlock')) 
                    : t('difficulty.complete_prev')) 
                : isCompleted 
                  ? t('difficulty.mastered') 
                  : t('difficulty.start')}
          </Text>
        </View>

        {!isLocked && !isUnavailable && <ChevronRight size={20} color={colors.textSecondary} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => {
            // Prevent clicks inside content from closing the modal
          }}>
            <View style={[styles.content, { backgroundColor: colors.background }]}>
              <View style={styles.header}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                   <MaterialIcons 
                     name={(category.icon?.replace(/_/g, '-') as any) || 'help-outline'} 
                     size={24} 
                     color={category.color} 
                   />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.text }]}>{category.name}</Text>
                  <Text style={[styles.subTitle, { color: colors.textSecondary }]}>{t('difficulty.select')}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.list}>
                {difficulties.map(renderDifficultyItem)}
              </View>

              <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
                <View style={styles.infoRow}>
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.infoText, { color: colors.text }]}>
                    <Text style={{ fontWeight: 'bold' }}>{t('difficulty.how_to_unlock')}:</Text> {t('difficulty.unlock_desc')}
                  </Text>
                </View>
                {user?.role === 'guest' && (
                  <View style={[styles.infoRow, { marginTop: 8 }]}>
                    <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                      {t('difficulty.guest_limit')}
                    </Text>
                  </View>
                )}
              </View>

              <PuzzleModal
                visible={showPuzzle}
                categoryId={category._id}
                onClose={() => {
                  setShowPuzzle(false);
                  setPendingDifficulty(null);
                }}
                onSuccess={() => {
                  setShowPuzzle(false);
                  if (pendingDifficulty) {
                    onSelect(pendingDifficulty);
                    setPendingDifficulty(null);
                  }
                }}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 60 : 40,
    maxHeight: height * 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subTitle: {
    fontSize: 14,
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    display: 'none',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 12,
  },
  infoBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default DifficultySelectModal;
