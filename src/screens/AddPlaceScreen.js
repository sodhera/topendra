import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShadButton } from '../components/ShadButton';
import { useAppContext } from '../context/AppContext';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';
import { useLiveLocation } from '../hooks/useLiveLocation';

export function AddPlaceScreen({ navigation }) {
  const { state, dispatch } = useAppContext();
  const { region, setRegion, errorMessage } = useLiveLocation();
  const initialPin = useMemo(
    () => ({
      latitude: region.latitude,
      longitude: region.longitude,
    }),
    [region.latitude, region.longitude]
  );
  const [pin, setPin] = useState(initialPin);
  const [hasPinnedManually, setHasPinnedManually] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!hasPinnedManually) {
      setPin({
        latitude: region.latitude,
        longitude: region.longitude,
      });
    }
  }, [hasPinnedManually, region.latitude, region.longitude]);

  function handleSubmit() {
    if (!name.trim() || !description.trim()) {
      Alert.alert('Missing details', 'Add a name and description before saving the place.');
      return;
    }

    dispatch({
      type: 'add_place',
      payload: {
        name,
        description,
        latitude: pin.latitude,
        longitude: pin.longitude,
        authorId: state.currentUserId,
      },
    });

    navigation.navigate('Browse');
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={region}
        onRegionChangeComplete={setRegion}
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
          <Text style={styles.copy}>Tap the map or drag the pin, then add a short name and description.</Text>
          {errorMessage ? <Text style={styles.subtle}>{errorMessage}</Text> : null}

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

          <ShadButton label="Save place" onPress={handleSubmit} />
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
  subtle: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
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
