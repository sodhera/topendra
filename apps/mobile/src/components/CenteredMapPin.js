import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@topey/shared/lib/theme';

const PIN_RED = '#DC2626';

export function CenteredMapPin({
  moving = false,
  testID = 'centered-map-pin',
  verticalPercent = '40%',
}) {
  return (
    <View pointerEvents="none" style={styles.root} testID={testID}>
      <View style={[styles.pinWrap, { top: verticalPercent }, moving && styles.pinWrapMoving]}>
        <View style={styles.point} />
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
    transform: [{ translateX: -20 }, { translateY: -42 }],
  },
  pinWrapMoving: {
    transform: [{ translateX: -20 }, { translateY: -38 }, { scaleX: 0.94 }, { scaleY: 0.94 }],
  },
  point: {
    backgroundColor: PIN_RED,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 12,
    borderColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 2,
    height: 20,
    marginBottom: -12,
    transform: [{ rotate: '45deg' }],
    width: 20,
  },
  head: {
    alignItems: 'center',
    backgroundColor: PIN_RED,
    borderColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    width: 36,
  },
  core: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    height: 12,
    width: 12,
  },
});
