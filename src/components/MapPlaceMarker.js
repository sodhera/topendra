import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors } from '../lib/theme';

export const MapPlaceMarker = React.memo(function MapPlaceMarker({
  coordinate,
  selected = false,
  onPress,
}) {
  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={selected}
    >
      <View style={[styles.outerDot, selected && styles.outerDotSelected]}>
        <View style={[styles.innerDot, selected && styles.innerDotSelected]} />
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  outerDot: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderRadius: 999,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    width: 18,
  },
  outerDotSelected: {
    height: 22,
    width: 22,
  },
  innerDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  innerDotSelected: {
    backgroundColor: colors.primary,
    height: 8,
    width: 8,
  },
});
