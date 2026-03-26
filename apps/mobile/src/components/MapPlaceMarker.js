import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors } from '@topey/shared/lib/theme';

export const MapPlaceMarker = React.memo(function MapPlaceMarker({
  coordinate,
  selected = false,
  onPress,
  testID,
}) {
  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      testID={testID}
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
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 3,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  outerDotSelected: {
    backgroundColor: colors.accent,
    height: 30,
    width: 30,
  },
  innerDot: {
    backgroundColor: colors.primary,
    borderRadius: 2,
    height: 8,
    width: 8,
  },
  innerDotSelected: {
    backgroundColor: colors.text,
    height: 10,
    width: 10,
  },
});
