import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MAP_HINTS } from '../lib/constants';
import { colors, radius, spacing, typography } from '../lib/theme';

export function FauxMap({
  places = [],
  selectedPlaceId,
  onSelectPlace,
  pickable = false,
  pin,
  onPick,
  height = 230,
}) {
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });

  const handlePress = (event) => {
    if (!pickable || !onPick) {
      return;
    }

    const { locationX, locationY } = event.nativeEvent;
    const normalizedX = Math.max(4, Math.min(96, Math.round((locationX / dimensions.width) * 100)));
    const normalizedY = Math.max(4, Math.min(96, Math.round((locationY / dimensions.height) * 100)));

    if (!Number.isNaN(normalizedX) && !Number.isNaN(normalizedY)) {
      onPick({ x: normalizedX, y: normalizedY });
    }
  };

  return (
    <Pressable
      style={[styles.shell, { height }]}
      onLayout={(event) => setDimensions(event.nativeEvent.layout)}
      onPress={handlePress}
      disabled={!pickable}
    >
      <View style={[styles.terrain, styles.terrainOne]} />
      <View style={[styles.terrain, styles.terrainTwo]} />
      <View style={[styles.terrain, styles.terrainThree]} />

      {MAP_HINTS.map((hint) => (
        <Text
          key={hint.label}
          style={[
            styles.hint,
            {
              left: `${hint.x}%`,
              top: `${hint.y}%`,
            },
          ]}
        >
          {hint.label}
        </Text>
      ))}

      {places.map((place) => {
        const isSelected = selectedPlaceId === place.id;
        return (
          <Pressable
            key={place.id}
            onPress={() => onSelectPlace?.(place)}
            style={[
              styles.pin,
              isSelected && styles.pinSelected,
              {
                left: `${place.coords.x}%`,
                top: `${place.coords.y}%`,
              },
            ]}
          />
        );
      })}

      {pin?.x && pin?.y ? (
        <View
          style={[
            styles.pin,
            styles.pinDraft,
            {
              left: `${pin.x}%`,
              top: `${pin.y}%`,
            },
          ]}
        />
      ) : null}

      {pickable ? <Text style={styles.pickHint}>Tap the map to drop a pin.</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(216, 194, 142, 0.24)',
    borderRadius: radius.lg,
    backgroundColor: colors.deepPine,
    position: 'relative',
  },
  terrain: {
    position: 'absolute',
    backgroundColor: 'rgba(110, 138, 59, 0.22)',
    borderColor: 'rgba(167, 201, 87, 0.18)',
    borderWidth: 1,
    borderRadius: 999,
  },
  terrainOne: {
    width: 160,
    height: 82,
    left: 18,
    top: 28,
  },
  terrainTwo: {
    width: 210,
    height: 94,
    left: 110,
    top: 118,
  },
  terrainThree: {
    width: 128,
    height: 110,
    right: 18,
    top: 42,
  },
  hint: {
    position: 'absolute',
    color: 'rgba(244, 231, 193, 0.72)',
    fontFamily: typography.mono,
    fontSize: 11,
    transform: [{ translateX: -20 }, { translateY: -10 }],
  },
  pin: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: colors.savePage,
    backgroundColor: colors.cartridgeGreen,
    transform: [{ translateX: -9 }, { translateY: -9 }],
    shadowColor: colors.leafHighlight,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  pinSelected: {
    width: 22,
    height: 22,
    backgroundColor: colors.antiqueGold,
    transform: [{ translateX: -11 }, { translateY: -11 }],
  },
  pinDraft: {
    backgroundColor: colors.error,
  },
  pickHint: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    color: colors.textMuted,
    fontFamily: typography.mono,
    fontSize: 11,
  },
});
