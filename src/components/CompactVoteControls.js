import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../lib/theme';

export function CompactVoteControls({
  currentVote = 0,
  onDownvote,
  onUpvote,
  score = 0,
  testIDPrefix = 'vote',
}) {
  const scoreLabel = score > 0 ? `+${score}` : `${score}`;

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        onPress={onUpvote}
        style={[styles.arrowButton, currentVote === 1 && styles.arrowButtonActive]}
        testID={`${testIDPrefix}-up-button`}
      >
        <Text style={[styles.arrowLabel, currentVote === 1 && styles.arrowLabelActive]}>▲</Text>
      </Pressable>
      <Text style={styles.scoreLabel}>{scoreLabel}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onDownvote}
        style={[styles.arrowButton, currentVote === -1 && styles.arrowButtonActive]}
        testID={`${testIDPrefix}-down-button`}
      >
        <Text style={[styles.arrowLabel, currentVote === -1 && styles.arrowLabelActive]}>▼</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 0.75,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  arrowButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 0.75,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  arrowButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  arrowLabel: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 12,
  },
  arrowLabelActive: {
    color: colors.primaryText,
  },
  scoreLabel: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.14,
    minWidth: 34,
    textAlign: 'center',
  },
});
