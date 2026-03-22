import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../lib/theme';

export function ShadButton({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  shape = 'rounded',
  style,
  disabled = false,
  testID,
}) {
  const scale = React.useRef(new Animated.Value(1)).current;

  function animateTo(value) {
    Animated.spring(scale, {
      toValue: value,
      friction: 7,
      tension: 160,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
      style={[styles.base, styles[variant], styles[size], styles[shape], disabled && styles.disabled, style]}
      testID={testID}
    >
      <Animated.View style={[styles.inner, { transform: [{ scale }] }]}>
        <View style={styles.sheen} pointerEvents="none" />
        <View style={styles.shadowFill} pointerEvents="none" />
        <Text style={[styles.label, variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  primary: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  secondary: {
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  default: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  compact: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rounded: {
    borderRadius: radius.md,
  },
  pill: {
    borderRadius: radius.pill,
  },
  disabled: {
    opacity: 0.48,
  },
  inner: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    height: '42%',
  },
  shadowFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    top: '48%',
  },
  label: {
    fontFamily: typography.semibold,
    fontSize: 15,
  },
  primaryLabel: {
    color: colors.text,
  },
  secondaryLabel: {
    color: colors.text,
  },
});
