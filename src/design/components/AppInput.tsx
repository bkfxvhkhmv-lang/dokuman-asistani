import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, ViewStyle, TextStyle, TextInputProps } from 'react-native';
import { useTheme } from '../../ThemeContext';
import Icon from '../../components/Icon';

type InputVariant = 'default' | 'search' | 'underline';

interface AppInputProps extends Omit<TextInputProps, 'style'> {
  variant?: InputVariant;
  label?: string;
  placeholder?: string;
  icon?: string;
  secure?: boolean;
  error?: string;
  helper?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onClear?: () => void;
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

export default function AppInput({
  variant = 'default',
  label,
  placeholder,
  icon,
  secure = false,
  error,
  helper,
  value,
  onChangeText,
  onClear,
  style,
  inputStyle,
  ...rest
}: AppInputProps) {
  const { Colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [secureVisible, setSecureVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const hasLeft  = !!icon || secure;
  const hasRight = secure || (variant === 'search' && (value?.length ?? 0) > 0);

  const borderColor = error
    ? Colors.danger ?? '#E24B4A'
    : focused
    ? Colors.primary
    : Colors.border;

  const focusShadow = focused && variant !== 'underline' && !error
    ? { shadowColor: Colors.primary, shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }
    : {};

  const containerStyle = [
    variant === 'underline' ? st.wrapUnderline : st.wrapDefault,
    variant !== 'underline' && { borderColor, backgroundColor: Colors.bgInput },
    variant === 'underline' && { borderBottomColor: borderColor },
    focused && variant !== 'underline' && st.focused,
    focusShadow,
    style,
  ];

  return (
    <View style={st.root}>
      {label ? (
        <Text style={[st.label, { color: error ? (Colors.danger ?? '#E24B4A') : Colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}

      <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={containerStyle}>
        {hasLeft ? (
          <View style={st.iconLeft}>
            <Icon
              name={secure ? 'lock' : icon!}
              size={16}
              color={focused ? Colors.primary : Colors.textTertiary}
            />
          </View>
        ) : null}

        <TextInput
          ref={inputRef}
          style={[
            st.input,
            { color: Colors.text },
            hasLeft && st.inputWithLeft,
            hasRight && st.inputWithRight,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry={secure && !secureVisible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={secure ? 'none' : rest.autoCapitalize}
          autoCorrect={secure ? false : rest.autoCorrect}
          {...rest}
        />

        {secure ? (
          <TouchableOpacity onPress={() => setSecureVisible(v => !v)} style={st.iconRight} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name={secureVisible ? 'eye-slash' : 'eye'} size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        ) : variant === 'search' && (value?.length ?? 0) > 0 ? (
          <TouchableOpacity
            onPress={() => { onChangeText?.(''); onClear?.(); }}
            style={st.iconRight}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="x-circle" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {error ? (
        <Text style={[st.helper, { color: Colors.danger ?? '#E24B4A' }]}>{error}</Text>
      ) : helper ? (
        <Text style={[st.helper, { color: Colors.textTertiary }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  root: { width: '100%' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.1 },
  wrapDefault: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, minHeight: 48, paddingHorizontal: 12,
  },
  wrapUnderline: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1.5, minHeight: 44, paddingHorizontal: 0, backgroundColor: 'transparent',
  },
  focused:        { borderWidth: 1.5 },
  input:          { flex: 1, fontSize: 15, paddingVertical: Platform.OS === 'ios' ? 13 : 10 },
  inputWithLeft:  { marginLeft: 6 },
  inputWithRight: { marginRight: 6 },
  iconLeft:       { width: 20, alignItems: 'center', justifyContent: 'center' },
  iconRight:      { width: 24, alignItems: 'center', justifyContent: 'center' },
  helper:         { fontSize: 11, marginTop: 5, marginLeft: 2 },
});
