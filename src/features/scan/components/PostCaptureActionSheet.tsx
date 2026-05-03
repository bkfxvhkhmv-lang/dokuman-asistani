/**
 * Çekim sonrası aksiyon sheet — orchestrator.
 * Alt parçalar `post-capture-sheet/` dizininde.
 */
import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScanI18n } from '@/hooks/useScanI18n';
import { useScan } from '@/features/scan/context/ScanContext';

import PostCaptureHeader from '@/features/scan/components/post-capture-sheet/PostCaptureHeader';
import PostCapturePrimaryDiagnose from '@/features/scan/components/post-capture-sheet/PostCapturePrimaryDiagnose';
import PostCaptureSecondaryList from '@/features/scan/components/post-capture-sheet/PostCaptureSecondaryList';
import { usePostCapturePresence } from '@/features/scan/components/post-capture-sheet/usePostCapturePresence';
import { postCaptureSheetStyles as st } from '@/features/scan/components/post-capture-sheet/styles';

import type { PostCaptureAction, PostCaptureActionSheetProps } from '@/features/scan/components/post-capture-sheet/types';

export type { PostCaptureAction } from '@/features/scan/components/post-capture-sheet/types';

export default function PostCaptureActionSheet({ pageCount, onSelect }: PostCaptureActionSheetProps) {
  const { t } = useScanI18n();
  const { showActionPicker, closeActionPicker } = useScan();
  const insets = useSafeAreaInsets();

  const { slideY, backdropOp, glowOp } = usePostCapturePresence(showActionPicker);

  const handleCancel = useCallback(() => {
    if (pageCount === 0) { closeActionPicker(); return; }
    Alert.alert(
      'Scan verwerfen?',
      'Die aufgenommenen Seiten werden gelöscht.',
      [
        { text: 'Behalten', style: 'cancel' },
        { text: 'Verwerfen', style: 'destructive', onPress: closeActionPicker },
      ],
    );
  }, [pageCount, closeActionPicker]);

  const pageLabel = pageCount === 1
    ? `1 ${t('scan.page')}`
    : `${pageCount} ${t('scan.pages')}`;

  return (
    <Modal visible={showActionPicker} transparent animationType="none" onRequestClose={handleCancel}>
      <Animated.View style={[st.backdrop, { opacity: backdropOp }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleCancel} activeOpacity={1} />
      </Animated.View>

      <Animated.View
        style={[
          st.sheet,
          { paddingBottom: Math.max(insets.bottom + 8, 20), transform: [{ translateY: slideY }] },
        ]}
      >
        <View style={st.handle} />

        <PostCaptureHeader
          pageLabel={pageLabel}
          ocrReadyLabel={t('scan.ocr_ready')}
          readyTitle={t('scan.ready_title')}
        />

        <PostCapturePrimaryDiagnose
          glowOpacity={glowOp}
          title="Weiter zur Analyse"
          subtitle="KI erkennt Felder, Frist und Risiko."
          onDiagnose={() => onSelect('diagnose')}
        />

        <PostCaptureSecondaryList
          labels={{
            add_page: 'Weitere Seite scannen',
            edit:     'Bearbeiten',
          }}
          onSelect={onSelect}
        />

        <TouchableOpacity style={st.cancelBtn} onPress={handleCancel}>
          <Text style={st.cancelText}>{t('scan.cancel')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}
