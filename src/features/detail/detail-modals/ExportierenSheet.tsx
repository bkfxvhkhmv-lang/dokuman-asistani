import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { AppSheet } from '@/design/components';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPDF: () => void | Promise<void>;
  onOriginal?: () => void | Promise<void>;
  onText: () => void;
  onSicherLink: () => void;
  onMail?: () => void | Promise<void>;
  onExcel?: () => void | Promise<void>;
}

const OPTIONS = [
  {
    key: 'mail',
    label: 'Per E-Mail senden',
    sublabel: 'Mit Betreff und Anhang als E-Mail-Entwurf öffnen.',
  },
  {
    key: 'pdf',
    label: 'PDF exportieren',
    sublabel: 'Als lesbares Dokument teilen.',
  },
  {
    key: 'excel',
    label: 'Excel herunterladen',
    sublabel: 'Analyseergebnis als Tabelle exportieren.',
  },
  {
    key: 'original',
    label: 'Originaldatei teilen',
    sublabel: 'Scan oder hochgeladene Datei weitergeben.',
  },
  {
    key: 'text',
    label: 'Text-Zusammenfassung teilen',
    sublabel: 'Kurzfassung als Text senden.',
  },
  {
    key: 'sicher',
    label: 'Sicherer Link',
    sublabel: 'Zeitlich begrenzten Link erstellen.',
  },
] as const;

export default function ExportierenSheet({
  visible, onClose, onPDF, onOriginal, onText, onSicherLink, onMail, onExcel,
}: Props) {
  const { Colors: C } = useTheme();

  const handlers: Record<string, (() => void | Promise<void>) | undefined> = {
    mail: onMail,
    pdf: onPDF,
    excel: onExcel,
    original: onOriginal,
    text: onText,
    sicher: onSicherLink,
  };

  const visible_options = OPTIONS.filter(o =>
    (o.key !== 'original' || !!onOriginal) &&
    (o.key !== 'mail'     || !!onMail) &&
    (o.key !== 'excel'    || !!onExcel),
  );

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title="Exportieren"
      subtitle="Wähle, wie du dieses Dokument weitergeben möchtest."
    >
      {visible_options.map((opt, index) => (
        <TouchableOpacity
          key={opt.key}
          onPress={() => {
            onClose();
            // Wait for sheet dismiss animation before presenting next view controller
            setTimeout(() => { void Promise.resolve(handlers[opt.key]?.()); }, 350);
          }}
          style={{
            paddingVertical: 14,
            borderBottomWidth: index < visible_options.length - 1 ? 0.5 : 0,
            borderBottomColor: C.border,
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>
            {opt.label}
          </Text>
          <Text style={{ fontSize: 13, color: C.textTertiary, marginTop: 2 }}>
            {opt.sublabel}
          </Text>
        </TouchableOpacity>
      ))}
    </AppSheet>
  );
}
