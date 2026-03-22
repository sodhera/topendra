import React from 'react';
import { StyleSheet, View } from 'react-native';
import { OAUTH_PROVIDERS } from '../lib/constants';
import { spacing } from '../lib/theme';
import { ShadButton } from './ShadButton';

export function AuthButtons({ busyProvider, onProviderPress, compact = false }) {
  return (
    <View style={[styles.row, compact && styles.compactRow]}>
      <ShadButton
        label={busyProvider === OAUTH_PROVIDERS.GOOGLE ? 'Connecting Google...' : 'Google'}
        size={compact ? 'compact' : 'default'}
        variant="secondary"
        disabled={Boolean(busyProvider)}
        style={styles.button}
        onPress={() => onProviderPress(OAUTH_PROVIDERS.GOOGLE)}
      />
      <ShadButton
        label={busyProvider === OAUTH_PROVIDERS.FACEBOOK ? 'Connecting Facebook...' : 'Facebook'}
        size={compact ? 'compact' : 'default'}
        variant="secondary"
        disabled={Boolean(busyProvider)}
        style={styles.button}
        onPress={() => onProviderPress(OAUTH_PROVIDERS.FACEBOOK)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  compactRow: {
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
  },
});
