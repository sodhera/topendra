import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AddPlaceScreen } from '../src/screens/AddPlaceScreen';
import { useAppContext } from '../src/context/AppContext';
import { useLiveLocation } from '../src/hooks/useLiveLocation';

const mockAnimateToRegion = jest.fn();

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const MockMapView = React.forwardRef(function MockMapView(
    {
      children,
      initialRegion,
      poiClickEnabled,
      showsBuildings,
      showsCompass,
      showsIndoorLevelPicker,
      showsIndoors,
      showsPointsOfInterest,
      showsScale,
      showsTraffic,
      toolbarEnabled,
    },
    ref
  ) {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: mockAnimateToRegion,
    }));

    return (
      <View testID="map-view">
        <Text testID="map-region">{JSON.stringify(initialRegion)}</Text>
        <Text testID="map-config">
          {JSON.stringify({
            poiClickEnabled,
            showsBuildings,
            showsCompass,
            showsIndoorLevelPicker,
            showsIndoors,
            showsPointsOfInterest,
            showsScale,
            showsTraffic,
            toolbarEnabled,
          })}
        </Text>
        {children}
      </View>
    );
  });

  function Marker({ coordinate }) {
    return (
      <View testID="map-marker">
        <Text testID="marker-coordinate">{JSON.stringify(coordinate)}</Text>
      </View>
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

jest.mock('../src/components/EmailAuthCard', () => ({
  EmailAuthCard: ({ email, username }) => {
    const React = require('react');
    const { Text, View } = require('react-native');

    return (
      <View>
        <Text>Email</Text>
        <Text>{email}</Text>
        <Text>{username}</Text>
      </View>
    );
  },
}));

describe('AddPlaceScreen', () => {
  const addPlace = jest.fn();
  const requestEmailAccess = jest.fn();
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useAppContext.mockReturnValue({
      state: {
        session: {
          user: {
            id: 'user-1',
          },
        },
      },
      isEmailAuthLoading: false,
      authNoticeMessage: '',
      errorMessage: '',
      requestEmailAccess,
      addPlace,
    });

    useLiveLocation.mockReturnValue({
      region: {
        latitude: 40.7128,
        longitude: -74.006,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      },
      permissionStatus: 'granted',
      errorMessage: '',
      hasResolvedInitialRegion: true,
    });
  });

  test('centers the add flow on the resolved live location and adds from the modal', async () => {
    addPlace.mockResolvedValue(undefined);
    const startingRegion = {
      latitude: 27.7172,
      longitude: 85.324,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12,
    };

    const screen = render(<AddPlaceScreen navigation={navigation} route={{ params: { startingRegion } }} />);

    expect(screen.getByTestId('map-region').props.children).toContain('27.7172');
    expect(screen.getByTestId('map-config').props.children).toContain('"showsPointsOfInterest":false');
    expect(screen.getByTestId('map-config').props.children).toContain('"showsBuildings":false');
    expect(screen.getByTestId('add-place-center-pin')).toBeTruthy();
    expect(mockAnimateToRegion).toHaveBeenCalledWith({
      latitude: 40.7128,
      longitude: -74.006,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    }, 280);

    fireEvent.press(screen.getByText('Add here'));

    fireEvent.changeText(screen.getByPlaceholderText('Place name'), 'Corner Cafe');
    fireEvent.changeText(screen.getByPlaceholderText('Description'), 'Late-night coffee and Wi-Fi.');
    fireEvent.press(screen.getByText('Add'));

    await waitFor(() => {
      expect(addPlace).toHaveBeenCalledWith({
        name: 'Corner Cafe',
        description: 'Late-night coffee and Wi-Fi.',
        latitude: 40.7188,
        longitude: -74.006,
      });
    });

    expect(navigation.navigate).toHaveBeenCalledWith('Browse');
  });

  test('keeps add-here disabled until the initial location has resolved', () => {
    useLiveLocation.mockReturnValue({
      region: {
        latitude: 27.7172,
        longitude: 85.324,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      },
      permissionStatus: 'loading',
      errorMessage: '',
      hasResolvedInitialRegion: false,
    });

    const screen = render(<AddPlaceScreen navigation={navigation} />);

    expect(screen.queryByText('Move the map and Add the pin')).toBeNull();

    fireEvent.press(screen.getByText('Add here'));

    expect(screen.queryByText('Place details')).toBeNull();
  });

  test('shows the email access path when a guest opens add place details', async () => {
    useAppContext.mockReturnValue({
      state: {
        session: null,
      },
      isEmailAuthLoading: false,
      authNoticeMessage: '',
      errorMessage: '',
      requestEmailAccess,
      addPlace,
    });

    const screen = render(<AddPlaceScreen navigation={navigation} route={{ params: {} }} />);

    expect(screen.getByTestId('map-region').props.children).toContain('40.7128');

    fireEvent.press(screen.getByText('Add here'));

    expect(screen.getByText('Login required before adding.')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
  });
});
