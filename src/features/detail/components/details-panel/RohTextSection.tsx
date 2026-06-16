import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/ThemeContext';
import { useT } from '@/hooks/useT';

interface Props {
  rohText: string;
}

export function RohTextSection({ rohText }: Props) {
  const { Colors: C, S, R, Shadow } = useTheme();
  const { t: T } = useT();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ borderRadius: R.lg, padding: S.md, backgroundColor: C.bgCard,
      borderWidth: 0.5, borderColor: C.border, ...Shadow.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: C.textTertiary, letterSpacing: 0.8 }}>
          {T('detail.section.original_text')}
        </Text>
        <TouchableOpacity onPress={() => setOpen(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>
            {open ? T('detail.show_less') : T('detail.show_all')}
          </Text>
        </TouchableOpacity>
      </View>
      {open && (
        <Text style={{ fontSize: 11, color: C.textSecondary, lineHeight: 18 }}>
          {rohText}
        </Text>
      )}
    </View>
  );
}
