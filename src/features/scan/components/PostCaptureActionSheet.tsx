/**
 * Çekim sonrası aksiyon sheet — orchestrator.
 * Alt parçalar `post-capture-sheet/` dizininde.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, Modal, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WARNING } from '@/features/scan/constants';
import { useScanI18n } from '@/hooks/useScanI18n';
import { useScan } from '@/features/scan/context/ScanContext';

import PostCaptureHeader from '@/features/scan/components/post-capture-sheet/PostCaptureHeader';
import PostCaptureInsightCard from '@/features/scan/components/post-capture-sheet/PostCaptureInsightCard';
import PostCapturePrimaryDiagnose from '@/features/scan/components/post-capture-sheet/PostCapturePrimaryDiagnose';
import PostCaptureSecondaryList from '@/features/scan/components/post-capture-sheet/PostCaptureSecondaryList';
import { usePostCapturePresence } from '@/features/scan/components/post-capture-sheet/usePostCapturePresence';
import { SHEET_CYAN } from '@/features/scan/components/post-capture-sheet/constants';
import { postCaptureSheetStyles as st } from '@/features/scan/components/post-capture-sheet/styles';

import type { PostCaptureAction, PostCaptureActionSheetProps } from '@/features/scan/components/post-capture-sheet/types';

export type { PostCaptureAction } from '@/features/scan/components/post-capture-sheet/types';

export default function PostCaptureActionSheet({ pageCount, briefInsight, onSelect }: PostCaptureActionSheetProps) {
  const { t } = useScanI18n();
  const { showActionPicker, closeActionPicker } = useScan();
  const insets = useSafeAreaInsets();

  const { slideY, backdropOp, glowOp } = usePostCapturePresence(showActionPicker);

  const pageLabel = pageCount === 1
    ? `1 ${t('scan.page')}`
    : `${pageCount} ${t('scan.pages')}`;

  const insightColor = briefInsight ? WARNING : SHEET_CYAN;

  return (
    <Modal visible={showActionPicker} transparent animationType="none" onRequestClose={closeActionPicker}>
      <Animated.View style={[st.backdrop, { opacity: backdropOp }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={closeActionPicker} activeOpacity={1} />
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

        <PostCaptureInsightCard
          insightText={briefInsight ?? t('scan.ai_preparing')}
          dotColor={insightColor}
        />

        <PostCapturePrimaryDiagnose
          glowOpacity={glowOp}
          title={t('scan.action_diagnose')}
          subtitle={t('scan.action_diagnose_sub')}
          onDiagnose={() => onSelect('diagnose')}
        />

        <PostCaptureSecondaryList
          labels={{
            archive: t('scan.action_archive'),
            export:  t('scan.action_export'),
            advanced: t('scan.action_advanced'),
          }}
          onSelect={onSelect}
        />

        <TouchableOpacity style={st.cancelBtn} onPress={closeActionPicker}>
          <Text style={st.cancelText}>{t('scan.cancel')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}
