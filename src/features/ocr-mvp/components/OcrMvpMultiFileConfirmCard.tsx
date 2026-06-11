import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/ThemeContext';
import Icon from '@/components/Icon';
import { useT } from '@/hooks/useT';
import type { ScannedAsset } from '../scanner/types';

interface Props {
  assets: ScannedAsset[];
  onSaveOnly: () => void;
  onDiscard: () => void;
  busy?: boolean;
}

export default function OcrMvpMultiFileConfirmCard({
  assets,
  onSaveOnly,
  onDiscard,
  busy = false,
}: Props) {
  const { Colors: C } = useTheme();
  const { t: T } = useT();
  const st = styles(C);

  return (
    <View style={st.container}>
      <View style={[st.card, { borderColor: C.primary + '40', backgroundColor: C.primary + '08' }]}>
        <View style={st.iconCircle}>
          <Icon name="documents-outline" size={28} color={C.primary} />
        </View>
        <Text style={[st.title, { color: C.text }]}>
          {T('ocr.upload.batch_selected_title', { n: assets.length })}
        </Text>
        <Text style={[st.hint, { color: C.textSecondary }]}>
          {T('ocr.upload.batch_save_hint')}
        </Text>
        <View style={[st.fileList, { borderColor: C.border }]}>
          {assets.map((asset) => (
            <Text
              key={`${asset.uri}-${asset.name}`}
              style={[st.fileName, { color: C.text }]}
              numberOfLines={1}
            >
              {asset.displayName || asset.name}
            </Text>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[st.primaryBtn, { backgroundColor: C.primary }]}
        onPress={onSaveOnly}
        activeOpacity={0.85}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Icon name="archive" size={18} color="#fff" />
            <Text style={st.primaryBtnLabel}>{T('ocr.upload.batch_save_only')}</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[st.discardBtn, { borderColor: C.border }]}
        onPress={onDiscard}
        activeOpacity={0.75}
        disabled={busy}
      >
        <Text style={[st.discardBtnLabel, { color: C.textSecondary }]}>
          {T('ocr.upload.discard_selection')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = (C: ReturnType<typeof useTheme>['Colors']) => StyleSheet.create({
  container: { padding: 20, gap: 12 },
  card: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  hint: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  fileList: {
    alignSelf: 'stretch',
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 6,
  },
  fileName: { fontSize: 13, fontWeight: '600' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  primaryBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  discardBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  discardBtnLabel: { fontSize: 14, fontWeight: '600' },
});
