/**
 * DocumentContextSheet (#113)
 *
 * Native-feeling context menu triggered by long-pressing a document card.
 * Uses AppSheet (bottom drawer) + haptic confirmation for each action.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import AppSheet from '../design/components/AppSheet';
import Icon from './Icon';
import { useTheme } from '../ThemeContext';
import { HIT_SLOP } from '../theme';
import type { Dokument } from '../store';

interface Action {
  key:     string;
  label:   string;
  icon:    string;
  tone?:   'danger' | 'primary' | 'default';
  onPress: () => void;
}

interface DocumentContextSheetProps {
  dok:     Dokument | null;
  onClose: () => void;
  onNavigate:   () => void;
  onErledigt:   () => void;
  onTeilen:     () => void;
  onPDF:        () => void;
  onLoeschen:   () => void;
}

export default function DocumentContextSheet({
  dok,
  onClose,
  onNavigate,
  onErledigt,
  onTeilen,
  onPDF,
  onLoeschen,
}: DocumentContextSheetProps) {
  const { Colors: C } = useTheme();

  if (!dok) return null;

  const actions: Action[] = [
    {
      key: 'anzeigen',
      label: 'Dokument öffnen',
      icon: 'document-text-outline',
      tone: 'primary',
      onPress: onNavigate,
    },
    {
      key: 'erledigt',
      label: dok.erledigt ? 'Als offen markieren' : 'Als erledigt markieren',
      icon: dok.erledigt ? 'refresh-circle-outline' : 'checkmark-circle-outline',
      onPress: onErledigt,
    },
    {
      key: 'teilen',
      label: 'Teilen',
      icon: 'share-outline',
      onPress: onTeilen,
    },
    {
      key: 'pdf',
      label: 'Als PDF exportieren',
      icon: 'document-outline',
      onPress: onPDF,
    },
    {
      key: 'loeschen',
      label: 'Löschen',
      icon: 'trash-outline',
      tone: 'danger',
      onPress: onLoeschen,
    },
  ];

  const handleAction = (action: Action) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    // Small delay so sheet closes before action fires
    setTimeout(action.onPress, 180);
  };

  return (
    <AppSheet
      visible={!!dok}
      onClose={onClose}
      title={dok.titel || dok.typ}
      subtitle={dok.absender}
    >
      <View style={st.list}>
        {actions.map((action, i) => {
          const textColor = action.tone === 'danger'
            ? C.danger
            : action.tone === 'primary'
            ? C.primary
            : C.text;
          const iconColor = action.tone === 'danger'
            ? C.danger
            : action.tone === 'primary'
            ? C.primary
            : C.textSecondary;

          return (
            <TouchableOpacity
              key={action.key}
              onPress={() => handleAction(action)}
              hitSlop={HIT_SLOP}
              style={[
                st.row,
                { borderBottomWidth: i < actions.length - 1 ? 0.5 : 0, borderBottomColor: C.borderLight },
              ]}
              activeOpacity={0.7}
            >
              <View style={[st.iconCircle, { backgroundColor: `${iconColor}12` }]}>
                <Icon name={action.icon} size={18} color={iconColor} />
              </View>
              <Text style={[st.label, { color: textColor }]}>{action.label}</Text>
              {action.tone !== 'danger' && (
                <Icon name="chevron-forward-outline" size={14} color={C.textTertiary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </AppSheet>
  );
}

const st = StyleSheet.create({
  list:       { paddingBottom: 8 },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  label:      { flex: 1, fontSize: 15, fontWeight: '500', letterSpacing: -0.2 },
});
