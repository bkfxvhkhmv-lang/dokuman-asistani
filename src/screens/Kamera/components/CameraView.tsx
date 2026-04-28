import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Animated,
} from 'react-native';
import type { DistanceHint } from '../../../hooks/useScanner';
import type { ViewStyle } from 'react-native';
import { CameraView as ExpoCameraView } from 'expo-camera';
import Reanimated from 'react-native-reanimated';
import type { AnimatedStyle } from 'react-native-reanimated';
import Icon from '../../../components/Icon';
import { styles } from '../styles';
import { SUCCESS, WARNING } from '../constants';
import PermissionView from './PermissionView';
import { HIT_SLOP_LG } from '../../../theme';

interface StabilityState {
  isStable: boolean;
  confidence: number;
}

interface BatchPage {
  id: string;
  imageSession: {
    finalUri: string;
    previewUri?: string;
    originalUri: string;
    enhancedUri?: string;
    croppedUri?: string;
    correctedUri?: string;
  };
}

interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  cameraRef: React.RefObject<ExpoCameraView>;
  hasPermission: boolean;
  onRequestPermission: () => void;

  flash: 'off' | 'on';
  onToggleFlash: () => void;

  autoCapture: boolean;
  onToggleAutoCapture: () => void;
  stability: StabilityState;

  activeFilter: string;
  onFilterChange: (id: string) => void;
  isFilterDirty: boolean;
  onApplyFilter: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  filterPresets: FilterPreset[];
  filterPreviewUri?: string | null;

  isCapturing: boolean;
  onCapture: () => void;

  pageCount: number;
  pages: BatchPage[];
  onBatchPress: () => void;
  onRemovePage: (id: string) => void;
  onOpenPageEditor: (id: string) => void;

  scanLineStyle: AnimatedStyle<ViewStyle>;
  insets: { top: number; bottom: number };

  onClose: () => void;
  distanceHint?: DistanceHint;
}

const HINT_CONFIG: Record<NonNullable<DistanceHint>, { icon: string; label: string; color: string }> = {
  closer:  { icon: '↓', label: 'Näher heran', color: '#FFB703' },
  farther: { icon: '↑', label: 'Weiter weg',  color: '#FFB703' },
  perfect: { icon: '✓', label: 'Perfekt',      color: '#2DC653' },
};

