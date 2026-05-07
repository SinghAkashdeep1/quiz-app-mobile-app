import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions, 
  Image, 
  Platform, 
  ScrollView,
  Animated,
  Easing
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { X, CheckCircle2, AlertCircle, ArrowRight, Clock, Lock, Coins, Heart, Trophy, Zap, Brain, Hexagon, Sparkles, PartyPopper } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import client, { BASE_IMAGE_URL } from '../api/client';
import PuzzleModal from '../components/PuzzleModal';

const { width, height } = Dimensions.get('window');

const CelebrationParticle = ({ delay, color, type }: { delay: number, color: string, type: 'trophy' | 'heart' | 'sparkle' }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 2500,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  const x = useRef(Math.random() * width - width / 2).current;
  const startY = useRef(height / 2 + 50).current;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [startY, -height / 2 - 100],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1.2, 1, 0.5],
  });

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${(Math.random() - 0.5) * 720}deg`],
  });

  return (
    <Animated.View 
      style={[
        { position: 'absolute', zIndex: 1 }, 
        { 
          opacity,
          transform: [
            { translateY },
            { translateX: x },
            { scale },
            { rotate }
          ]
        }
      ]}
    >
      {type === 'trophy' && <Trophy size={24} color={color} fill={color + '40'} />}
      {type === 'heart' && <Heart size={24} color={color} fill={color + '40'} />}
      {type === 'sparkle' && <Sparkles size={24} color={color} />}
    </Animated.View>
  );
};

const WinnerCelebration = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(true);
  const celebrationType = useRef<'trophy' | 'heart' | 'sparkle'>(
    ['trophy', 'heart', 'sparkle'][Math.floor(Math.random() * 3)] as any
  ).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Start fade out after celebration finishes (approx 6 seconds)
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        StyleSheet.absoluteFill, 
        { zIndex: 0, opacity: fadeAnim, pointerEvents: 'none' }
      ]}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {[...Array(25)].map((_, i) => (
          <CelebrationParticle 
            key={i} 
            delay={i * 120} 
            type={celebrationType}
            color={
              celebrationType === 'trophy' ? '#FFD60A' : 
              celebrationType === 'heart' ? '#FF2D55' : 
              ['#FFD60A', '#FF2D55', '#5856D6', '#34C759'][Math.floor(Math.random() * 4)]
            } 
          />
        ))}
      </View>
    </Animated.View>
  );
};

interface Question {
  _id: string;
  type: 'mcq' | 'boolean' | 'image' | 'matching' | 'multiple_correct';
  text: string;
  imageUrl?: string;
  options: string[];
  optionImages?: string[];
  correctAnswerIndex?: number;
  correctAnswerIndices?: number[];
  matchingPairs?: { left: string, right: string }[];
  timeLimit?: number;
}

const QuizScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'Quiz'>>();
  const navigation = useNavigation();
  const { categoryId, categoryName, color, difficulty = 'easy', progressIndex = 0, lifelines } = route.params;
  const { colors } = useTheme();
  const { user, refreshProfile } = useAuth();
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [results, setResults] = useState<{ questionId: string, isCorrect: boolean }[]>([]);
  const [rewards, setRewards] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0); // in ms
  const [startTime, setStartTime] = useState(0);
  const [error, setError] = useState<{ message: string, code: string } | null>(null);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [currentHearts, setCurrentHearts] = useState<number | null>(null);

  // Lifelines state
  const [usedAiHints, setUsedAiHints] = useState(0);
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(0);
  const [usedChangeQuestion, setUsedChangeQuestion] = useState(0);
  const [usedStopTimer, setUsedStopTimer] = useState(0);
  const [isTimerStopped, setIsTimerStopped] = useState(false);
  const [stoppedTime, setStoppedTime] = useState<number | null>(null);
  const [hasAlternatives, setHasAlternatives] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [isProcessingLifeline, setIsProcessingLifeline] = useState(false);

  // New states for complex question types
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [matchingLinks, setMatchingLinks] = useState<{ [key: number]: number }>({});
  const [matchSelection, setMatchSelection] = useState<{ side: 'left' | 'right', index: number } | null>(null);
  const [shuffledMatchRight, setShuffledMatchRight] = useState<{ text: string, originalIndex: number }[]>([]);

  useEffect(() => {
    fetchQuestions();
  }, [categoryId, difficulty]);

  useEffect(() => {
    if (loading || quizFinished || selectedOption !== null || error || questions.length === 0 || isTimerStopped || isProcessingLifeline) return;

    if (timeLeft <= 0) {
      handleOptionSelect(-1); // Time out
      return;
    }

    if (startTime === 0) {
      setStartTime(Date.now());
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, loading, quizFinished, selectedOption, startTime, isProcessingLifeline, isTimerStopped]);

  useEffect(() => {
    if (questions.length > 0 && questions[currentIndex]?.type === 'matching') {
      const q = questions[currentIndex];
      if (q.matchingPairs) {
        const shuffled = q.matchingPairs.map((p: any, i: number) => ({ text: p.right, originalIndex: i }))
          .sort(() => Math.random() - 0.5);
        setShuffledMatchRight(shuffled);
      }
    }
  }, [currentIndex, questions]);

  const fetchQuestions = async () => {
    setLoading(true);
    setCurrentIndex(progressIndex);
    setSelectedOption(null);
    setIsCorrect(null);
    setScore(0);
    setQuizFinished(false);
    setResults([]);
    setTotalTimeSpent(0);
    setStartTime(0);
    setRewards(null);
    setQuestions([]);
    setUsedAiHints(0);
    setUsedFiftyFifty(0);
    setEliminatedOptions([]);
    setMatchingLinks({});
    setMatchSelection(null);
    setUsedChangeQuestion(0);
    setUsedStopTimer(0);
    setIsTimerStopped(false);
    setStoppedTime(null);

    try {
      setError(null);
      // Category name is already translated by the backend /categories API —
      // it arrives via navigation params as categoryName, so no extra call needed.

      const res = await client.get(`/questions/category/${categoryId}?difficulty=${difficulty}&lang=${locale}`);
      const fetchedQuestions = res.data.questions;
      setQuestions(fetchedQuestions);
      setHasAlternatives(res.data.hasAlternatives);

      if (fetchedQuestions.length > 0) {
        const initialQ = fetchedQuestions[progressIndex] || fetchedQuestions[0];
        setTimeLeft(initialQ.timeLimit || 30);
      }

      // Initialize Hearts for Guest
      if (user?.role === 'guest') {
        const catCredit = user.categoryCredits?.find(c => c.categoryId.toString() === categoryId);
        setCurrentHearts(catCredit?.hearts ?? 3);
      }
    } catch (err: any) {
      console.log('Failed to fetch questions:', err.message);
      const isRestricted = err.response?.data?.code === 'GUEST_RESTRICTED';
      const noCredits = err.response?.data?.code === 'NO_CREDITS';
      const isLocked = err.response?.data?.code === 'LEVEL_LOCKED';

      if (isRestricted || noCredits) {
        setError({
          message: err.response?.data?.message || 'Access restricted',
          code: noCredits ? 'NO_CREDITS' : 'GUEST_RESTRICTED'
        });
      } else if (isLocked) {
        setError({
          message: err.response?.data?.message || 'Please complete the previous level first.',
          code: 'LEVEL_LOCKED'
        });
      } else {
        setError({
          message: t('quiz.fetch_error'),
          code: 'FETCH_ERROR'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Removed old game exit useEffect as we handle it directly in handleOptionSelect

  const handleOptionSelect = (index: number) => {
    if (selectedOption !== null) return;
    const currentQuestion = questions[currentIndex];

    if (currentQuestion.type === 'multiple_correct') {
      setSelectedOptions(prev => {
        if (prev.includes(index)) return prev.filter(i => i !== index);
        return [...prev, index];
      });
      return;
    }

    // Standard logic for MCQ, Boolean, Image
    setSelectedOption(index);
    const correct = index !== -1 && currentQuestion.correctAnswerIndex === index;
    setIsCorrect(correct);

    if (correct) {
      setScore(prev => prev + 1);
    } else if (user?.role === 'guest') {
      const prevHearts = currentHearts ?? 3;
      const newHearts = Math.max(0, prevHearts - 1);
      setCurrentHearts(newHearts);
      client.post('/game/save-progress', {
        categoryId,
        difficulty,
        currentIndex,
        currentHearts: newHearts,
        isOutOfHearts: newHearts === 0
      }).then(() => refreshProfile());

      if (newHearts === 0) {
        setTimeout(() => navigation.navigate('Home' as any), 1500);
      }
    }

    const timeTaken = isTimerStopped && stoppedTime !== null 
      ? (currentQuestion.timeLimit || 30) - stoppedTime 
      : (Date.now() - startTime) / 1000;
    
    setTotalTimeSpent(prev => prev + (timeTaken * 1000));
    setResults(prev => [...prev, { questionId: currentQuestion._id, isCorrect: correct }]);
  };

  const handleMatchSelect = (side: 'left' | 'right', index: number) => {
    if (selectedOption !== null) return;

    if (!matchSelection) {
      setMatchSelection({ side, index });
    } else if (matchSelection.side === side) {
      // Switch selection on same side
      setMatchSelection({ side, index });
    } else {
      // Connect items
      const leftIdx = side === 'left' ? index : matchSelection.index;
      const rightIdx = side === 'right' ? index : matchSelection.index;

      setMatchingLinks(prev => ({
        ...prev,
        [leftIdx]: rightIdx
      }));
      setMatchSelection(null);
    }
  };

  const submitComplexQuestion = () => {
    if (selectedOption !== null) return;
    const currentQuestion = questions[currentIndex];
    let correct = false;

    if (currentQuestion.type === 'multiple_correct') {
      const correctIndices = currentQuestion.correctAnswerIndices || [];
      if (selectedOptions.length === correctIndices.length &&
        selectedOptions.every(i => correctIndices.includes(i))) {
        correct = true;
      }
    } else if (currentQuestion.type === 'matching') {
      const pairsCount = currentQuestion.matchingPairs?.length || 0;
      const linksCount = Object.keys(matchingLinks).length;
      if (linksCount === pairsCount) {
        correct = Object.entries(matchingLinks).every(([left, right]) => {
          // originalIndex in shuffledMatchRight tells us the correct mapping
          const matchedItem = shuffledMatchRight[right as any];
          return parseInt(left) === matchedItem.originalIndex;
        });
      }
    }

    setSelectedOption(-2); // Special value for complex submission
    setIsCorrect(correct);
    if (correct) setScore(prev => prev + 1);

    const timeTaken = isTimerStopped && stoppedTime !== null 
      ? (currentQuestion.timeLimit || 30) - stoppedTime 
      : (Date.now() - startTime) / 1000;
    
    setTotalTimeSpent(prev => prev + (timeTaken * 1000));
    setResults(prev => [...prev, { questionId: currentQuestion._id, isCorrect: correct }]);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setSelectedOption(null);
      setIsCorrect(null);
      setEliminatedOptions([]);
      setHintMessage(null);
      setSelectedOptions([]);
      setMatchingLinks({});
      setMatchSelection(null);
      setIsTimerStopped(false);
      setStoppedTime(null);

      const nextQ = questions[nextIdx];

      setTimeLeft(nextQ.timeLimit || 30);
      setStartTime(Date.now());
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setQuizFinished(true);
    try {
      // Submit to new game submission endpoint
      const response = await client.post('/game/submit', {
        categoryId,
        difficulty,
        score,
        questionsAttempted: questions.length,
        correctAnswers: score,
        timeSpent: totalTimeSpent,
        results
      });
      setRewards(response.data.rewards);
      // Refresh profile to update streaks on Home
      await refreshProfile();
    } catch (error) {
      console.log('Failed to submit game results:', (error as any).message);
    }
  };

  const handlePlayNext = () => {
    const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
    const currentIndex = difficulties.indexOf(difficulty as any);
    if (currentIndex < difficulties.length - 1) {
      const nextDiff = difficulties[currentIndex + 1];
      navigation.navigate('Quiz' as any, {
        categoryId,
        categoryName,
        color,
        difficulty: nextDiff
      });
    }
  };

  const handleAiHint = async () => {
    if (isProcessingLifeline || user?.role === 'guest') return;

    const freePerLevel = lifelines?.aiHints?.freePerLevel || 1;
    const isFree = usedAiHints < freePerLevel;
    const cost = lifelines?.aiHints?.coinCost || 10;

    if (!isFree && (user?.coins || 0) < cost) {
      alert(t('quiz.not_enough_coins', 'Not enough coins!'));
      return;
    }

    const targetLang = locale;

    setIsProcessingLifeline(true);
    try {
      const res = await client.post('/game/lifeline/ai-hint', {
        categoryId,
        questionId: questions[currentIndex]._id,
        isFree,
        targetLang
      });

      setUsedAiHints(prev => prev + 1);
      setHintMessage(res.data.hint);
      refreshProfile();
    } catch (err: any) {
      console.log('Hint error', err.message);
      alert(err.response?.data?.message || 'Failed to load hint');
    } finally {
      setIsProcessingLifeline(false);
    }
  };

  const handleFiftyFifty = async () => {
    if (isProcessingLifeline || user?.role === 'guest' || eliminatedOptions.length > 0) return;

    const freePerLevel = lifelines?.fiftyFifty?.freePerLevel || 1;
    const isFree = usedFiftyFifty < freePerLevel;
    const cost = lifelines?.fiftyFifty?.coinCost || 10;

    if (!isFree && (user?.coins || 0) < cost) {
      alert(t('quiz.not_enough_coins', 'Not enough coins!'));
      return;
    }

    setIsProcessingLifeline(true);
    try {
      const res = await client.post('/game/lifeline/50-50', {
        categoryId,
        questionId: questions[currentIndex]._id,
        isFree
      });

      setUsedFiftyFifty(prev => prev + 1);
      setEliminatedOptions(res.data.indicesToRemove);
      refreshProfile();
    } catch (err: any) {
      console.log('50/50 error', err.message);
      alert(err.response?.data?.message || 'Failed to use 50/50');
    } finally {
      setIsProcessingLifeline(false);
    }
  };

  const handleSwapQuestion = async () => {
    if (isProcessingLifeline || user?.role === 'guest' || selectedOption !== null) return;

    const freePerLevel = lifelines?.changeQuestion?.freePerLevel || 1;
    const isFree = usedChangeQuestion < freePerLevel;
    const cost = lifelines?.changeQuestion?.coinCost || 10;

    if (!isFree && (user?.coins || 0) < cost) {
      alert(t('quiz.not_enough_coins', 'Not enough coins!'));
      return;
    }

    setIsProcessingLifeline(true);
    try {
      const res = await client.post('/game/lifeline/change-question', {
        categoryId,
        questionId: questions[currentIndex]._id,
        excludeIds: questions.map(q => q._id),
        isFree
      });

      const newQuestions = [...questions];
      newQuestions[currentIndex] = {
        ...res.data.alternative
      };
      
      setQuestions(newQuestions);
      setUsedChangeQuestion(prev => prev + 1);
      setEliminatedOptions([]);
      setHintMessage(null);
      setIsTimerStopped(false);
      setStoppedTime(null);
      setStartTime(Date.now());
      refreshProfile();
    } catch (err: any) {
      console.log('Swap error', err.message);
      alert(err.response?.data?.message || 'Failed to swap question');
    } finally {
      setIsProcessingLifeline(false);
    }
  };

  const handleStopTimer = async () => {
    if (isProcessingLifeline || user?.role === 'guest' || isTimerStopped || selectedOption !== null) return;

    const freePerLevel = lifelines?.stopTimer?.freePerLevel || 1;
    const isFree = usedStopTimer < freePerLevel;
    const cost = lifelines?.stopTimer?.coinCost || 10;

    if (!isFree && (user?.coins || 0) < cost) {
      alert(t('quiz.not_enough_coins', 'Not enough coins!'));
      return;
    }

    setIsProcessingLifeline(true);
    try {
      await client.post('/game/lifeline/stop-timer', {
        categoryId,
        isFree
      });

      setUsedStopTimer(prev => prev + 1);
      setIsTimerStopped(true);
      setStoppedTime(timeLeft);
      refreshProfile();
    } catch (err: any) {
      console.log('Stop timer error', err.message);
      alert(err.response?.data?.message || 'Failed to stop timer');
    } finally {
      setIsProcessingLifeline(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }

  if (error || questions.length === 0) {
    const isRestricted = error?.code === 'GUEST_RESTRICTED';
    const isNoCredits = error?.code === 'NO_CREDITS';
    const isLocked = error?.code === 'LEVEL_LOCKED';

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X color={colors.text} size={24} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerCat, { color: colors.textSecondary }]}>{categoryName}</Text>
            <View style={[styles.difficultyBadge, { backgroundColor: color + '15' }]}>
              <Text style={[styles.difficultyText, { color: color }]}>{t(`difficulty.${difficulty}`)}</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.center}>
          <View style={[styles.errorIconContainer, { backgroundColor: (isRestricted || isLocked || isNoCredits) ? colors.primary + '20' : colors.error + '20' }]}>
            {isNoCredits ? (
              <Heart size={48} color={colors.error} />
            ) : (isRestricted || isLocked) ? (
              <Lock size={48} color={colors.primary} />
            ) : (
              <AlertCircle size={48} color={colors.error} />
            )}
          </View>

          <Text style={[styles.errorTitle, { color: colors.text }]}>
            {isNoCredits ? t('quiz.out_of_hearts') :
              isRestricted ? t('quiz.level_locked') :
                isLocked ? t('quiz.level_locked') : t('common.error')}
          </Text>

          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
            {isNoCredits
              ? error?.message
              : isRestricted
                ? t('quiz.guest_restricted_desc', { difficulty })
                : isLocked
                  ? t('quiz.level_locked_desc', { difficulty })
                  : error?.message || t('quiz.no_questions')}
          </Text>

          {isNoCredits && !isRestricted && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.success, marginTop: 12 }]}
              onPress={() => setShowPuzzle(true)}
            >
              <Text style={styles.btnTxt}>{t('puzzle.solve_to_earn') || 'Solve Puzzle to Earn Hearts'}</Text>
            </TouchableOpacity>
          )}

          {isLocked ? (
            <View style={{ width: '100%', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const prevDiff = difficulty === 'hard' ? 'medium' : 'easy';
                  navigation.navigate('Quiz' as any, {
                    categoryId,
                    categoryName,
                    color,
                    difficulty: prevDiff
                  });
                }}
              >
                <Text style={styles.btnTxt}>
                  {difficulty === 'hard' ? t('quiz.go_to_medium') || 'Go to Medium' : t('quiz.go_to_easy') || 'Go to Easy'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: color || colors.primary }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.btnTxt}>{t('quiz.back_to_home')}</Text>
              </TouchableOpacity>
            </View>
          ) : (isRestricted || isNoCredits) ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
              onPress={() => navigation.navigate('Auth' as any)}
            >
              <Text style={styles.btnTxt}>{t('common.login_signup')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: color || colors.primary, marginTop: 24 }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.btnTxt}>{t('quiz.back_to_home')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (quizFinished) {
    const accuracy = Math.round((score / questions.length) * 100);
    const isMastered = accuracy >= 70;

    return (
      <SafeAreaView style={styles.container}>
        {(difficulty === 'hard' && isMastered) && <WinnerCelebration />}
        <View style={styles.center}>
          <View style={[styles.scoreBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.scoreTxt, { color }]}>
              {Math.round((score / questions.length) * 100)}%
            </Text>
          </View>

          <Text style={styles.finishTitle}>
            {difficulty === 'hard' ? t('quiz.mastered') : t('quiz.completed')}
          </Text>
          <Text style={styles.finishSub}>
            {difficulty === 'hard'
              ? t('quiz.conquered_all', { category: categoryName })
              : t('quiz.correct_answers', { score, total: questions.length })}
          </Text>

          <View style={styles.finishAnalyticsGrid}>
            <View style={[styles.finishAnalyticsCard, { backgroundColor: colors.surface }]}>
              <Clock size={20} color={colors.primary} />
              <Text style={[styles.finishAnalyticsValue, { color: colors.text }]}>
                {totalTimeSpent < 10000
                  ? `${(totalTimeSpent / 1000).toFixed(2)}s`
                  : `${Math.round(totalTimeSpent / 1000)}s`}
              </Text>
              <Text style={[styles.finishAnalyticsLabel, { color: colors.textSecondary }]}>{t('quiz.time_spent')}</Text>
            </View>
            <View style={[styles.finishAnalyticsCard, { backgroundColor: colors.surface }]}>
              <AlertCircle size={20} color={colors.success} />
              <Text style={[styles.finishAnalyticsValue, { color: colors.text }]}>
                {Math.round((score / questions.length) * 100)}%
              </Text>
              <Text style={[styles.finishAnalyticsLabel, { color: colors.textSecondary }]}>{t('quiz.accuracy')}</Text>
            </View>
          </View>

          {rewards && (
            <View style={[styles.rewardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {user?.role === 'guest' ? (
                <View style={styles.rewardItem}>
                  <Heart size={24} color="#FF2D55" fill="#FF2D55" />
                  <Text style={[styles.rewardValue, { color: '#FF2D55' }]}>{rewards.hearts ?? currentHearts}</Text>
                  <Text style={[styles.rewardLabel, { color: colors.textSecondary }]}>{t('quiz.hearts') || 'Hearts'}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.rewardItem}>
                    <Coins size={24} color="#FFD60A" fill="#FFD60A" />
                    <Text style={[styles.rewardValue, { color: '#FFD60A' }]}>
                      {rewards.coins >= 0 ? `+${rewards.coins}` : rewards.coins}
                    </Text>
                    <Text style={[styles.rewardLabel, { color: colors.textSecondary }]}>{t('quiz.coins')}</Text>
                  </View>
                  <View style={styles.rewardDivider} />
                  <View style={styles.rewardItem}>
                    <Trophy size={24} color={colors.primary} />
                    <Text style={[styles.rewardValue, { color: colors.text }]}>
                      {rewards.currentLevel}
                    </Text>
                    <Text style={[styles.rewardLabel, { color: colors.textSecondary }]}>{t('quiz.category_rank')}</Text>
                  </View>
                </>
              )}
            </View>
          )}
          <View style={{ width: '100%', gap: 12 }}>
            {difficulty === 'hard' ? (
              isMastered ? (
                <>
                  <View style={[styles.completionBadge, { backgroundColor: colors.success + '20' }]}>
                    <CheckCircle2 size={20} color={colors.success} />
                    <Text style={[styles.completionTxt, { color: colors.success }]}>{t('quiz.all_levels_completed') || 'All Levels Completed!'}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: color || colors.primary }]}
                    onPress={() => navigation.navigate('Home' as any)}
                  >
                    <Text style={styles.btnTxt}>{t('quiz.back_to_home')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={fetchQuestions}
                  >
                    <Text style={styles.btnTxt}>{t('quiz.try_again') || 'Try Again'}</Text>
                    <ArrowRight size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: color || colors.primary }]}
                    onPress={() => {
                      navigation.navigate('Quiz' as any, {
                        categoryId,
                        categoryName,
                        color,
                        difficulty: 'medium'
                      });
                    }}
                  >
                    <Text style={styles.btnTxt}>{t('quiz.go_to_medium') || 'Go to Medium'}</Text>
                  </TouchableOpacity>
                </>
              )
            ) : (difficulty !== 'hard' && !(user?.role === 'guest' && difficulty === 'easy')) ? (
              <>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={handlePlayNext}
                >
                  <Text style={styles.btnTxt}>{t('quiz.play_next')}</Text>
                  <ArrowRight size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: color || colors.primary }]}
                  onPress={() => navigation.navigate('Home' as any)}
                >
                  <Text style={styles.btnTxt}>{t('quiz.back_to_home')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.completionBadge, { backgroundColor: colors.success + '20' }]}>
                  <CheckCircle2 size={20} color={colors.success} />
                  <Text style={[styles.completionTxt, { color: colors.success }]}>{t('quiz.all_levels_completed')}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: color || colors.primary }]}
                  onPress={() => navigation.navigate('Home' as any)}
                >
                  <Text style={styles.btnTxt}>{t('quiz.back_to_home')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <X color={colors.text} size={24} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerCat, { color: colors.textSecondary }]}>{categoryName}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: color + '15' }]}>
            <Text style={[styles.difficultyText, { color: color }]}>{t(`difficulty.${difficulty}`)}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {user?.role === 'guest' ? (
            <View style={[styles.headerStat, { backgroundColor: '#FF2D5515' }]}>
              <Heart size={14} color="#FF2D55" fill="#FF2D55" />
              <Text style={[styles.headerStatText, { color: '#FF2D55' }]}>{currentHearts}</Text>
            </View>
          ) : (
            <View style={[styles.headerStat, { backgroundColor: '#FFD60A15' }]}>
              <Coins size={14} color="#FFD60A" fill="#FFD60A" />
              <Text style={[styles.headerStatText, { color: '#FFD60A' }]}>{user?.coins}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {currentQuestion.imageUrl && (
          <Image
            source={{ uri: `${BASE_IMAGE_URL}${currentQuestion.imageUrl}` }}
            style={styles.qImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {t('quiz.question_count', { current: currentIndex + 1, total: questions.length, score: score })}
            </Text>
            <View style={styles.timerBadge}>
              <Clock size={14} color={timeLeft < 10 ? colors.error : colors.primary} />
              <Text style={[styles.timerText, { color: timeLeft < 10 ? colors.error : colors.primary }]}>{timeLeft}s</Text>
            </View>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.border + '30' }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: color || colors.primary,
                  width: `${((currentIndex + 1) / questions.length) * 100}%`
                }
              ]}
            />
          </View>
        </View>

        {user?.role !== 'guest' && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.lifelinesWrapper}
            contentContainerStyle={styles.lifelinesContent}
          >
            <TouchableOpacity
              onPress={handleAiHint}
              disabled={isProcessingLifeline || selectedOption !== null}
              style={[styles.lifelineBtn, { borderColor: colors.primary + '40' }]}
            >
              <Brain size={18} color={colors.primary} />
              <Text style={[styles.lifelineTxt, { color: colors.text }]}>
                {usedAiHints < (lifelines?.aiHints?.freePerLevel || 1) ? 'Hint Free' : (
                  <Text><Coins size={12} color="#FFD60A" /> {lifelines?.aiHints?.coinCost || 10}</Text>
                )}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleFiftyFifty}
              disabled={isProcessingLifeline || eliminatedOptions.length > 0 || selectedOption !== null || currentQuestion.options.length <= 2}
              style={[
                styles.lifelineBtn,
                {
                  borderColor: colors.primary + '40',
                  opacity: (eliminatedOptions.length > 0 || currentQuestion.options.length <= 2) ? 0.5 : 1
                }
              ]}
            >
              <Hexagon size={18} color={currentQuestion.options.length <= 2 ? colors.textSecondary : colors.primary} />
              <Text style={[styles.lifelineTxt, { color: currentQuestion.options.length <= 2 ? colors.textSecondary : colors.text }]}>
                {currentQuestion.options.length <= 2 ? '50/50 N/A' : (
                  usedFiftyFifty < (lifelines?.fiftyFifty?.freePerLevel || 1) ? '50/50 Free' : (
                    <Text>50/50 <Coins size={12} color="#FFD60A" /> {lifelines?.fiftyFifty?.coinCost || 10}</Text>
                  )
                )}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSwapQuestion}
              disabled={isProcessingLifeline || selectedOption !== null || !hasAlternatives}
              style={[styles.lifelineBtn, { borderColor: colors.primary + '40', opacity: !hasAlternatives ? 0.5 : 1 }]}
            >
              <ArrowRight size={18} color={!hasAlternatives ? colors.textSecondary : colors.primary} />
              <Text style={[styles.lifelineTxt, { color: !hasAlternatives ? colors.textSecondary : colors.text }]}>
                {!hasAlternatives ? 'Swap N/A' : (
                  usedChangeQuestion < (lifelines?.changeQuestion?.freePerLevel || 1) ? 'Swap Free' : (
                    <Text>Swap <Coins size={12} color="#FFD60A" /> {lifelines?.changeQuestion?.coinCost || 10}</Text>
                  )
                )}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleStopTimer}
              disabled={isProcessingLifeline || isTimerStopped || selectedOption !== null}
              style={[styles.lifelineBtn, { borderColor: colors.primary + '40', opacity: isTimerStopped ? 0.5 : 1 }]}
            >
              <Clock size={18} color={isTimerStopped ? colors.textSecondary : colors.primary} />
              <Text style={[styles.lifelineTxt, { color: isTimerStopped ? colors.textSecondary : colors.text }]}>
                {isTimerStopped ? 'Paused' : (
                  usedStopTimer < (lifelines?.stopTimer?.freePerLevel || 1) ? 'Stop Free' : (
                    <Text>Stop <Coins size={12} color="#FFD60A" /> {lifelines?.stopTimer?.coinCost || 10}</Text>
                  )
                )}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {hintMessage && (
          <View style={{ backgroundColor: colors.primary + '20', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.primary + '50' }}>
            <Text style={{ color: colors.text, fontSize: 14 }}>{hintMessage}</Text>
          </View>
        )}

        <Text style={styles.questionTxt}>
          {(currentQuestion?.text || '').split('___').map((part, i, arr) => {
            const optionParts = (selectedOption !== null && currentQuestion?.type === 'mcq' && currentQuestion?.options)
              ? (currentQuestion.options?.[selectedOption] || '').split(',').map(p => p.trim())
              : [];
            return (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && (
                  <Text style={styles.blankPlaceholder}>
                    {optionParts[i] || '___'}
                  </Text>
                )}
              </React.Fragment>
            );
          })}
        </Text>

        <View style={styles.optionsContainer}>
          {currentQuestion.type === 'matching' ? (
            <View style={styles.matchingContainer}>
              <View style={styles.matchingColumn}>
                {currentQuestion.matchingPairs?.map((pair, idx) => {
                  const isSelected = matchSelection?.side === 'left' && matchSelection.index === idx;
                  const isLinked = matchingLinks.hasOwnProperty(idx);

                  let borderColor = colors.border;
                  let bgColor = colors.surface;
                  let showStatusIcon = false;
                  let isCorrectMatch = false;

                  if (selectedOption !== null && isLinked) {
                    const rightIdx = matchingLinks[idx];
                    isCorrectMatch = idx === shuffledMatchRight[rightIdx]?.originalIndex;
                    borderColor = isCorrectMatch ? colors.success : colors.error;
                    bgColor = isCorrectMatch ? colors.success + '15' : colors.error + '15';
                    showStatusIcon = true;
                  } else if (isSelected) {
                    borderColor = colors.primary;
                    bgColor = colors.primary + '10';
                  } else if (isLinked) {
                    borderColor = colors.primary + '50';
                    bgColor = colors.primary + '05';
                  }

                  return (
                    <TouchableOpacity
                      key={`left-${idx}`}
                      onPress={() => handleMatchSelect('left', idx)}
                      style={[
                        styles.matchItem,
                        { borderColor, backgroundColor: bgColor }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {showStatusIcon && (
                          isCorrectMatch
                            ? <CheckCircle2 color={colors.success} size={16} />
                            : <AlertCircle color={colors.error} size={16} />
                        )}
                        <Text style={[styles.matchText, { color: colors.text, flex: 1, textAlign: 'center' }]}>{pair.left}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.matchingDivider} />
              <View style={styles.matchingColumn}>
                {shuffledMatchRight.map((item, idx) => {
                  const isSelected = matchSelection?.side === 'right' && matchSelection.index === idx;
                  const leftIdx = Object.keys(matchingLinks).find(k => matchingLinks[k as any] === idx);
                  const isLinked = leftIdx !== undefined;

                  let borderColor = colors.border;
                  let bgColor = colors.surface;
                  let showStatusIcon = false;
                  let isCorrectMatch = false;

                  if (selectedOption !== null && isLinked) {
                    isCorrectMatch = parseInt(leftIdx!) === item.originalIndex;
                    borderColor = isCorrectMatch ? colors.success : colors.error;
                    bgColor = isCorrectMatch ? colors.success + '15' : colors.error + '15';
                    showStatusIcon = true;
                  } else if (isSelected) {
                    borderColor = colors.primary;
                    bgColor = colors.primary + '10';
                  } else if (isLinked) {
                    borderColor = colors.primary + '50';
                    bgColor = colors.primary + '05';
                  }

                  return (
                    <TouchableOpacity
                      key={`right-${idx}`}
                      onPress={() => handleMatchSelect('right', idx)}
                      style={[
                        styles.matchItem,
                        { borderColor, backgroundColor: bgColor }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.matchText, { color: colors.text, flex: 1, textAlign: 'center' }]}>{item.text}</Text>
                        {showStatusIcon && (
                          isCorrectMatch
                            ? <CheckCircle2 color={colors.success} size={16} />
                            : <AlertCircle color={colors.error} size={16} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            currentQuestion.options.map((option, index) => {
              const hasText = option.trim().length > 0;
              const hasImage = currentQuestion.optionImages?.[index]?.trim()?.length > 0;
              if (!hasText && !hasImage) return null;

              if (eliminatedOptions.includes(index)) {
                return (
                  <View key={index} style={[styles.optionCard, { opacity: 0.3, borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <View style={styles.optionContent}>
                      <View style={[styles.optionLabelContainer, { backgroundColor: colors.border }]}>
                        <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>
                          {t(`quiz.options.${index}`)}
                        </Text>
                      </View>
                      {currentQuestion.optionImages?.[index] && !option.trim() && (
                        <Image
                          source={{ uri: `${BASE_IMAGE_URL}${currentQuestion.optionImages[index]}` }}
                          style={[styles.optionImage, { opacity: 0.3, marginLeft: 0, marginRight: 12 }]}
                          resizeMode="cover"
                        />
                      )}
                      <Text style={[styles.optionTxt, { textDecorationLine: 'line-through', color: colors.textSecondary }]}>{option}</Text>
                      {currentQuestion.optionImages?.[index] && option.trim() && (
                        <Image
                          source={{ uri: `${BASE_IMAGE_URL}${currentQuestion.optionImages[index]}` }}
                          style={[styles.optionImage, { opacity: 0.3 }]}
                          resizeMode="cover"
                        />
                      )}
                    </View>
                  </View>
                );
              }

              let borderColor = colors.border;
              let bgColor = colors.surface;
              let labelBg = colors.border;
              let labelTextColor = colors.textSecondary;
              let textColor = colors.text;

              const isThisSelected = currentQuestion.type === 'multiple_correct'
                ? selectedOptions.includes(index)
                : selectedOption === index;

              const isThisCorrect = currentQuestion.type === 'multiple_correct'
                ? currentQuestion.correctAnswerIndices?.includes(index)
                : index === currentQuestion.correctAnswerIndex;

              if (selectedOption !== null) {
                if (isThisCorrect) {
                  // Solid success background
                  borderColor = colors.success;
                  bgColor = colors.success + '20'; // 20% opacity fill
                  labelBg = colors.success;
                  labelTextColor = 'white';
                  textColor = colors.text;
                } else if (isThisSelected) {
                  // Solid error background
                  borderColor = colors.error;
                  bgColor = colors.error + '20'; // 20% opacity fill
                  labelBg = colors.error;
                  labelTextColor = 'white';
                  textColor = colors.text;
                }
              } else if (isThisSelected) {
                // While selecting (for multiple_correct)
                borderColor = colors.primary;
                bgColor = colors.primary + '10';
                labelBg = colors.primary;
                labelTextColor = 'white';
              }

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => handleOptionSelect(index)}
                  disabled={selectedOption !== null || eliminatedOptions.includes(index)}
                  style={[
                    styles.optionCard,
                    { borderColor, backgroundColor: bgColor }
                  ]}
                >
                  <View style={styles.optionContent}>
                    <View
                      style={[
                        styles.optionLabelContainer,
                        { backgroundColor: labelBg }
                      ]}
                    >
                      <Text style={[styles.optionLabel, { color: labelTextColor }]}>
                        {t(`quiz.options.${index}`)}
                      </Text>
                    </View>

                    {currentQuestion.optionImages?.[index] && !option.trim() && (
                      <Image
                        source={{ uri: `${BASE_IMAGE_URL}${currentQuestion.optionImages[index]}` }}
                        style={[styles.optionImage, { marginLeft: 0, marginRight: 12 }]}
                        resizeMode="cover"
                      />
                    )}
                    <Text style={[styles.optionTxt, { color: textColor }]}>{option}</Text>
                    {currentQuestion.optionImages?.[index] && option.trim() && (
                      <Image
                        source={{ uri: `${BASE_IMAGE_URL}${currentQuestion.optionImages[index]}` }}
                        style={styles.optionImage}
                        resizeMode="cover"
                      />
                    )}
                  </View>

                  {(selectedOption === index || (selectedOption === -2 && isThisSelected)) && (
                    isCorrect
                      ? <CheckCircle2 color={colors.success} size={22} />
                      : <AlertCircle color={colors.error} size={22} />
                  )}

                  {selectedOption !== null && isThisCorrect && !isThisSelected && (
                    <CheckCircle2 color={colors.success} size={22} />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {(currentQuestion.type === 'multiple_correct' || currentQuestion.type === 'matching') && selectedOption === null && (
          <TouchableOpacity
            onPress={submitComplexQuestion}
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary },
              (currentQuestion.type === 'multiple_correct' && selectedOptions.length === 0) ||
                (currentQuestion.type === 'matching' && Object.keys(matchingLinks).length < (currentQuestion.matchingPairs?.length || 0))
                ? { opacity: 0.5 } : {}
            ]}
            disabled={(currentQuestion.type === 'multiple_correct' && selectedOptions.length === 0) ||
              (currentQuestion.type === 'matching' && Object.keys(matchingLinks).length < (currentQuestion.matchingPairs?.length || 0))}
          >
            <Text style={styles.submitBtnText}>{t('quiz.submit') || 'Submit Answer'}</Text>
            <ArrowRight color="white" size={20} />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Footer */}
      {selectedOption !== null && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: color }]}
            onPress={nextQuestion}
          >
            <Text style={styles.btnTxt}>
              {currentIndex === questions.length - 1
                ? t('common.finish')
                : t('quiz.next_question')}
            </Text>
            <ArrowRight color="white" size={20} />
          </TouchableOpacity>
        </View>
      )}

      <PuzzleModal
        visible={showPuzzle}
        categoryId={categoryId}
        onClose={() => {
          setShowPuzzle(false);
          if (currentHearts === 0) {
            navigation.goBack();
          }
        }}
        onSuccess={(newHearts) => {
          setShowPuzzle(false);
          if (newHearts !== undefined) {
            setCurrentHearts(newHearts);
          }
          if (error) fetchQuestions();
        }}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 12,
      gap: 12,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    headerRight: {
      minWidth: 80,
      alignItems: 'flex-end',
    },
    headerStat: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    headerStatText: {
      fontSize: 12,
      fontWeight: 'bold',
    },
    headerInfo: {
      flex: 1,
      alignItems: 'center',
    },
    headerCat: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 2,
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
    progressContainer: {
      marginBottom: 12,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    progressText: {
      fontSize: 14,
      fontWeight: '600',
    },
    timerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border + '40',
      gap: 6,
    },
    timerText: {
      fontSize: 14,
      fontWeight: 'bold',
      fontVariant: ['tabular-nums'],
    },
    progressBarBg: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    content: {
      flex: 1,
      paddingHorizontal: 15,
      paddingTop: 10,
    },
    questionTxt: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 30,
      textAlign: 'center',
      marginBottom: 28,
      marginTop: 8,
    },
    blankPlaceholder: {
      color: colors.primary,
      textDecorationLine: 'underline',
      fontWeight: 'bold',
    },
    qImage: {
      width: '100%',
      height: 200,
      borderRadius: 16,
      marginBottom: 28,
    },
    optionsContainer: {
      gap: 12,
    },
    optionCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    optionLabelContainer: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    optionLabel: {
      fontWeight: 'bold',
    },
    optionTxt: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
    },
    optionImage: {
      width: 80,
      height: 80,
      borderRadius: 10,
      marginLeft: 12,
      backgroundColor: colors.border + '20',
    },
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
      borderRadius: 16,
      marginTop: 20,
      gap: 10,
    },
    submitBtnText: {
      color: 'white',
      fontSize: 18,
      fontWeight: '700',
    },
    matchingContainer: {
      flexDirection: 'row',
      gap: 15,
    },
    matchingColumn: {
      flex: 1,
      gap: 10,
    },
    matchingDivider: {
      width: 1,
      backgroundColor: colors.border,
      height: '100%',
    },
    matchItem: {
      padding: 15,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      minHeight: 60,
      justifyContent: 'center',
    },
    matchText: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    footer: {
      padding: 20,
    },
    nextBtn: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      gap: 10,
    },
    btnTxt: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 18,
      color: colors.text,
    },
    closeBtn: {
      padding: 20,
    },
    scoreBadge: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    scoreTxt: {
      fontSize: 30,
      fontWeight: 'bold',
    },
    finishTitle: {
      fontSize: 26,
      fontWeight: 'bold',
      color: colors.text,
    },
    finishSub: {
      color: colors.textSecondary,
      marginBottom: 30,
    },
    primaryBtn: {
      padding: 16,
      borderRadius: 16,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    finishAnalyticsGrid: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 32,
      width: '100%',
    },
    finishAnalyticsCard: {
      flex: 1,
      padding: 16,
      borderRadius: 20,
      alignItems: 'center',
      gap: 8,
      ...(Platform.OS === 'web' ? {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }),
      elevation: 2,
    },
    finishAnalyticsValue: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    finishAnalyticsLabel: {
      fontSize: 12,
    },
    errorIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 12,
      textAlign: 'center',
    },
    errorSub: {
      fontSize: 16,
      textAlign: 'center',
      paddingHorizontal: 40,
      lineHeight: 24,
      marginBottom: 8,
    },
    completionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 16,
      gap: 10,
      marginBottom: 4,
    },
    completionTxt: {
      fontSize: 16,
      fontWeight: '600',
    },
    rewardContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1,
      width: '100%',
      marginBottom: 24,
    },
    rewardItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rewardValue: {
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 4,
    },
    rewardLabel: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginTop: 2,
    },
    rewardDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
      marginHorizontal: 20,
    },
    lifelinesWrapper: {
      marginBottom: 12,
      marginHorizontal: -15, // Bleed to edges
    },
    lifelinesContent: {
      paddingHorizontal: 15, // Match screen padding
      paddingBottom: 4,
    },
    lifelineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderWidth: 1.5,
      borderRadius: 14,
      marginRight: 10,
      backgroundColor: colors.surface,
      minWidth: 110,
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
        web: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }
      }),
    },
    lifelineTxt: {
      fontSize: 13,
      fontWeight: 'bold',
    },
  });

export default QuizScreen;