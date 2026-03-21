import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { ACTIONS } from '../lib/constants';
import { can } from '../lib/auth';
import { colors, spacing, typography } from '../lib/theme';
import { PlaceForm } from '../components/PlaceForm';
import { WindowPanel } from '../components/WindowPanel';

export function EditPlaceScreen({ navigation, route }) {
  const { state, dispatch } = useAppContext();
  const { placeId } = route.params;
  const currentUser = state.users.find((user) => user.id === state.currentUserId);
  const place = state.places.find((item) => item.id === placeId);

  if (!place || !can(currentUser.role, ACTIONS.LIVE_EDIT_PLACE)) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <WindowPanel title="Live edit locked" subtitle="Only trusted scouts and moderators can update approved places directly.">
            <Text style={styles.copy}>
              Switch to Sagar or Anika on the Profile tab to test the audit-backed live-edit flow.
            </Text>
          </WindowPanel>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <PlaceForm
          mode="edit"
          initialValues={{
            title: place.name,
            neighborhood: place.neighborhood,
            summary: place.summary,
            bestTime: place.bestTime,
            allowedActions: place.allowedActions,
            restrictions: place.restrictions,
            evidenceType: place.moderation.evidenceType,
            evidenceNote: place.moderation.note,
            coords: place.coords,
            photos: place.photos,
          }}
          submitLabel="Publish live update"
          onSubmit={(formValues, reason) => {
            dispatch({
              type: 'live_edit_place',
              payload: {
                actorId: currentUser.id,
                placeId,
                formValues,
                reason,
              },
            });
            Alert.alert('Live place updated', 'The listing changed immediately and the audit log recorded the edit.');
            navigation.goBack();
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.nightRoot,
  },
  content: {
    padding: spacing.md,
  },
  copy: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
});
