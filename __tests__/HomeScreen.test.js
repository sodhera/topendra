import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import { buildSeedState } from '../src/data/seed';
import { DEFAULT_REGION } from '../src/lib/constants';
import { useAppContext } from '../src/context/AppContext';
import { useLiveLocation } from '../src/hooks/useLiveLocation';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  function MockMapView({ children, region, onRegionChangeStart, onRegionChangeComplete }) {
    return (
      <View testID="home-map">
        <Text testID="home-map-region">{JSON.stringify(region)}</Text>
        <Text testID="home-map-handlers">{onRegionChangeStart && onRegionChangeComplete ? 'ready' : 'missing'}</Text>
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
    SafeAreaView: ({ children }) => <View>{children}</View>,
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
  beforeEach(() => {
    useAppContext.mockReturnValue({
      state: buildSeedState(),
      authBusyProvider: '',
      isPasswordAuthLoading: false,
      errorMessage: '',
      signInWithOAuth: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    });

    useLiveLocation.mockReturnValue({
      region: {
        latitude: 51.5,
        longitude: -0.1,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      errorMessage: '',
    });
  });

  test('keeps the home map anchored to the Kathmandu demo region and exposes drag handlers', () => {
    const screen = render(<HomeScreen navigation={{ navigate: jest.fn() }} />);

    expect(screen.getByTestId('home-map-handlers').props.children).toBe('ready');
    expect(JSON.parse(screen.getByTestId('home-map-region').props.children)).toEqual(DEFAULT_REGION);
  });
});
