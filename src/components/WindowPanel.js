import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../lib/theme';

export function WindowPanel({ title, subtitle, right, children, style, contentStyle }) {
  return (
    <View style={[styles.shell, style]}>
      {(title || subtitle || right) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      )}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.forestPanel,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.antiqueGold,
    overflow: 'hidden',
    ...shadows.window,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 194, 142, 0.18)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: 'rgba(244, 231, 193, 0.04)',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.savePage,
    fontFamily: typography.display,
    fontSize: 16,
    letterSpacing: 0.6,
  },
  subtitle: {
    color: colors.textDim,
    fontFamily: typography.body,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  content: {
    padding: spacing.md,
  },
});
