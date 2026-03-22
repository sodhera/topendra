import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthButtons } from '../components/AuthButtons';
import { EmailAuthCard } from '../components/EmailAuthCard';
import { MapPlaceMarker } from '../components/MapPlaceMarker';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { getUserIdentity, isLoggedIn } from '../lib/auth';
import { KATHMANDU_EXPLORE_REGION } from '../lib/constants';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';

export function HomeScreen({ navigation }) {
  const {
    state,
    authBusyProvider,
    isPasswordAuthLoading,
    errorMessage,
    signInWithOAuth,
    signInWithPassword,
    signOut,
  } = useAppContext();
  const currentUser = getUserIdentity(state.session?.user);
  const isAuthenticated = isLoggedIn(state.session);
  const [isAccountModalVisible, setIsAccountModalVisible] = useState(false);
  const [email, setEmail] = useState('testuser@topey.app');
  const [password, setPassword] = useState('TopeyTest123!');

  async function handleProviderPress(provider) {
    try {
      await signInWithOAuth(provider);
      setIsAccountModalVisible(false);
    } catch (error) {
      return;
    }
  }

  async function handleEmailSignIn() {
    try {
      await signInWithPassword({ email, password });
      setIsAccountModalVisible(false);
    } catch (error) {
      Alert.alert('Sign-in failed', error.message);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setIsAccountModalVisible(false);
    } catch (error) {
      Alert.alert('Sign-out failed', error.message);
    }
  }

  function handleMarkerPress(placeId) {
    navigation.navigate('Browse', { placeId });
  }

  return (
    <View style={styles.container}>
      <MapView initialRegion={KATHMANDU_EXPLORE_REGION} style={StyleSheet.absoluteFill} testID="home-map">
        {state.places.map((place) => (
          <MapPlaceMarker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            onPress={() => handleMarkerPress(place.id)}
          />
        ))}
      </MapView>

      <SafeAreaView pointerEvents="box-none" style={styles.overlayRoot}>
        <View pointerEvents="box-none" style={styles.topRow}>
          <ShadButton
            label="Add a place"
            size="compact"
            shape="pill"
            variant="secondary"
            onPress={() => navigation.navigate('AddPlace')}
            testID="home-add-button"
          />
          <ShadButton
            label={isAuthenticated ? 'Profile' : 'Sign in'}
            size="compact"
            shape="pill"
            variant="secondary"
            onPress={() => setIsAccountModalVisible(true)}
            testID="home-account-button"
          />
        </View>

        <View pointerEvents="box-none" style={styles.bottomDock}>
          <ShadButton
            label="Find a place"
            size="large"
            shape="pill"
            onPress={() => navigation.navigate('Browse')}
            style={styles.findButton}
            testID="home-find-button"
          />
        </View>
      </SafeAreaView>

      <Modal
        animationType="slide"
        transparent
        visible={isAccountModalVisible}
        onRequestClose={() => setIsAccountModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', default: undefined })}
          style={styles.modalRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setIsAccountModalVisible(false)} />
          <View style={styles.sheet}>
            {isAuthenticated ? (
              <>
                <Text style={styles.sheetTitle}>Profile</Text>
                <Text style={styles.profileName}>{currentUser.name}</Text>
                {currentUser.email ? <Text style={styles.profileMeta}>{currentUser.email}</Text> : null}
                <ShadButton
                  label="Sign out"
                  shape="pill"
                  onPress={handleSignOut}
                  style={styles.sheetButton}
                />
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Sign in</Text>
                <Text style={styles.sheetCopy}>
                  Sign in to post places, join threads, and vote on the Kathmandu map.
                </Text>
                <AuthButtons busyProvider={authBusyProvider} onProviderPress={handleProviderPress} />
                <EmailAuthCard
                  email={email}
                  password={password}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onSignIn={handleEmailSignIn}
                  authBusy={isPasswordAuthLoading}
                  helperText="Test account: testuser@topey.app / TopeyTest123!"
                />
                {errorMessage ? <Text style={styles.sheetMeta}>{errorMessage}</Text> : null}
              </>
            )}
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
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomDock: {
    paddingBottom: spacing.sm,
  },
  findButton: {
    width: '100%',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 9, 11, 0.18)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: spacing.md,
    ...shadows.floating,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 22,
  },
  sheetCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  profileName: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 18,
    marginTop: spacing.md,
  },
  profileMeta: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  sheetMeta: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  sheetButton: {
    marginTop: spacing.lg,
  },
});
