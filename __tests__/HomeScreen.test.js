import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import { buildSeedState } from '../src/data/seed';
import { useAppContext } from '../src/context/AppContext';
import { useLiveLocation } from '../src/hooks/useLiveLocation';

jest.useFakeTimers();

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  function MockMapView({ children, region, onRegionChangeStart, onRegionChangeComplete }) {
    return (
      <View testID="home-map">
        <Text testID="home-map-region">{JSON.stringify(region)}</Text>
        <Pressable testID="map-drag-start" onPress={() => onRegionChangeStart?.()}>
          <Text>drag-start</Text>
        </Pressable>
        <Pressable
          testID="map-drag-end"
          onPress={() =>
            onRegionChangeComplete?.({
              latitude: 27.7172,
              longitude: 85.324,
              latitudeDelta: 0.06,
              longitudeDelta: 0.06,
            })
          }
        >
          <Text>drag-end</Text>
        </Pressable>
        {children}
      </View>
    );
  }

  function Marker({ children }) {
    return <View>{children}</View>;
  }

  return {
    __esModule: true,
    default: MockMapView,
    Marker,
  };
});

jest.mock('../src/context/AppContext', () => ({
  useAppContext: jest.fn(),
}));

jest.mock('../src/hooks/useLiveLocation', () => ({
  useLiveLocation: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    SafeAreaView: ({ children, ...props }) => <View {...props}>{children}</View>,
  };
});

jest.mock('../src/components/AuthButtons', () => ({
  AuthButtons: () => {
    const React = require('react');
    const { Text, View } = require('react-native');

    return (
      <View>
        <Text>Auth buttons</Text>
      </View>
    );
  },
}));

jest.mock('../src/components/EmailAuthCard', () => ({
  EmailAuthCard: () => {
    const React = require('react');
    const { Text, View } = require('react-native');

    return (
      <View>
        <Text>Email auth</Text>
      </View>
    );
  },
}));

describe('HomeScreen', () => {
  const trackPlaceOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useAppContext.mockReturnValue({
      state: {
        ...buildSeedState(),
        session: {
          user: {
            id: 'user-1',
            email: 'testuser@topey.app',
          },
        },
      },
      authBusyProvider: '',
      isPasswordAuthLoading: false,
      errorMessage: '',
      signInWithOAuth: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      votePlace: jest.fn(),
      addComment: jest.fn(),
      trackPlaceOpen,
    });

    useLiveLocation.mockReturnValue({
      region: {
        latitude: 27.7172,
        longitude: 85.324,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      },
      errorMessage: '',
    });
  });

  test('enters browse mode when the home map moves and expands preview after idle time', () => {
    const screen = render(<HomeScreen navigation={{ navigate: jest.fn(), canGoBack: jest.fn(() => false) }} />);

    expect(screen.getByTestId('home-mode-chrome')).toBeTruthy();
    expect(screen.queryByText('Open details')).toBeNull();

    fireEvent.press(screen.getByTestId('map-drag-start'));
    fireEvent.press(screen.getByTestId('map-drag-end'));

    expect(screen.getByText('Back')).toBeTruthy();
    expect(screen.queryByText('Open details')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText('Open details')).toBeTruthy();
  });
});
