/**
 * Gemeinsame Blöcke für den Einstellungen-Baum (Überschrift + Abschnitt).
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';

function flattenFragments(nodes: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(nodes).flatMap((child: any) => {
    if (child != null && child.type === React.Fragment) {
      return flattenFragments(child.props.children);
    }
    return [child];
  });
}

/** iOS‑artige gruppierte Zeilen: dünner Rahmen, Trenner zwischen Kinder‑Views. */
export function FlatGroup({ children }: { children: React.ReactNode }) {
  const { Colors: C } = useTheme();
  const ch = flattenFragments(children).filter(Boolean);
  return (
    <View
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.bgCard,
      }}
    >
      {ch.map((child, i) => (
        <View
          key={i}
          style={{
            borderBottomWidth: i < ch.length - 1 ? StyleSheet.hairlineWidth : 0,
            borderBottomColor: `${C.border}CC`,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

type FlatRowProps = {
  icon?: string;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
};

export function FlatRow({ icon, label, sub, right, onPress, disabled }: FlatRowProps) {
  const { Colors: C, fs } = useTheme();
  const body = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        {icon ? (
          <View
            style={{
              width: 29,
              height: 29,
              borderRadius: 8,
              backgroundColor: C.bgInput,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={icon} size={fs(22)} color={C.textSecondary} />
          </View>
        ) : (
          <View style={{ width: 29 }} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: fs(16), fontWeight: '400', letterSpacing: -0.2 }}>
            {label}
          </Text>
          {sub ? (
            <Text style={{ fontSize: fs(13), color: C.textTertiary, marginTop: 2, letterSpacing: 0.1 }}>
              {sub}
            </Text>
          ) : null}
        </View>
      </View>
      {right}
    </>
  );
  const pad = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: sub ? 10 : 12,
    paddingHorizontal: 16,
    minHeight: sub ? undefined : 48,
  };
  if (onPress) {
    return (
      <TouchableOpacity style={pad} onPress={onPress} disabled={disabled} activeOpacity={0.65}>
        {body}
      </TouchableOpacity>
    );
  }
  return <View style={pad}>{body}</View>;
}

export function SettingsSectionTitle({ label }: { label: string }) {
  const { Colors: C, fs } = useTheme();
  return (
    <Text style={[sheet.title, { color: C.textSecondary, fontSize: fs(11) }]} accessibilityRole="header">
      {label}
    </Text>
  );
}

export function SettingsSectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  const { Colors: C, fs } = useTheme();
  return (
    <View style={sheet.block}>
      <Text style={[sheet.blockCaps, { color: C.primary, fontSize: fs(10) }]}>
        {title}
      </Text>
      <View>{children}</View>
    </View>
  );
}

const sheet = StyleSheet.create({
  title: {
    fontWeight: '800',
    letterSpacing: 0.85,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  block: { gap: 12 },
  blockCaps: { fontWeight: '800', letterSpacing: 0.7 },
});
