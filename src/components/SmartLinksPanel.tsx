import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, type ThemeColors } from '@/ThemeContext';
import type { LinkingResult, DocumentLink } from '@/services/SmartLinkingService';
import { safeDisplayTitel } from '@/utils/displaySanitizer';
import Icon from '@/components/Icon';

interface SmartLinksPanelProps {
  result: LinkingResult;
  allDoksMap: Map<string, { titel: string; typ: string; absender: string }>;
}

const LINK_TYPE_LABEL: Record<string, string> = {
  gleicher_absender:  'Gleicher Absender',
  gleicher_vorgang:   'Gleicher Vorgang',
  folgedokument:      'Dokumentenkette',
  zahlung_bezug:      'Zahlungsbezug',
  vertrag_ergaenzung: 'Verwandter Vertrag',
  ähnlicher_inhalt:   'Ähnlicher Inhalt',
};

function LinkRow({ link, dok, onPress, C }: {
  link: DocumentLink;
  dok: { titel: string; typ: string; absender: string } | undefined;
  onPress: () => void;
  C: ThemeColors;
}) {
  if (!dok) return null;
  const isHighConf = link.confidence >= 80;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12,
        borderBottomWidth: 0.5, borderColor: C.border }}>
      <View style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        backgroundColor: isHighConf ? C.primaryLight : C.bgInput,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 14 }}>{link.icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontSize: 13, fontWeight: '600', color: C.text }}
          numberOfLines={2}
          ellipsizeMode="tail">
          {safeDisplayTitel(dok.titel, dok.typ)}
        </Text>
        <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }} numberOfLines={2}>
          {LINK_TYPE_LABEL[link.type] || link.type} · {dok.typ}
        </Text>
        {link.beschreibung ? (
          <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 6, lineHeight: 14 }}
            numberOfLines={2}
            ellipsizeMode="tail">
            {link.beschreibung}
          </Text>
        ) : null}
      </View>
      <View style={{ flexShrink: 0, alignItems: 'flex-end', paddingTop: 2, minWidth: 48 }}>
        <View style={{ backgroundColor: isHighConf ? C.primaryLight : C.bgInput,
          borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4,
          borderWidth: 1, borderColor: isHighConf ? C.primary + '44' : C.border }}>
          <Text style={{ fontSize: 10, fontWeight: '700',
            color: isHighConf ? C.primaryDark : C.textTertiary }}>
            {isHighConf ? 'Passend' : 'Ähnlich'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SmartLinksPanel({ result, allDoksMap }: SmartLinksPanelProps) {
  const { Colors: C, R, S } = useTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  if (result.topLinks.length === 0) return null;

  const count = result.topLinks.length;
  const summaryLabel = count === 1 ? '1 verknüpftes Dokument' : `${count} verknüpfte Dokumente`;
  const visible = expanded ? result.topLinks : [];

  return (
    <View style={{ marginHorizontal: S.md, backgroundColor: C.bgInput, borderRadius: R.lg, padding: 14,
      borderWidth: 0.5, borderColor: C.border, marginBottom: 12 }}>
      <TouchableOpacity
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.8}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <View style={{
          width: 34, height: 34, borderRadius: 12,
          backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 14 }}>🔗</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{summaryLabel}</Text>
          <Text style={{ fontSize: 11, color: C.textSecondary }} numberOfLines={1}>
            Ähnliche Inhalte und Dokumentbezüge gefunden
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>
            {expanded ? 'Weniger' : 'Alle'} →
          </Text>
          <Icon name={expanded ? 'caret-up' : 'caret-down'} size={12} color={C.primary} />
        </View>
      </TouchableOpacity>

      {expanded ? (
        <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 0.5, borderColor: C.border }}>
          {visible.map(link => (
            <LinkRow
              key={link.nachId}
              link={link}
              dok={allDoksMap.get(link.nachId)}
              onPress={() => router.push({ pathname: '/detail', params: { dokId: link.nachId } })}
              C={C}
            />
          ))}

          {result.clusterGruppen.length > 0 && (
            <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderColor: C.border }}>
              <Text style={{ fontSize: 11, color: C.textTertiary, marginBottom: 6 }}>Dokumentgruppen</Text>
              {result.clusterGruppen.map(cluster => (
                <View key={cluster.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13, flexShrink: 0 }}>{cluster.icon}</Text>
                  <Text style={{ fontSize: 12, color: C.text, flex: 1, minWidth: 0 }} numberOfLines={2}>{cluster.label}</Text>
                  <Text style={{ fontSize: 11, color: C.textTertiary, flexShrink: 0 }}>
                    {cluster.dokIds.length} Dok.
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
