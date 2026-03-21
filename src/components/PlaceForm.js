import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { EVIDENCE_TYPES, KATHMANDU_NEIGHBORHOODS } from '../lib/constants';
import { normalizePlaceFacts, validatePlaceFacts } from '../lib/placeFacts';
import { colors, radius, spacing, typography } from '../lib/theme';
import { Chip } from './Chip';
import { FauxMap } from './FauxMap';
import { PhotoStrip } from './PhotoStrip';
import { WindowPanel } from './WindowPanel';

function toTextValue(list) {
  return Array.isArray(list) ? list.join('\n') : '';
}

export function PlaceForm({
  mode = 'submission',
  initialValues,
  onSaveDraft,
  onSubmit,
  submitLabel,
}) {
  const [form, setForm] = useState(() => normalizePlaceFacts(initialValues));
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(normalizePlaceFacts(initialValues));
    setReason('');
    setErrors({});
  }, [initialValues]);

  const onChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const onChangeList = (key, value) => {
    setForm((current) => ({ ...current, [key]: value.split('\n') }));
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Photo permission needed', 'Allow photo library access to attach optional scout photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });

    if (result.canceled) {
      return;
    }

    const nextPhotos = result.assets.map((asset) => ({ uri: asset.uri }));
    setForm((current) => ({ ...current, photos: [...current.photos, ...nextPhotos].slice(0, 4) }));
  };

  const handleDraft = () => {
    const validation = validatePlaceFacts(form, { mode: 'draft' });
    setErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    onSaveDraft?.(validation.facts);
  };

  const handleSubmit = () => {
    const validation = validatePlaceFacts(form, { mode: mode === 'edit' ? 'live_edit' : 'submitted' });
    setErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    if (mode === 'edit' && !reason.trim()) {
      setErrors((current) => ({ ...current, reason: 'Explain why the live place is changing.' }));
      return;
    }

    onSubmit(validation.facts, reason.trim());
  };

  return (
    <ScrollView contentContainerStyle={styles.stack} showsVerticalScrollIndicator={false}>
      <WindowPanel title={mode === 'edit' ? 'Live edit place' : 'Add a place'} subtitle="Quest-log style submission with optional photos and a tap-to-drop pin.">
        <View style={styles.field}>
          <Text style={styles.label}>Place name</Text>
          <TextInput
            value={form.title}
            onChangeText={(value) => onChange('title', value)}
            placeholder="Temple View Rooftop Cafe"
            placeholderTextColor={colors.textDim}
            style={styles.input}
          />
          {errors.title ? <Text style={styles.error}>{errors.title}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Neighborhood</Text>
          <View style={styles.choiceRow}>
            {KATHMANDU_NEIGHBORHOODS.map((item) => (
              <Pressable
                key={item}
                onPress={() => onChange('neighborhood', item)}
                style={[styles.choice, form.neighborhood === item && styles.choiceActive]}
              >
                <Text style={styles.choiceText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Why this place works</Text>
          <TextInput
            value={form.summary}
            onChangeText={(value) => onChange('summary', value)}
            placeholder="Describe the vibe, cover, and why it lowers anxiety."
            placeholderTextColor={colors.textDim}
            multiline
            style={[styles.input, styles.textarea]}
          />
          {errors.summary ? <Text style={styles.error}>{errors.summary}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Allowed actions</Text>
          <TextInput
            value={toTextValue(form.allowedActions)}
            onChangeText={(value) => onChangeList('allowedActions', value)}
            placeholder={'One per line\nRolling allowed\nPre-rolls okay'}
            placeholderTextColor={colors.textDim}
            multiline
            style={[styles.input, styles.textarea]}
          />
          {errors.allowedActions ? <Text style={styles.error}>{errors.allowedActions}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Restrictions</Text>
          <TextInput
            value={toTextValue(form.restrictions)}
            onChangeText={(value) => onChangeList('restrictions', value)}
            placeholder={'One per line\nNo flash photos\nBuy first'}
            placeholderTextColor={colors.textDim}
            multiline
            style={[styles.input, styles.textarea]}
          />
          {errors.restrictions ? <Text style={styles.error}>{errors.restrictions}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Best time to go</Text>
          <TextInput
            value={form.bestTime}
            onChangeText={(value) => onChange('bestTime', value)}
            placeholder="After 7 PM on weekdays"
            placeholderTextColor={colors.textDim}
            style={styles.input}
          />
          {errors.bestTime ? <Text style={styles.error}>{errors.bestTime}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Proof basis</Text>
          <View style={styles.choiceRow}>
            {EVIDENCE_TYPES.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => onChange('evidenceType', item.value)}
                style={[styles.choice, form.evidenceType === item.value && styles.choiceActive]}
              >
                <Text style={styles.choiceText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Why should moderators trust this?</Text>
          <TextInput
            value={form.evidenceNote}
            onChangeText={(value) => onChange('evidenceNote', value)}
            placeholder="Describe who confirmed it, what the house rules are, and what you personally observed."
            placeholderTextColor={colors.textDim}
            multiline
            style={[styles.input, styles.textarea]}
          />
          {errors.evidenceNote ? <Text style={styles.error}>{errors.evidenceNote}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Pin</Text>
          <FauxMap pickable pin={form.coords} onPick={(coords) => onChange('coords', coords)} height={210} />
          {form.coords.x && form.coords.y ? (
            <Text style={styles.helper}>{`Pin: ${form.coords.x}, ${form.coords.y}`}</Text>
          ) : null}
          {errors.coords ? <Text style={styles.error}>{errors.coords}</Text> : null}
        </View>

        <View style={styles.field}>
          <View style={styles.photoHeader}>
            <Text style={styles.label}>Optional photos</Text>
            <Pressable onPress={handlePickPhoto}>
              <Chip label="Attach photo" tone="info" />
            </Pressable>
          </View>
          <PhotoStrip photos={form.photos} placeholderText="Photos help, but they are not required for a valid submission." />
        </View>

        {mode === 'edit' ? (
          <View style={styles.field}>
            <Text style={styles.label}>Reason for live edit</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="What changed since the last scout?"
              placeholderTextColor={colors.textDim}
              multiline
              style={[styles.input, styles.textarea]}
            />
            {errors.reason ? <Text style={styles.error}>{errors.reason}</Text> : null}
          </View>
        ) : null}

        <View style={styles.actionRow}>
          {mode !== 'edit' ? (
            <Pressable onPress={handleDraft} style={[styles.actionButton, styles.secondaryButton]}>
              <Text style={styles.actionText}>Save draft</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={handleSubmit} style={[styles.actionButton, styles.primaryButton]}>
            <Text style={styles.actionText}>{submitLabel}</Text>
          </Pressable>
        </View>
      </WindowPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stack: {
    paddingBottom: spacing.xxl,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.savePage,
    fontFamily: typography.displayRegular,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: 'rgba(18, 23, 17, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(216, 194, 142, 0.18)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 14,
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  error: {
    marginTop: spacing.xs,
    color: colors.error,
    fontFamily: typography.bodyMedium,
    fontSize: 12,
  },
  helper: {
    marginTop: spacing.xs,
    color: colors.textDim,
    fontFamily: typography.mono,
    fontSize: 11,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  choice: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(179, 146, 69, 0.35)',
    backgroundColor: 'rgba(18, 23, 17, 0.32)',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
  },
  choiceActive: {
    backgroundColor: 'rgba(110, 138, 59, 0.35)',
    borderColor: colors.antiqueGold,
  },
  choiceText: {
    color: colors.textPrimary,
    fontFamily: typography.bodyMedium,
    fontSize: 13,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  primaryButton: {
    backgroundColor: colors.mossCore,
    borderColor: colors.antiqueGold,
  },
  secondaryButton: {
    backgroundColor: 'rgba(18, 23, 17, 0.4)',
    borderColor: 'rgba(216, 194, 142, 0.28)',
  },
  actionText: {
    color: colors.savePage,
    fontFamily: typography.bodyBold,
    fontSize: 14,
  },
});
