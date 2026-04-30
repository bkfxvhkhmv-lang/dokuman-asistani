/**
 * Profil ekraninda bolumler icin paylasilan goruntu primitivleri.
 *
 *  - SectionCard  : renk-tematik kart (ust 3px renk seridi + tint)
 *  - SectionTitle : kart icindeki kucuk all-caps baslik
 *  - Row          : icon + label + (opsiyonel sub) + sag taraf control
 */
import React from 'react';
import { View, Text } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';

/* ── SectionCard ─────────────────────────────────────────────────── */

interface SectionCardProps {
  color:    string;
  children: React.ReactNode;
}

export function SectionCard({ color, children }: SectionCardProps) {
  const { Shadow } = useTheme();
  return (
    <View
      style={{
        backgroundColor: `${color}08`, borderRadius: 20, padding: 18,
        overflow: 'hidden', borderWidth: 1, borderColor: `${color}22`,
        ...Shadow.sm,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 3,
          backgroundColor: `${color}99`,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
        }}
      />
      {children}
    </View>
  );
}

/* ── SectionTitle ────────────────────────────────────────────────── */

interface SectionTitleProps {
  label: string;
  color: string;
}

export function SectionTitle({ label, color }: SectionTitleProps) {
  const { fs } = useTheme();
  return (
    <Text style={{ fontSize: fs(11), fontWeight: '800', color, marginBottom: 14, letterSpacing: 0.8 }}>
      {label}
    </Text>
  );
}

/* ── Row ─────────────────────────────────────────────────────────── */

interface RowProps {
  icon:  string;
  label: string;
  sub?:  string;
  right?: React.ReactNode;
}

export function Row({ icon, label, sub, right }: RowProps) {
  const { Colors: C, fs } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: sub ? 16 : 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <View
          style={{
            width: 34, height: 34, borderRadius: 10,
            backgroundColor: C.bgInput,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={fs(17)} color={C.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: fs(14), fontWeight: '500', letterSpacing: -0.1 }}>
            {label}
          </Text>
          {sub
            ? (
              <Text style={{ fontSize: fs(11), color: C.textTertiary, marginTop: 2, letterSpacing: 0.1 }}>
                {sub}
              </Text>
            )
            : null}
        </View>
      </View>
      {right}
    </View>
  );
}
