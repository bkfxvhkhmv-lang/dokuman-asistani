import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { AppSheet } from '@/design/components';
import { useT } from '@/hooks/useT';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPDF: () => void | Promise<void>;
  onOriginal?: () => void | Promise<void>;
  onText: () => void;
  onSicherLink?: () => void;
  onMail?: () => void | Promise<void>;
  onExcel?: () => void | Promise<void>;
}

type OptionKey = 'mail' | 'pdf' | 'excel' | 'original' | 'text' | 'sicher';

const OPTION_KEYS: OptionKey[] = ['mail', 'pdf', 'excel', 'original', 'text', 'sicher'];

export default function ExportierenSheet({
  visible, onClose, onPDF, onOriginal, onText, onSicherLink, onMail, onExcel,
}: Props) {
  const { Colors: C } = useTheme();
  const { t } = useT();

  const options = OPTION_KEYS.map(key => ({
    key,
    label:    t(`export.option.${key === 'sicher' ? 'secure' : key}.label`),
    sublabel: t(`export.option.${key === 'sicher' ? 'secure' : key}.sublabel`),
  }));

  const handlers: Record<OptionKey, (() => void | Promise<void>) | undefined> = {
    mail:     onMail,
    pdf:      onPDF,
    excel:    onExcel,
    original: onOriginal,
    text:     onText,
    sicher:   onSicherLink,
  };

  const visible_options = options.filter(o =>
    (o.key !== 'original' || !!onOriginal) &&
    (o.key !== 'mail'     || !!onMail) &&
    (o.key !== 'excel'    || !!onExcel) &&
    (o.key !== 'sicher'   || !!onSicherLink),
  );

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title={t('export.sheet.title')}
      subtitle={t('export.sheet.subtitle')}
    >
      {visible_options.map((opt, index) => (
        <TouchableOpacity
          key={opt.key}
          onPress={() => {
            onClose();
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
