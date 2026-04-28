import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  PanResponder, Animated,
} from 'react-native';
import Icon from '../../../components/Icon';
import { styles } from '../styles';

interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ManualAdjustments {
  brightness: number;   // -100 to +100, default 0
  contrast: number;     // -100 to +100, default 0
  clarity: number;      // 0 to 100, default 0
  shadowRemoval: number; // 0 to 100, default 0
}

interface Props {
  presets: FilterPreset[];
  activeFilter: string;
  qualityScore?: number;
  processing: boolean;
  isDirty: boolean;
  adjustments?: ManualAdjustments;
  onSelectPreset: (id: string) => void;
  onAdjustmentsChange?: (adj: ManualAdjustments) => void;
  onApply: () => void;
}

const DEFAULT_ADJUSTMENTS: ManualAdjustments = {
  brightness: 0,
  contrast: 0,
  clarity: 0,
  shadowRemoval: 0,
};

function getRecommendation(qualityScore?: number) {
  if (typeof qualityScore !== 'number') return { title: 'Auto Enhance', description: 'Nutze Clean oder Magic für klarere Kanten und stabileres OCR.' };
  if (qualityScore < 45) return { title: 'Starke Optimierung empfohlen', description: 'Magic oder Clean helfen bei schwachem Kontrast und unruhigem Hintergrund.' };
  if (qualityScore < 70) return { title: 'Leichte Optimierung empfohlen', description: 'Clean glättet den Scan, ohne zu aggressiv zu wirken.' };
  return { title: 'Scan ist bereits stark', description: 'Original oder Color behalten mehr Details, wenn der Scan schon sauber ist.' };
}

// ── Premium Slider ────────────────────────────────────────────────────────────

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  showCenter?: boolean;
}

function PremiumSlider({ label, value, min, max, onChange, showCenter = false }: SliderProps) {
  const trackWidth = useRef(0);
  const range = max - min;
  const pct = (value - min) / range;

  const pan = useRef(new Animated.Value(0)).current;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        const w = trackWidth.current;
        if (w <= 0) return;
        const raw = Math.round((x / w) * range + min);
        onChange(Math.max(min, Math.min(max, raw)));
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX;
        const w = trackWidth.current;
        if (w <= 0) return;
        const raw = Math.round((x / w) * range + min);
        onChange(Math.max(min, Math.min(max, raw)));
      },
    })
  ).current;

  const displayValue = value === 0 ? '0' : value > 0 ? `+${value}` : `${value}`;

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: '#aaa', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }}>
          {label.toUpperCase()}
        </Text>
        <Text style={{ color: value !== 0 ? '#fff' : '#666', fontSize: 11, fontWeight: '700', minWidth: 32, textAlign: 'right' }}>
          {displayValue}
        </Text>
      </View>

      <View
        onLayout={e => { trackWidth.current = e.nativeEvent.layout.width; }}
        style={{ height: 28, justifyContent: 'center' }}
        {...responder.panHandlers}
      >
        {/* Track background */}
        <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
          {showCenter ? (
            <>
              {/* Left of center */}
              {pct < 0.5 && (
                <View style={{ position: 'absolute', left: `${pct * 100}%`, width: `${(0.5 - pct) * 100}%`, height: '100%', backgroundColor: '#4FC3F7' }} />
              )}
              {/* Right of center */}
              {pct > 0.5 && (
                <View style={{ position: 'absolute', left: '50%', width: `${(pct - 0.5) * 100}%`, height: '100%', backgroundColor: '#4FC3F7' }} />
              )}
            </>
          ) : (
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: '#4FC3F7' }} />
          )}
        </View>

        {/* Center marker */}
        {showCenter && (
          <View style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: 10, marginLeft: -1, marginTop: -5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />
        )}

        {/* Thumb */}
        <View style={{
          position: 'absolute',
          left: `${pct * 100}%`,
          width: 20, height: 20,
          borderRadius: 10,
          backgroundColor: '#fff',
          marginLeft: -10,
          top: '50%', marginTop: -10,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4, shadowRadius: 3,
          elevation: 4,
        }} />
      </View>
    </View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function EnhancementPanel({
  presets,
  activeFilter,
  qualityScore,
  processing,
  isDirty,
  adjustments = DEFAULT_ADJUSTMENTS,
  onSelectPreset,
  onAdjustmentsChange,
  onApply,
}: Props) {
  const [showManual, setShowManual] = useState(false);
  const recommendation = getRecommendation(qualityScore);

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
      {/* Recommendation hint — one line */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
        <Icon name="magic-wand" size={16} color="#7C6EF8" />
        <Text style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: '600' }}>
          {recommendation.description}
        </Text>
        {hasAdjustments && (
          <TouchableOpacity onPress={resetAdjustments}
            style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: '#EF4444' }}>
            <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Presets */}
      <Text style={styles.editSectionTitle}>Schnell-Presets</Text>
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
              {preset.id === 'original' ? 'Unverändert'
                : preset.id === 'clean' ? 'Helle Kanten'
                : preset.id === 'magic' ? 'Dokument-Look'
                : preset.id === 'bw' ? 'Maximale Lesbarkeit'
                : 'Details + Kontrast'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Manual adjustments toggle */}
      {onAdjustmentsChange && (
        <>
          <TouchableOpacity
            onPress={() => setShowManual(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingVertical: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}
          >
            <Text style={{ color: '#ccc', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
              MANUELLE ANPASSUNGEN
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {qualityScore && (
                <TouchableOpacity onPress={autoEnhance} style={{ paddingHorizontal: 10, paddingVertical: 4,
                    borderRadius: 8, backgroundColor: 'rgba(79,195,247,0.15)', borderWidth: 1, borderColor: '#4FC3F7' }}>
                  <Text style={{ color: '#4FC3F7', fontSize: 10, fontWeight: '700' }}>AUTO</Text>
                </TouchableOpacity>
              )}
              <Icon name={showManual ? 'caret-up' : 'caret-down'} size={14} color="#666" />
            </View>
          </TouchableOpacity>

          {showManual && (
            <View style={{ paddingTop: 8, paddingHorizontal: 4 }}>
              <PremiumSlider
                label="Helligkeit"
                value={adjustments.brightness}
                min={-100} max={100}
                showCenter
                onChange={v => handleAdjust('brightness', v)}
              />
              <PremiumSlider
                label="Kontrast"
                value={adjustments.contrast}
                min={-100} max={100}
                showCenter
                onChange={v => handleAdjust('contrast', v)}
              />
              <PremiumSlider
                label="Schärfe"
                value={adjustments.clarity}
                min={0} max={100}
                onChange={v => handleAdjust('clarity', v)}
              />
              <PremiumSlider
                label="Schatten entfernen"
                value={adjustments.shadowRemoval}
                min={0} max={100}
                onChange={v => handleAdjust('shadowRemoval', v)}
              />
            </View>
          )}
        </>
      )}

      {/* Apply button */}
      <TouchableOpacity
        style={[styles.enhancementApplyBtn, (!isDirty && !hasAdjustments || processing) && styles.filterApplyBtnDisabled]}
        disabled={(!isDirty && !hasAdjustments) || processing}
        onPress={onApply}
      >
        <Text style={styles.enhancementApplyText}>
          {processing ? 'Vorschau wird erstellt…' : 'Enhancement anwenden'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
