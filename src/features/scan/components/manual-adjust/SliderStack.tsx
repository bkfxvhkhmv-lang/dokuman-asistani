/**
 * Manual Adjust 5 sliderini bir arada gostermesi icin grup.
 *
 * Sliderlar grubu sabit bir kontrol bloku icinde scroll'lanabilir
 * (maxHeight: 160) — boylece preview alanini ezmez.
 */
import React from 'react';
import { ScrollView } from 'react-native';
import Slider from '@/features/scan/components/manual-adjust/Slider';
import { adjustStyles as st } from '@/features/scan/components/manual-adjust/styles';
import type { ManualAdjustValues } from '@/modules/image-processing/engine/SkiaManualAdjuster';
import type { T } from '@/features/scan/components/manual-adjust/types';

interface Props {
  values: ManualAdjustValues;
  onChange: (key: keyof ManualAdjustValues, v: number) => void;
  t: T;
}

export default function SliderStack({ values, onChange, t }: Props) {
  return (
    <ScrollView
      style={st.slidersBlock}
      contentContainerStyle={st.slidersInner}
      showsVerticalScrollIndicator={false}
    >
      <Slider
        label={t('scan.adjust_brightness')}
        value={values.brightness}
        min={-100} max={100} showCenter
        onChange={v => onChange('brightness', v)}
      />
      <Slider
        label={t('scan.adjust_contrast')}
        value={values.contrast}
        min={-100} max={100} showCenter
        onChange={v => onChange('contrast', v)}
      />
      <Slider
        label={t('scan.adjust_clarity')}
        value={values.clarity}
        min={0} max={100}
        onChange={v => onChange('clarity', v)}
      />
      <Slider
        label={t('scan.adjust_shadow')}
        value={values.shadowRemoval}
        min={0} max={100}
        onChange={v => onChange('shadowRemoval', v)}
      />
      <Slider
        label={t('scan.adjust_saturation')}
        value={values.saturation ?? 0}
        min={-100} max={100} showCenter
        onChange={v => onChange('saturation', v)}
      />
    </ScrollView>
  );
}
