import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { Silkscreen_400Regular, Silkscreen_700Bold } from '@expo-google-fonts/silkscreen';
import {
  SplineSans_400Regular,
  SplineSans_500Medium,
  SplineSans_600SemiBold,
  SplineSans_700Bold,
} from '@expo-google-fonts/spline-sans';
import { AppProvider, useAppContext } from './src/context/AppContext';
import { AddPlaceScreen } from './src/screens/AddPlaceScreen';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { EditPlaceScreen } from './src/screens/EditPlaceScreen';
import { ModerationScreen } from './src/screens/ModerationScreen';
import { PlaceDetailScreen } from './src/screens/PlaceDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { colors, typography } from './src/lib/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LoadingScreen() {
  return (
    <LinearGradient colors={[colors.deepPine, colors.nightRoot]} style={styles.loading}>
      <MaterialCommunityIcons name="map-search" size={44} color={colors.antiqueGold} />
      <Text style={styles.loadingTitle}>Loading Topey</Text>
      <Text style={styles.loadingCopy}>Booting the cartridge, pulling your saved Kathmandu state, and loading fonts.</Text>
      <ActivityIndicator color={colors.leafHighlight} style={styles.spinner} />
      <StatusBar style="light" />
    </LinearGradient>
  );
}

function MainTabs() {
  const { state } = useAppContext();
  const currentUser = state.users.find((user) => user.id === state.currentUserId);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.savePage,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, size }) => {
          const iconMap = {
            Discover: 'map-outline',
            Add: 'map-marker-plus-outline',
            Queue: 'shield-check-outline',
            Profile: 'account-circle-outline',
          };

          return <MaterialCommunityIcons name={iconMap[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen
        name="Add"
        component={AddPlaceScreen}
        options={{
          tabBarBadge: currentUser.role === 'anon' ? undefined : ' ',
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tab.Screen
        name="Queue"
        component={ModerationScreen}
        options={{
          tabBarBadge: currentUser.role === 'moderator' ? ' ' : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isHydrated } = useAppContext();

  if (!isHydrated) {
    return <LoadingScreen />;
  }

  const navigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.nightRoot,
      card: colors.forestPanel,
      text: colors.savePage,
      border: colors.antiqueGold,
      primary: colors.leafHighlight,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.deepPine,
          },
          headerTintColor: colors.savePage,
          headerTitleStyle: {
            fontFamily: typography.displayRegular,
          },
          contentStyle: {
            backgroundColor: colors.nightRoot,
          },
        }}
      >
        <Stack.Screen name="Home" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="PlaceDetail" component={PlaceDetailScreen} options={{ title: 'Place detail' }} />
        <Stack.Screen name="EditPlace" component={EditPlaceScreen} options={{ title: 'Live edit' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    Silkscreen_400Regular,
    Silkscreen_700Bold,
    SplineSans_400Regular,
    SplineSans_500Medium,
    SplineSans_600SemiBold,
    SplineSans_700Bold,
  });

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingTitle: {
    color: colors.savePage,
    fontFamily: typography.display,
    fontSize: 28,
    marginTop: 18,
  },
  loadingCopy: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 320,
  },
  spinner: {
    marginTop: 18,
  },
  tabBar: {
    backgroundColor: colors.deepPine,
    borderTopColor: 'rgba(216, 194, 142, 0.12)',
    height: 72,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: 11,
  },
  badge: {
    backgroundColor: colors.leafHighlight,
    color: colors.nightRoot,
    minWidth: 8,
    height: 8,
    borderRadius: 999,
    top: 4,
  },
});
