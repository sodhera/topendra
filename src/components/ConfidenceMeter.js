import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getConfidenceLabel } from '../lib/trust';
import { colors, spacing, typography } from '../lib/theme';

export function ConfidenceMeter({ score }) {
  const label = getConfidenceLabel(score);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.score}>{score}%</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${score}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  score: {
    fontFamily: typography.display,
    color: colors.leafHighlight,
    fontSize: 22,
  },
  label: {
    fontFamily: typography.bodyMedium,
    color: colors.textMuted,
    fontSize: 14,
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 231, 193, 0.14)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.leafHighlight,
  },
});
