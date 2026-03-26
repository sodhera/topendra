import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { BrowseScreen } from '../src/screens/BrowseScreen';
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
      <View testID="browse-map">
        <Text testID="browse-map-region">{JSON.stringify(initialRegion)}</Text>
        <Text testID="browse-map-config">
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

jest.mock('../src/components/GoogleAuthCard', () => ({
  GoogleAuthCard: () => {
    const React = require('react');
    const { Text, View } = require('react-native');

    return (
      <View>
        <Text>Google Auth</Text>
      </View>
    );
  },
}));

describe('BrowseScreen', () => {
  const trackPlaceOpen = jest.fn();
  const requestEmailAccess = jest.fn();
  const claimHandle = jest.fn();
  const voteComment = jest.fn();
  const navigation = {
    goBack: jest.fn(),
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
      isEmailAuthLoading: false,
      authNoticeMessage: '',
      errorMessage: '',
      requestEmailAccess,
      claimHandle,
      addComment: jest.fn(),
      voteComment,
      votePlace: jest.fn(),
      trackPlaceOpen,
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

  test('shows the selected place preview and details flow from a marker tap', () => {
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

    useAppContext.mockReturnValue({
      state: {
        ...state,
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
      claimHandle,
      addComment: jest.fn(),
      voteComment,
      votePlace: jest.fn(),
      trackPlaceOpen,
    });

    const screen = render(<BrowseScreen navigation={navigation} route={{ params: {} }} />);

    fireEvent.press(screen.getByTestId(`browse-marker-${visiblePlace.id}`));

    expect(screen.getByTestId('browse-map-config').props.children).toContain('"showsPointsOfInterest":false');
    expect(screen.getByTestId('browse-map-config').props.children).toContain('"showsBuildings":false');
    expect(screen.getByTestId('browse-map-region').props.children).toContain('27.7172');
    expect(screen.getByTestId('browse-preview-card')).toBeTruthy();
    expect(screen.getByText(visiblePlace.name)).toBeTruthy();
    expect(trackPlaceOpen).toHaveBeenCalledWith({
      placeId: visiblePlace.id,
      sourceScreen: 'browse_preview',
    });

    fireEvent.press(screen.getByText('View more'));

    expect(screen.getAllByText(visiblePlace.description).length).toBeGreaterThan(0);
    expect(screen.getByTestId('browse-open-location-button')).toBeTruthy();
    expect(screen.getByTestId('browse-vote-up-button')).toBeTruthy();
    expect(screen.getByTestId('browse-vote-down-button')).toBeTruthy();
    expect(screen.getByTestId('browse-added-by-label')).toBeTruthy();
    expect(screen.getByText(visiblePlace.authorName)).toBeTruthy();
    expect(screen.getByTestId('browse-comment-compose-button')).toBeTruthy();
    expect(screen.getByText(visiblePlaceComments[0].body)).toBeTruthy();

    fireEvent.press(screen.getByTestId('browse-discussion-open-button'));

    expect(screen.getByText('Discussion')).toBeTruthy();
    expect(screen.getAllByText('Reply').length).toBeGreaterThan(0);
  });

  test('shows preview comments for guests and routes see more into email access', () => {
    const state = buildSeedState();
    const firstPlace = state.places[0];
    const firstPlaceComments = state.comments.filter((comment) => comment.placeId === firstPlace.id);

    useAppContext.mockReturnValue({
      state: {
        ...state,
        session: null,
      },
      isEmailAuthLoading: false,
      authNoticeMessage: '',
      errorMessage: '',
      requestEmailAccess,
      claimHandle,
      addComment: jest.fn(),
      voteComment,
      votePlace: jest.fn(),
      trackPlaceOpen,
    });

    const screen = render(<BrowseScreen navigation={navigation} route={{ params: { placeId: state.places[0].id } }} />);

    fireEvent.press(screen.getByText('View more'));

    expect(screen.getByText(firstPlaceComments[0].body)).toBeTruthy();
    expect(screen.queryByText('Log in to read threads.')).toBeNull();

    fireEvent.press(screen.getByTestId('browse-discussion-open-button'));

    expect(screen.getByText('Google Auth')).toBeTruthy();
  });

  test('opens add place from the current browse viewport', () => {
    const screen = render(<BrowseScreen navigation={navigation} route={{ params: {} }} />);

    fireEvent.press(screen.getByTestId('browse-add-button'));

    expect(navigation.navigate).toHaveBeenCalledWith('AddPlace', {
      startingRegion: {
        latitude: 27.7172,
        longitude: 85.324,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      },
    });
  });
});
