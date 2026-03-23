import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors, radius } from '@topey/shared/lib/theme';

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
        <View style={styles.core} />
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  outerBubble: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.primaryText,
    borderRadius: radius.pill,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  core: {
    backgroundColor: colors.primaryText,
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
});
