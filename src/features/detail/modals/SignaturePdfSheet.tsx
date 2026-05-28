import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';

import type { Dokument } from '@/store';
import { exportierePDFZuDatei } from '@/utils/exporters';
import { stampSignatureOnLastPage } from '@/core/pdf/jsPdfGenerate';
import { AppSheet } from '@/design/components';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';
import { detailModalStyles as st } from '@/features/detail/detail-modals/styles';
import { safeDisplayTitel } from '@/utils/displaySanitizer';

interface Props {
  visible: boolean;
  onClose: () => void;
  dok: Dokument;
  onDone?: () => void;
}

export default function SignaturePdfSheet({ visible, onClose, dok, onDone }: Props) {
  const { Colors: C } = useTheme();
  const { t } = useT();
  const { width: winW } = useWindowDimensions();
  const padW = Math.min(winW - 48, 400);
  const padH = 180;

  const shotRef = useRef<View>(null);
  const [paths, setPaths] = useState<[number, number][][]>([]);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setPaths([]);
  }, []);

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: evt => {
          const { locationX: x, locationY: y } = evt.nativeEvent;
          setPaths(p => [...p, [[x, y]]]);
        },
        onPanResponderMove: evt => {
          const { locationX: x, locationY: y } = evt.nativeEvent;
          setPaths(prev => {
            if (!prev.length) return prev;
            const copy = [...prev];
            const i = copy.length - 1;
            copy[i] = [...copy[i], [x, y]];
            return copy;
          });
        },
      }),
    [],
  );

  const handleApply = useCallback(async () => {
    const ink = paths.some(s => s.length >= 2);
    if (!ink) {
      Alert.alert(t('signature.title'), t('signature.alert_empty'));
      return;
    }

    setBusy(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const sigUri = await captureRef(shotRef, { format: 'png', quality: 0.92 });
      const basePdf = await exportierePDFZuDatei(dok);
      const out = await stampSignatureOnLastPage(basePdf, sigUri);

      if (!out?.uri) {
        Alert.alert(t('common.error'), t('signature.error_pdf'));
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        const displayTitle = safeDisplayTitel(dok.titel, dok.typ, dok.confidence);
        await Sharing.shareAsync(out.uri, {
          mimeType: 'application/pdf',
          dialogTitle: displayTitle || 'BriefPilot',
        });
      } else {
        Alert.alert(t('common.done'), t('signature.success_no_share'));
      }

      reset();
      onDone?.();
      onClose();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      console.warn('[SignaturePdf]', e);
      Alert.alert(t('common.error'), (e as Error)?.message || t('signature.error_pdf'));
    } finally {
      setBusy(false);
    }
  }, [dok, onClose, onDone, paths, reset]);

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title={t('signature.title')}
      subtitle={t('signature.subtitle')}
      footer={
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <TouchableOpacity
            onPress={reset}
            disabled={busy}
            style={[st.sheetButton, { backgroundColor: C.bgCard, borderColor: C.border, opacity: busy ? 0.5 : 1 }]}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{t('signature.clear')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            disabled={busy}
            style={[st.sheetButton, { backgroundColor: C.bgCard, borderColor: C.border, opacity: busy ? 0.5 : 1 }]}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleApply}
            disabled={busy}
            style={[st.sheetButton, { backgroundColor: C.primaryLight, borderColor: C.primary, opacity: busy ? 0.5 : 1 }]}
          >
            {busy ? (
              <ActivityIndicator color={C.primaryDark} />
            ) : (
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.primaryDark }}>{t('signature.create_pdf')}</Text>
            )}
          </TouchableOpacity>
        </View>
      }
    >
      <View
        ref={shotRef}
        collapsable={false}
        {...panResponder.panHandlers}
        style={{
          width: padW,
          alignSelf: 'center',
          height: padH,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: C.border,
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
        }}
      >
        <Svg width={padW} height={padH}>
          {paths.map((pts, idx) => (
            <Polyline
              key={idx}
              points={pts.map(([px, py]) => `${px},${py}`).join(' ')}
              fill="none"
              stroke="#111827"
              strokeWidth={2.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>
    </AppSheet>
  );
}