function DistanceHintBadge({ hint }: { hint: DistanceHint }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hint) {
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
  }, [hint, opacity]);

  const cfg = hint ? HINT_CONFIG[hint] : null;

  return (
    <Animated.View style={[hintStyles.wrap, { opacity }]} pointerEvents="none">
      {cfg && (
        <View style={[hintStyles.pill, { borderColor: cfg.color }]}>
          <Text style={[hintStyles.icon, { color: cfg.color }]}>{cfg.icon}</Text>
          <Text style={[hintStyles.label, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const hintStyles = StyleSheet.create({
  wrap:  { position: 'absolute', bottom: -36, left: 0, right: 0, alignItems: 'center' },
  pill:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.55)' },
  icon:  { fontSize: 13, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
});

export default function CameraView({
  cameraRef, hasPermission, onRequestPermission,
  flash, onToggleFlash,
  autoCapture, onToggleAutoCapture, stability,
  activeFilter, onFilterChange, isFilterDirty, onApplyFilter, showFilters, onToggleFilters, filterPresets, filterPreviewUri,
  isCapturing, onCapture,
  pageCount, pages, onBatchPress, onRemovePage, onOpenPageEditor,
  scanLineStyle, insets, onClose, distanceHint,
}: Props) {
  if (!hasPermission) return <PermissionView onRequest={onRequestPermission} />;

  const cornerColor = autoCapture && stability.isStable ? SUCCESS : 'rgba(255,255,255,0.85)';

  return (
    <View style={styles.fill}>
      <ExpoCameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flash}
      />

      {/* Guide frame corners + distance hint */}
      <View style={styles.guideFrame}>
        {[styles.cornerTL, styles.cornerTR, styles.cornerBL, styles.cornerBR].map((cornerStyle, i) => (
          <View key={i} style={[styles.corner, cornerStyle, { borderColor: cornerColor }]} />
        ))}
        {autoCapture && <DistanceHintBadge hint={distanceHint ?? null} />}
      </View>

      {/* Auto-capture scan line */}
      {autoCapture && (
        <Reanimated.View style={[styles.scanLine, scanLineStyle]} />
      )}

      {/* Top bar */}
      <View style={[styles.topBar, { top: insets.top }]}>
        <TouchableOpacity style={styles.controlBtn} onPress={onClose} hitSlop={HIT_SLOP_LG}>
          <Icon name="close" size={21} color="#fff" />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.controlBtn, autoCapture && styles.controlBtnActive]}
            onPress={onToggleAutoCapture}
          >
            <Text style={{ fontSize: 10, fontWeight: '800', color: autoCapture ? SUCCESS : '#fff' }}>
              AUTO
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, flash === 'on' && { backgroundColor: 'rgba(255,255,255,0.3)' }]}
            onPress={onToggleFlash}
          >
            <Icon name={flash === 'on' ? 'flash' : 'flash-off'} size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stability bar */}
      {autoCapture && (
        <View style={[styles.stabilityContainer, { top: insets.top + 60 }]}>
          <Text style={styles.stabilityText}>
            {stability.isStable ? '✓ Stabil – Bereit' : 'Gerät ruhig halten…'}
          </Text>
          <View style={styles.stabilityBarWrap}>
            <View
              style={[
                styles.stabilityBar,
                { width: `${stability.confidence * 100}%`, backgroundColor: stability.isStable ? SUCCESS : WARNING },
              ]}
            />
          </View>
        </View>
      )}

      {/* Filter bar */}
      {showFilters && (
        <View style={[styles.filterBar, { top: insets.top + (autoCapture ? 100 : 60) }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
            {filterPreviewUri ? (
              <View style={styles.filterPreviewCard}>
                <Image source={{ uri: filterPreviewUri }} style={styles.filterPreviewImage} />
                <View style={styles.filterPreviewOverlay}>
                  <Text style={styles.filterPreviewLabel}>Vorschau</Text>
                  <Text style={styles.filterPreviewValue}>
                    {filterPresets.find(f => f.id === activeFilter)?.name || activeFilter}
                  </Text>
                </View>
              </View>
            ) : null}

            {filterPresets.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterBtn, activeFilter === f.id && styles.filterBtnActive]}
                onPress={() => onFilterChange(f.id)}
              >
                <Icon name={f.icon} size={12} color="#fff" />
                <Text style={styles.filterText}>{f.name}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.filterApplyBtn, !isFilterDirty && styles.filterApplyBtnDisabled]}
              onPress={onApplyFilter}
              disabled={!isFilterDirty}
            >
              <Text style={styles.filterApplyText}>
                Anwenden
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { bottom: insets.bottom + 20 }]}>
        {/* Spacer to keep shutter centred */}
        <View style={{ width: 60 }} />

        <TouchableOpacity
          style={[
            styles.shutterBtn,
            {
              borderColor: stability.isStable ? SUCCESS : 'rgba(255,255,255,0.5)',
              shadowColor: stability.isStable ? SUCCESS : 'transparent',
              shadowOpacity: stability.isStable ? 0.8 : 0,
              shadowRadius: stability.isStable ? 20 : 0,
            },
          ]}
          onPress={onCapture}
          activeOpacity={0.8}
          disabled={isCapturing}
        >
          <View
            style={[
              styles.shutterInner,
              { backgroundColor: isCapturing ? WARNING : stability.isStable ? SUCCESS : '#fff' },
            ]}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideBtn} onPress={onBatchPress}>
          <View style={styles.sideBtnCircle}>
            {pageCount > 0
              ? <Text style={styles.pageCountText}>{pageCount}</Text>
              : <Icon name="albums-outline" size={20} color="#fff" />
            }
          </View>
          <Text style={styles.sideBtnText}>{pageCount > 0 ? 'Seiten' : 'Stapel'}</Text>
        </TouchableOpacity>
      </View>

      {/* Thumbnail strip */}
      {pageCount > 0 && (
        <View style={[styles.thumbnailStrip, { bottom: insets.bottom + 120 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.thumbnailContainer}>
              {pages.map((page, i) => (
                <TouchableOpacity key={page.id} style={styles.thumbnailWrapper} activeOpacity={0.85} onPress={() => onOpenPageEditor(page.id)}>
                  <Image source={{ uri: page.imageSession.enhancedUri ?? page.imageSession.finalUri ?? page.imageSession.croppedUri ?? page.imageSession.correctedUri ?? page.imageSession.originalUri }} style={styles.thumbnailImage} />
                  <View style={styles.thumbnailBadge}>
                    <Text style={styles.thumbnailBadgeText}>{i + 1}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.thumbnailDelete}
                    onPress={() => onRemovePage(page.id)}
                  >
                    <Icon name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}
