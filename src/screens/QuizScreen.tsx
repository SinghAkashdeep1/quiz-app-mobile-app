import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import client, { BASE_IMAGE_URL } from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import { X, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Question {
  _id: string;
  type: 'mcq' | 'boolean' | 'image';
  text: string;
  imageUrl?: string;
  options: string[];
  correctAnswerIndex: number;
}

const QuizScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'Quiz'>>();
  const navigation = useNavigation();
  const { categoryId, categoryName, color } = route.params;
  const { colors } = useTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [results, setResults] = useState<{ questionId: string, isCorrect: boolean }[]>([]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await client.get(`/questions/category/${categoryId}`);
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (index: number) => {
    if (selectedOption !== null) return;

    setSelectedOption(index);
    const correct = questions[currentIndex].correctAnswerIndex === index;
    setIsCorrect(correct);

    if (correct) setScore(prev => prev + 1);

    setResults(prev => [
      ...prev,
      { questionId: questions[currentIndex]._id, isCorrect: correct }
    ]);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setQuizFinished(true);
    try {
      await client.post('/questions/analytics', { results });
    } catch (error) {
      console.error('Failed to send analytics', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <X color={colors.text} size={24} />
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.title}>No questions found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (quizFinished) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <View style={[styles.scoreBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.scoreTxt, { color }]}>
              {score} / {questions.length}
            </Text>
          </View>

          <Text style={styles.finishTitle}>Quiz Completed!</Text>
          <Text style={styles.finishSub}>
            Great effort on the {categoryName} quiz.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: color }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnTxt}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color={colors.text} size={24} />
        </TouchableOpacity>

        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: color }
            ]}
          />
        </View>

        <Text style={styles.progressTxt}>
          {currentIndex + 1} / {questions.length}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {console.log('Current Question:', currentQuestion)}
        {currentQuestion.type === 'image' && currentQuestion.imageUrl && (
          <Image 
            source={{ uri: `${BASE_IMAGE_URL}${currentQuestion.imageUrl}` }} 
            style={styles.qImage} 
            resizeMode="cover"
          />
        )}
        <Text style={styles.qText}>{currentQuestion.text}</Text>

        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            let borderColor = colors.border;
            let bgColor = colors.surface;
            let labelBg = colors.border;
            let labelTextColor = colors.textSecondary;

            // ✅ Selected option
            if (selectedOption === index) {
              const correct = isCorrect;

              borderColor = correct ? colors.success : colors.error;
              bgColor = correct ? colors.successLight : colors.errorLight;
              labelBg = correct ? colors.success : colors.error;
              labelTextColor = 'white';
            }

            // ✅ Show correct answer
            else if (
              selectedOption !== null &&
              index === currentQuestion.correctAnswerIndex
            ) {
              borderColor = colors.success;
              bgColor = colors.successLight;
              labelBg = colors.success;
              labelTextColor = 'white';
            }

            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() => handleOptionSelect(index)}
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
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>

                  <Text style={styles.optionTxt}>{option}</Text>
                </View>

                {selectedOption === index && (
                  isCorrect
                    ? <CheckCircle2 color={colors.success} size={22} />
                    : <AlertCircle color={colors.error} size={22} />
                )}

                {selectedOption !== null &&
                  index === currentQuestion.correctAnswerIndex &&
                  selectedOption !== index && (
                    <CheckCircle2 color={colors.success} size={22} />
                  )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Footer */}
      {selectedOption !== null && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: color }]}
            onPress={nextQuestion}
          >
            <Text style={styles.btnTxt}>
              {currentIndex === questions.length - 1
                ? 'Finish'
                : 'Next Question'}
            </Text>
            <ArrowRight color="white" size={20} />
          </TouchableOpacity>
        </View>
      )}
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
      padding: 20,
      gap: 12,
    },
    progressBg: {
      flex: 1,
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 6,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
    },
    progressTxt: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      padding: 20,
    },
    qText: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 24,
      color: colors.text,
    },
    qImage: {
      width: '100%',
      height: 200,
      borderRadius: 16,
      marginBottom: 20,
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
      alignItems: 'center',
    },
  });

export default QuizScreen;