import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LOCATION_DISCLOSURE_COPY } from '@topey/shared/lib/constants';
import { colors, radius, spacing, typography } from '@topey/shared/lib/theme';
import { ShadButton } from './ShadButton';

export function EmailAuthCard({
  onSignUp,
  onSignIn,
  onMagicLink,
  onGoogleSignIn,
  onAppleSignIn,
  authBusy,
  helperText,
}) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const isSignUp = mode === 'signup';

  function handleSubmit() {
    if (isSignUp) {
      onSignUp({ email, username, password });
    } else {
      onSignIn({ email, password });
    }
  }

  function handleMagicLink() {
    onMagicLink({ email, username });
  }

  function toggleMode() {
    setMode(isSignUp ? 'signin' : 'signup');
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
      <Text style={styles.copy}>
        {isSignUp
          ? 'Sign up with a social account or email. Choose an anonymous username that will appear on places and comments.'
          : 'Sign in with your social account or email.'}
      </Text>

      <View style={styles.socialButtonsContainer}>
        {onGoogleSignIn && (
          <ShadButton
            icon={<Ionicons name="logo-google" size={20} color={colors.text} />}
            label={authBusy ? 'Please wait...' : 'Continue with Google'}
            onPress={onGoogleSignIn}
            disabled={authBusy}
            style={styles.socialButton}
            variant="outline"
          />
        )}
        {Platform.OS === 'ios' && onAppleSignIn && (
          <ShadButton
            icon={<Ionicons name="logo-apple" size={20} color={colors.text} />}
            label={authBusy ? 'Please wait...' : 'Continue with Apple'}
            onPress={onAppleSignIn}
            disabled={authBusy}
            style={styles.socialButton}
            variant="outline"
          />
        )}
      </View>

      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or continue with email</Text>
        <View style={styles.dividerLine} />
      </View>

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
      {isSignUp ? (
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Anonymous username"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          testID="auth-username-input"
        />
      ) : null}
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Password"
        placeholderTextColor={colors.mutedText}
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        testID="auth-password-input"
      />
      <ShadButton
        label={authBusy ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create account' : 'Sign in')}
        onPress={handleSubmit}
        disabled={authBusy}
        style={styles.button}
        testID="auth-submit-button"
      />
      <Pressable onPress={toggleMode} style={styles.toggleRow}>
        <Text style={styles.toggleText}>
          {isSignUp ? 'Already have an account? ' : 'Need an account? '}
          <Text style={styles.toggleLink}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
        </Text>
      </Pressable>
      {isSignUp ? (
        <Pressable onPress={handleMagicLink} disabled={authBusy} style={styles.toggleRow}>
          <Text style={styles.toggleText}>
            Or <Text style={styles.toggleLink}>send me a sign-in link</Text> instead
          </Text>
        </Pressable>
      ) : null}
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
      {isSignUp ? (
        <Text style={styles.note}>
          Keep the username anonymous. {LOCATION_DISCLOSURE_COPY}
        </Text>
      ) : null}
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
  socialButtonsContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  socialButton: {
    width: '100%',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.sm,
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  toggleRow: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  toggleText: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 18,
  },
  toggleLink: {
    color: colors.text,
    fontFamily: typography.medium,
    fontWeight: '600',
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
