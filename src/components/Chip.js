import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../lib/theme';

export function Chip({ label, tone = 'default', compact = false }) {
  return (
    <View
      style={[
        styles.base,
        compact && styles.compact,
        tone === 'success' && styles.success,
        tone === 'warning' && styles.warning,
        tone === 'info' && styles.info,
      ]}
    >
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(179, 146, 69, 0.55)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    backgroundColor: 'rgba(18, 23, 17, 0.44)',
  },
  compact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  success: {
    borderColor: 'rgba(167, 201, 87, 0.55)',
  },
  warning: {
    borderColor: 'rgba(216, 194, 142, 0.55)',
  },
  info: {
    borderColor: 'rgba(140, 184, 158, 0.6)',
  },
  text: {
    color: colors.savePage,
    fontFamily: typography.mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
