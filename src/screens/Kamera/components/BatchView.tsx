import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  Animated, PanResponder, StyleSheet, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Icon from '../../../components/Icon';
import { styles as sharedStyles } from '../styles';
import { ACCENT, BG_DARK, DANGER, SUCCESS, WARNING } from '../constants';
import { HIT_SLOP_LG } from '../../../theme';

// ── Types ────────────────────────────────────────────────────────────────────

interface BatchPageData {
  id: string;
  order: number;
  imageSession: {
    originalUri: string;
    finalUri: string;
    previewUri?: string;
    enhancedUri?: string;
    croppedUri?: string;
    correctedUri?: string;
    quality?: { overallScore: number };
    activeFilter?: string;
  };
  filter?: string;
  enhanced?: boolean;
}

interface FilterPreset {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  pages: BatchPageData[];
  pageCount: number;
  filterPresets: FilterPreset[];
  onBack: () => void;
  onClearAll: () => void;
  onOpenPageEditor: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRotate: (id: string) => void;
  onRemove: (id: string) => void;
  onProcessAll: () => void;
  onApplyFilterToAll?: (filterId: string) => void;
  onRotateAll?: () => void;
  onExportPdf?: () => void;
  isGeneratingPdf?: boolean;
  onShowActionPicker?: () => void;
}

// ── Quality indicator ─────────────────────────────────────────────────────────

function QualityDot({ score }: { score?: number }) {
  if (typeof score !== 'number') return null;
  const color = score >= 75 ? SUCCESS : score >= 45 ? WARNING : DANGER;
  const label = score >= 75 ? 'Gut' : score >= 45 ? 'OK' : 'Schwach';
  return (
    <View style={localStyles.qualityDot}>
      <View style={[localStyles.qualityDotCircle, { backgroundColor: color }]} />
      <Text style={[localStyles.qualityDotLabel, { color }]}>{Math.round(score)} · {label}</Text>
    </View>
  );
}

