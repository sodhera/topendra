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
  labelStyle,
  disabled = false,
  testID,
}) {
  const scale = React.useRef(new Animated.Value(1)).current;

  function animateTo(value) {
    Animated.spring(scale, {
      toValue: value,
      friction: 10,
      tension: 210,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => animateTo(0.985)}
      onPressOut={() => animateTo(1)}
      style={[styles.base, styles[variant], styles[size], styles[shape], disabled && styles.disabled, style]}
      testID={testID}
    >
      <Animated.View style={[styles.inner, { transform: [{ scale }] }]}>
        <Text
          style={[
            styles.label,
            variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel,
            labelStyle,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderWidth: 0.75,
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  secondary: {
    backgroundColor: colors.secondary,
    borderColor: 'rgba(255, 255, 255, 0.62)',
  },
  default: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  compact: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  large: {
    minHeight: 62,
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
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.24,
  },
  primaryLabel: {
    color: colors.primaryText,
  },
  secondaryLabel: {
    color: colors.text,
  },
});
