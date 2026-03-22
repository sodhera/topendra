import React from 'react';
import { HomeScreen } from './HomeScreen';

export function BrowseScreen({ navigation }) {
  return <HomeScreen navigation={navigation} initialMode="browse" />;
}
