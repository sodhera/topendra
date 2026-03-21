import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { getCapabilitySummary, getRoleLabel } from '../lib/auth';
import { ROLES } from '../lib/constants';
import { getTrustSignalsForUser } from '../lib/trust';
import { colors, spacing, typography } from '../lib/theme';
import { Chip } from '../components/Chip';
import { WindowPanel } from '../components/WindowPanel';

export function ProfileScreen() {
  const { state, dispatch } = useAppContext();
  const currentUser = state.users.find((user) => user.id === state.currentUserId);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <WindowPanel title="Demo personas" subtitle="Switch roles to test public read, trusted live edit, and moderator flows.">
          <View style={styles.personaStack}>
            {state.users.map((user) => (
              <Pressable
                key={user.id}
                onPress={() => dispatch({ type: 'switch_user', payload: user.id })}
                style={[styles.personaCard, currentUser.id === user.id && styles.personaCardActive]}
              >
                <View style={styles.personaTop}>
                  <Text style={styles.personaName}>{user.name}</Text>
                  <Chip label={getRoleLabel(user.role)} tone="info" />
                </View>
                <Text style={styles.personaBio}>{user.bio}</Text>
              </Pressable>
            ))}
          </View>
        </WindowPanel>

        <WindowPanel title="Current access" subtitle={currentUser.name}>
          <Text style={styles.currentRole}>{getRoleLabel(currentUser.role)}</Text>
          <Text style={styles.currentCopy}>{getCapabilitySummary(currentUser.role)}</Text>
          <Text style={styles.currentSignals}>
            Trust signals: {getTrustSignalsForUser(state, currentUser.id)}
            {currentUser.confirmedTrusted ? ' · moderator confirmed' : ''}
          </Text>
        </WindowPanel>

        {currentUser.role === ROLES.MODERATOR ? (
          <WindowPanel title="Trust candidates" subtitle="Hybrid model: system counts activity, moderator confirms the role.">
            <View style={styles.personaStack}>
              {state.users
                .filter((user) => user.id !== 'anon' && user.id !== currentUser.id)
                .map((user) => {
                  const signals = getTrustSignalsForUser(state, user.id);
                  const nextRole = user.role === ROLES.TRUSTED ? ROLES.MEMBER : ROLES.TRUSTED;
                  return (
                    <View key={user.id} style={styles.personaCard}>
                      <View style={styles.personaTop}>
                        <Text style={styles.personaName}>{user.name}</Text>
                        <Chip label={`${signals} signals`} tone="warning" />
                      </View>
                      <Text style={styles.personaBio}>{user.bio}</Text>
                      <Pressable
                        onPress={() => {
                          dispatch({
                            type: 'set_user_role',
                            payload: {
                              actorId: currentUser.id,
                              userId: user.id,
                              nextRole,
                            },
                          });
                          Alert.alert('Trust updated', `${user.name} is now ${getRoleLabel(nextRole)}.`);
                        }}
                        style={styles.manageButton}
                      >
                        <Text style={styles.manageButtonText}>
                          {nextRole === ROLES.TRUSTED ? 'Promote to trusted' : 'Revoke trusted role'}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
            </View>
          </WindowPanel>
        ) : null}

        <WindowPanel title="Demo controls" subtitle="Keep the prototype easy to explore and reset.">
          <Pressable
            onPress={() => {
              dispatch({ type: 'reset_demo' });
              Alert.alert('Demo reset', 'Seeded places, submissions, and roles are back to the original state.');
            }}
            style={styles.resetButton}
          >
            <Text style={styles.manageButtonText}>Reset demo data</Text>
          </Pressable>
        </WindowPanel>
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
    gap: spacing.md,
  },
  personaStack: {
    gap: spacing.sm,
  },
  personaCard: {
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(216, 194, 142, 0.14)',
    backgroundColor: 'rgba(18, 23, 17, 0.28)',
  },
  personaCardActive: {
    borderColor: colors.antiqueGold,
    backgroundColor: 'rgba(110, 138, 59, 0.24)',
  },
  personaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  personaName: {
    flex: 1,
    color: colors.savePage,
    fontFamily: typography.bodyBold,
    fontSize: 14,
  },
  personaBio: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  currentRole: {
    color: colors.leafHighlight,
    fontFamily: typography.display,
    fontSize: 18,
    marginBottom: spacing.sm,
  },
  currentCopy: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  currentSignals: {
    color: colors.textDim,
    fontFamily: typography.mono,
    fontSize: 11,
    marginTop: spacing.md,
  },
  manageButton: {
    marginTop: spacing.md,
    borderRadius: 12,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    backgroundColor: colors.mossCore,
    borderWidth: 1,
    borderColor: colors.antiqueGold,
  },
  resetButton: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: 'rgba(18, 23, 17, 0.34)',
    borderWidth: 1,
    borderColor: 'rgba(216, 194, 142, 0.22)',
  },
  manageButtonText: {
    color: colors.savePage,
    fontFamily: typography.bodyBold,
    fontSize: 13,
  },
});
