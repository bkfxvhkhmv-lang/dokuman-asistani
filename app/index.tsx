import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/providers/AuthContext';
import { ONBOARDING_DONE_KEY } from '../src/product/onboardingStorage';

export default function Index() {
  const { user, loading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DONE_KEY).then(val => {
      setOnboardingDone(val === 'true');
      setOnboardingChecked(true);
    });
  }, []);

  if (loading || !onboardingChecked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F1A' }}>
        <ActivityIndicator size="large" color="#7C6AFF" />
      </View>
    );
  }

  if (!onboardingDone) return <Redirect href="/onboarding" />;
  return <Redirect href={user ? '/(tabs)/' : '/login'} />;
}
