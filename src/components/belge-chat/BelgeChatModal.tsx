import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from '@/components/Icon';
import { useTheme } from '@/ThemeContext';
import { chatWithDocument } from '@/services/v4Api';
import type { Dokument } from '@/store';

import { ChatBubble } from './ChatBubble';
import { belgeChatStyles as st } from './belgeChatStyles';
import type { ChatMessage } from './chatTypes';
import { TypingIndicator } from './TypingIndicator';
import { getChipsForTyp } from './typChips';

interface BelgeChatModalProps {
  visible: boolean;
  onClose: () => void;
  dok?: Dokument;
  lang?: string;
  initialText?: string;
}

export default function BelgeChatModal({ visible, onClose, dok, lang = 'de', initialText }: BelgeChatModalProps) {
  const { Colors: C } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const mountedRef = useRef(true);
  const chips = getChipsForTyp(dok);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const trimmed = (text ?? inputText).trim();
    if (!trimmed || loading || !dok?.id) return;

    setInputText('');
    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);
    scrollToEnd();

    try {
      const res = await chatWithDocument(dok.id, updated, lang) as { reply: string; model_used?: string };
      if (!mountedRef.current) return;
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
      setModelUsed(res.model_used ?? null);
      scrollToEnd();
    } catch {
      if (!mountedRef.current) return;
      setError('KI derzeit nicht erreichbar. Bitte versuche es später.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [messages, inputText, loading, dok, lang, scrollToEnd]);

  useEffect(() => {
    if (visible && initialText && messages.length === 0) {
      void handleSend(initialText);
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    setMessages([]); setInputText(''); setError(null); setModelUsed(null); onClose();
  }, [onClose]);

  const isLocal = modelUsed?.startsWith('local/');
  const isCloud = modelUsed?.startsWith('cloud/');
  const canSend = inputText.trim().length > 0 && !loading;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={handleClose} activeOpacity={1} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 0 }}>
        <View style={[st.sheet, { backgroundColor: C.bgCard }]}>
          <View style={[st.handle, { backgroundColor: C.border }]} />

          <View style={[st.header, { borderColor: C.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>Dokument fragen</Text>
              {dok?.absender ? (
                <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }} numberOfLines={1}>
                  {dok.absender} · {dok.typ}
                </Text>
              ) : null}
            </View>
            {modelUsed && (
              <View style={[st.modelBadge, {
                backgroundColor: isLocal ? C.successLight : isCloud ? C.primaryLight : C.bgInput,
              }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isLocal ? C.success : isCloud ? C.primary : C.textTertiary }} />
                <Text style={{ fontSize: 10, fontWeight: '600', color: isLocal ? C.success : isCloud ? C.primary : C.textTertiary }}>
                  {isLocal ? 'Local AI' : isCloud ? 'Cloud AI' : 'Offline'}
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={handleClose} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="Schließen">
              <Icon name="close" size={20} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[st.dsgvo, { backgroundColor: C.bgInput, borderColor: C.border }]}>
            <Text style={{ fontSize: 10, color: C.textTertiary, textAlign: 'center' }}>
              Nur Metadaten werden verarbeitet — kein Dokumentinhalt (DSGVO-konform)
            </Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 12, paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToEnd}
          >
            {messages.length === 0 && (
              <View style={{ alignItems: 'center', paddingTop: 16, paddingBottom: 8 }}>
                <View style={[st.emptyIcon, { backgroundColor: C.primaryLight }]}>
                  <Icon name="chatbubble-ellipses-outline" size={28} color={C.primary} />
                </View>
                <Text style={{ fontSize: 13, color: C.textSecondary, textAlign: 'center', marginBottom: 16, marginTop: 8 }}>
                  Was möchtest du zu diesem Dokument wissen?
                </Text>
                <View style={{ width: '100%', gap: 8 }}>
                  {chips.map((chip, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleSend(chip.text)}
                      accessibilityRole="button"
                      accessibilityLabel={chip.text}
                      style={[st.chip, { backgroundColor: C.bgInput, borderColor: C.border }]}
                    >
                      <Text style={{ fontSize: 17 }}>{chip.icon}</Text>
                      <Text style={{ fontSize: 13, color: C.text, flex: 1 }}>{chip.text}</Text>
                      <Text style={{ fontSize: 14, color: C.textTertiary }}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {messages.map((msg, i) => <ChatBubble key={i} msg={msg} C={C} />)}

            {loading && <TypingIndicator C={C} />}

            {error && (
              <View style={[st.errorBox, { backgroundColor: C.dangerLight, borderColor: C.danger + '44' }]}>
                <Text style={{ fontSize: 12, color: C.danger }}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={[st.inputRow, { borderColor: C.border }]}>
            <TextInput
              style={[st.input, { backgroundColor: C.bgInput, borderColor: C.border, color: C.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Stell eine Frage..."
              placeholderTextColor={C.textTertiary}
              multiline
              onSubmitEditing={() => handleSend()}
              blurOnSubmit={false}
              editable={!loading}
              accessibilityLabel="Frage eingeben"
            />
            <TouchableOpacity
              onPress={() => handleSend()}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel="Senden"
              accessibilityState={{ disabled: !canSend }}
              style={[st.sendBtn, { backgroundColor: canSend ? C.primary : C.border }]}
            >
              <Text style={{ fontSize: 18, color: '#fff' }}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
