import React, { useMemo, useState, useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { AppSheet, AppButton } from '@/design/components';
import type { MoreMenuGroup, MoreMenuItem } from '@/features/detail/detail-modals/types';

const GROUP_LABEL: Record<MoreMenuGroup, string> = {
  main:           'Hauptaktionen',
  communication:  'Chat & Antwort',
  secondary:      'Weitere Werkzeuge',
  advanced:       'Weitere Werkzeuge',
};

/** Sichtbar ohne Scroll: Haupt + genug Chat — alles andere unter „Weitere Werkzeuge“. */
const FIRST_SCREEN_TOTAL = 5;

const SECTION_WEITERE_WERKZEUGE = 'Weitere Werkzeuge';

function pileByGroup(items: MoreMenuItem[]) {
  const m: Record<MoreMenuGroup, MoreMenuItem[]> = {
    main: [], communication: [], secondary: [], advanced: [],
  };
  for (const item of items) {
    const g = (item.group ?? 'secondary') as MoreMenuGroup;
    if (m[g]) m[g].push(item);
    else m.secondary.push({ ...item, group: 'secondary' });
  }
  return m;
}

function SectionHeader({ label }: { label: string }) {
  const { Colors: C } = useTheme();
  return (
    <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.75, color: C.textTertiary, marginBottom: 10, marginTop: 12 }}>
      {label}
    </Text>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  items: MoreMenuItem[];
}

export default function MoreMenuSheet({ visible, onClose, items }: Props) {
  const { Colors: C } = useTheme();
  const pile = useMemo(() => pileByGroup(items), [items]);

  const [extraCommOpen, setExtraCommOpen] = useState(false);
  /** Ein Block: Teilen, PDF, Hilfe, Experte … — zugeklappt, damit die ersten Sekunden klar bleiben */
  const [weitereOpen, setWeitereOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setWeitereOpen(false);
      setExtraCommOpen(false);
    }
  }, [visible]);

  const main = pile.main;
  const communication = pile.communication;
  const allottedComm = Math.max(0, FIRST_SCREEN_TOTAL - main.length);
  const commHead = communication.slice(0, allottedComm);
  const commRest = communication.slice(allottedComm);

  const weitereWerkzeuge = useMemo(
    () => [...pile.secondary, ...pile.advanced],
    [pile.secondary, pile.advanced],
  );

  const Row = ({
    item, isLastRow,
  }: {
    item: MoreMenuItem;
    isLastRow: boolean;
  }) => (
    <TouchableOpacity
      onPress={item.onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 13,
        borderBottomWidth: isLastRow ? 0 : 0.45,
        borderBottomColor: C.border,
      }}
    >
      <Text style={{ fontSize: 17 }}>{item.icon}</Text>
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: '600',
          color: item.destructive ? C.danger : C.text,
        }}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title="Mehr"
      subtitle="Zuerst siehst du, was zählt — Teilen, Export, Hilfe und mehr stehen unter „Weitere Werkzeuge“."
      footer={
        <AppButton label="Schließen" variant="secondary" onPress={onClose} />
      }
    >
      {main.length > 0 && (
        <View>
          <SectionHeader label={GROUP_LABEL.main} />
          {main.map((item, i) => (
            <Row key={item.key} item={item} isLastRow={i === main.length - 1 && communication.length === 0} />
          ))}
        </View>
      )}

      {(commHead.length > 0 || commRest.length > 0) && (
        <View>
          {(main.length === 0 || communication.length > 0) ? <SectionHeader label={GROUP_LABEL.communication} /> : null}

          {commHead.map((item, i) => (
            <Row
              key={item.key}
              item={item}
              isLastRow={commRest.length === 0 ? i === commHead.length - 1 && !extraCommOpen && weitereWerkzeuge.length === 0 : false}
            />
          ))}

          {commRest.length > 0 && (
            <>
              {extraCommOpen && commRest.map((item, i) => (
                <Row
                  key={item.key}
                  item={item}
                  isLastRow={i === commRest.length - 1 && !weitereWerkzeuge.length}
                />
              ))}
              {!extraCommOpen ? (
                <TouchableOpacity onPress={() => setExtraCommOpen(true)} style={{ paddingVertical: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary }}>
                    ↓ Chat & Antwort (+{commRest.length})
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>
      )}

      {weitereWerkzeuge.length > 0 && (
        <View>
          <TouchableOpacity
            onPress={() => setWeitereOpen(v => !v)}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 12,
              marginTop: 8,
              borderBottomWidth: 0.4,
              borderBottomColor: `${C.border}99`,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: C.textTertiary, letterSpacing: 0.5 }}>
              {SECTION_WEITERE_WERKZEUGE} ({weitereWerkzeuge.length})
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.primary }}>{weitereOpen ? '▴' : '▾'}</Text>
          </TouchableOpacity>
          {!weitereOpen ? (
            <Text style={{ fontSize: 12, color: C.textTertiary, marginBottom: 0, lineHeight: 17 }}>
              Alles Weitere an einem Ort — aufklappen, wenn du es brauchst.
            </Text>
          ) : null}
          {weitereOpen &&
            weitereWerkzeuge.map((item, i) => (
              <Row key={item.key} item={item} isLastRow={i === weitereWerkzeuge.length - 1} />
            ))}
        </View>
      )}

      {items.length === 0 && (
        <Text style={{ paddingVertical: 16, fontSize: 13, color: C.textSecondary }}>
          Keine weiteren Schnellaktionen — nutze „Aktionen“ oben oder die Übersicht.
        </Text>
      )}
    </AppSheet>
  );
}
