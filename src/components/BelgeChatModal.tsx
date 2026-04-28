import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Animated, StyleSheet,
} from 'react-native';
import Icon from './Icon';
import { useTheme, type ThemeColors } from '../ThemeContext';
import { chatWithDocument } from '../services/v4Api';
import type { Dokument } from '../store';

// ── Type-aware quick chips ────────────────────────────────────────────────────

const TYP_CHIPS: Record<string, Array<{ icon: string; text: string }>> = {
  Rechnung: [
    { icon: '💶', text: 'Muss ich wirklich zahlen?' },
    { icon: '📅', text: 'Bis wann muss ich reagieren?' },
    { icon: '💳', text: 'Gibt es Ratenzahlung?' },
    { icon: '❌', text: 'Kann ich widersprechen?' },
  ],
  Mahnung: [
    { icon: '⚖️', text: 'Ist die Forderung berechtigt?' },
    { icon: '❗', text: 'Was passiert wenn ich nicht zahle?' },
    { icon: '✍️', text: 'Wie formuliere ich einen Widerspruch?' },
    { icon: '💰', text: 'Sind die Mahnkosten zulässig?' },
  ],
  Bußgeld: [
    { icon: '✍️', text: 'Lohnt sich ein Einspruch?' },
    { icon: '⏰', text: 'Wie lange habe ich für den Einspruch?' },
    { icon: '⚖️', text: 'Wann brauche ich einen Anwalt?' },
    { icon: '💶', text: 'Kann ich reduzieren lassen?' },
  ],
  Steuerbescheid: [
    { icon: '✍️', text: 'Kann ich Einspruch einlegen?' },
    { icon: '❓', text: 'Was bedeutet dieser Bescheid?' },
    { icon: '⏰', text: 'Was sind meine Fristen?' },
    { icon: '🏛️', text: 'An wen wende ich mich?' },
  ],
  Vertrag: [
    { icon: '✂️', text: 'Wann kann ich kündigen?' },
    { icon: '🔄', text: 'Gibt es automatische Verlängerung?' },
    { icon: '📋', text: 'Was sind meine Hauptpflichten?' },
    { icon: '⚠️', text: 'Welche Klauseln sind riskant?' },
  ],
  Versicherung: [
    { icon: '🛡️', text: 'Bin ich ausreichend versichert?' },
    { icon: '📋', text: 'Was genau ist abgedeckt?' },
    { icon: '⏰', text: 'Wann verlängert es sich automatisch?' },
    { icon: '💶', text: 'Kann ich Prämie senken?' },
  ],
  Behördenbescheid: [
    { icon: '❓', text: 'Was muss ich jetzt tun?' },
    { icon: '✍️', text: 'Kann ich Widerspruch einlegen?' },
    { icon: '⏰', text: 'Welche Fristen gelten?' },
    { icon: '🏛️', text: 'An wen wende ich mich?' },
  ],
  Kündigung: [
    { icon: '⚖️', text: 'Ist die Kündigung wirksam?' },
    { icon: '✍️', text: 'Muss ich antworten?' },
    { icon: '📅', text: 'Was sind die Fristen?' },
    { icon: '🏛️', text: 'Welche Rechte habe ich?' },
  ],
};

const DEFAULT_CHIPS = [
  { icon: '❓', text: 'Was muss ich jetzt tun?' },
  { icon: '⏰', text: 'Bis wann muss ich reagieren?' },
  { icon: '💶', text: 'Muss ich wirklich zahlen?' },
  { icon: '✍️', text: 'Wie kann ich widersprechen?' },
];

function getChips(dok?: Dokument) {
  return (dok && TYP_CHIPS[dok.typ]) || DEFAULT_CHIPS;
}

// ── Typing indicator (3-dot bounce) ──────────────────────────────────────────

function TypingIndicator({ C }: { C: ThemeColors }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -5, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
          Animated.delay(300),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, marginBottom: 10 }}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="hardware-chip-outline" size={16} color={C.primary} />
      </View>
      <View style={{ backgroundColor: C.bgInput, borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 0.5, borderColor: C.border, flexDirection: 'row', gap: 4, alignItems: 'center', height: 38 }}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary, transform: [{ translateY: dot }] }} />
        ))}
      </View>
    </View>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────

interface ChatMessage { role: 'user' | 'assistant'; content: string }

function ChatBubble({ msg, C }: { msg: ChatMessage; C: ThemeColors }) {
  const isUser = msg.role === 'user';
  return (
    <View style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10, paddingHorizontal: 4 }}>
      {!isUser && (
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>
          <Icon name="hardware-chip-outline" size={16} color={C.primary} />
        </View>
      )}
      <View style={{ maxWidth: '80%', backgroundColor: isUser ? C.primary : C.bgInput, borderRadius: 16,
        borderBottomRightRadius: isUser ? 4 : 16, borderBottomLeftRadius: isUser ? 16 : 4,
        padding: 12, borderWidth: 0.5, borderColor: isUser ? C.primary : C.border }}>
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

// ── Main modal ────────────────────────────────────────────────────────────────

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
  const chips = getChips(dok);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Auto-send initialText when modal opens
  useEffect(() => {
    if (visible && initialText && messages.length === 0) {
      handleSend(initialText);
    }
  }, [visible]);

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
          {/* Drag handle */}
          <View style={[st.handle, { backgroundColor: C.border }]} />

          {/* Header */}
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

          {/* DSGVO note */}
          <View style={[st.dsgvo, { backgroundColor: C.bgInput, borderColor: C.border }]}>
            <Text style={{ fontSize: 10, color: C.textTertiary, textAlign: 'center' }}>
              Nur Metadaten werden verarbeitet — kein Dokumentinhalt (DSGVO-konform)
            </Text>
          </View>

          {/* Messages */}
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

          {/* Input bar */}
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

const st = StyleSheet.create({
  sheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '82%', maxHeight: 700, paddingBottom: Platform.OS === 'android' ? 8 : 0 },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, gap: 8 },
  modelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  dsgvo:      { marginHorizontal: 12, marginTop: 8, marginBottom: 4, padding: 8, borderRadius: 8, borderWidth: 0.5 },
  emptyIcon:  { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 12, borderWidth: 0.5 },
  errorBox:   { borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 0.5 },
  inputRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: 0.5 },
  input:      { flex: 1, borderRadius: 20, borderWidth: 1, fontSize: 14, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, lineHeight: 20 },
  sendBtn:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
