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
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  outerDotSelected: {
    backgroundColor: colors.primary,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    height: 26,
    width: 26,
  },
  innerDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  innerDotSelected: {
    backgroundColor: colors.primaryText,
    height: 8,
    width: 8,
  },
});
