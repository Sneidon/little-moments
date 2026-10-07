import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';

type ParentFlags = { parentStatus?: string; onboardingTourCompletedAt?: unknown };

function completeTour() {
  httpsCallable(getFunctions(app), 'completeParentOnboardingTour')({}).catch(() => {});
}

export function useOnboardingTour() {
  const { profile } = useAuth();
  const shown = useRef(false);
  const flags = (profile ?? {}) as ParentFlags;
  const eligible = profile?.role === 'parent' && flags.parentStatus === 'ACTIVE' && !flags.onboardingTourCompletedAt;

  useEffect(() => {
    if (!eligible || shown.current) return;
    shown.current = true;
    Alert.alert('Welcome!', 'Tap the heart to react to a moment.', [
      {
        text: 'Next',
        onPress: () => Alert.alert('Tip', 'Swipe for older moments.', [{ text: 'Done', onPress: completeTour }]),
      },
    ]);
  }, [eligible]);
}
