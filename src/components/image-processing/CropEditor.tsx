import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  PanResponder,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Icon from '../Icon';
import type { CropBox, CropImageSize } from '../../modules/image-processing';
import { getSharedCropEngine, type CropLayout } from '../../modules/image-processing/core/CropEngine';

const HANDLE = 28;
const ACCENT = '#7C6EF8';

interface Props {
  visible: boolean;
  uri: string;
  presentation?: 'inline' | 'modal';
  title?: string;
  hint?: string;
  confirmLabel?: string;
  secondaryConfirmLabel?: string;
  onConfirm: (croppedUri: string) => void;
  onConfirmAndAnalyze?: (croppedUri: string) => void;
  onCancel: () => void;
}

export default function CropEditor({
  visible,
  uri,
  presentation = 'inline',
  title = 'Dokument zuschneiden',
  hint = 'Ecken ziehen zum Anpassen',
  confirmLabel = 'Seite hinzufügen',
  secondaryConfirmLabel = 'Analysieren',
  onConfirm,
  onConfirmAndAnalyze,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const cropEngine = useMemo(() => getSharedCropEngine(), []);
  const [imgLayout, setImgLayout] = useState<CropLayout | null>(null);
  const [imgSize, setImgSize] = useState<CropImageSize | null>(null);
  const [box, setBox] = useState<CropBox | null>(null);
  const [workingUri, setWorkingUri] = useState(uri);
  const [rotating, setRotating] = useState(false);
  const rotationRef = useRef(0);
  // #57 Corner magnifier state
  const [magCorner, setMagCorner] = useState<'TL'|'TR'|'BL'|'BR'|null>(null);

  // Reset working URI when input uri changes
  useEffect(() => {
    setWorkingUri(uri);
    setBox(null);
    setImgLayout(null);
    rotationRef.current = 0;
  }, [uri]);

  const onImageLayout = useCallback((e: any) => {
    const layout = e.nativeEvent.layout as CropLayout;
    setImgLayout(layout);
    setBox(cropEngine.createInitialBox(layout));
    Image.getSize(workingUri, (w, h) => setImgSize({ w, h }));
  }, [cropEngine, workingUri]);

  const resetBox = useCallback(() => {
    if (imgLayout) setBox(cropEngine.createInitialBox(imgLayout));
  }, [cropEngine, imgLayout]);

  const rotate = useCallback(async (degrees: 90 | -90) => {
    setRotating(true);
    try {
      const result = await manipulateAsync(
        workingUri,
        [{ rotate: degrees }],
        { compress: 0.95, format: SaveFormat.JPEG },
      );
      rotationRef.current = ((rotationRef.current + degrees) % 360 + 360) % 360;
      setWorkingUri(result.uri);
      setBox(null); // reset box — onImageLayout will reinit
      setImgLayout(null);
    } finally {
      setRotating(false);
    }
  }, [workingUri]);

  const makePan = useCallback((corner: 'TL' | 'TR' | 'BL' | 'BR') => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setMagCorner(corner); // #57 show magnifier on drag start
    },
    onPanResponderMove: (_, gesture) => {
      setBox(prev => {
        if (!prev || !imgLayout) return prev;
        return cropEngine.updateCorner(prev, imgLayout, corner, gesture.dx, gesture.dy);
      });
    },
    onPanResponderRelease:    () => { setMagCorner(null); }, // #57 hide magnifier
    onPanResponderTerminate:  () => { setMagCorner(null); },
  }), [cropEngine, imgLayout]);

  const panTL = makePan('TL');
  const panTR = makePan('TR');
  const panBL = makePan('BL');
  const panBR = makePan('BR');

  const doCrop = useCallback(async (): Promise<string> => {
    if (!box || !imgLayout || !imgSize) return workingUri;
    try {
      return await cropEngine.manualCrop(workingUri, box, imgLayout, imgSize);
    } catch {
      return workingUri;
    }
  }, [box, cropEngine, imgLayout, imgSize, workingUri]);

  const handleConfirm = useCallback(async () => {
    onConfirm(await doCrop());
  }, [doCrop, onConfirm]);

  const handleAnalyze = useCallback(async () => {
    const cropped = await doCrop();
    if (onConfirmAndAnalyze) onConfirmAndAnalyze(cropped);
    else onConfirm(cropped);
  }, [doCrop, onConfirm, onConfirmAndAnalyze]);

  if (!visible) return null;

  const content = (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolBtn} onPress={() => rotate(-90)} disabled={rotating}>
          <Icon name="arrow-counter-clockwise" size={22} color={ACCENT} />
          <Text style={styles.toolLabel}>Links</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={() => rotate(90)} disabled={rotating}>
          <Icon name="arrow-clockwise" size={22} color={ACCENT} />
          <Text style={styles.toolLabel}>Rechts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={resetBox} disabled={!imgLayout}>
          <Icon name="frame-corners" size={22} color={ACCENT} />
          <Text style={styles.toolLabel}>Zurücksetzen</Text>
        </TouchableOpacity>
      </View>

      {/* Image + crop overlay */}
      <View style={styles.imageWrap}>
        {rotating ? (
          <View style={styles.spinnerWrap}>
            <ActivityIndicator color={ACCENT} size="large" />
          </View>
        ) : (
          <Image
            source={{ uri: workingUri }}
            style={styles.image}
            resizeMode="contain"
            onLayout={onImageLayout}
          />
        )}

        {box && !rotating && (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            <View style={[styles.mask, { top: 0, left: 0, right: 0, height: box.y }]} />
            <View style={[styles.mask, { top: box.y + box.h, left: 0, right: 0, bottom: 0 }]} />
            <View style={[styles.mask, { top: box.y, left: 0, width: box.x, height: box.h }]} />
            <View style={[styles.mask, { top: box.y, left: box.x + box.w, right: 0, height: box.h }]} />

            <View style={[styles.frame, { left: box.x, top: box.y, width: box.w, height: box.h }]}>
              <View style={[styles.gridLine, { top: box.h / 3, left: 0, right: 0, height: 0.5 }]} />
              <View style={[styles.gridLine, { top: (box.h / 3) * 2, left: 0, right: 0, height: 0.5 }]} />
              <View style={[styles.gridLine, { left: box.w / 3, top: 0, bottom: 0, width: 0.5 }]} />
              <View style={[styles.gridLine, { left: (box.w / 3) * 2, top: 0, bottom: 0, width: 0.5 }]} />
            </View>

            {([
              { pan: panTL, pos: { left: box.x - HANDLE / 2, top: box.y - HANDLE / 2 } },
              { pan: panTR, pos: { left: box.x + box.w - HANDLE / 2, top: box.y - HANDLE / 2 } },
              { pan: panBL, pos: { left: box.x - HANDLE / 2, top: box.y + box.h - HANDLE / 2 } },
              { pan: panBR, pos: { left: box.x + box.w - HANDLE / 2, top: box.y + box.h - HANDLE / 2 } },
            ] as const).map(({ pan, pos }, i) => (
              <View key={i} {...pan.panHandlers} style={[styles.handle, pos]} />
            ))}

            {/* #57 Corner magnifier — shows while dragging a handle */}
            {magCorner && box && imgLayout && (() => {
              const MAG    = 110;
              const SCALE  = 2.4;
              const cx = (magCorner === 'TL' || magCorner === 'BL') ? box.x : box.x + box.w;
              const cy = (magCorner === 'TL' || magCorner === 'TR') ? box.y : box.y + box.h;
              const posX = Math.max(0, Math.min(cx - MAG / 2, imgLayout.width - MAG));
              const posY = Math.max(0, cy - MAG - 24);
              const imgX = -(cx * SCALE - MAG / 2);
              const imgY = -(cy * SCALE - MAG / 2);
              return (
                <View pointerEvents="none" style={{
                  position: 'absolute', left: posX, top: posY,
                  width: MAG, height: MAG, borderRadius: MAG / 2,
                  overflow: 'hidden', borderWidth: 2.5, borderColor: ACCENT,
                  shadowColor: ACCENT, shadowOpacity: 0.7, shadowRadius: 12, elevation: 12,
                }}>
                  <Image
                    source={{ uri: workingUri }}
                    style={{ width: imgLayout.width * SCALE, height: imgLayout.height * SCALE, position: 'absolute', left: imgX, top: imgY }}
                    resizeMode="contain"
                  />
                  {/* Crosshair */}
                  <View style={{ position: 'absolute', top: MAG / 2 - 0.5, left: MAG / 2 - 18, width: 36, height: 1, backgroundColor: ACCENT + '88' }} />
                  <View style={{ position: 'absolute', left: MAG / 2 - 0.5, top: MAG / 2 - 18, width: 1, height: 36, backgroundColor: ACCENT + '88' }} />
                </View>
              );
            })()}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={[styles.actions, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
        <TouchableOpacity style={styles.cancel} onPress={onCancel}>
          <Text style={styles.cancelText}>Abbrechen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.confirm, styles.secondaryConfirm]} onPress={handleConfirm}>
          <Text style={styles.confirmText}>{confirmLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirm} onPress={handleAnalyze}>
          <Text style={styles.confirmText}>{secondaryConfirmLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (presentation === 'modal') {
    return (
      <Modal visible={visible} animationType="fade" statusBarTranslucent>
        {content}
      </Modal>
    );
  }

  return <View style={styles.inlineContainer}>{content}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A12' },
  inlineContainer: { flex: 1, backgroundColor: '#0A0A12' },
  header: { paddingTop: 14, paddingBottom: 8, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 2 },
  hint: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
  },
  toolBtn: { alignItems: 'center', gap: 3, minWidth: 52, paddingVertical: 4 },
  toolLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  spinnerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageWrap: { flex: 1, margin: 16, position: 'relative' },
  image: { width: '100%', height: '100%' },
  mask: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  frame: { position: 'absolute', borderWidth: 1.5, borderColor: ACCENT, overflow: 'hidden' },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(124,110,248,0.35)' },
  handle: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    borderRadius: 4,
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: '#fff',
  },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  cancel: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  confirm: { flex: 2, paddingVertical: 16, borderRadius: 16, alignItems: 'center', backgroundColor: '#534AB7' },
  secondaryConfirm: { backgroundColor: '#2d2d4a', flex: 1 },
  cancelText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
