import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@topey/shared/lib/theme';

const PIN_BLUE = '#2563EB';

export function CenteredMapPin({
  moving = false,
  testID = 'centered-map-pin',
  verticalPercent = '40%',
}) {
  return (
    <View pointerEvents="none" style={styles.root} testID={testID}>
      <View style={[styles.pinWrap, { top: verticalPercent }, moving && styles.pinWrapMoving]}>
        <View style={styles.shadow} />
        <View style={styles.tail} />
        <View style={styles.bubble}>
          <View style={styles.ring}>
            <View style={styles.core} />
          </View>
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
    transform: [{ translateX: -22 }, { translateY: -54 }],
  },
  pinWrapMoving: {
    transform: [{ translateX: -22 }, { translateY: -50 }, { scaleX: 0.96 }, { scaleY: 0.96 }],
  },
  shadow: {
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
    borderRadius: radius.pill,
    bottom: -6,
    height: 10,
    position: 'absolute',
    transform: [{ scaleX: 1.2 }],
    width: 28,
  },
  tail: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 11,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderWidth: 1,
    height: 16,
    marginTop: -7,
    transform: [{ rotate: '45deg' }],
    width: 16,
  },
  bubble: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    width: 44,
  },
  ring: {
    alignItems: 'center',
    borderColor: PIN_BLUE,
    borderRadius: radius.pill,
    borderWidth: 3,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  core: {
    backgroundColor: PIN_BLUE,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
});
