import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@topey/shared/lib/theme';

export function CenteredMapPin({ moving = false, testID = 'centered-map-pin' }) {
  return (
    <View pointerEvents="none" style={styles.root} testID={testID}>
      <View style={[styles.pinWrap, moving && styles.pinWrapMoving]}>
        <View style={styles.stem} />
        <View style={styles.head}>
          <View style={styles.core} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  pinWrap: {
    alignItems: 'center',
    left: '50%',
    position: 'absolute',
    top: '50%',
    transform: [{ translateX: -18 }, { translateY: -44 }],
  },
  pinWrapMoving: {
    transform: [{ translateX: -18 }, { translateY: -38 }, { scaleX: 0.94 }, { scaleY: 0.94 }],
  },
  stem: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 18,
    marginBottom: -3,
    width: 6,
  },
  head: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    width: 36,
  },
  core: {
    backgroundColor: colors.primaryText,
    borderRadius: 7,
    height: 14,
    width: 14,
  },
});
