import { View, Text } from 'react-native';
import type { ThemeColors } from '@/ThemeContext';
import Icon from '@/components/Icon';

import type { ChatMessage } from './chatTypes';

interface Props {
  msg: ChatMessage;
  C: ThemeColors;
}

export function ChatBubble({ msg, C }: Props) {
  const isUser = msg.role === 'user';
  return (
    <View style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10, paddingHorizontal: 4 }}>
      {!isUser && (
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>
          <Icon name="hardware-chip-outline" size={16} color={C.primary} />
        </View>
      )}
      <View style={{
        maxWidth: '80%', backgroundColor: isUser ? C.primary : C.bgInput, borderRadius: 16,
        borderBottomRightRadius: isUser ? 4 : 16, borderBottomLeftRadius: isUser ? 16 : 4,
        padding: 12, borderWidth: 0.5, borderColor: isUser ? C.primary : C.border,
      }}>
        <Text style={{ fontSize: 14, lineHeight: 20, color: isUser ? '#fff' : C.text }}>{msg.content}</Text>
      </View>
      {isUser && (
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary + '33', alignItems: 'center', justifyContent: 'center', marginLeft: 8, flexShrink: 0, alignSelf: 'flex-end' }}>
          <Text style={{ fontSize: 14 }}>👤</Text>
        </View>
      )}
    </View>
  );
}
