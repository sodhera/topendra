import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radius } from '@topey/shared/lib/theme';

export function CenteredMapPin({
  moving = false,
  testID = 'centered-map-pin',
  verticalPercent = '40%',
}) {
  return (
    <View pointerEvents="none" style={styles.root} testID={testID}>
      <View style={[styles.pinWrap, { top: verticalPercent }, moving && styles.pinWrapMoving]}>
        <View style={styles.shadow} />
        <View style={styles.bubble}>
          <View style={styles.core} />
        </View>
        <View style={styles.tail} />
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
    transform: [{ translateX: -22 }, { translateY: -50 }, { scaleX: 0.97 }, { scaleY: 0.97 }],
  },
  shadow: {
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
    borderRadius: radius.pill,
    bottom: -12,
    height: 12,
    position: 'absolute',
    transform: [{ scaleX: 1.25 }],
    width: 36,
  },
  bubble: {
    alignItems: 'center',
    backgroundColor: '#E32731',
    borderRadius: 24,
    height: 46,
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    width: 46,
    zIndex: 2,
  },
  tail: {
    backgroundColor: '#D81F29',
    height: 26,
    marginTop: -8,
    transform: [{ rotate: '45deg' }],
    width: 26,
  },
  core: {
    backgroundColor: '#FFFFFF',
    height: 20,
    width: 20,
    borderRadius: radius.pill,
  },
});
