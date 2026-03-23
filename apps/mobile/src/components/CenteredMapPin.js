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
    transform: [{ translateX: -22 }, { translateY: -50 }],
  },
  bubble: {
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: 24,
    height: 46,
    justifyContent: 'center',
    width: 46,
    zIndex: 2,
  },
  tail: {
    backgroundColor: '#18181B',
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
