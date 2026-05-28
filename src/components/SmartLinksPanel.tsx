import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, type ThemeColors } from '@/ThemeContext';
import type { LinkingResult, DocumentLink } from '@/services/SmartLinkingService';
import { safeDisplayTitel } from '@/utils/displaySanitizer';

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

  const visible = expanded ? result.topLinks : result.topLinks.slice(0, 3);

  return (
    <View style={{ marginHorizontal: S.md, backgroundColor: C.bgInput, borderRadius: R.lg, padding: 14,
      borderWidth: 0.5, borderColor: C.border, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary,
          letterSpacing: 0.6, flex: 1, minWidth: 0 }}>
          🔗 VERKNÜPFTE DOKUMENTE ({result.topLinks.length})
        </Text>
        {result.topLinks.length > 3 && (
          <TouchableOpacity onPress={() => setExpanded(v => !v)} style={{ flexShrink: 0, marginLeft: 8 }}>
            <Text style={{ fontSize: 11, color: C.primary }}>{expanded ? 'Weniger' : 'Alle'} →</Text>
          </TouchableOpacity>
        )}
      </View>

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
          <Text style={{ fontSize: 11, color: C.textTertiary, marginBottom: 6 }}>DOKUMENTENGRUPPEN</Text>
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
  );
}
