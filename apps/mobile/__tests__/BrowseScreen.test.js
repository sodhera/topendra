import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { BrowseScreen } from '../src/screens/BrowseScreen';
import { buildSeedState } from '@topey/shared/data/seed';
import { useAppContext } from '../src/context/AppContext';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  const MockMapView = React.forwardRef(function MockMapView({ children, initialRegion }, ref) {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
    }));

    return (
      <View testID="browse-map">
        <Text testID="browse-map-region">{JSON.stringify(initialRegion)}</Text>
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

describe('BrowseScreen', () => {
  const trackPlaceOpen = jest.fn();
  const requestEmailAccess = jest.fn();
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
      addComment: jest.fn(),
      votePlace: jest.fn(),
      trackPlaceOpen,
    });
  });

  test('shows the selected place preview and details flow from a marker tap', () => {
    const state = buildSeedState();
    const firstPlace = state.places[0];
    const firstPlaceComments = state.comments.filter((comment) => comment.placeId === firstPlace.id);

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
      addComment: jest.fn(),
      votePlace: jest.fn(),
      trackPlaceOpen,
    });

    const screen = render(<BrowseScreen navigation={navigation} route={{ params: {} }} />);

    fireEvent.press(screen.getAllByTestId('map-marker')[0]);

    expect(screen.getByTestId('browse-preview-card')).toBeTruthy();
    expect(screen.getByText(firstPlace.name)).toBeTruthy();
    expect(trackPlaceOpen).toHaveBeenCalledWith({
      placeId: firstPlace.id,
      sourceScreen: 'browse_preview',
    });

    fireEvent.press(screen.getByText('View more'));

    expect(screen.getAllByText(firstPlace.description).length).toBeGreaterThan(0);
    expect(screen.getByTestId('browse-open-location-button')).toBeTruthy();
    expect(screen.getByTestId('browse-vote-up-button')).toBeTruthy();
    expect(screen.getByTestId('browse-vote-down-button')).toBeTruthy();
    expect(screen.getByTestId('browse-added-by-label')).toBeTruthy();
    expect(screen.getByText(firstPlace.authorName)).toBeTruthy();
    expect(screen.getByTestId('browse-comment-compose-button')).toBeTruthy();
    expect(screen.getByText(firstPlaceComments[0].body)).toBeTruthy();

    fireEvent.press(screen.getByTestId('browse-discussion-open-button'));

    expect(screen.getByText('Discussion')).toBeTruthy();
    expect(screen.getAllByText('Reply').length).toBeGreaterThan(0);
  });

  test('shows the login gate when the viewer is not signed in', () => {
    const state = buildSeedState();

    useAppContext.mockReturnValue({
      state: {
        ...state,
        session: null,
      },
      isEmailAuthLoading: false,
      authNoticeMessage: '',
      errorMessage: '',
      requestEmailAccess,
      addComment: jest.fn(),
      votePlace: jest.fn(),
      trackPlaceOpen,
    });

    const screen = render(<BrowseScreen navigation={navigation} route={{ params: { placeId: state.places[0].id } }} />);

    fireEvent.press(screen.getByText('View more'));

    expect(screen.getByText('Log in to read threads.')).toBeTruthy();
    expect(screen.getByText('Log in')).toBeTruthy();

    fireEvent.press(screen.getByText('Log in'));

    expect(screen.getByText('Email access')).toBeTruthy();
  });
});
