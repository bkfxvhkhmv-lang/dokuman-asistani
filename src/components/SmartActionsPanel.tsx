import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, type ThemeColors } from '@/ThemeContext';
import Icon from '@/components/Icon';
import type { RadiusTokens } from '@/theme';
import type { SmartAction, ActionKey, ActionsResult } from '@/services/SmartActionsService';

interface SmartActionsPanelProps {
  result: ActionsResult;
  onAction: (key: string) => void;
  /** Detail: bereits „Nächster Schritt“ über ActionsPanel + FAB — keine zweite Primary-Leiste */
  omitPrimaryBanner?: boolean;
  /** Aktions-Schlüssel ausblenden (z. B. wenn ActionsPanel gleiche Aktion führt) */
  omitKeys?: readonly ActionKey[];
}

function ActionButton({ action, onPress, C, R, large }: {
  action: SmartAction; onPress: () => void; C: ThemeColors; R: RadiusTokens; large?: boolean;
}) {
  if (large) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: C.primary, borderRadius: R.lg,
          padding: 16, marginBottom: 12 }}>
        <Icon name={action.icon} size={22} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>{action.label}</Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
            {action.beschreibung}
          </Text>
        </View>
        {action.badge && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999,
            paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{action.badge}</Text>
          </View>
        )}
        <Icon name="arrow-right" size={18} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
        borderBottomWidth: 0.5, borderColor: C.border }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.bgInput,
        alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={action.icon} size={20} color={C.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{action.label}</Text>
        <Text style={{ fontSize: 11, color: C.textSecondary }}>{action.beschreibung}</Text>
      </View>
      {action.badge && (
        <View style={{ backgroundColor: C.dangerLight, borderRadius: 999,
          paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: C.danger + '44' }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: C.danger }}>{action.badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const OMITTABLE = new Set<ActionKey>();

export default function SmartActionsPanel({
  result,
  onAction,
  omitPrimaryBanner = false,
  omitKeys,
}: SmartActionsPanelProps) {
  const { Colors: C, R } = useTheme();
  const [expandedTools, setExpandedTools] = useState(false);

  const omit = omitKeys?.length ? new Set(omitKeys) : OMITTABLE;

  const filterList = (list: SmartAction[]) => list.filter(a => !omit.has(a.key));

  const primary =
    omitPrimaryBanner || !result.nächsterSchritt || omit.has(result.nächsterSchritt.key)
      ? null
      : result.nächsterSchritt;

  const toolActions = useMemo(
    () => Object.values(result.gruppen)
      .flatMap(actions => filterList(actions))
      .filter((action, index, arr) => action.key !== primary?.key && arr.findIndex(a => a.key === action.key) === index),
    [result.gruppen, primary, omitKeys],
  );

  if (!primary && toolActions.length > 0) {
    return null;
  }

  return (
    <View>
      {/* Primary CTA */}
      {primary && (
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary,
            letterSpacing: 0.6, marginBottom: 8 }}>
            NÄCHSTER SCHRITT
          </Text>
          <ActionButton
            action={primary}
            onPress={() => onAction(primary.key)}
            C={C} R={R} large
          />
        </View>
      )}

      {toolActions.length > 0 && (
        <View style={{ marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => setExpandedTools(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.6, flex: 1 }}>
              WEITERE WERKZEUGE
            </Text>
            <Text style={{ fontSize: 11, color: C.textTertiary }}>
              {expandedTools ? '▴' : '▾'}
            </Text>
          </TouchableOpacity>

          {expandedTools && toolActions.map(action => (
            <ActionButton
              key={action.key}
              action={action}
              onPress={() => onAction(action.key)}
              C={C} R={R}
            />
          ))}
        </View>
      )}
    </View>
  );
}
