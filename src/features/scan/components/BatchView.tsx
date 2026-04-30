/**
 * BatchView — Toplu tarama sayfa listesi orkestratoru.
 *
 * Bu dosya yalnizca state ve callback yonetimini yapar; gorsel
 * parcalari `./batch/` alt klasorundeki ozel bilesenlere devreder:
 *
 *  - BatchHeader        — ust serit (geri / baslik / aksiyonlar)
 *  - BatchStatsBar      — sayfa sayisi + ortalama kalite + hepsini dondur
 *  - BatchFilterStrip   — toplu filtre uygulamasi
 *  - SwipeablePageRow   — tek sayfa satiri (swipe-to-delete + reorder + rotate)
 *  - BatchFooter        — sonraki adim + sayfa ekle
 *
 * Eski monolithic versiyon 613 satir tek dosyaydi; modulerlestirme
 * sonrasi her bilesen test edilebilir ve degistirilebilir hale geldi.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { styles as sharedStyles } from '@/features/scan/styles';
import { BG_DARK } from '@/features/scan/constants';
import { useScanI18n } from '@/hooks/useScanI18n';
import { useScan } from '@/features/scan/context/ScanContext';
import BatchHeader      from '@/features/scan/components/batch/BatchHeader';
import BatchStatsBar    from '@/features/scan/components/batch/BatchStatsBar';
import BatchFilterStrip from '@/features/scan/components/batch/BatchFilterStrip';
import BatchFooter      from '@/features/scan/components/batch/BatchFooter';
import SwipeablePageRow from '@/features/scan/components/batch/SwipeablePageRow';
import { batchStyles as st } from '@/features/scan/components/batch/styles';
import type { BatchPageData, FilterPreset } from '@/features/scan/components/batch/types';

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
  onApplyFilterToAll?: (filterId: string) => void;
  onRotateAll?: () => void;
}

export default function BatchView({
  pages, pageCount, filterPresets,
  onBack, onClearAll, onOpenPageEditor,
  onMoveUp, onMoveDown, onRotate, onRemove,
  onApplyFilterToAll, onRotateAll,
}: Props) {
  const { t } = useScanI18n();
  const { openActionPicker } = useScan();

  // ── Local UI state ────────────────────────────────────────────────────
  const [selectMode,      setSelectMode]      = useState(false);
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set());
  const [batchFilterId,   setBatchFilterId]   = useState('original');
  const [showFilterStrip, setShowFilterStrip] = useState(false);

  // ── Selection helpers ─────────────────────────────────────────────────
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

  // ── Filter helpers ────────────────────────────────────────────────────
  const applyFilterAll = useCallback((filterId: string) => {
    setBatchFilterId(filterId);
    onApplyFilterToAll?.(filterId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [onApplyFilterToAll]);

  // ── Derived ──────────────────────────────────────────────────────────
  const avgQuality = pages.length > 0
    ? Math.round(
        pages.reduce((sum, p) => sum + (p.imageSession.quality?.overallScore ?? 0), 0) /
        pages.length,
      )
    : null;

  return (
    <SafeAreaView style={[sharedStyles.fill, { backgroundColor: BG_DARK }]}>
      <BatchHeader
        selectMode={selectMode}
        selectedCount={selectedIds.size}
        pageCount={pageCount}
        avgQuality={avgQuality}
        showFilterStrip={showFilterStrip}
        hasFilterStrip={!!onApplyFilterToAll}
        onBack={onBack}
        onExitSelectMode={exitSelectMode}
        onDeleteSelected={deleteSelected}
        onToggleFilterStrip={() => setShowFilterStrip(v => !v)}
        onClearAll={onClearAll}
        t={t}
      />

      {showFilterStrip && onApplyFilterToAll && (
        <BatchFilterStrip
          presets={filterPresets}
          activeId={batchFilterId}
          onSelect={applyFilterAll}
          t={t}
        />
      )}

      {!selectMode && pages.length > 0 && (
        <BatchStatsBar
          pageCount={pageCount}
          avgQuality={avgQuality}
          onRotateAll={onRotateAll}
          t={t}
        />
      )}

      <ScrollView contentContainerStyle={st.listContent} showsVerticalScrollIndicator={false}>
        {pages.map((page, index) => (
          <SwipeablePageRow
            key={page.id}
            page={page}
            index={index}
            total={pages.length}
            isSelected={selectedIds.has(page.id)}
            selectMode={selectMode}
            onPress={() => (selectMode ? toggleSelect(page.id) : onOpenPageEditor(page.id))}
            onLongPress={() => enterSelectMode(page.id)}
            onMoveUp={() => onMoveUp(page.id)}
            onMoveDown={() => onMoveDown(page.id)}
            onRotate={() => onRotate(page.id)}
            onRemove={() => onRemove(page.id)}
            entryDelay={index * 45}
            isFirst={index === 0}
            isLast={index === pages.length - 1}
            t={t}
          />
        ))}
      </ScrollView>

      <BatchFooter
        pageCount={pageCount}
        onNext={openActionPicker}
        onAddPage={onBack}
        t={t}
      />
    </SafeAreaView>
  );
}
