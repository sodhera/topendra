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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: 'rgba(17, 17, 17, 0.92)',
  },
  secondary: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
  },
  default: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: spacing.sm,
  },
  compact: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: spacing.xs,
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
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.35,
  },
  primaryLabel: {
    color: colors.primaryText,
  },
  secondaryLabel: {
    color: colors.text,
  },
});
