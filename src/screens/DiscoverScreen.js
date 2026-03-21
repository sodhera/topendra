import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { computePlaceConfidence, sortPlacesForDiscover } from '../lib/trust';
import { colors, spacing, typography } from '../lib/theme';
import { Chip } from '../components/Chip';
import { FauxMap } from '../components/FauxMap';
import { PlaceCard } from '../components/PlaceCard';
import { WindowPanel } from '../components/WindowPanel';
import { getCapabilitySummary, getRoleLabel } from '../lib/auth';

export function DiscoverScreen({ navigation }) {
  const { state } = useAppContext();
  const currentUser = state.users.find((user) => user.id === state.currentUserId);
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState('');

  const places = useMemo(() => {
    const filtered = sortPlacesForDiscover(state, state.places).filter((place) => {
      const haystack = `${place.name} ${place.neighborhood} ${place.summary}`.toLowerCase();
      const matchesSearch = haystack.includes(searchText.trim().toLowerCase());
      const matchesFilter =
        !selectedFilter ||
        place.allowedActions.some((item) => item.toLowerCase().includes(selectedFilter.toLowerCase()));

      return matchesSearch && matchesFilter;
    });

    return filtered;
  }, [searchText, selectedFilter, state]);

  const featuredPlace = places[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <WindowPanel
        title="Topey"
        subtitle="Moderator-approved Kathmandu places in a cartridge-era shell."
        right={<Chip label={getRoleLabel(currentUser.role)} tone="info" />}
      >
        <Text style={styles.heroCopy}>{getCapabilitySummary(currentUser.role)}</Text>
        <View style={styles.heroActions}>
          <Pressable
            onPress={() => {
              setSearchText('');
              setSelectedFilter('');
              if (featuredPlace) {
                setSelectedPlaceId(featuredPlace.id);
              }
            }}
            style={[styles.heroButton, styles.primaryHeroButton]}
          >
            <MaterialCommunityIcons name="map-search-outline" size={18} color={colors.savePage} />
            <Text style={styles.heroButtonText}>Find Places</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Add')}
            style={[styles.heroButton, styles.secondaryHeroButton]}
          >
            <MaterialCommunityIcons name="map-marker-plus-outline" size={18} color={colors.savePage} />
            <Text style={styles.heroButtonText}>Add Place</Text>
          </Pressable>
        </View>
      </WindowPanel>

      <WindowPanel title="World screen" subtitle="Approved places only. Tap a pin to jump to its details.">
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search neighborhoods or place names"
          placeholderTextColor={colors.textDim}
          style={styles.search}
        />
        <View style={styles.filterRow}>
          {['Rolling', 'Pre-roll', 'Low crowd', 'Rooftop'].map((item) => (
            <Pressable key={item} onPress={() => setSelectedFilter(selectedFilter === item ? '' : item)}>
              <Chip label={item} tone={selectedFilter === item ? 'success' : 'default'} />
            </Pressable>
          ))}
        </View>
        <FauxMap
          places={places}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={(place) => {
            setSelectedPlaceId(place.id);
            navigation.navigate('PlaceDetail', { placeId: place.id });
          }}
        />
      </WindowPanel>

      {featuredPlace ? (
        <WindowPanel title="Best next move" subtitle={`${featuredPlace.neighborhood} · ${featuredPlace.distanceMinutes} min away`}>
          <Text style={styles.featureTitle}>{featuredPlace.name}</Text>
          <Text style={styles.featureBody}>{featuredPlace.summary}</Text>
          <View style={styles.featureRow}>
            <Chip label={featuredPlace.bestTime} tone="warning" />
            <Chip label={`${computePlaceConfidence(state, featuredPlace)}% confidence`} tone="success" />
          </View>
        </WindowPanel>
      ) : null}

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Approved places</Text>
        <Text style={styles.sectionCopy}>Open the app and immediately get clear rules, best-time guidance, and confidence before leaving home.</Text>
        {places.map((place) => (
          <PlaceCard
            key={place.id}
            state={state}
            place={place}
            onPress={() => navigation.navigate('PlaceDetail', { placeId: place.id })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.nightRoot,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  heroCopy: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryHeroButton: {
    backgroundColor: colors.mossCore,
    borderColor: colors.antiqueGold,
  },
  secondaryHeroButton: {
    backgroundColor: 'rgba(18, 23, 17, 0.45)',
    borderColor: 'rgba(216, 194, 142, 0.22)',
  },
  heroButtonText: {
    color: colors.savePage,
    fontFamily: typography.bodyBold,
    fontSize: 14,
  },
  search: {
    backgroundColor: 'rgba(18, 23, 17, 0.45)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(216, 194, 142, 0.18)',
    color: colors.textPrimary,
    fontFamily: typography.body,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    marginBottom: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  featureTitle: {
    color: colors.savePage,
    fontFamily: typography.displayRegular,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
  featureBody: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  listSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.savePage,
    fontFamily: typography.display,
    fontSize: 18,
  },
  sectionCopy: {
    color: colors.textDim,
    fontFamily: typography.body,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
});
