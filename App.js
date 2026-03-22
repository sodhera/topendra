import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppProvider, useAppContext } from './src/context/AppContext';
import { AddPlaceScreen } from './src/screens/AddPlaceScreen';
import { BrowseScreen } from './src/screens/BrowseScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { colors, typography } from './src/lib/theme';

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Text style={styles.loadingTitle}>Topey</Text>
      <Text style={styles.loadingCopy}>Loading the Kathmandu map and preparing the latest place data.</Text>
      <ActivityIndicator color={colors.primary} style={styles.spinner} />
      <StatusBar style="dark" />
    </View>
  );
}

function AppNavigator() {
  const { isHydrated } = useAppContext();

  if (!isHydrated) {
    return <LoadingScreen />;
  }

  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Browse" component={BrowseScreen} />
        <Stack.Screen name="AddPlace" component={AddPlaceScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  loadingTitle: {
    color: colors.text,
    fontFamily: typography.semibold,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.9,
  },
  loadingCopy: {
    color: colors.mutedText,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 320,
  },
  spinner: {
    marginTop: 18,
  },
});
