import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LOCATION_DISCLOSURE_COPY } from '@topey/shared/lib/constants';
import { colors, radius, spacing, typography } from '@topey/shared/lib/theme';
import { ShadButton } from './ShadButton';

export function EmailAuthCard({
  authBusy,
  helperText,
  mode = 'email',
  onClaimHandle,
  onRequestAccess,
  suggestedHandle = '',
}) {
  const [email, setEmail] = useState('');
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

    onRequestAccess?.({ email, username });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {isHandleMode ? 'Choose anonymous name' : 'Email access'}
      </Text>
      <Text style={styles.copy}>
        {isHandleMode
          ? 'Pick the public name other people will see when you comment, reply, or add places.'
          : 'We only collect your email. Add an anonymous name now, or choose it after opening the sign-in link.'}
      </Text>

      {!isHandleMode ? (
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          testID="auth-email-input"
        />
      ) : null}

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={
          isHandleMode ? 'Anonymous name' : 'Anonymous name (optional for returning users)'
        }
        placeholderTextColor={colors.mutedText}
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        testID="auth-username-input"
      />

      <ShadButton
        label={
          authBusy
            ? isHandleMode
              ? 'Saving...'
              : 'Sending link...'
            : isHandleMode
              ? 'Save anonymous name'
              : 'Email me a sign-in link'
        }
        onPress={handleSubmit}
        disabled={authBusy}
        style={styles.button}
        testID="auth-submit-button"
      />

      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

      {!isHandleMode ? (
        <Pressable accessibilityRole="text" style={styles.disclosureRow}>
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
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
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
