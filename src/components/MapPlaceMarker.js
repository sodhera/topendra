import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors, radius, spacing, typography } from '../lib/theme';

export function MapPlaceMarker({ coordinate, title, selected = false, moving = false, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: moving ? 0.54 : selected ? 1.1 : 1,
      friction: 8,
      tension: 138,
      useNativeDriver: true,
    }).start();
  }, [moving, scale, selected]);

  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={moving}
    >
      <Animated.View
        style={[
          styles.shell,
          selected && styles.shellSelected,
          moving && styles.shellMoving,
          { transform: [{ scale }] },
        ]}
      >
        <View style={[styles.core, selected && styles.coreSelected, moving && styles.coreMoving]} />
        {title && !moving ? (
          <Text numberOfLines={1} style={[styles.label, selected && styles.labelSelected]}>
            {title}
          </Text>
        ) : null}
      </Animated.View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    maxWidth: 180,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  shellSelected: {
    backgroundColor: 'rgba(34, 197, 94, 0.24)',
    borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  shellMoving: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  core: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 10,
    width: 10,
  },
  coreSelected: {
    backgroundColor: colors.primary,
    height: 12,
    width: 12,
  },
  coreMoving: {
    height: 7,
    width: 20,
  },
  label: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 12,
    maxWidth: 120,
  },
  labelSelected: {
    color: colors.text,
  },
});
