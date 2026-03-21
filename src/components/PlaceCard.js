import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { computePlaceConfidence } from '../lib/trust';
import { colors, spacing, typography } from '../lib/theme';
import { Chip } from './Chip';
import { ConfidenceMeter } from './ConfidenceMeter';
import { WindowPanel } from './WindowPanel';

export function PlaceCard({ state, place, onPress, compact = false }) {
  const confidence = computePlaceConfidence(state, place);

  return (
    <Pressable onPress={onPress}>
      <WindowPanel
        title={place.name}
        subtitle={`${place.neighborhood} · ${place.distanceMinutes} min away`}
        style={compact ? styles.compactShell : undefined}
      >
        <Text style={styles.summary}>{place.summary}</Text>
        <View style={styles.chips}>
          {place.allowedActions.slice(0, 2).map((item) => (
            <Chip key={item} label={item} tone="success" />
          ))}
          <Chip label={place.bestTime} tone="warning" />
        </View>
        <ConfidenceMeter score={confidence} />
      </WindowPanel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compactShell: {
    marginBottom: spacing.sm,
  },
  summary: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
});
