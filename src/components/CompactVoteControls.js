import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../lib/theme';

export function CompactVoteControls({
  currentVote = 0,
  onDownvote,
  onUpvote,
  score = 0,
  style,
  testIDPrefix = 'vote',
}) {
  const scoreLabel = score > 0 ? `+${score}` : `${score}`;

  return (
    <View style={[styles.container, style]}>
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
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderColor: colors.separator,
    borderRadius: radius.pill,
    borderWidth: 0.75,
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.sm,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  arrowButton: {
    alignItems: 'center',
    backgroundColor: colors.elevatedCard,
    borderColor: colors.separator,
    borderRadius: radius.pill,
    borderWidth: 0.75,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  arrowButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  arrowLabel: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 11,
  },
  arrowLabelActive: {
    color: colors.primaryText,
  },
  scoreLabel: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    minWidth: 42,
    textAlign: 'center',
  },
});
