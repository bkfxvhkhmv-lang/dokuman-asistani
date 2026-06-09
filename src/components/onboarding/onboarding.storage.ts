import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_STORAGE_KEY } from '@/components/onboarding/onboarding.constants';

export async function onboardingGesehen(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
  return raw === 'true';
}

export async function onboardingAlsGesehen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
}
