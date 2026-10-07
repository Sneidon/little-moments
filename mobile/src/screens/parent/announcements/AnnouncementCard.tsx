import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnnouncementMedia } from '../../../components/AnnouncementMedia';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { isVideoMedia } from '../../../utils/media';
import type { Announcement } from '@shared/types';

type IoniconName = keyof typeof Ionicons.glyphMap;

function countLabel(n: number, singular: string, plural: string) {
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

function previewChips(item: Announcement): { key: string; icon: IoniconName; label: string }[] {
  const chips: { key: string; icon: IoniconName; label: string }[] = [];
  if (item.imageUrl) {
    const video = isVideoMedia(item.mediaType, item.imageUrl);
    chips.push({ key: 'hero', icon: video ? 'videocam-outline' : 'image-outline', label: video ? 'Video' : 'Image' });
  }
  const docs = item.documents?.length ?? 0;
  if (docs > 0) chips.push({ key: 'docs', icon: 'document-text-outline', label: countLabel(docs, 'file', 'files') });
  const links = item.links?.length ?? 0;
  if (links > 0) chips.push({ key: 'links', icon: 'link-outline', label: countLabel(links, 'link', 'links') });
  return chips;
}

function LinkRow({ icon, label, url }: { icon: IoniconName; label: string; url: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity style={styles.attachmentRow} onPress={() => Linking.openURL(url)} activeOpacity={0.75}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.attachmentText} numberOfLines={2}>
        {label}
      </Text>
      <Ionicons name="open-outline" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function ExpandedBody({ item }: { item: Announcement }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <>
      {item.body?.trim() ? <Text style={styles.bodyFull}>{item.body.trim()}</Text> : null}
      {item.imageUrl ? <AnnouncementMedia url={item.imageUrl} mediaType={item.mediaType} colors={colors} variant="expanded" /> : null}
      {item.documents?.map((d, i) =>
        d.url ? <LinkRow key={`doc-${i}`} icon="document-text-outline" label={d.label || d.name || 'Attachment'} url={d.url} /> : null
      )}
      {item.links?.map((l, i) => (l.url ? <LinkRow key={`link-${i}`} icon="link-outline" label={l.label || l.name || l.url} url={l.url} /> : null))}
    </>
  );
}

function CollapsedPreview({ item }: { item: Announcement }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const chips = previewChips(item);
  return (
    <>
      {item.body?.trim() ? (
        <Text style={styles.bodyPreview} numberOfLines={2}>
          {item.body.trim()}
        </Text>
      ) : null}
      {chips.length > 0 ? (
        <View style={styles.chipRow}>
          {chips.map((c) => (
            <View key={c.key} style={styles.chip}>
              <Ionicons name={c.icon} size={14} color={colors.textSecondary} style={styles.chipIcon} />
              <Text style={styles.chipLabel}>{c.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

type Props = { item: Announcement; expanded: boolean; onToggle: (item: Announcement) => void };

export function AnnouncementCard({ item, expanded, onToggle }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const dateLabel = new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <TouchableOpacity
      style={[styles.card, expanded && styles.cardExpanded]}
      onPress={() => onToggle(item)}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityHint={expanded ? 'Collapse announcement' : 'Expand announcement'}
    >
      <View style={expanded ? undefined : styles.row}>
        {!expanded && item.imageUrl ? <AnnouncementMedia url={item.imageUrl} mediaType={item.mediaType} colors={colors} variant="thumbnail" /> : null}
        {!expanded && !item.imageUrl ? (
          <View style={styles.placeholder}>
            <Ionicons name="megaphone" size={28} color={colors.primary} />
          </View>
        ) : null}
        <View style={[styles.content, expanded && styles.contentExpanded]}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={expanded ? undefined : 2}>
              {item.title}
            </Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} style={styles.chevron} />
          </View>
          {expanded ? <ExpandedBody item={item} /> : <CollapsedPreview item={item} />}
          <Text style={styles.meta}>{dateLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    cardExpanded: { padding: 14 },
    row: { flexDirection: 'row', alignItems: 'stretch' },
    placeholder: { width: 88, height: 88, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryMuted },
    content: { flex: 1, marginLeft: 12, minWidth: 0 },
    contentExpanded: { marginLeft: 0 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
    title: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text, paddingRight: 4 },
    chevron: { marginTop: 2 },
    bodyPreview: { fontSize: 14, color: colors.textMuted, marginTop: 6, lineHeight: 20 },
    bodyFull: { fontSize: 15, lineHeight: 22, marginTop: 10, color: colors.textSecondary },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    attachmentText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.backgroundSecondary },
    chipIcon: { marginRight: 4 },
    chipLabel: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 10 },
  });
