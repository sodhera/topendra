import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButtons } from '../components/AuthButtons';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { getUserLabel, isLoggedIn } from '../lib/auth';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

export function HomeScreen({ navigation }) {
  const { state, authBusyProvider, errorMessage, signInWithOAuth, signOut } = useAppContext();
  const { region, errorMessage: locationError } = useLiveLocation();
  const isAuthenticated = isLoggedIn(state.session);

  async function handleProviderPress(provider) {
    try {
      await signInWithOAuth(provider);
    } catch (error) {
      return;
    }
  }

  return (
    <View style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} region={region} showsUserLocation>
        {state.places.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.name}
            description={place.description}
          />
        ))}
      </MapView>
      <View style={styles.scrim} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topRow}>
          <ShadButton label="Add a place" size="compact" onPress={() => navigation.navigate('AddPlace')} />
          {isAuthenticated ? (
            <ShadButton label="Sign out" size="compact" variant="secondary" onPress={() => signOut()} />
          ) : null}
        </View>

        <View style={styles.bottomStack}>
          <View style={styles.statusDock}>
            <Text style={styles.eyebrow}>Topey</Text>
            <Text style={styles.statusTitle}>{getUserLabel(state.session?.user)}</Text>
            <Text style={styles.statusCopy}>
              {isAuthenticated
                ? 'Comments, votes, and new place submissions are unlocked.'
                : 'Browse as a guest, then sign in with Google or Facebook to vote, comment, and add places.'}
            </Text>

            {!isAuthenticated ? (
              <AuthButtons busyProvider={authBusyProvider} onProviderPress={handleProviderPress} />
            ) : null}

            {errorMessage ? <Text style={styles.meta}>{errorMessage}</Text> : null}
            {locationError ? <Text style={styles.meta}>{locationError}</Text> : null}
          </View>

          <ShadButton
            label="Find a place"
            onPress={() => navigation.navigate('Browse')}
            style={styles.findButton}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.mapOverlay,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  bottomStack: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  statusDock: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.floating,
  },
  eyebrow: {
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statusTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 28,
    marginTop: spacing.sm,
  },
  statusCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  meta: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  findButton: {
    minHeight: 58,
  },
});
