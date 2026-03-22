import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButtons } from '../components/AuthButtons';
import { EmailAuthCard } from '../components/EmailAuthCard';
import { ShadButton } from '../components/ShadButton';
import { MapPlaceMarker } from '../components/MapPlaceMarker';
import { useAppContext } from '../context/AppContext';
import { getUserLabel, isLoggedIn } from '../lib/auth';
import { DEFAULT_REGION } from '../lib/constants';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

export function HomeScreen({ navigation }) {
  const { state, authBusyProvider, isPasswordAuthLoading, errorMessage, signInWithOAuth, signInWithPassword, signOut } =
    useAppContext();
  const { errorMessage: locationError } = useLiveLocation({ watch: false });
  const isAuthenticated = isLoggedIn(state.session);
  const [email, setEmail] = useState('testuser@topey.app');
  const [password, setPassword] = useState('TopeyTest123!');
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [isMapMoving, setIsMapMoving] = useState(false);

  async function handleProviderPress(provider) {
    try {
      await signInWithOAuth(provider);
    } catch (error) {
      return;
    }
  }

  async function handleEmailSignIn() {
    try {
      await signInWithPassword({ email, password });
    } catch (error) {
      Alert.alert('Sign-in failed', error.message);
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={mapRegion}
        onRegionChangeStart={() => setIsMapMoving(true)}
        onRegionChangeComplete={(nextRegion) => {
          setMapRegion(nextRegion);
          setIsMapMoving(false);
        }}
        showsUserLocation
      >
        {state.places.map((place) => (
          <MapPlaceMarker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.name}
            moving={isMapMoving}
          />
        ))}
      </MapView>
      <View style={styles.scrim} pointerEvents="none" />

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
                : 'Browse as a guest, then sign in with Google, Facebook, or the test email account to vote, comment, and add places.'}
            </Text>

            {!isAuthenticated ? (
              <>
                <AuthButtons busyProvider={authBusyProvider} onProviderPress={handleProviderPress} />
                <EmailAuthCard
                  email={email}
                  password={password}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onSignIn={handleEmailSignIn}
                  authBusy={isPasswordAuthLoading}
                  helperText="Seeded test credentials: testuser@topey.app / TopeyTest123!"
                />
              </>
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
    backgroundColor: 'rgba(9, 9, 11, 0.24)',
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
