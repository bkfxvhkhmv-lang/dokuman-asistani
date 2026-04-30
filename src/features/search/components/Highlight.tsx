/**
 * Arama sonucu metni icinde sorgu kelimelerini boyayarak vurgular.
 *
 * Kurallar:
 *  - 2 karakterden uzun kelimeler vurgulanir (cok kisa kelimeler false-positive yapar)
 *  - En fazla 10 kelime regex'e dahil edilir (regex blow-up koruma)
 *  - Case-insensitive eslesme
 */
import React from 'react';
import { Text } from 'react-native';

interface Props {
  text?: string;
  query?: string;
  /** Vurgu rengi (genellikle theme.primary). */
  color: string;
  /** Vurgulanmamis text icin renk. */
  secondaryColor: string;
}

export default function Highlight({ text = '', query = '', color, secondaryColor }: Props) {
  // Sorgu bos veya text bos -> dogrudan plain render
  if (!query.trim() || !text) {
    return <Text style={{ fontSize: 12, color: secondaryColor }} numberOfLines={2}>{text}</Text>;
  }

  // 2 karakterden uzun anlamli kelimeleri al
  const words = query.trim().split(/\s+/).filter(w => w.length > 2).slice(0, 10);
  if (words.length === 0) {
    return <Text style={{ fontSize: 12, color: secondaryColor }} numberOfLines={2}>{text}</Text>;
  }

  // Regex special char'lari escape et
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex     = new RegExp(`(${escaped})`, 'gi');
  const testRegex = new RegExp(`^(${escaped})$`, 'i');
  const parts     = text.split(regex);

  return (
    <Text style={{ fontSize: 12, color: secondaryColor }} numberOfLines={2}>
      {parts.map((p, i) =>
        testRegex.test(p)
          ? <Text key={i} style={{ backgroundColor: color + '33', color, fontWeight: '700' }}>{p}</Text>
          : p,
      )}
    </Text>
  );
}