function QualityStrip({ score }: { score?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct = typeof score === 'number' ? Math.min(100, Math.max(0, score)) : 0;
  const color = pct >= 75 ? SUCCESS : pct >= 45 ? WARNING : DANGER;

  useEffect(() => {
    Animated.spring(anim, { toValue: pct / 100, useNativeDriver: false, damping: 20, stiffness: 140 }).start();
  }, [pct]);

  return (
    <View style={localStyles.qualityStrip}>
      <Animated.View style={[localStyles.qualityStripFill, {
        width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        backgroundColor: color,
      }]} />
    </View>
  );
}

// ── Swipeable page row ────────────────────────────────────────────────────────

interface SwipeableRowProps {
  page: BatchPageData;
  index: number;
  total: number;
  isSelected: boolean;
  selectMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRotate: () => void;
  onRemove: () => void;
  entryDelay: number;
  isFirst: boolean;
  isLast: boolean;
}


function SwipeablePageRow({
  page, index, total, isSelected, selectMode,
  onPress, onLongPress, onMoveUp, onMoveDown, onRotate, onRemove,
  entryDelay, isFirst, isLast,
}: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const entryTranslate = useRef(new Animated.Value(16)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const isSwipedOpen = useRef(false);

  const DELETE_THRESHOLD = -72;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(entryOpacity,   { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(entryTranslate, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
      ]).start();
    }, entryDelay);
    return () => clearTimeout(t);
  }, []);

  const snapClosed = useCallback(() => {
    isSwipedOpen.current = false;
    Animated.parallel([
      Animated.spring(translateX,    { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }),
      Animated.timing(deleteOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [translateX, deleteOpacity]);

  const snapOpen = useCallback(() => {
    isSwipedOpen.current = true;
    Animated.parallel([
      Animated.spring(translateX,    { toValue: DELETE_THRESHOLD, useNativeDriver: true, damping: 20, stiffness: 240 }),
      Animated.timing(deleteOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [translateX, deleteOpacity]);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => {
      if (g.dx > 0 && !isSwipedOpen.current) return;
      const clamp = Math.max(DELETE_THRESHOLD * 1.3, Math.min(0, g.dx + (isSwipedOpen.current ? DELETE_THRESHOLD : 0)));
      translateX.setValue(clamp);
      deleteOpacity.setValue(Math.min(1, Math.abs(clamp) / Math.abs(DELETE_THRESHOLD)));
    },
    onPanResponderRelease: (_, g) => {
      const current = isSwipedOpen.current ? DELETE_THRESHOLD + g.dx : g.dx;
      if (current < DELETE_THRESHOLD * 0.6) snapOpen();
      else snapClosed();
    },
  })).current;

  const thumbUri = page.imageSession.enhancedUri
    ?? page.imageSession.finalUri
    ?? page.imageSession.croppedUri
    ?? page.imageSession.correctedUri
    ?? page.imageSession.originalUri;

  const qualityScore = page.imageSession.quality?.overallScore;
  const filterLabel  = page.filter && page.filter !== 'original' ? page.filter : null;

  return (
    <Animated.View style={{ opacity: entryOpacity, transform: [{ translateY: entryTranslate }], marginBottom: 10 }}>
      <View style={{ overflow: 'hidden', borderRadius: 18 }}>
        {/* Delete background */}
        <Animated.View style={[localStyles.deleteBackground, { opacity: deleteOpacity }]}>
          <TouchableOpacity style={localStyles.deleteAction} onPress={onRemove}>
            <Icon name="trash" size={22} color="#fff" />
            <Text style={localStyles.deleteActionText}>Löschen</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Row card */}
        <Animated.View
          style={{ transform: [{ translateX }] }}
          {...panResponder.panHandlers}
        >
          <Pressable
            onPress={() => { if (isSwipedOpen.current) { snapClosed(); return; } onPress(); }}
            onLongPress={() => { Haptics.selectionAsync(); onLongPress(); }}
            style={[
              localStyles.pageCard,
              isSelected && localStyles.pageCardSelected,
            ]}
          >
            {/* Select checkbox */}
            {selectMode && (
              <View style={[localStyles.selectCircle, isSelected && localStyles.selectCircleActive]}>
                {isSelected && <Icon name="check" size={12} color="#fff" weight="bold" />}
              </View>
            )}

            {/* Thumbnail */}
            <View style={localStyles.thumbWrap}>
              <Image source={{ uri: thumbUri }} style={localStyles.thumb} resizeMode="cover" />
              <View style={localStyles.thumbBadge}>
                <Text style={localStyles.thumbBadgeText}>{index + 1}</Text>
              </View>
              {page.enhanced && (
                <View style={localStyles.enhancedBadge}>
                  <Icon name="magic-wand" size={9} color="#fff" />
                </View>
              )}
            </View>

            {/* Info */}
            <View style={localStyles.pageInfo}>
              <Text style={localStyles.pageTitle}>Seite {index + 1}</Text>
              <QualityDot score={qualityScore} />
              <QualityStrip score={qualityScore} />
              {filterLabel && (
                <View style={localStyles.filterBadge}>
                  <Icon name="funnel" size={9} color={ACCENT} />
                  <Text style={localStyles.filterBadgeText}>{filterLabel}</Text>
                </View>
              )}
            </View>

            {/* Actions — ↑↓ order buttons + rotate */}
            <View style={localStyles.rowActions}>
              <TouchableOpacity
                style={[localStyles.rowActionBtn, isFirst && localStyles.rowActionBtnDisabled]}
                onPress={isFirst ? undefined : onMoveUp}
                hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
              >
                <Icon name="arrow-up" size={15} color={isFirst ? '#444' : '#ccc'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[localStyles.rowActionBtn, isLast && localStyles.rowActionBtnDisabled]}
                onPress={isLast ? undefined : onMoveDown}
                hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="arrow-down" size={15} color={isLast ? '#444' : '#ccc'} />
              </TouchableOpacity>
              <TouchableOpacity style={localStyles.rowActionBtn} onPress={onRotate}>
                <Icon name="arrow-clockwise" size={15} color="#ccc" />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// ── Batch filter strip ────────────────────────────────────────────────────────

function BatchFilterStrip({
  presets,
  activeId,
  onSelect,
}: {
  presets: FilterPreset[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={localStyles.batchFilterWrap}>
      <Text style={localStyles.batchFilterLabel}>FILTER AUF ALLE SEITEN</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {presets.map(preset => (
          <TouchableOpacity
            key={preset.id}
            onPress={() => onSelect(preset.id)}
            style={[localStyles.batchFilterChip, activeId === preset.id && { borderColor: preset.color, backgroundColor: `${preset.color}22` }]}
          >
            <Icon name={preset.icon} size={12} color={activeId === preset.id ? preset.color : '#aaa'} />
            <Text style={[localStyles.batchFilterChipText, activeId === preset.id && { color: preset.color }]}>
              {preset.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BatchView({
  pages, pageCount, filterPresets,
  onBack, onClearAll, onOpenPageEditor,
  onMoveUp, onMoveDown, onRotate, onRemove, onProcessAll,
  onApplyFilterToAll, onRotateAll, onExportPdf, isGeneratingPdf, onShowActionPicker,
}: Props) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchFilterId, setBatchFilterId] = useState('original');
  const [showFilterStrip, setShowFilterStrip] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const enterSelectMode = useCallback((id: string) => {
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = useCallback(() => {
    selectedIds.forEach(id => onRemove(id));
    exitSelectMode();
  }, [selectedIds, onRemove, exitSelectMode]);

  const applyFilterAll = useCallback((filterId: string) => {
    setBatchFilterId(filterId);
    onApplyFilterToAll?.(filterId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [onApplyFilterToAll]);

  const avgQuality = pages.length > 0
    ? Math.round(pages.reduce((sum, p) => sum + (p.imageSession.quality?.overallScore ?? 0), 0) / pages.length)
    : null;

  return (
    <SafeAreaView style={[sharedStyles.fill, { backgroundColor: BG_DARK }]}>
      {/* Header */}
      <Animated.View style={[localStyles.header, { opacity: headerAnim }]}>
        <TouchableOpacity
          style={localStyles.headerBtn}
          onPress={selectMode ? exitSelectMode : onBack}
          hitSlop={HIT_SLOP_LG}
        >
          <Icon name={selectMode ? 'x' : 'arrow-left'} size={20} color="#fff" />
        </TouchableOpacity>

        <View style={localStyles.headerCenter}>
          <Text style={localStyles.headerTitle}>
            {selectMode ? `${selectedIds.size} ausgewählt` : `Seiten (${pageCount})`}
          </Text>
          {avgQuality !== null && !selectMode && (
            <Text style={localStyles.headerSubtitle}>Ø Qualität {avgQuality}</Text>
          )}
        </View>

        <View style={localStyles.headerRight}>
          {selectMode ? (
            <TouchableOpacity style={localStyles.headerBtn} onPress={deleteSelected} disabled={selectedIds.size === 0}>
              <Icon name="trash" size={18} color={selectedIds.size > 0 ? DANGER : '#555'} />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={localStyles.headerBtn} onPress={() => setShowFilterStrip(v => !v)}>
                <Icon name="funnel" size={18} color={showFilterStrip ? ACCENT : '#ccc'} />
              </TouchableOpacity>
              <TouchableOpacity style={localStyles.headerBtn} onPress={onClearAll}>
                <Icon name="trash" size={18} color={DANGER} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>

      {/* Batch filter strip */}
      {showFilterStrip && onApplyFilterToAll && (
        <BatchFilterStrip
          presets={filterPresets}
          activeId={batchFilterId}
          onSelect={applyFilterAll}
        />
      )}

      {/* Quick stats bar */}
      {!selectMode && pages.length > 0 && (
        <View style={localStyles.statsBar}>
          <View style={localStyles.statItem}>
            <Icon name="files" size={13} color="#aaa" />
            <Text style={localStyles.statText}>{pageCount} Seiten</Text>
          </View>
          {avgQuality !== null && (
            <View style={localStyles.statItem}>
              <View style={[localStyles.qualityDotCircle, { backgroundColor: avgQuality >= 75 ? SUCCESS : avgQuality >= 45 ? WARNING : DANGER }]} />
              <Text style={localStyles.statText}>Ø {avgQuality}</Text>
            </View>
          )}
          {onRotateAll && (
            <TouchableOpacity style={localStyles.statItem} onPress={() => { onRotateAll(); Haptics.selectionAsync(); }}>
              <Icon name="arrow-clockwise" size={13} color="#aaa" />
              <Text style={localStyles.statText}>Alle drehen</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Page list */}
      <ScrollView
        contentContainerStyle={localStyles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {pages.map((page, index) => (
          <SwipeablePageRow
            key={page.id}
            page={page}
            index={index}
            total={pages.length}
            isSelected={selectedIds.has(page.id)}
            selectMode={selectMode}
            onPress={() => selectMode ? toggleSelect(page.id) : onOpenPageEditor(page.id)}
            onLongPress={() => enterSelectMode(page.id)}
            onMoveUp={() => onMoveUp(page.id)}
            onMoveDown={() => onMoveDown(page.id)}
            onRotate={() => onRotate(page.id)}
            onRemove={() => onRemove(page.id)}
            entryDelay={index * 45}
            isFirst={index === 0}
            isLast={index === pages.length - 1}
          />
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={localStyles.footer}>
        <TouchableOpacity
          style={[localStyles.primaryBtn, pageCount === 0 && { opacity: 0.4 }]}
          onPress={onShowActionPicker ?? onProcessAll}
          disabled={pageCount === 0}
        >
          <Icon name="flash" size={18} color="#fff" />
          <Text style={localStyles.primaryBtnText}>Brief erstellen</Text>
        </TouchableOpacity>

        <View style={localStyles.footerRow}>
          <TouchableOpacity
            style={[localStyles.secondaryBtn, { flex: 1 }]}
            onPress={onBack}
          >
            <Icon name="camera" size={15} color="rgba(255,255,255,0.7)" />
            <Text style={localStyles.secondaryBtnText}>Weitere Seite</Text>
          </TouchableOpacity>

          {onExportPdf && (
            <TouchableOpacity
              style={[localStyles.secondaryBtn, { flex: 1 }, (pageCount === 0 || isGeneratingPdf) && { opacity: 0.4 }]}
              onPress={onExportPdf}
              disabled={pageCount === 0 || isGeneratingPdf}
            >
              <Icon name="document" size={15} color="rgba(255,255,255,0.7)" />
              <Text style={localStyles.secondaryBtnText}>
                {isGeneratingPdf ? 'PDF…' : 'PDF teilen'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 6 },

  statsBar: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 16, paddingBottom: 10,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { color: '#aaa', fontSize: 12, fontWeight: '600' },

  listContent: { paddingHorizontal: 16, paddingBottom: 16 },

  pageCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  pageCardSelected: {
    borderColor: ACCENT,
    backgroundColor: `${ACCENT}18`,
  },

  selectCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  selectCircleActive: {
    backgroundColor: ACCENT, borderColor: ACCENT,
  },

  thumbWrap: { width: 72, height: 96, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  thumbBadge: {
    position: 'absolute', top: 5, left: 5,
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  thumbBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  enhancedBadge: {
    position: 'absolute', bottom: 5, right: 5,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(124,110,248,0.85)', alignItems: 'center', justifyContent: 'center',
  },

  pageInfo: { flex: 1, gap: 4 },
  pageTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },

  qualityDot: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  qualityDotCircle: { width: 7, height: 7, borderRadius: 4 },
  qualityDotLabel: { fontSize: 11, fontWeight: '600' },

  qualityStrip: {
    height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  qualityStripFill: { height: '100%', borderRadius: 2 },

  filterBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
    backgroundColor: `${ACCENT}1A`, alignSelf: 'flex-start',
  },
  filterBadgeText: { color: ACCENT, fontSize: 10, fontWeight: '600' },

  rowActions: { gap: 4, alignItems: 'center' },
  rowActionBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rowActionBtnDisabled: { opacity: 0.3 },

  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DANGER,
    borderRadius: 18,
    alignItems: 'flex-end', justifyContent: 'center', paddingRight: 16,
  },
  deleteAction: { alignItems: 'center', gap: 4 },
  deleteActionText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  batchFilterWrap: {
    paddingHorizontal: 16, paddingBottom: 10, gap: 8,
  },
  batchFilterLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700', letterSpacing: 0.6,
  },
  batchFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  batchFilterChipText: { color: '#aaa', fontSize: 12, fontWeight: '600' },

  footer: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  footerRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 16, backgroundColor: ACCENT,
    shadowColor: '#00C8FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 13,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  secondaryBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
});
