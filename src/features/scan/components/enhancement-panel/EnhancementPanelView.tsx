import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
} from 'react-native';
import Icon from '@/components/Icon';
import { styles } from '@/features/scan/styles';
import { DEFAULT_ADJUSTMENTS, type EnhancementPanelProps, type ManualAdjustments } from '@/features/scan/components/enhancement-panel/types';
import { getEnhancementRecommendation } from '@/features/scan/components/enhancement-panel/recommendation';
import { getPresetSubtitle } from '@/features/scan/components/enhancement-panel/presetHints';
import { EnhancementPremiumSlider } from '@/features/scan/components/enhancement-panel/EnhancementPremiumSlider';
import { useT } from '@/hooks/useT';

export default function EnhancementPanelView({
  presets,
  activeFilter,
  qualityScore,
  processing,
  isDirty,
  adjustments = DEFAULT_ADJUSTMENTS,
  onSelectPreset,
  onAdjustmentsChange,
  onApply,
}: EnhancementPanelProps) {
  const { t: T } = useT();
  const [showManual, setShowManual] = useState(false);
  const recommendation = getEnhancementRecommendation(qualityScore);

  const handleAdjust = useCallback((key: keyof ManualAdjustments, v: number) => {
    onAdjustmentsChange?.({ ...adjustments, [key]: v });
  }, [adjustments, onAdjustmentsChange]);

  const hasAdjustments = Object.values(adjustments).some(v => v !== 0);

  const autoEnhance = useCallback(() => {
    if (!qualityScore) return;
    onAdjustmentsChange?.({
      brightness: qualityScore < 50 ? 15 : 5,
      contrast: qualityScore < 50 ? 20 : 10,
      clarity: qualityScore < 70 ? 30 : 10,
      shadowRemoval: qualityScore < 60 ? 25 : 0,
    });
  }, [qualityScore, onAdjustmentsChange]);

  const resetAdjustments = useCallback(() => {
    onAdjustmentsChange?.(DEFAULT_ADJUSTMENTS);
  }, [onAdjustmentsChange]);

  return (
    <View style={styles.enhancementPanel}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
        <Icon name="magic-wand" size={16} color="#7C6EF8" />
        <Text style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: '600' }}>
          {T(recommendation.descriptionKey)}
        </Text>
        {hasAdjustments && (
          <TouchableOpacity onPress={resetAdjustments}
            style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: '#EF4444' }}>
            <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>{T('common.reset')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.editSectionTitle}>{T('scan.enhance.presets')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.enhancementPresetRow}>
        {presets.map(preset => (
          <TouchableOpacity
            key={preset.id}
            style={[styles.enhancementPresetCard, activeFilter === preset.id && styles.enhancementPresetCardActive]}
            onPress={() => onSelectPreset(preset.id)}
          >
            <View style={[styles.enhancementPresetIcon, { backgroundColor: activeFilter === preset.id ? preset.color : 'rgba(255,255,255,0.08)' }]}>
              <Icon name={preset.icon} size={16} color="#fff" />
            </View>
            <Text style={styles.enhancementPresetTitle}>{preset.name}</Text>
            <Text style={styles.enhancementPresetHint}>
              {getPresetSubtitle(preset.id)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {onAdjustmentsChange && (
        <>
          <TouchableOpacity
            onPress={() => setShowManual(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingVertical: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}
          >
              <Text style={{ color: '#ccc', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
              {T('scan.enhance.manual')}
              </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {qualityScore ? (
                <TouchableOpacity onPress={autoEnhance} style={{ paddingHorizontal: 10, paddingVertical: 4,
                  borderRadius: 8, backgroundColor: 'rgba(79,195,247,0.15)', borderWidth: 1, borderColor: '#4FC3F7' }}>
                  <Text style={{ color: '#4FC3F7', fontSize: 10, fontWeight: '700' }}>{T('scan.enhance.auto')}</Text>
                </TouchableOpacity>
              ) : null}
              <Icon name={showManual ? 'caret-up' : 'caret-down'} size={14} color="#666" />
            </View>
          </TouchableOpacity>

          {showManual && (
            <View style={{ paddingTop: 8, paddingHorizontal: 4 }}>
              <EnhancementPremiumSlider
                label={T('scan.enhance.brightness')}
                value={adjustments.brightness}
                min={-100} max={100}
                showCenter
                onChange={v => handleAdjust('brightness', v)}
              />
              <EnhancementPremiumSlider
                label={T('scan.enhance.contrast')}
                value={adjustments.contrast}
                min={-100} max={100}
                showCenter
                onChange={v => handleAdjust('contrast', v)}
              />
              <EnhancementPremiumSlider
                label={T('scan.enhance.sharpness')}
                value={adjustments.clarity}
                min={0} max={100}
                onChange={v => handleAdjust('clarity', v)}
              />
              <EnhancementPremiumSlider
                label={T('scan.enhance.shadow_remove')}
                value={adjustments.shadowRemoval}
                min={0} max={100}
                onChange={v => handleAdjust('shadowRemoval', v)}
              />
            </View>
          )}
        </>
      )}

      <TouchableOpacity
        style={[styles.enhancementApplyBtn, (!isDirty && !hasAdjustments || processing) && styles.filterApplyBtnDisabled]}
        disabled={(!isDirty && !hasAdjustments) || processing}
        onPress={onApply}
      >
        <Text style={styles.enhancementApplyText}>
          {processing ? T('scan.enhance.processing') : T('scan.enhance.apply')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
