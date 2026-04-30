import { View, Text, Modal, TouchableOpacity, TextInput } from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import { SheetDragger } from '@/screens/marktplatz/SheetDragger';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  score: number;
  setScore: (n: number) => void;
  text: string;
  setText: (s: string) => void;
  onSubmit: () => void;
}

export function MarktplatzRatingModal({
  visible,
  onDismiss,
  score: bewertungScore,
  setScore: setBewertungScore,
  text: bewertungText,
  setText: setBewertungText,
  onSubmit,
}: Props) {
  const { Colors: C } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onDismiss} />
      <View style={{
        backgroundColor: C.bgCard,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
      }}>
        <SheetDragger />
        <Text style={{ fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 16 }}>Bewertung abgeben</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => setBewertungScore(n)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Icon
                name="star"
                size={28}
                color={n <= bewertungScore ? '#f59e0b' : C.border}
                weight={n <= bewertungScore ? 'fill' : 'regular'}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ textAlign: 'center', fontSize: 13, color: C.textSecondary, marginBottom: 16 }}>
          {bewertungScore === 5 ? 'Ausgezeichnet'
            : bewertungScore === 4 ? 'Gut'
            : bewertungScore === 3 ? 'Mittel'
            : bewertungScore === 2 ? 'Schlecht'
            : 'Sehr schlecht'}
        </Text>
        <TextInput
          style={{
            borderRadius: 13,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.bgInput,
            color: C.text,
            fontSize: 13,
            padding: 12,
            height: 80,
            textAlignVertical: 'top',
            marginBottom: 16,
          }}
          placeholder="Kommentar (optional)…"
          placeholderTextColor={C.textTertiary}
          value={bewertungText}
          onChangeText={setBewertungText}
          multiline
        />
        <TouchableOpacity
          style={{ borderRadius: 13, padding: 14, alignItems: 'center', backgroundColor: C.primary }}
          onPress={onSubmit}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Bewertung senden</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
