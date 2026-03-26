import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AUTH_PRIVACY_COPY, LOCATION_DISCLOSURE_COPY } from '@topey/shared/lib/constants';
import { colors, radius, shadows, spacing, typography } from '@topey/shared/lib/theme';
import { ShadButton } from './ShadButton';

export function GoogleAuthCard({
  authBusy,
  helperText,
  mode = 'auth',
  onClaimHandle,
  onRequestAccess,
  suggestedHandle = '',
}) {
  const [username, setUsername] = useState(suggestedHandle);

  useEffect(() => {
    setUsername(suggestedHandle);
  }, [suggestedHandle]);

  const isHandleMode = mode === 'handle';

  function handleSubmit() {
    if (isHandleMode) {
      onClaimHandle?.({ username });
      return;
    }

    onRequestAccess?.();
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {isHandleMode ? 'Choose anonymous name' : 'Sign in'}
      </Text>
      <Text style={styles.copy}>
        {isHandleMode
          ? 'Pick the public name other people will see when you comment, reply, or add places.'
          : 'Sign in with Google to post comments and add places. Your real name and email are never shown to other users.'}
      </Text>

      {isHandleMode ? (
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Anonymous name"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          testID="auth-username-input"
        />
      ) : null}

      <ShadButton
        label={
          authBusy
            ? isHandleMode
              ? 'Saving...'
              : 'Signing in...'
            : isHandleMode
              ? 'Save anonymous name'
              : 'Sign in with Google'
        }
        onPress={handleSubmit}
        disabled={authBusy}
        style={styles.button}
        testID="auth-submit-button"
      />

      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

      {!isHandleMode ? (
        <Pressable accessibilityRole="text" style={styles.disclosureRow}>
          <Text style={styles.disclosureText}>{AUTH_PRIVACY_COPY}</Text>
          <Text style={styles.disclosureText}>{LOCATION_DISCLOSURE_COPY}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 2,
    marginTop: spacing.md,
    padding: spacing.md,
    ...shadows.floating,
  },
  title: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.18,
    textAlign: 'center',
  },
  copy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.elevatedCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 2,
    color: colors.text,
    fontFamily: typography.body,
    marginTop: spacing.sm,
    minHeight: 52,
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
  disclosureRow: {
    marginTop: spacing.md,
  },
  disclosureText: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
  },
});
