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
      friction: 8,
      tension: 170,
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
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  default: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  compact: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  large: {
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    justifyContent: 'center',
  },
  label: {
    fontFamily: typography.semibold,
    fontSize: 15,
  },
  primaryLabel: {
    color: colors.primaryText,
  },
  secondaryLabel: {
    color: colors.text,
  },
});
