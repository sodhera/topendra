import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButtons } from '../components/AuthButtons';
import { MapPlaceMarker } from '../components/MapPlaceMarker';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { isLoggedIn } from '../lib/auth';
import { DEFAULT_REGION } from '../lib/constants';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

export function AddPlaceScreen({ navigation }) {
  const { state, authBusyProvider, errorMessage: appError, signInWithOAuth, addPlace } = useAppContext();
  const {
    region: userRegion,
    permissionStatus,
    errorMessage: locationError,
    hasResolvedInitialRegion,
  } = useLiveLocation({ watch: false });
  const [mapRegion, setMapRegion] = useState(DEFAULT_REGION);
  const [hasCenteredMap, setHasCenteredMap] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [pin, setPin] = useState({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!hasCenteredMap && hasResolvedInitialRegion) {
      setMapRegion(userRegion);
      setPin({
        latitude: userRegion.latitude,
        longitude: userRegion.longitude,
      });
      setHasCenteredMap(true);
    }
  }, [hasCenteredMap, hasResolvedInitialRegion, userRegion]);

  useEffect(() => {
    setPin({
      latitude: mapRegion.latitude,
      longitude: mapRegion.longitude,
    });
  }, [mapRegion.latitude, mapRegion.longitude]);

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
      setIsSaving(true);
      await addPlace({
        name,
        description,
        latitude: pin.latitude,
        longitude: pin.longitude,
      });

      setName('');
      setDescription('');
      setIsDetailsModalVisible(false);
      navigation.navigate('Browse');
    } catch (error) {
      Alert.alert('Save failed', error.message);
    } finally {
      setIsSaving(false);
    }
  }

  const isAuthenticated = isLoggedIn(state.session);
  const locationStatusCopy =
    permissionStatus === 'loading' && !hasResolvedInitialRegion
      ? 'Finding your current location so the map opens where you are.'
      : 'Move the pin if needed, then tap Add here to enter the place details.';

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
        <MapPlaceMarker
          coordinate={pin}
          moving={isMapMoving}
        />
      </MapView>
      <View style={styles.scrim} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <ShadButton label="Back" size="compact" variant="secondary" onPress={() => navigation.goBack()} />
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.title}>Add a place</Text>
          <Text style={styles.copy}>{locationStatusCopy}</Text>

          <View style={styles.coordsCard}>
            <Text style={styles.coordsLabel}>Pinned at</Text>
            <Text style={styles.coordsValue}>
              {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
            </Text>
          </View>

          {appError ? <Text style={styles.subtle}>{appError}</Text> : null}
          {locationError ? <Text style={styles.subtle}>{locationError}</Text> : null}

          <ShadButton
            label="Add here"
            onPress={() => setIsDetailsModalVisible(true)}
            disabled={!hasResolvedInitialRegion}
          />
        </View>
      </SafeAreaView>

      <Modal
        animationType="slide"
        transparent
        visible={isDetailsModalVisible}
        onRequestClose={() => setIsDetailsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', default: undefined })}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setIsDetailsModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.title}>Place details</Text>
              <Text style={styles.copy}>
                Confirm this pin and fill in the details before the place is added.
              </Text>

              {!isAuthenticated ? (
                <View style={styles.authCallout}>
                  <Text style={styles.authTitle}>Login required before adding.</Text>
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
                <Text style={styles.coordsLabel}>Adding at</Text>
                <Text style={styles.coordsValue}>
                  {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                </Text>
              </View>

              <View style={styles.modalActions}>
                <ShadButton
                  label="Cancel"
                  variant="secondary"
                  onPress={() => setIsDetailsModalVisible(false)}
                  style={styles.modalButton}
                />
                <ShadButton
                  label={isSaving ? 'Adding...' : 'Add'}
                  onPress={handleSubmit}
                  disabled={isSaving || !isAuthenticated}
                  style={styles.modalButton}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
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
  actionCard: {
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
    marginTop: spacing.sm,
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
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    maxHeight: '82%',
    minHeight: 420,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 5,
    marginBottom: spacing.md,
    width: 44,
  },
  modalContent: {
    paddingBottom: spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
