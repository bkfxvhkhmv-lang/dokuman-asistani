import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, type ThemeColors } from '../ThemeContext';
import type { RadiusTokens } from '../theme';
import type { LinkingResult, DocumentLink } from '../services/SmartLinkingService';

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

function LinkRow({ link, dok, onPress, C, R }: {
  link: DocumentLink;
  dok: { titel: string; typ: string; absender: string } | undefined;
  onPress: () => void;
  C: ThemeColors; R: RadiusTokens;
}) {
  if (!dok) return null;
  const isHighConf = link.confidence >= 80;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
        borderBottomWidth: 0.5, borderColor: C.border }}>
      <View style={{ width: 32, height: 32, borderRadius: 10,
        backgroundColor: isHighConf ? C.primaryLight : C.bgInput,
        alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 14 }}>{link.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }} numberOfLines={1}>
          {dok.titel}
        </Text>
        <Text style={{ fontSize: 11, color: C.textSecondary }}>
          {LINK_TYPE_LABEL[link.type] || link.type} · {dok.typ}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ backgroundColor: isHighConf ? C.primaryLight : C.bgInput,
          borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3,
          borderWidth: 1, borderColor: isHighConf ? C.primary + '44' : C.border }}>
          <Text style={{ fontSize: 9, fontWeight: '700',
            color: isHighConf ? C.primary : C.textTertiary }}>
            {link.confidence}%
          </Text>
        </View>
        <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 2 }}>
          {link.beschreibung}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SmartLinksPanel({ result, allDoksMap }: SmartLinksPanelProps) {
  const { Colors: C, R } = useTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  if (result.topLinks.length === 0) return null;

  const visible = expanded ? result.topLinks : result.topLinks.slice(0, 3);

  return (
    <View style={{ backgroundColor: C.bgInput, borderRadius: R.lg, padding: 14,
      borderWidth: 0.5, borderColor: C.border, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.textTertiary,
          letterSpacing: 0.6, flex: 1 }}>
          🔗 VERKNÜPFTE DOKUMENTE ({result.topLinks.length})
        </Text>
        {result.topLinks.length > 3 && (
          <TouchableOpacity onPress={() => setExpanded(v => !v)}>
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
          C={C} R={R}
        />
      ))}

      {result.clusterGruppen.length > 0 && (
        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderColor: C.border }}>
          <Text style={{ fontSize: 11, color: C.textTertiary, marginBottom: 6 }}>DOKUMENTENGRUPPEN</Text>
          {result.clusterGruppen.map(cluster => (
            <View key={cluster.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingVertical: 4 }}>
              <Text style={{ fontSize: 13 }}>{cluster.icon}</Text>
              <Text style={{ fontSize: 12, color: C.text, flex: 1 }}>{cluster.label}</Text>
              <Text style={{ fontSize: 11, color: C.textTertiary }}>
                {cluster.dokIds.length} Dok.
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
