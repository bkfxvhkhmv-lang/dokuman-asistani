import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HIT_SLOP_LG } from '../../../theme';
import Icon from '../../../components/Icon';
import CropEditor from '../../../components/image-processing/CropEditor';
import EditActionBar from './EditActionBar';
import { styles } from '../styles';
import { BG_DARK, ACCENT } from '../constants';
import { deriveEditUiState } from '../state/EditStateMachine';
import { useEditAnimations } from '../hooks/useEditAnimations';
import { usePinchZoom } from '../hooks/usePinchZoom';
import type { ImageSession } from '../../../modules/image-processing';

interface Props {
  session: ImageSession;
  isOptimizing: boolean;
  compareUri?: string | null;       // before-optimize URI → triggers comparison UI
  onAcceptOptimize?: () => void;
  onRevertOptimize?: () => void;
  onBack: () => void;
  onDone?: () => void;              // proceed to save/analyse sheet
  onStartCrop: () => void;
  onOptimize: () => void;
  onRotate: () => void;
  onCropConfirm: (croppedUri: string) => void;
  onCropConfirmAndAnalyze: (croppedUri: string) => void;
  onCropCancel: () => void;
}

function getSessionUri(session: ImageSession) {
  return session.finalUri ?? session.croppedUri ?? session.correctedUri ?? session.originalUri;
}

