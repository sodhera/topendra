import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@topey/shared/lib/theme';

export function CompactVoteControls({
  currentVote = 0,
  direction = 'horizontal',
  onDownvote,
  onUpvote,
  score = 0,
  style,
  testIDPrefix = 'vote',
}) {
  const scoreLabel = score > 0 ? `+${score}` : `${score}`;

  return (
    <View style={[styles.container, direction === 'vertical' && styles.containerVertical, style]}>
      <Pressable
        accessibilityRole="button"
        onPress={onUpvote}
        style={[styles.arrowButton, currentVote === 1 && styles.arrowButtonActive]}
        testID={`${testIDPrefix}-up-button`}
      >
        <Text style={[styles.arrowLabel, currentVote === 1 && styles.arrowLabelActive]}>↑</Text>
      </Pressable>
      <Text style={styles.scoreLabel}>{scoreLabel}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onDownvote}
        style={[styles.arrowButton, currentVote === -1 && styles.arrowButtonActive]}
        testID={`${testIDPrefix}-down-button`}
      >
        <Text style={[styles.arrowLabel, currentVote === -1 && styles.arrowLabelActive]}>↓</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  containerVertical: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  arrowButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 36,
  },
  arrowButtonActive: {
    backgroundColor: colors.accent,
  },
  arrowLabel: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
  },
  arrowLabelActive: {
    color: colors.text,
  },
  scoreLabel: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    minWidth: 34,
    textAlign: 'center',
  },
});
