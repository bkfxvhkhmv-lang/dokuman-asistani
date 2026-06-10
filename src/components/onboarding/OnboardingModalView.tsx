import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useT } from '@/hooks/useT';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ONBOARDING_SLIDE_WIDTH } from '@/components/onboarding/onboarding.constants';
import { ONBOARDING_SLIDES } from '@/components/onboarding/onboarding.slides';
import type { OnboardingModalProps } from '@/components/onboarding/onboarding.types';
import { onboardingAlsGesehen } from '@/components/onboarding/onboarding.storage';
import { onboardingStyles as st, ONBOARDING_TOP_OFFSET } from '@/components/onboarding/onboarding.styles';
import { OnboardingSlideDemo } from '@/components/onboarding/onboarding.demos';

const W = ONBOARDING_SLIDE_WIDTH;

export default function OnboardingModalView({ visible, onFertig }: OnboardingModalProps) {
  const { t: T } = useT();
  const [aktiv, setAktiv] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const insets = useSafeAreaInsets();
  const topOffset = insets.top + ONBOARDING_TOP_OFFSET;

  const slides = ONBOARDING_SLIDES;

  const goTo = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * W, animated: true });
    setAktiv(idx);
  };

  const handleWeiter = async () => {
    if (aktiv < slides.length - 1) {
      goTo(aktiv + 1);
    } else {
      await onboardingAlsGesehen();
      onFertig();
    }
  };

  const handleUeberspringen = async () => {
    await onboardingAlsGesehen();
    onFertig();
  };

  if (!visible) return null;

  const slide = slides[aktiv];

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={[st.container, { backgroundColor: slide.farbe }]}>
        {aktiv < slides.length - 1 ? (
          <TouchableOpacity style={[st.atla, { top: topOffset }]} onPress={handleUeberspringen}>
            <Text style={st.atlaText}>{T('onboarding.skip')}</Text>
          </TouchableOpacity>
        ) : null}
        <View style={[st.counter, { top: topOffset }]}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' }}>
            {aktiv + 1} / {slides.length}
          </Text>
        </View>

        <ScrollView ref={scrollRef} horizontal pagingEnabled scrollEnabled={false}
          showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          {slides.map((s, i) => (
            <ScrollView key={s.id} style={{ width: W }} contentContainerStyle={st.slide}
              showsVerticalScrollIndicator={false}>
              <View style={st.emojiWrap}>
                <Text style={st.emoji}>{s.emoji}</Text>
              </View>
              <Text style={st.titel}>{s.titel}</Text>
              <Text style={st.text}>{s.textKey ? T(s.textKey) : s.text}</Text>
              {i === aktiv ? <OnboardingSlideDemo slide={s} /> : null}
              <View style={{ height: 120 }} />
            </ScrollView>
          ))}
        </ScrollView>

        <View style={st.noktalar}>
          {slides.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View style={[st.nokta, aktiv === i && st.noktaAktiv, i < aktiv && { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={st.btn} onPress={handleWeiter} activeOpacity={0.85}>
          <Text style={st.btnText}>
            {aktiv === slides.length - 1 ? T('onboarding.start_now') : T('onboarding.next_cta')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </View>
    </Modal>
  );
}
