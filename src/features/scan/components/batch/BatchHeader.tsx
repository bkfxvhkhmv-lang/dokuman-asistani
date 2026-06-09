/**
 * Batch view ust seridi: geri/cikis dugmesi, baslik, sag aksiyonlar.
 *
 * Iki modda calisir:
 *  - Normal: filter toggle + hepsini sil
 *  - Secim modu: secilenleri sil, secimden cik
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import Icon from '@/components/Icon';
import { ACCENT, DANGER } from '@/features/scan/constants';
import { HIT_SLOP_LG } from '@/theme';
import { batchStyles as st } from '@/features/scan/components/batch/styles';
import type { T } from '@/features/scan/components/batch/types';

interface Props {
  selectMode: boolean;
  selectedCount: number;
  pageCount: number;
  avgQuality: number | null;
  showFilterStrip: boolean;
  hasFilterStrip: boolean;
  onBack: () => void;
  onExitSelectMode: () => void;
  onDeleteSelected: () => void;
  onToggleFilterStrip: () => void;
  onClearAll: () => void;
  t: T;
}

export default function BatchHeader({
  selectMode, selectedCount, pageCount, avgQuality,
  showFilterStrip, hasFilterStrip,
  onBack, onExitSelectMode, onDeleteSelected,
  onToggleFilterStrip, onClearAll, t,
}: Props) {
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [headerAnim]);

  return (
    <Animated.View style={[st.header, { opacity: headerAnim }]}>
      <TouchableOpacity
        style={st.headerBtn}
        onPress={selectMode ? onExitSelectMode : onBack}
        hitSlop={HIT_SLOP_LG}
      >
        <Icon name={selectMode ? 'x' : 'arrow-left'} size={20} color="#fff" />
      </TouchableOpacity>

      <View style={st.headerCenter}>
        <Text style={st.headerTitle}>
          {selectMode
            ? `${selectedCount} ${t('scan.selected')}`
            : `${t('scan.pages')} (${pageCount})`}
        </Text>
        {avgQuality !== null && !selectMode && (
          <Text style={st.headerSubtitle}>{t('scan.avg_quality')} {avgQuality}</Text>
        )}
      </View>

      <View style={st.headerRight}>
        {selectMode ? (
          <TouchableOpacity
            style={st.headerBtn}
            onPress={onDeleteSelected}
            disabled={selectedCount === 0}
            hitSlop={HIT_SLOP_LG}
          >
            <Icon name="trash" size={18} color={selectedCount > 0 ? DANGER : '#555'} />
          </TouchableOpacity>
        ) : (
          <>
            {hasFilterStrip && (
              <TouchableOpacity
                style={st.headerBtn}
                onPress={onToggleFilterStrip}
                hitSlop={HIT_SLOP_LG}
              >
                <Icon name="funnel" size={18} color={showFilterStrip ? ACCENT : '#ccc'} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={st.headerBtn} onPress={onClearAll} hitSlop={HIT_SLOP_LG}>
              <Icon name="trash" size={18} color={DANGER} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </Animated.View>
  );
}
