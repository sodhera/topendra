import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { getUserLabel, isLoggedIn } from '../lib/auth';
import { USER_IDS } from '../lib/constants';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

export function HomeScreen({ navigation }) {
  const { state, dispatch } = useAppContext();
  const { region, errorMessage } = useLiveLocation();
  const currentUser = useMemo(
    () => state.users.find((user) => user.id === state.currentUserId),
    [state.currentUserId, state.users]
  );

  return (
    <View style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} region={region} showsUserLocation followsUserLocation>
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
          <ShadButton
            label={isLoggedIn(state.currentUserId) ? 'Use guest' : 'Demo login'}
            size="compact"
            variant="secondary"
            onPress={() =>
              dispatch({
                type: 'switch_user',
                payload: isLoggedIn(state.currentUserId) ? USER_IDS.GUEST : USER_IDS.DEMO,
              })
            }
          />
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Topey</Text>
          <Text style={styles.title}>Find nearby places on a live map.</Text>
          <Text style={styles.copy}>
            The background map follows your location. Logged-in users can vote and comment on any place.
          </Text>
          <Text style={styles.meta}>
            {getUserLabel(currentUser?.id)} · {state.places.length} places loaded
          </Text>
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        </View>

        <View style={styles.bottomArea}>
          <ShadButton label="Find a place" onPress={() => navigation.navigate('Browse')} style={styles.findButton} />
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
  heroCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: '18%',
    padding: spacing.lg,
    ...shadows.floating,
  },
  eyebrow: {
    color: colors.mutedText,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 30,
    lineHeight: 34,
  },
  copy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  meta: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: spacing.md,
  },
  error: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  bottomArea: {
    justifyContent: 'flex-end',
    paddingBottom: spacing.md,
  },
  findButton: {
    minHeight: 58,
  },
});
