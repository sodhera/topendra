import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { LOCATION_DISCLOSURE_COPY } from '@topey/shared/lib/constants';
import { colors, radius, spacing, typography } from '@topey/shared/lib/theme';
import { ShadButton } from './ShadButton';

export function EmailAuthCard({
  email,
  username,
  onEmailChange,
  onUsernameChange,
  onSubmit,
  authBusy,
  helperText,
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Email</Text>
      <Text style={styles.copy}>
        Email plus an anonymous username.
      </Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={colors.mutedText}
        style={styles.input}
        value={email}
        onChangeText={onEmailChange}
      />
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Anonymous username"
        placeholderTextColor={colors.mutedText}
        style={styles.input}
        value={username}
        onChangeText={onUsernameChange}
      />
      <ShadButton
        label={authBusy ? 'Sending link...' : 'Send sign-in link'}
        onPress={onSubmit}
        disabled={authBusy}
        style={styles.button}
      />
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      <Text style={styles.note}>
        Anonymous only. {LOCATION_DISCLOSURE_COPY}
      </Text>
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
    color: colors.primary,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  note: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
