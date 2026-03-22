import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButtons } from '../components/AuthButtons';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { isLoggedIn } from '../lib/auth';
import { DEFAULT_REGION } from '../lib/constants';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

export function AddPlaceScreen({ navigation }) {
  const { state, authBusyProvider, errorMessage: appError, signInWithOAuth, addPlace } = useAppContext();
  const { region: userRegion, errorMessage: locationError } = useLiveLocation({ watch: false });
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [hasCenteredMap, setHasCenteredMap] = useState(false);
  const [pin, setPin] = useState({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [hasPinnedManually, setHasPinnedManually] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!hasCenteredMap) {
      setMapRegion(userRegion);
      setPin({
        latitude: userRegion.latitude,
        longitude: userRegion.longitude,
      });
      setHasCenteredMap(true);
    }
  }, [hasCenteredMap, userRegion]);

  useEffect(() => {
    if (!hasPinnedManually) {
      setPin({
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
      });
    }
  }, [hasPinnedManually, mapRegion.latitude, mapRegion.longitude]);

  async function handleProviderPress(provider) {
    try {
      await signInWithOAuth(provider);
    } catch (error) {
      return;
    }
  }

  async function handleSubmit() {
    if (!isLoggedIn(state.session)) {
      Alert.alert('Login required', 'Sign in with Google or Facebook before saving a new place.');
      return;
    }

    if (!name.trim() || !description.trim()) {
      Alert.alert('Missing details', 'Add a name and description before saving the place.');
      return;
    }

    try {
      await addPlace({
        name,
        description,
        latitude: pin.latitude,
        longitude: pin.longitude,
      });

      navigation.navigate('Browse');
    } catch (error) {
      Alert.alert('Save failed', error.message);
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        onPress={(event) => {
          setHasPinnedManually(true);
          setPin(event.nativeEvent.coordinate);
        }}
        showsUserLocation
      >
        <Marker
          coordinate={pin}
          draggable
          onDragEnd={(event) => {
            setHasPinnedManually(true);
            setPin(event.nativeEvent.coordinate);
          }}
        />
      </MapView>
      <View style={styles.scrim} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <ShadButton label="Back" size="compact" variant="secondary" onPress={() => navigation.goBack()} />
        </View>

        <View style={styles.sheet}>
          <Text style={styles.title}>Add a place</Text>
          <Text style={styles.copy}>
            Drop the pin where you want it, then save the place into Supabase.
          </Text>

          {!isLoggedIn(state.session) ? (
            <View style={styles.authCallout}>
              <Text style={styles.authTitle}>Login required before saving.</Text>
              <Text style={styles.authCopy}>
                Google and Facebook sign-in unlock place submission, comments, and voting.
              </Text>
              <AuthButtons busyProvider={authBusyProvider} onProviderPress={handleProviderPress} />
            </View>
          ) : null}

          <TextInput
            placeholder="Place name"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            placeholder="Description"
            placeholderTextColor={colors.mutedText}
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <View style={styles.coordsCard}>
            <Text style={styles.coordsLabel}>Pinned at</Text>
            <Text style={styles.coordsValue}>
              {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
            </Text>
          </View>

          {appError ? <Text style={styles.subtle}>{appError}</Text> : null}
          {locationError ? <Text style={styles.subtle}>{locationError}</Text> : null}

          <ShadButton
            label="Save place"
            onPress={handleSubmit}
            disabled={!isLoggedIn(state.session)}
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
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  sheet: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.floating,
  },
  title: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 26,
  },
  copy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  authCallout: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  authTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 16,
  },
  authCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  subtle: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontFamily: typography.body,
    marginTop: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  coordsCard: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginVertical: spacing.md,
    padding: spacing.md,
  },
  coordsLabel: {
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  coordsValue: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
});
