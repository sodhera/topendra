import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../lib/theme';

export function PhotoStrip({ photos, placeholderText = 'No scout photo uploaded yet.' }) {
  if (!photos?.length) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>Scout photo slot</Text>
        <Text style={styles.placeholderCopy}>{placeholderText}</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {photos.map((photo) => (
        <Image key={photo.uri || photo} source={{ uri: photo.uri || photo }} style={styles.image} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
  },
  image: {
    width: 180,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.forestPanel,
  },
  placeholder: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(216, 194, 142, 0.2)',
    padding: spacing.md,
    backgroundColor: 'rgba(18, 23, 17, 0.3)',
    minHeight: 120,
    justifyContent: 'center',
  },
  placeholderTitle: {
    color: colors.savePage,
    fontFamily: typography.displayRegular,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  placeholderCopy: {
    color: colors.textDim,
    fontFamily: typography.body,
    fontSize: 14,
  },
});
