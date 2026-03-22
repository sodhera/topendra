import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../lib/theme';
import { ShadButton } from './ShadButton';

export function EmailAuthCard({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSignIn,
  authBusy,
  helperText,
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Email sign-in</Text>
      <Text style={styles.copy}>Use the test account below or your own email/password credentials.</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={colors.mutedText}
        style={styles.input}
        value={email}
        onChangeText={onEmailChange}
      />
      <TextInput
        autoCapitalize="none"
        placeholder="Password"
        placeholderTextColor={colors.mutedText}
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={onPasswordChange}
      />
      <ShadButton
        label={authBusy ? 'Signing in...' : 'Sign in with email'}
        onPress={onSignIn}
        disabled={authBusy}
        style={styles.button}
      />
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 0.75,
    marginTop: spacing.md,
    padding: spacing.md,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.18,
  },
  copy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.elevatedCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 0.75,
    color: colors.text,
    fontFamily: typography.body,
    marginTop: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  button: {
    marginTop: spacing.sm,
  },
  helper: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
