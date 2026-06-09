/**
 * Gelişmiş toplu sayfa düzenleme — çoklu seçim, sıra, sil, döndür,
 * çoğalt, seçileni bırak ve snapshot tabanlı süreli geri alma.
 *
 * Davranış orchestrator’da; görsel parçalar `advanced-batch/` altında.
 */
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { ScrollView, Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BG_DARK } from '@/features/scan/constants';
import { useScanI18n } from '@/hooks/useScanI18n';

import type { AdvancedBatchPageData, UndoEntry } from '@/features/scan/components/advanced-batch/types';
import { clonePages } from '@/features/scan/components/advanced-batch/types';
import AdvancedBatchHeader     from '@/features/scan/components/advanced-batch/AdvancedBatchHeader';
import AdvancedBatchToolbar    from '@/features/scan/components/advanced-batch/AdvancedBatchToolbar';
import DraggableBatchPageRow   from '@/features/scan/components/advanced-batch/DraggableBatchPageRow';
import AdvancedBatchUndoBar    from '@/features/scan/components/advanced-batch/AdvancedBatchUndoBar';
import { advancedBatchStyles as st } from '@/features/scan/components/advanced-batch/styles';

export type { AdvancedBatchPageData };
export type AdvancedBatchViewProps = import('@/features/scan/components/advanced-batch/types').AdvancedBatchViewProps;