export default function EditView({
  session,
  isOptimizing,
  compareUri,
  onAcceptOptimize,
  onRevertOptimize,
  onBack,
  onDone,
  onStartCrop,
  onOptimize,
  onRotate,
  onCropConfirm,
  onCropConfirmAndAnalyze,
  onCropCancel,
}: Props) {
  const insets      = useSafeAreaInsets();
  const editMode    = session.editMode ?? 'none';
  const editUiState = deriveEditUiState(editMode);
  const quality     = session.quality?.overallScore;

  const anim = useEditAnimations(editMode);
  const zoom = usePinchZoom();

  // Comparison toggle — reset to "optimiert" whenever a new comparison starts
  const [showOriginal, setShowOriginal] = useState(false);
  useEffect(() => { setShowOriginal(false); }, [compareUri]);

  const previewUri = (compareUri && showOriginal) ? compareUri : getSessionUri(session);

  const handleRotate = () => {
    anim.triggerRotateHint();
    onRotate();
  };

  const prevMode = useRef(editMode);
  useEffect(() => {
    if (prevMode.current !== editMode) {
      anim.triggerModeChange();
      prevMode.current = editMode;
    }
  }, [editMode]);

  useEffect(() => {
    if (editMode === 'crop') zoom.reset();
  }, [editMode]);

  const rotateDeg = anim.rotateSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const bottomPad = Math.max(20, insets.bottom + 12);

  return (
    <Animated.View style={[localStyles.root, { backgroundColor: BG_DARK, opacity: anim.headerOpacity }]}>
      {/* ── Header ── */}
      <View style={[styles.editHeader, { paddingTop: Math.max(20, insets.top) }]}>
        <TouchableOpacity style={styles.controlBtn} onPress={onBack} hitSlop={HIT_SLOP_LG}>
          <Icon name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.editTitle}>Seite bearbeiten</Text>
        <View style={{ minWidth: 52, alignItems: 'flex-end', justifyContent: 'center' }}>
          {onDone && !editUiState.showsCropEditor ? (
            <TouchableOpacity
              onPress={onDone}
              hitSlop={HIT_SLOP_LG}
              style={{
                paddingHorizontal: 12, paddingVertical: 6,
                borderRadius: 10, backgroundColor: `${ACCENT}22`,
                borderWidth: 1, borderColor: `${ACCENT}55`,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT }}>Weiter</Text>
            </TouchableOpacity>
          ) : typeof quality === 'number' ? (
            <Text style={{
              fontSize: 13, fontWeight: '700',
              color: quality >= 75 ? '#34D399' : quality >= 45 ? '#FBBF24' : '#F87171',
            }}>
              {Math.round(quality)}%
            </Text>
          ) : null}
        </View>
      </View>

      {editUiState.showsCropEditor ? (
        <CropEditor
          visible
          presentation="inline"
          uri={session.finalUri}
          confirmLabel="Zuschneiden"
          secondaryConfirmLabel="Zuschneiden & analysieren"
          onConfirm={onCropConfirm}
          onConfirmAndAnalyze={onCropConfirmAndAnalyze}
          onCancel={onCropCancel}
        />
      ) : (
        <View style={localStyles.body}>
          {/* ── Preview — fills all space above bottom bar ── */}
          <Animated.View
            style={[localStyles.preview,
              { transform: [{ scale: zoom.scale }, { translateX: zoom.translateX }, { translateY: zoom.translateY }] }]}
            {...zoom.panHandlers}
          >
            <Animated.Image
              source={{ uri: previewUri ?? undefined }}
              style={localStyles.previewImage}
              resizeMode="contain"
              opacity={anim.imageOpacityA}
            />
            {editMode === 'rotate' && (
              <Animated.View style={[localStyles.rotateOverlay, { transform: [{ rotate: rotateDeg }] }]}>
                <View style={localStyles.rotateIcon}>
                  <Icon name="arrow-clockwise" size={28} color="#FBBF24" />
                </View>
              </Animated.View>
            )}
          </Animated.View>

          {/* ── Bottom bar ── */}
          {compareUri ? (
            /* Comparison UI — shown after Optimieren */
            <View style={[localStyles.compareBar, { paddingBottom: bottomPad }]}>
              {/* Toggle row */}
              <View style={localStyles.compareToggleRow}>
                <TouchableOpacity
                  style={[localStyles.toggleChip, showOriginal && localStyles.toggleChipActive]}
                  onPress={() => setShowOriginal(true)}
                >
                  <Text style={[localStyles.toggleChipText, showOriginal && { color: '#fff' }]}>Original</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[localStyles.toggleChip, !showOriginal && localStyles.toggleChipOptimized]}
                  onPress={() => setShowOriginal(false)}
                >
                  <Icon name="sparkle" size={12} color={!showOriginal ? '#fff' : 'rgba(255,255,255,0.5)'} weight="fill" />
                  <Text style={[localStyles.toggleChipText, !showOriginal && { color: '#fff' }]}>Lesbar verbessert</Text>
                </TouchableOpacity>
              </View>
              {!showOriginal && (
                <Text style={localStyles.optimizeHint}>Gölge · Kontrast · Netlik iyileştirildi</Text>
              )}
              {/* Action buttons */}
              <View style={localStyles.compareActionRow}>
                <TouchableOpacity style={localStyles.revertBtn} onPress={onRevertOptimize}>
                  <Icon name="arrow-left" size={15} color="#F87171" />
                  <Text style={localStyles.revertText}>Rückgängig</Text>
                </TouchableOpacity>
                <TouchableOpacity style={localStyles.acceptBtn} onPress={onAcceptOptimize}>
                  <Icon name="check" size={16} color="#fff" weight="bold" />
                  <Text style={localStyles.acceptText}>Behalten</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* Normal action bar */
            <View style={{ paddingBottom: bottomPad }}>
              <EditActionBar
                toolbarMode={editUiState.toolbarMode}
                isOptimizing={isOptimizing}
                onStartCrop={onStartCrop}
                onOptimize={onOptimize}
                onRotate={handleRotate}
              />
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const localStyles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },

  // Preview: edge-to-edge, transparent — no border box, no letterbox frame
  preview: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: BG_DARK,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },

  rotateOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    pointerEvents: 'none',
  },
  rotateIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)',
  },

  // ── Comparison UI ──────────────────────────────────────────────────────────
  compareBar: {
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: 'rgba(10,11,20,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  compareToggleRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  toggleChipActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  toggleChipOptimized: {
    backgroundColor: `${ACCENT}33`,
    borderColor: ACCENT,
  },
  toggleChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  optimizeHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  compareActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  revertBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
  },
  revertText: { fontSize: 14, fontWeight: '700', color: '#F87171' },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#22C55E',
  },
  acceptText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
