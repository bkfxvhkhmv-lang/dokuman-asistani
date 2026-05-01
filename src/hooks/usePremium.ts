import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_KEY = '@briefpilot_premium_v1';

export interface PremiumState {
  isPlus: boolean;
  loading: boolean;
  activate: () => Promise<void>;
  deactivate: () => Promise<void>;
}

export function usePremium(): PremiumState {
  const [isPlus, setIsPlus]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(PREMIUM_KEY)
      .then(val => setIsPlus(val === 'true'))
      .finally(() => setLoading(false));
  }, []);

  const activate = useCallback(async () => {
    await AsyncStorage.setItem(PREMIUM_KEY, 'true');
    setIsPlus(true);
  }, []);

  const deactivate = useCallback(async () => {
    await AsyncStorage.removeItem(PREMIUM_KEY);
    setIsPlus(false);
  }, []);

  return { isPlus, loading, activate, deactivate };
}
