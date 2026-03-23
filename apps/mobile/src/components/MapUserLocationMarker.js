import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors, radius } from '@topey/shared/lib/theme';

const RAINBOW_ACCENTS = [
  { color: '#FF5A5F', left: 7, top: 0 },
  { color: '#FF9F1C', left: 12, top: 2 },
  { color: '#FFD60A', left: 14, top: 7 },
  { color: '#2DC653', left: 12, top: 12 },
  { color: '#00B4D8', left: 7, top: 14 },
  { color: '#4361EE', left: 2, top: 12 },
  { color: '#7B2CBF', left: 0, top: 7 },
  { color: '#FF66C4', left: 2, top: 2 },
];

export const MapUserLocationMarker = React.memo(function MapUserLocationMarker({
  coordinate,
  testID = 'user-location-marker',
}) {
  return (
    <Marker
      anchor={{ x: 0.5, y: 0.5 }}
      coordinate={coordinate}
      testID={testID}
      tracksViewChanges={false}
    >
      <View style={styles.outerBubble}>
        <View style={styles.halo}>
          {RAINBOW_ACCENTS.map((accent) => (
            <View
              key={`${accent.color}-${accent.left}-${accent.top}`}
              style={[
                styles.accent,
                {
                  backgroundColor: accent.color,
                  left: accent.left,
                  top: accent.top,
                },
              ]}
            />
          ))}
          <View style={styles.centerPlate}>
            <View style={styles.core} />
          </View>
        </View>
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  outerBubble: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: 'rgba(17, 17, 17, 0.1)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    width: 28,
  },
  halo: {
    height: 20,
    position: 'relative',
    width: 20,
  },
  accent: {
    borderRadius: radius.pill,
    height: 6,
    position: 'absolute',
    width: 6,
  },
  centerPlate: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    height: 10,
    justifyContent: 'center',
    left: 5,
    position: 'absolute',
    top: 5,
    width: 10,
  },
  core: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 4,
    width: 4,
  },
});
