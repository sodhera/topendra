import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import { buildSeedState } from '../src/data/seed';
import { useAppContext } from '../src/context/AppContext';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  const MockMapView = React.forwardRef(function MockMapView({ children, initialRegion }, ref) {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
    }));

    return (
      <View testID="home-map">
        <Text testID="home-map-region">{JSON.stringify(initialRegion)}</Text>
        {children}
      </View>
    );
  });

  function Marker({ children, onPress }) {
    return (
      <Pressable testID="map-marker" onPress={onPress}>
        {children}
      </Pressable>
    );
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
  const navigation = {
    navigate: jest.fn(),
  };

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
    });
  });

  test('shows the requested home button layout and opens browse from the bottom CTA', () => {
    const screen = render(<HomeScreen navigation={navigation} />);

    expect(screen.getByTestId('home-add-button')).toBeTruthy();
    expect(screen.getByTestId('home-account-button')).toBeTruthy();
    expect(screen.getByTestId('home-find-button')).toBeTruthy();

    fireEvent.press(screen.getByTestId('home-find-button'));

    expect(navigation.navigate).toHaveBeenCalledWith('Browse');
  });

  test('opens browse when a map marker is tapped from home', () => {
    const screen = render(<HomeScreen navigation={navigation} />);
    const firstPlace = buildSeedState().places[0];

    fireEvent.press(screen.getAllByTestId('map-marker')[0]);

    expect(navigation.navigate).toHaveBeenCalledWith('Browse', { placeId: firstPlace.id });
  });
});
