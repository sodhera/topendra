import React, { useEffect, useRef, useState } from 'react';
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
import { CenteredMapPin } from '../components/CenteredMapPin';
import { GoogleAuthCard } from '../components/GoogleAuthCard';
import { MapUserLocationMarker } from '../components/MapUserLocationMarker';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { hasAnonymousHandle, isLoggedIn } from '@topey/shared/lib/auth';
import { DEFAULT_REGION } from '@topey/shared/lib/constants';
import { CLEAN_MOBILE_MAP_PROPS } from '@topey/shared/lib/mobileMap';
import { colors, radius, shadows, spacing, typography } from '@topey/shared/lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

const ADD_PLACE_PIN_VERTICAL_FRACTION = 0.4;

function getPinnedCoordinate(region) {
  return {
    latitude: region.latitude + (0.5 - ADD_PLACE_PIN_VERTICAL_FRACTION) * region.latitudeDelta,
    longitude: region.longitude,
  };
}

export function AddPlaceScreen({ navigation, route }) {
  const {
    state,
    isEmailAuthLoading,
    authNoticeMessage,
    errorMessage,
    requestGoogleAccess,
    claimHandle,
    addPlace,
  } = useAppContext();
  const {
    region: userRegion,
    hasResolvedInitialRegion,
    permissionStatus,
  } = useLiveLocation({ watch: false });
  const mapRef = useRef(null);
  const [initialViewportRegion] = useState(
    () => route?.params?.startingRegion ?? (hasResolvedInitialRegion ? userRegion : DEFAULT_REGION)
  );
  const [mapRegion, setMapRegion] = useState(initialViewportRegion);
  const [hasAutoScrolledToUserRegion, setHasAutoScrolledToUserRegion] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [pin, setPin] = useState(getPinnedCoordinate(initialViewportRegion));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!hasResolvedInitialRegion || hasAutoScrolledToUserRegion) {
      return;
    }

    mapRef.current?.animateToRegion?.(userRegion, 280);
    setMapRegion(userRegion);
    setPin(getPinnedCoordinate(userRegion));
    setHasAutoScrolledToUserRegion(true);
  }, [hasAutoScrolledToUserRegion, hasResolvedInitialRegion, userRegion]);

  async function handleRequestAccess() {
    try {
      await requestGoogleAccess();
    } catch (error) {
      Alert.alert('Google sign-in failed', error.message);
    }
  }

  async function handleClaimHandle({ username }) {
    try {
      await claimHandle({ handle: username });
      setIsAuthModalVisible(false);
    } catch (error) {
      Alert.alert('Anonymous name failed', error.message);
    }
  }

  async function handleSubmit() {
    if (!isLoggedIn(state.session)) {
      setIsDetailsModalVisible(false);
      setIsAuthModalVisible(true);
      return;
    }

    if (!hasAnonymousHandle(state.session?.user)) {
      setIsDetailsModalVisible(false);
      setIsAuthModalVisible(true);
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
      Alert.alert(
        'Success',
        'Place added successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Browse')
          }
        ]
      );
    } catch (error) {
      Alert.alert('Save failed', error.message);
    } finally {
      setIsSaving(false);
    }
  }

  const isAuthenticated = isLoggedIn(state.session);

  return (
    <View style={styles.container}>
      <MapView
        {...CLEAN_MOBILE_MAP_PROPS}
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialViewportRegion}
        onRegionChangeStart={() => setIsMapMoving(true)}
        onRegionChange={(nextRegion) => {
          setPin(getPinnedCoordinate(nextRegion));
        }}
        onRegionChangeComplete={(nextRegion) => {
          setMapRegion(nextRegion);
          setPin(getPinnedCoordinate(nextRegion));
          setIsMapMoving(false);
        }}
      >
        {permissionStatus === 'granted' ? (
          <MapUserLocationMarker
            coordinate={{ latitude: userRegion.latitude, longitude: userRegion.longitude }}
            testID="add-place-user-location-marker"
          />
        ) : null}
      </MapView>
      <CenteredMapPin
        moving={isMapMoving}
        testID="add-place-center-pin"
        verticalPercent={`${ADD_PLACE_PIN_VERTICAL_FRACTION * 100}%`}
      />
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

        <View style={styles.actionDock}>
          <ShadButton
            label="Add here"
            shape="pill"
            onPress={() => setIsDetailsModalVisible(true)}
            disabled={!hasResolvedInitialRegion}
            style={styles.actionButton}
          />
        </View>
      </SafeAreaView>

      <Modal
        animationType="fade"
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
                    Sign in to add a place.
                  </Text>
                  <ShadButton
                    label="Sign in"
                    onPress={() => {
                      setIsDetailsModalVisible(false);
                      setIsAuthModalVisible(true);
                    }}
                    style={{ marginTop: spacing.md }}
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

      <Modal
        animationType="fade"
        transparent
        visible={isAuthModalVisible}
        onRequestClose={() => setIsAuthModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', default: undefined })}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setIsAuthModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <GoogleAuthCard
              authBusy={isEmailAuthLoading}
              helperText={authNoticeMessage}
              mode={isLoggedIn(state.session) && !hasAnonymousHandle(state.session?.user) ? 'handle' : 'auth'}
              onClaimHandle={handleClaimHandle}
              onRequestAccess={handleRequestAccess}
            />
            {errorMessage ? <Text style={styles.sheetMeta}>{errorMessage}</Text> : null}
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
  actionDock: {
    paddingBottom: spacing.sm,
  },
  actionButton: {
    ...shadows.floating,
  },
  title: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: spacing.xs,
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
  sheetMeta: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
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
