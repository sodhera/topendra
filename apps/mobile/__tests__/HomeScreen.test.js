import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import { buildSeedState } from '@topey/shared/data/seed';
import { getMapPlacesForRegion } from '@topey/shared/lib/geo';
import { useAppContext } from '../src/context/AppContext';
import { useLiveLocation } from '../src/hooks/useLiveLocation';

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

  function Marker({ children, onPress, testID }) {
    return (
      <Pressable testID={testID ?? 'map-marker'} onPress={onPress}>
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

describe('HomeScreen', () => {
  const navigation = {
    navigate: jest.fn(),
  };
  const trackPlaceOpen = jest.fn();
  const signUpWithPassword = jest.fn();
  const signInWithPassword = jest.fn();
  const signInWithGoogle = jest.fn();
  const setIsAuthModalVisible = jest.fn();

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
      signUpWithPassword,
      signInWithPassword,
      signInWithGoogle,
      signOut: jest.fn(),
      addComment: jest.fn(),
      votePlace: jest.fn(),
      trackPlaceOpen,
      isAuthModalVisible: false,
      setIsAuthModalVisible,
    });

    useLiveLocation.mockReturnValue({
      region: {
        latitude: 27.7172,
        longitude: 85.324,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      },
      permissionStatus: 'granted',
      errorMessage: '',
      hasResolvedInitialRegion: true,
    });
  });

  test('shows the simplified home layout and opens add-place from the bottom plus button', () => {
    const screen = render(<HomeScreen navigation={navigation} />);

    expect(screen.getByTestId('home-account-button')).toBeTruthy();
    expect(screen.getByTestId('home-plus-button')).toBeTruthy();
    expect(screen.getByTestId('home-map-config').props.children).toContain('"showsPointsOfInterest":false');
    expect(screen.getByTestId('home-map-config').props.children).toContain('"showsBuildings":false');
    expect(screen.getByTestId('home-map-region').props.children).toContain('27.7172');

    fireEvent.press(screen.getByTestId('home-plus-button'));

    expect(navigation.navigate).toHaveBeenCalledWith('AddPlace', {
      startingRegion: {
        latitude: 27.7172,
        longitude: 85.324,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      },
    });
  });

  test('opens the place modal when a map marker is tapped from home', () => {
    const screen = render(<HomeScreen navigation={navigation} />);
    const state = buildSeedState();
    const visiblePlace = getMapPlacesForRegion(
      state.places,
      {
        latitude: 27.7172,
        longitude: 85.324,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      },
      state.votes
    )[0];
    const visiblePlaceComments = state.comments.filter((comment) => comment.placeId === visiblePlace.id);

    fireEvent.press(screen.getByTestId(`home-marker-${visiblePlace.id}`));

    expect(screen.getByText(visiblePlace.name)).toBeTruthy();
    expect(screen.getByTestId('home-open-location-button')).toBeTruthy();
    expect(screen.getByTestId('home-vote-up-button')).toBeTruthy();
    expect(screen.getByTestId('home-vote-down-button')).toBeTruthy();
    expect(screen.getByTestId('home-added-by-label')).toBeTruthy();
    expect(screen.getByText(visiblePlace.authorName)).toBeTruthy();
    expect(screen.getByTestId('home-comment-compose-button')).toBeTruthy();
    expect(screen.getByText(visiblePlaceComments[0].body)).toBeTruthy();
    expect(trackPlaceOpen).toHaveBeenCalledWith({
      placeId: visiblePlace.id,
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
      signUpWithPassword,
      signInWithPassword,
      signInWithGoogle,
      signOut: jest.fn(),
      addComment: jest.fn(),
      votePlace: jest.fn(),
      trackPlaceOpen,
      isAuthModalVisible: false,
      setIsAuthModalVisible,
    });

    const screen = render(<HomeScreen navigation={navigation} />);
    const state = buildSeedState();
    const visiblePlace = getMapPlacesForRegion(
      state.places,
      {
        latitude: 27.7172,
        longitude: 85.324,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      },
      state.votes
    )[0];

    fireEvent.press(screen.getByTestId(`home-marker-${visiblePlace.id}`));
    fireEvent.press(screen.getByTestId('home-vote-up-button'));

    expect(setIsAuthModalVisible).toHaveBeenCalledWith(true);
  });
});
