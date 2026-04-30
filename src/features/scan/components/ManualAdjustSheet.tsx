/**
 * ManualAdjustSheet — Manuel goruntu duzenleme tam ekran modal'i.
 *
 * Bu dosya yalnizca state ve callback yonetimini yapar; gorsel
 * parcalari `./manual-adjust/` alt klasoruyle paylasir:
 *
 *  - PreviewArea  — pinch/zoom + bas-tut karsilastirma + close
 *  - PresetChips  — yatay preset seridi
 *  - SliderStack  — 5 ayar kaydiricisi
 *  - ActionFooter — Cancel + Apply butonlari
 *  - usePreview   — debounce'lu preview generation hook'u
 *
 * Eski monolithic versiyon 583 satir tek dosyaydi; modulerlestirme
 * sonrasi her bilesen test edilebilir ve degistirilebilir hale geldi.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Animated, View } from 'react-native';
import { usePinchZoom } from '@/features/scan/hooks/usePinchZoom';
import { useScanI18n } from '@/hooks/useScanI18n';
import {
  applyManualAdjustments,
  DEFAULT_MANUAL_ADJUSTMENTS,
  isIdentity,
  MANUAL_PRESETS,
  type ManualAdjustValues,
} from '@/modules/image-processing/engine/SkiaManualAdjuster';
import PreviewArea       from '@/features/scan/components/manual-adjust/PreviewArea';
import PresetChips       from '@/features/scan/components/manual-adjust/PresetChips';
import SliderStack       from '@/features/scan/components/manual-adjust/SliderStack';
import ActionFooter      from '@/features/scan/components/manual-adjust/ActionFooter';
import { useManualAdjustPreview } from '@/features/scan/components/manual-adjust/usePreview';
import { adjustStyles as st } from '@/features/scan/components/manual-adjust/styles';

interface Props {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onApply: (committedUri: string, finalValues: ManualAdjustValues) => void;
}

/** Verilen degerlerin hangi preset'e karsilik geldigini bulur.
 *  Hicbir preset'e tam denk dusmuyorsa null doner. */
function findActivePreset(values: ManualAdjustValues): keyof typeof MANUAL_PRESETS | null {
  for (const key of Object.keys(MANUAL_PRESETS) as Array<keyof typeof MANUAL_PRESETS>) {
    const p = MANUAL_PRESETS[key];
    if (
      (p.brightness    ?? 0) === (values.brightness    ?? 0) &&
      (p.contrast      ?? 0) === (values.contrast      ?? 0) &&
      (p.clarity       ?? 0) === (values.clarity       ?? 0) &&
      (p.shadowRemoval ?? 0) === (values.shadowRemoval ?? 0) &&
      (p.saturation    ?? 0) === (values.saturation    ?? 0)
    ) {
      return key;
    }
  }
  return null;
}

export default function ManualAdjustSheet({ visible, imageUri, onCancel, onApply }: Props) {
  const { t } = useScanI18n();
  const zoom  = usePinchZoom();

  const [values, setValues]             = useState<ManualAdjustValues>(DEFAULT_MANUAL_ADJUSTMENTS);
  const [committing, setCommitting]     = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Sheet ne zaman acilirsa state'i sifirla.
  useEffect(() => {
    if (visible) {
      setValues(DEFAULT_MANUAL_ADJUSTMENTS);
      setCommitting(false);
      setShowOriginal(false);
      zoom.reset();
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
    // zoom'u kasitli olarak haricinde tutuyoruz — her render'da
    // re-run istemeyiz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, fadeAnim]);

  const { previewUri, previewing } = useManualAdjustPreview(visible, imageUri, values);

  const setVal = useCallback((key: keyof ManualAdjustValues, v: number) => {
    setValues(prev => ({ ...prev, [key]: v }));
  }, []);

  const applyPreset = useCallback((preset: keyof typeof MANUAL_PRESETS) => {
    setValues({ ...MANUAL_PRESETS[preset] });
  }, []);

  const handleApply = useCallback(async () => {
    if (!imageUri) return;
    // Identity ise commit gerekmez; orijinali geri ver.
    if (isIdentity(values)) {
      onApply(imageUri, values);
      return;
    }
    setCommitting(true);
    try {
      const out = await applyManualAdjustments(imageUri, values);
      onApply(out, values);
    } finally {
      setCommitting(false);
    }
  }, [imageUri, values, onApply]);

  const activePresetId = useMemo(() => findActivePreset(values), [values]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen" transparent>
      <Animated.View style={[st.root, { opacity: fadeAnim }]}>
        <PreviewArea
          imageUri={imageUri}
          previewUri={previewUri}
          showOriginal={showOriginal}
          setShowOriginal={setShowOriginal}
          previewing={previewing}
          zoom={zoom}
          onCancel={onCancel}
          t={t}
        />

        <View style={st.controlsBlock}>
          <PresetChips
            activePresetId={activePresetId}
            onApplyPreset={applyPreset}
            t={t}
          />

          <SliderStack values={values} onChange={setVal} t={t} />

          <ActionFooter
            committing={committing}
            onCancel={onCancel}
            onApply={handleApply}
            t={t}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}
