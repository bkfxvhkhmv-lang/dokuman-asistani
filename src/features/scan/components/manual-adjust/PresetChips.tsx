/**
 * Manual Adjust ust seridindeki preset chip'leri.
 *
 * Active preset belirlemesi orchestrator'da yapildigi icin bu bilesen
 * "stupid" — sadece icindekilerini cizer.
 */
import React from 'react';
import { ScrollView, Pressable, Text } from 'react-native';
import Icon from '@/components/Icon';
import { HIT_SLOP } from '@/theme';
import { adjustStyles as st } from '@/features/scan/components/manual-adjust/styles';
import { PRESETS, type T } from '@/features/scan/components/manual-adjust/types';
import type { MANUAL_PRESETS } from '@/modules/image-processing/engine/SkiaManualAdjuster';

interface Props {
  activePresetId: keyof typeof MANUAL_PRESETS | null;
  onApplyPreset: (id: keyof typeof MANUAL_PRESETS) => void;
  t: T;
}

export default function PresetChips({ activePresetId, onApplyPreset, t }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={st.presetsRow}
    >
      {PRESETS.map(p => {
        const isActive = activePresetId === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => onApplyPreset(p.id)}
            style={[st.presetChip, isActive && st.presetChipActive]}
            hitSlop={HIT_SLOP}
          >
            <Icon name={p.icon} size={13} color={isActive ? '#fff' : 'rgba(255,255,255,0.85)'} />
            <Text style={[st.presetChipText, isActive && st.presetChipTextActive]}>
              {t(p.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