export default function AdvancedBatchView({
  pages,
  onBack,
  onOpenPageEditor,
  onMoveUp,
  onMoveDown,
  onRotate,
  onRemove,
  onAddPageLike,
  onReplacePages,
}: import('@/features/scan/components/advanced-batch/types').AdvancedBatchViewProps) {
  const { t } = useScanI18n();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  const sortedPages = useMemo(() => [...pages].sort((a, b) => a.order - b.order), [pages]);
  const selectedPages = useMemo(() => sortedPages.filter(p => selectedIds.has(p.id)), [selectedIds, sortedPages]);
  const hasSelection = selectedPages.length > 0;
  const isMultiPage = sortedPages.length > 1;

  useEffect(() => {
    if (!undoEntry) return;
    const timer = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(timer);
  }, [undoEntry]);

  useEffect(() => {
    if (!undoEntry) return;
    if (nowMs >= undoEntry.expiresAt) {
      setUndoEntry(null);
    }
  }, [nowMs, undoEntry]);

  const registerUndo = useCallback((snapshot: AdvancedBatchPageData[], message: string, hint: string, ttlSeconds = 12) => {
    setUndoEntry({
      snapshot,
      message,
      hint,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(sortedPages.map(p => p.id)));
  }, [sortedPages]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleDeleteSelected = useCallback(() => {
    if (!hasSelection) return;
    Alert.alert(
      t('scan.confirm_title'),
      t('scan.confirm_delete_selected', { count: String(selectedPages.length) }),
      [
        { text: t('scan.cancel'), style: 'cancel' },
        {
          text: t('scan.delete'),
          style: 'destructive',
          onPress: () => {
            const snapshot = clonePages(sortedPages);
            selectedPages.forEach(page => onRemove(page.id));
            registerUndo(
              snapshot,
              t('scan.undo_removed_pages', { count: String(selectedPages.length) }),
              t('scan.undo_hint_batch'),
            );
            clearSelection();
          },
        },
      ],
    );
  }, [clearSelection, hasSelection, onRemove, registerUndo, selectedPages, sortedPages, t]);

  const handleRotateSelected = useCallback(async () => {
    if (!hasSelection) return;
    const snapshot = clonePages(sortedPages);
    for (const page of selectedPages) {
      await onRotate(page.id);
    }
    registerUndo(
      snapshot,
      t('scan.undo_rotated_pages', { count: String(selectedPages.length) }),
      t('scan.undo_hint_batch'),
    );
  }, [hasSelection, onRotate, registerUndo, selectedPages, sortedPages, t]);

  const handleDuplicateSelected = useCallback(() => {
    if (!hasSelection) return;
    const snapshot = clonePages(sortedPages);
    selectedPages.forEach(page => {
      onAddPageLike({
        ...page,
        id: '',
        order: 0,
      });
    });
    registerUndo(
      snapshot,
      t('scan.undo_duplicated_pages', { count: String(selectedPages.length) }),
      t('scan.undo_hint_batch'),
    );
  }, [hasSelection, onAddPageLike, registerUndo, selectedPages, sortedPages, t]);

  const handleKeepOnlySelected = useCallback(() => {
    if (!hasSelection) return;
    Alert.alert(
      t('scan.confirm_title'),
      t('scan.confirm_keep_only_selected'),
      [
        { text: t('scan.cancel'), style: 'cancel' },
        {
          text: t('scan.ok'),
          style: 'destructive',
          onPress: () => {
            const snapshot = clonePages(sortedPages);
            const keep = sortedPages.filter(p => selectedIds.has(p.id));
            onReplacePages(keep);
            setSelectedIds(new Set(keep.map(p => p.id)));
            registerUndo(
              snapshot,
              t('scan.undo_extracted_selection'),
              t('scan.undo_hint_extract'),
            );
          },
        },
      ],
    );
  }, [hasSelection, onReplacePages, registerUndo, selectedIds, sortedPages, t]);

  const pageSubLabel = useCallback((page: AdvancedBatchPageData) => {
    if (page.enhanced) return t('scan.readable_enhanced');
    const raw = page.filter;
    if (!raw) return '';
    const normal = String(raw).replace(/-/g, '_');
    const presetKey = `scan.preset_${normal}`;
    const lbl = t(presetKey);
    return lbl !== presetKey ? lbl : raw;
  }, [t]);

  const handleUndo = useCallback(() => {
    if (!undoEntry) return;
    onReplacePages(undoEntry.snapshot);
    setUndoEntry(null);
    setSelectedIds(new Set());
  }, [onReplacePages, undoEntry]);

  const handleMoveUp = useCallback((id: string) => {
    const snapshot = clonePages(sortedPages);
    onMoveUp(id);
    registerUndo(snapshot, t('scan.undo_reordered_pages'), t('scan.undo_hint_batch'));
  }, [onMoveUp, registerUndo, sortedPages, t]);

  const handleMoveDown = useCallback((id: string) => {
    const snapshot = clonePages(sortedPages);
    onMoveDown(id);
    registerUndo(snapshot, t('scan.undo_reordered_pages'), t('scan.undo_hint_batch'));
  }, [onMoveDown, registerUndo, sortedPages, t]);

  const handleRemoveOne = useCallback((id: string) => {
    const snapshot = clonePages(sortedPages);
    onRemove(id);
    registerUndo(snapshot, t('scan.undo_removed_pages', { count: '1' }), t('scan.undo_hint_batch'));
  }, [onRemove, registerUndo, sortedPages, t]);

  const toolbarLabels = useMemo(() => ({
    selectAll:        t('scan.select_all'),
    clearSelection:   t('scan.clear_selection'),
    delete:           t('scan.delete'),
    rotateSelected:   t('scan.rotate_selected'),
    duplicateSelected: t('scan.duplicate_selected'),
    extractSelected:  t('scan.extract_selected'),
    multiPageHint:    t('scan.multi_page_hint'),
  }), [t]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG_DARK }}>
      <AdvancedBatchHeader
        title={t('scan.manage_pages')}
        onBack={onBack}
        undoEnabled={!!undoEntry}
        onUndo={handleUndo}
      />

      <AdvancedBatchToolbar
        isMultiPage={isMultiPage}
        hasSelection={hasSelection}
        labels={toolbarLabels}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onDeleteSelected={handleDeleteSelected}
        onRotateSelected={handleRotateSelected}
        onDuplicateSelected={handleDuplicateSelected}
        onExtractSelected={handleKeepOnlySelected}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 20 }}>
        <Text style={st.listTitle}>{t('scan.pages')}</Text>
        <View style={{ paddingHorizontal: 14 }}>
          {sortedPages.map((page, index) => {
            const uri = page.imageSession?.finalUri ?? page.uri;
            return (
              <DraggableBatchPageRow
                key={page.id}
                index={index}
                totalRows={sortedPages.length}
                uri={uri}
                selected={selectedIds.has(page.id)}
                pageLabel={`${t('scan.page')} ${index + 1}`}
                subLabel={pageSubLabel(page)}
                onToggleSelect={() => toggleSelect(page.id)}
                onLongPressEditor={() => onOpenPageEditor(page.id)}
                onMoveUp={() => handleMoveUp(page.id)}
                onMoveDown={() => handleMoveDown(page.id)}
                onRemove={() => handleRemoveOne(page.id)}
              />
            );
          })}
        </View>
      </ScrollView>

      {undoEntry && (
        <AdvancedBatchUndoBar
          undoEntry={undoEntry}
          nowMs={nowMs}
          undoLabel={t('scan.undo')}
          onUndo={handleUndo}
        />
      )}
    </SafeAreaView>
  );
}
