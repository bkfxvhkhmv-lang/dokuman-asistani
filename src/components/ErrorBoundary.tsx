import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ThemeContext } from '@/ThemeContext';

interface Props {
  children:  React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error:    Error | null;
  retries:  number;
}

// Maximum silent auto-retries before showing the error screen
const MAX_AUTO_RETRY = 1;

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retries: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Session expiry is handled silently — let auth context recover
    if (error?.message === 'SESSION_EXPIRED') {
      this.setState({ hasError: false, error: null });
      return;
    }

    console.error('[BriefPilot:crash]', error?.message ?? error, __DEV__ ? info.componentStack : '');

    // One silent auto-retry for transient JS engine errors
    if (this.state.retries < MAX_AUTO_RETRY && !__DEV__) {
      this.setState(s => ({ hasError: false, error: null, retries: s.retries + 1 }));
      return;
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, retries: 0 });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback)  return this.props.fallback;

    const { error } = this.state;
    const isNetworkError = error?.message?.toLowerCase().includes('network') ||
                           error?.message?.toLowerCase().includes('fetch');

    return (
      <ThemeContext.Consumer>
        {(theme) => (
          <View style={[st.container, { backgroundColor: theme.Colors.bg }]}>
            <View style={st.iconWrap}>
              <View style={[st.iconOuter, { borderColor: `${PRIMARY}1A` }]}>
                <View style={[st.iconInner, { backgroundColor: theme.Colors.primaryLight }]}>
                  <Text style={st.iconEmoji}>{isNetworkError ? '📡' : '⚡'}</Text>
                </View>
              </View>
            </View>

            <Text style={[st.title, { color: theme.Colors.text }]}>
              {isNetworkError ? 'Verbindungsproblem' : 'Unerwarteter Fehler'}
            </Text>
            <Text style={[st.subtitle, { color: theme.Colors.textSecondary }]}>
              {isNetworkError
                ? 'Die Verbindung zum Server ist kurz unterbrochen.\nIch versuche es gleich erneut.'
                : 'Ein interner Fehler ist aufgetreten.\nIch bin bereits dabei, ihn zu beheben.'}
            </Text>

            <View style={[st.hint, { backgroundColor: theme.Colors.primaryLight, borderColor: `${PRIMARY}28` }]}>
              <View style={st.hintDot} />
              <Text style={[st.hintText, { color: theme.Colors.textSecondary }]}>
                {isNetworkError
                  ? 'Alle lokalen Daten sind weiterhin verfügbar.'
                  : 'Deine Daten sind sicher gespeichert.'}
              </Text>
            </View>

            {__DEV__ && error && (
              <ScrollView style={[st.devBox, { backgroundColor: theme.Colors.dangerLight }]}>
                <Text style={[st.devText, { color: theme.Colors.danger }]}>{error.toString()}</Text>
              </ScrollView>
            )}

            <TouchableOpacity style={st.btn} onPress={this.handleReset} activeOpacity={0.82}>
              <Text style={st.btnText}>Erneut versuchen</Text>
            </TouchableOpacity>
          </View>
        )}
      </ThemeContext.Consumer>
    );
  }
}

const PRIMARY = '#4361EE';
const LIGHT   = '#EEF1FD';

const st = StyleSheet.create({
  container:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingBottom: 48 },
  iconWrap:   { marginBottom: 28 },
  iconOuter:  { width: 120, height: 120, borderRadius: 60, borderWidth: 1.5, borderColor: `${PRIMARY}1A`, alignItems: 'center', justifyContent: 'center' },
  iconInner:  { width: 88,  height: 88,  borderRadius: 44, backgroundColor: LIGHT, alignItems: 'center', justifyContent: 'center' },
  iconEmoji:  { fontSize: 36 },
  title:      { fontSize: 19, fontWeight: '700', color: '#111827', textAlign: 'center', letterSpacing: -0.4, marginBottom: 8 },
  subtitle:   { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, letterSpacing: -0.1, marginBottom: 16 },
  hint:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: LIGHT, borderRadius: 14, borderWidth: 1, borderColor: `${PRIMARY}28`, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 24, alignSelf: 'stretch' },
  hintDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY, marginTop: 5, flexShrink: 0 },
  hintText:   { flex: 1, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
  devBox:     { maxHeight: 120, alignSelf: 'stretch', borderRadius: 10, padding: 10, marginBottom: 16 },
  devText:    { fontSize: 11, fontFamily: 'monospace' },
  btn:        { backgroundColor: PRIMARY, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 999, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.30, shadowRadius: 12, elevation: 6 },
  btnText:    { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
});
