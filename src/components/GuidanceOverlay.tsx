import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { X, ChevronRight, Lightbulb } from 'lucide-react-native';
import { useGuidance } from '../context/GuidanceContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

interface GuideStep {
  title: string;
  description: string;
}

interface GuidanceOverlayProps {
  featureKey: string;
  steps: GuideStep[];
  onComplete?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

const GuidanceOverlay: React.FC<GuidanceOverlayProps> = ({ featureKey, steps, onComplete, onVisibilityChange }) => {
  const { onboarding, markAsSeen } = useGuidance();
  const { loading: authLoading } = useAuth(); // Need to import useAuth
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    onVisibilityChange?.(isVisible);
  }, [isVisible]);

  useEffect(() => {
    // Determine if seen. Treat undefined or null as NOT seen.
    const isSeen = onboarding && onboarding[featureKey] === true;

    // Only start timer if:
    // 1. Not already seen in persistent state
    // 2. Auth is finished loading
    // 3. Not already visible
    // 4. HAS NOT BEEN SHOWN IN THIS MOUNT CYCLE
    if (!isSeen && !authLoading && !isVisible && !hasBeenShown) {
      const timer = setTimeout(() => {
        // Double check isSeen inside the timeout
        const stillNotSeen = !onboarding || onboarding[featureKey] !== true;
        if (stillNotSeen) {
          setIsVisible(true);
          setHasBeenShown(true); // Mark as shown so this specific component won't trigger again
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [onboarding, authLoading, featureKey, isVisible, hasBeenShown]);

  if (!isVisible) return null;

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      await markAsSeen(featureKey);
      setIsVisible(false);
      onComplete?.();
    }
  };

  const handleSkip = async () => {
    await markAsSeen(featureKey);
    setIsVisible(false);
    onComplete?.();
  };

  const step = steps[currentStep];

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={styles.backdrop}
        >
          <TouchableOpacity style={styles.backdropPress} onPress={handleSkip} />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.springify().damping(15)}
          style={styles.modal}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Lightbulb size={24} color="#6366f1" />
            </View>
            <TouchableOpacity onPress={handleSkip} style={styles.closeButton}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{t(step.title)}</Text>
          <Text style={styles.description}>{t(step.description)}</Text>

          <View style={styles.footer}>
            <View style={styles.dotsContainer}>
              {steps.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === currentStep ? styles.activeDot : styles.inactiveDot
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleNext}
              style={styles.nextButton}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === steps.length - 1 ? t('onboarding.finish') : t('onboarding.next')}
              </Text>
              <ChevronRight size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropPress: {
    flex: 1,
  },
  modal: {
    width: width * 0.92,
    backgroundColor: '#fff',
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#6366f1',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#e2e8f0',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default GuidanceOverlay;
