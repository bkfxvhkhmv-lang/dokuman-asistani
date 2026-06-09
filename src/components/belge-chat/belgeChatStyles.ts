import { Platform, StyleSheet } from 'react-native';

export const belgeChatStyles = StyleSheet.create({
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
