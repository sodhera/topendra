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
import { EmailAuthCard } from '../components/EmailAuthCard';
import { MapPlaceMarker } from '../components/MapPlaceMarker';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { isLoggedIn } from '../lib/auth';
import { DEFAULT_REGION, LOCATION_DISCLOSURE_COPY } from '../lib/constants';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

export function AddPlaceScreen({ navigation }) {
  const {
    state,
    isEmailAuthLoading,
    authNoticeMessage,
    errorMessage: appError,
    requestEmailAccess,
    addPlace,
  } = useAppContext();
  const {
    region: userRegion,
    permissionStatus,
    errorMessage: locationError,
    hasResolvedInitialRegion,
  } = useLiveLocation({ watch: false });
  const [mapKey, setMapKey] = useState(0);
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
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (!hasCenteredMap && hasResolvedInitialRegion) {
      setMapRegion(userRegion);
      setPin({
        latitude: userRegion.latitude,
        longitude: userRegion.longitude,
      });
      setHasCenteredMap(true);
      setMapKey((value) => value + 1);
    }
  }, [hasCenteredMap, hasResolvedInitialRegion, userRegion]);

  async function handleEmailAccess() {
    try {
      await requestEmailAccess({ email, username });
      Alert.alert('Check your email', 'We sent you a sign-in link. Open it on this device, then come back to finish adding the place.');
    } catch (error) {
      Alert.alert('Sign-in failed', error.message);
    }
  }

  async function handleSubmit() {
    if (!isLoggedIn(state.session)) {
      Alert.alert('Login required', 'Use email access before saving a new place.');
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
      : 'Move the map if needed, then tap Add here to enter the place details.';

  return (
    <View style={styles.container}>
      <MapView
        key={`add-place-map-${mapKey}`}
        style={StyleSheet.absoluteFill}
        initialRegion={mapRegion}
        onRegionChangeStart={() => setIsMapMoving(true)}
        onRegionChange={(nextRegion) => {
          setPin({
            latitude: nextRegion.latitude,
            longitude: nextRegion.longitude,
          });
        }}
        onRegionChangeComplete={(nextRegion) => {
          setMapRegion(nextRegion);
          setPin({
            latitude: nextRegion.latitude,
            longitude: nextRegion.longitude,
          });
          setIsMapMoving(false);
        }}
        showsUserLocation
      >
        <MapPlaceMarker
          coordinate={pin}
          moving={isMapMoving}
        />
      </MapView>
      <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <ShadButton
            label="Back"
            size="compact"
            shape="pill"
            variant="secondary"
            onPress={() => navigation.goBack()}
          />
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.eyebrow}>Add a place</Text>
          <Text style={styles.title}>Move the map, then pin here</Text>
          <Text style={styles.copy}>{locationStatusCopy}</Text>

          <View style={styles.coordsCard}>
            <Text style={styles.coordsLabel}>Pinned at</Text>
            <Text style={styles.coordsValue}>
              {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
            </Text>
          </View>

          {appError ? <Text style={styles.subtle}>{appError}</Text> : null}
          {locationError ? <Text style={styles.subtle}>{locationError}</Text> : null}
          <Text style={styles.subtle}>{LOCATION_DISCLOSURE_COPY}</Text>

          <ShadButton
            label="Add here"
            shape="pill"
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
                    Use email access to unlock place submission, comments, and voting. Choose an anonymous public username.
                  </Text>
                  <EmailAuthCard
                    email={email}
                    username={username}
                    onEmailChange={setEmail}
                    onUsernameChange={setUsername}
                    onSubmit={handleEmailAccess}
                    authBusy={isEmailAuthLoading}
                    helperText={authNoticeMessage}
                  />
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
                  shape="pill"
                  onPress={() => setIsDetailsModalVisible(false)}
                  style={styles.modalButton}
                />
                <ShadButton
                  label={isSaving ? 'Adding...' : 'Add'}
                  shape="pill"
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
    borderRadius: radius.xl,
    borderWidth: 0.75,
    padding: spacing.lg,
    ...shadows.floating,
  },
  eyebrow: {
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.9,
    marginTop: spacing.xs,
  },
  copy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  authCallout: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 0.75,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  authTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.18,
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
    backgroundColor: colors.elevatedCard,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 0.75,
    color: colors.text,
    fontFamily: typography.body,
    marginTop: spacing.md,
    minHeight: 50,
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
    borderWidth: 0.75,
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
    backgroundColor: colors.sheetBackdrop,
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 0.75,
    borderBottomWidth: 0,
    borderColor: colors.border,
    maxHeight: '82%',
    minHeight: 420,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    ...shadows.floating,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: colors.handle,
    borderRadius: radius.pill,
    height: 5,
    marginBottom: spacing.md,
    width: 38,
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
