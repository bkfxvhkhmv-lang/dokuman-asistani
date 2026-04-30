import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/ThemeContext';
import { HIT_SLOP_LG } from '@/theme';
import Icon from '@/components/Icon';
import type { Dokument } from '@/store';

interface Props {
  pages: NonNullable<Dokument['pages']>;
  onOpen: (initialIndex?: number) => void;
}

/** DIN A4 portrait width/height for aspectRatio (RN: width / height). */
const A4_ASPECT = 210 / 297;

export default function PagesPreviewCard({ pages, onOpen }: Props) {
  const { Colors: C, S, R, Shadow } = useTheme();
  const { width: winW } = useWindowDimensions();
  const sorted = useMemo(() => [...pages].sort((a, b) => a.order - b.order), [pages]);
  const previews = sorted.slice(0, 4);
  const remaining = sorted.length - previews.length;

  const innerMaxW = winW - S.md * 4;

  return (
    <View
      style={{
        marginHorizontal: S.md,
        marginBottom: S.md,
        borderRadius: R.lg,
        padding: S.md,
        backgroundColor: C.bgCard,
        borderWidth: 0.5,
        borderColor: C.border,
        ...Shadow.sm,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            color: C.textTertiary,
            letterSpacing: 0.8,
          }}
        >
          GESCANNTE SEITEN ({sorted.length})
        </Text>
        <TouchableOpacity
          onPress={() => onOpen(0)}
          hitSlop={HIT_SLOP_LG}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: C.primaryLight,
            borderWidth: 0.5,
            borderColor: `${C.primary}33`,
          }}
          accessibilityRole="button"
          accessibilityLabel="Vollbild öffnen"
        >
          <Icon name="image" size={14} color={C.primary} />
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.primaryDark }}>
            Vollbild
          </Text>
        </TouchableOpacity>
      </View>

      {sorted.length === 1 ? (
        <TouchableOpacity
          onPress={() => onOpen(0)}
          activeOpacity={0.9}
          accessibilityRole="imagebutton"
          accessibilityLabel="Scan in Vollbild anzeigen"
          style={[
            previewSt.heroFrame,
            {
              maxWidth: innerMaxW,
              alignSelf: 'center',
              width: '100%',
              aspectRatio: A4_ASPECT,
              borderColor: C.border,
              backgroundColor: C.bgInput,
            },
          ]}
        >
          <Image
            source={{ uri: sorted[0].uri }}
            style={previewSt.heroImage}
            resizeMode="contain"
          />
          <View style={[previewSt.heroHint, { backgroundColor: C.text + 'E6' }]}>
            <Text style={previewSt.heroHintText}>Antippen · Vollbild</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <>
          <View style={previewSt.row}>
            {previews.map((p, idx) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => onOpen(idx)}
                activeOpacity={0.85}
                style={[
                  previewSt.thumb,
                  { borderColor: C.border, backgroundColor: C.bgInput },
                ]}
              >
                <Image
                  source={{ uri: p.uri }}
                  style={previewSt.thumbImage}
                  resizeMode="cover"
                />
                <View style={[previewSt.badge, { backgroundColor: C.text + 'CC' }]}>
                  <Text style={previewSt.badgeText}>{idx + 1}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {remaining > 0 && (
              <TouchableOpacity
                onPress={() => onOpen(previews.length)}
                activeOpacity={0.85}
                style={[
                  previewSt.thumb,
                  previewSt.more,
                  {
                    borderColor: C.border,
                    backgroundColor: C.primaryLight,
                  },
                ]}
              >
                <Text style={[previewSt.moreText, { color: C.primaryDark }]}>
                  +{remaining}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => onOpen(0)}
            style={[previewSt.rowFullBleedTap, { marginTop: S.sm }]}
            hitSlop={HIT_SLOP_LG}
            accessibilityRole="button"
            accessibilityLabel="Alle Seiten in Vollbild"
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: C.primaryDark }}>
              Tippen · Vollbildansicht ({sorted.length} Seiten)
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const previewSt = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  heroFrame: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    position: 'relative',
  },
  heroImage: { width: '100%', height: '100%' },
  heroHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  heroHintText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  thumb: {
    width: 96,
    height: 130,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
    position: 'relative',
  },
  thumbImage: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  more: { alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 14, fontWeight: '700' },
  rowFullBleedTap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});
