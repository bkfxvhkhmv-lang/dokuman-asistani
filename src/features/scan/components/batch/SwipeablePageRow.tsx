/**
 * Tek bir sayfa satiri — swipe-to-delete + reorder + rotate.
 *
 * Eskiden BatchView icindeydi; sorumluluk yogunlugu yuksek oldugu icin
 * burada izole edildi. Pan/animation logic burada kapsulleniyor; ana
 * orchestrator yalnizca callback'leri sagliyor.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, TouchableOpacity, Animated, PanResponder } from 'react-native';
import * as Haptics from 'expo-haptics';
import Icon from '@/components/Icon';
import { ACCENT } from '@/features/scan/constants';
import { HIT_SLOP, HIT_SLOP_LG } from '@/theme';
import { QualityDot, QualityStrip } from '@/features/scan/components/batch/QualityIndicators';
import { batchStyles as st } from '@/features/scan/components/batch/styles';
import type { BatchPageData, T } from '@/features/scan/components/batch/types';

/** Swipe acilma esigi (-72 px). Bunu asarsa silme actiona snap eder. */
const DELETE_THRESHOLD = -72;

interface Props {
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
  /** Liste icindeki konum sirasina gore staggered fade-in icin gecikme (ms). */
  entryDelay: number;
  isFirst: boolean;
  isLast: boolean;
  t: T;
}

export default function SwipeablePageRow({
  page, index, total, isSelected, selectMode,
  onPress, onLongPress, onMoveUp, onMoveDown, onRotate, onRemove,
  entryDelay, isFirst, isLast, t,
}: Props) {
  const translateX     = useRef(new Animated.Value(0)).current;
  const entryOpacity   = useRef(new Animated.Value(0)).current;
  const entryTranslate = useRef(new Animated.Value(16)).current;
  const deleteOpacity  = useRef(new Animated.Value(0)).current;
  const isSwipedOpen   = useRef(false);

  // Staggered fade-in entrance
  useEffect(() => {
    const id = setTimeout(() => {
      Animated.parallel([
        Animated.timing(entryOpacity,   { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(entryTranslate, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
      ]).start();
    }, entryDelay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        if (g.dx > 0 && !isSwipedOpen.current) return;
        const clamp = Math.max(
          DELETE_THRESHOLD * 1.3,
          Math.min(0, g.dx + (isSwipedOpen.current ? DELETE_THRESHOLD : 0)),
        );
        translateX.setValue(clamp);
        deleteOpacity.setValue(Math.min(1, Math.abs(clamp) / Math.abs(DELETE_THRESHOLD)));
      },
      onPanResponderRelease: (_, g) => {
        const current = isSwipedOpen.current ? DELETE_THRESHOLD + g.dx : g.dx;
        if (current < DELETE_THRESHOLD * 0.6) snapOpen();
        else snapClosed();
      },
    }),
  ).current;

  // En kaliteli mevcut URI'yi sec — fallback zinciri
  const thumbUri =
    page.imageSession.enhancedUri  ??
    page.imageSession.finalUri     ??
    page.imageSession.croppedUri   ??
    page.imageSession.correctedUri ??
    page.imageSession.originalUri;

  const qualityScore = page.imageSession.quality?.overallScore;
  const filterLabel  = page.filter && page.filter !== 'original' ? page.filter : null;

  return (
    <Animated.View style={{ opacity: entryOpacity, transform: [{ translateY: entryTranslate }], marginBottom: 10 }}>
      <View style={{ overflow: 'hidden', borderRadius: 18 }}>
        {/* Swipe-to-delete arka plan */}
        <Animated.View style={[st.deleteBackground, { opacity: deleteOpacity }]}>
          <TouchableOpacity style={st.deleteAction} onPress={onRemove} hitSlop={HIT_SLOP}>
            <Icon name="trash" size={22} color="#fff" />
            <Text style={st.deleteActionText}>{t('scan.delete')}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Asil kart */}
        <Animated.View
          style={{ transform: [{ translateX }] }}
          {...panResponder.panHandlers}
        >
          <Pressable
            onPress={() => {
              if (isSwipedOpen.current) { snapClosed(); return; }
              onPress();
            }}
            onLongPress={() => { Haptics.selectionAsync(); onLongPress(); }}
            style={[st.pageCard, isSelected && st.pageCardSelected]}
          >
            {/* Secim modu checkbox */}
            {selectMode && (
              <View style={[st.selectCircle, isSelected && st.selectCircleActive]}>
                {isSelected && <Icon name="check" size={12} color="#fff" weight="bold" />}
              </View>
            )}

            {/* Kucuk resim */}
            <View style={st.thumbWrap}>
              <Image source={{ uri: thumbUri }} style={st.thumb} resizeMode="cover" />
              <View style={st.thumbBadge}>
                <Text style={st.thumbBadgeText}>{index + 1}</Text>
              </View>
              {page.enhanced && (
                <View style={st.enhancedBadge}>
                  <Icon name="magic-wand" size={9} color="#fff" />
                </View>
              )}
            </View>

            {/* Bilgi kolonu */}
            <View style={st.pageInfo}>
              <Text style={st.pageTitle}>{t('scan.page')} {index + 1}</Text>
              <QualityDot score={qualityScore} t={t} />
              <QualityStrip score={qualityScore} />
              {filterLabel && (
                <View style={st.filterBadge}>
                  <Icon name="funnel" size={9} color={ACCENT} />
                  <Text style={st.filterBadgeText}>{filterLabel}</Text>
                </View>
              )}
            </View>

            {/* Sira ve dondurme aksiyonlari */}
            <View style={st.rowActions}>
              <TouchableOpacity
                style={[st.rowActionBtn, isFirst && st.rowActionBtnDisabled]}
                onPress={isFirst ? undefined : onMoveUp}
                hitSlop={{ top: 14, bottom: 6, left: 18, right: 18 }}
              >
                <Icon name="arrow-up" size={15} color={isFirst ? '#444' : '#ccc'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.rowActionBtn, isLast && st.rowActionBtnDisabled]}
                onPress={isLast ? undefined : onMoveDown}
                hitSlop={{ top: 6, bottom: 14, left: 18, right: 18 }}
              >
                <Icon name="arrow-down" size={15} color={isLast ? '#444' : '#ccc'} />
              </TouchableOpacity>
              <TouchableOpacity style={st.rowActionBtn} onPress={onRotate} hitSlop={HIT_SLOP_LG}>
                <Icon name="arrow-clockwise" size={15} color="#ccc" />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
