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
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 3,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  core: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    height: 10,
    width: 10,
  },
});
