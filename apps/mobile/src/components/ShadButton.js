import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '@topey/shared/lib/theme';

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
  icon,
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[size],
        styles[shape],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      testID={testID}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.label,
          variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel,
          labelStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    ...shadows.floating,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  default: {
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: spacing.sm,
  },
  compact: {
    minHeight: 46,
    paddingHorizontal: 14,
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
  pressed: {
    shadowOpacity: 0,
    elevation: 0,
    transform: [{ translateX: 4 }, { translateY: 4 }],
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  label: {
    fontFamily: typography.semibold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  primaryLabel: {
    color: colors.primaryText,
  },
  secondaryLabel: {
    color: colors.text,
  },
});
