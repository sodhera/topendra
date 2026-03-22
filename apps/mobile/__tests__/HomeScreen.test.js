import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import { buildSeedState } from '@topey/shared/data/seed';
import { useAppContext } from '../src/context/AppContext';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

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
      animateToRegion: jest.fn(),
    }));

    return (
      <View testID="home-map">
        <Text testID="home-map-region">{JSON.stringify(initialRegion)}</Text>
        <Text testID="home-map-config">
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

jest.mock('../src/components/EmailAuthCard', () => ({
  EmailAuthCard: ({ email, username }) => {
    const React = require('react');
    const { Text, View } = require('react-native');

    return (
      <View>
        <Text>Email access</Text>
        <Text>{email}</Text>
        <Text>{username}</Text>
      </View>
    );
  },
}));

describe('HomeScreen', () => {
  const navigation = {
    navigate: jest.fn(),
  };
  const trackPlaceOpen = jest.fn();
  const requestEmailAccess = jest.fn();

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
      isEmailAuthLoading: false,
      authNoticeMessage: '',
      errorMessage: '',
      requestEmailAccess,
      signOut: jest.fn(),
      addComment: jest.fn(),
      votePlace: jest.fn(),
      trackPlaceOpen,
    });
  });

  test('shows the simplified home layout and opens add-place from the bottom plus button', () => {
    const screen = render(<HomeScreen navigation={navigation} />);

    expect(screen.getByTestId('home-account-button')).toBeTruthy();
    expect(screen.getByTestId('home-plus-button')).toBeTruthy();
    expect(screen.getByTestId('home-map-config').props.children).toContain('"showsPointsOfInterest":false');
    expect(screen.getByTestId('home-map-config').props.children).toContain('"showsBuildings":false');

    fireEvent.press(screen.getByTestId('home-plus-button'));

    expect(navigation.navigate).toHaveBeenCalledWith('AddPlace');
  });

  test('opens the place modal when a map marker is tapped from home', () => {
    const screen = render(<HomeScreen navigation={navigation} />);
    const firstPlace = buildSeedState().places[0];
    const firstPlaceComments = buildSeedState().comments.filter((comment) => comment.placeId === firstPlace.id);

    fireEvent.press(screen.getAllByTestId('map-marker')[0]);

    expect(screen.getByText(firstPlace.name)).toBeTruthy();
    expect(screen.getByTestId('home-open-location-button')).toBeTruthy();
    expect(screen.getByTestId('home-vote-up-button')).toBeTruthy();
    expect(screen.getByTestId('home-vote-down-button')).toBeTruthy();
    expect(screen.getByTestId('home-added-by-label')).toBeTruthy();
    expect(screen.getByText(firstPlace.authorName)).toBeTruthy();
    expect(screen.getByTestId('home-comment-compose-button')).toBeTruthy();
    expect(screen.getByText(firstPlaceComments[0].body)).toBeTruthy();
    expect(trackPlaceOpen).toHaveBeenCalledWith({
      placeId: firstPlace.id,
      sourceScreen: 'home_pin_modal',
    });

    fireEvent.press(screen.getByTestId('home-discussion-open-button'));

    expect(screen.getByText('Discussion')).toBeTruthy();
    expect(screen.getAllByText('Reply').length).toBeGreaterThan(0);
  });

  test('opens the email access path when a guest tries to vote from home', () => {
    useAppContext.mockReturnValue({
      state: {
        ...buildSeedState(),
        session: null,
      },
      isEmailAuthLoading: false,
      authNoticeMessage: '',
      errorMessage: '',
      requestEmailAccess,
      signOut: jest.fn(),
      addComment: jest.fn(),
      votePlace: jest.fn(),
      trackPlaceOpen,
    });

    const screen = render(<HomeScreen navigation={navigation} />);

    fireEvent.press(screen.getAllByTestId('map-marker')[0]);
    fireEvent.press(screen.getByTestId('home-vote-up-button'));

    expect(screen.getByText('Email access')).toBeTruthy();
  });
});
