import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../ThemeContext';

const STEPS = [
  { event: 'DOCUMENT_CREATED',    label: 'Hochgeladen',       icon: 'cloud-upload' },
  { event: 'OCR_COMPLETED',       label: 'OCR abgeschlossen', icon: 'scan' },
  { event: 'EMBEDDING_COMPLETED', label: 'Embedding fertig',  icon: 'bulb' },
  { event: 'RULE_APPLIED',        label: 'Regeln angewandt',  icon: 'settings' },
];

interface PipelineStatusProps {
  currentEvent?: string;
}

export default function PipelineStatus({ currentEvent }: PipelineStatusProps) {
  const { Colors } = useTheme();
  const currentIndex = STEPS.findIndex(s => s.event === currentEvent);

  return (
    <View style={styles.container}>
      {STEPS.map((step, idx) => {
        const isActive = idx <= currentIndex;
        return (
          <View key={step.event} style={styles.step}>
            <View style={[styles.iconCircle, { backgroundColor: isActive ? Colors.primary : Colors.border }]}>
              <Icon name={step.icon} size={16} color="#fff" />
            </View>
            <Text style={[styles.label, { color: isActive ? Colors.text : Colors.textTertiary }]}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  step: { alignItems: 'center', flex: 1 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  label: { fontSize: 10, textAlign: 'center' },
});
