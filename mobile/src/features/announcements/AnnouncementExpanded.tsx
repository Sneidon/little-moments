import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../hooks/useThemedStyles';
import { brandFont } from '../../theme/typography';
import { type as typeTokens } from '../../theme/tokens';
import { docIcon } from '../school-post/attachments';
import type { Announcement } from '@shared/types';
import { MediaBlock } from '../../components/brand/MediaBlock';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function postedLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  return `${date} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function LinkTile({ icon, tile, label, url, trailing }: { icon: IconName; tile: string; label: string; url: string; trailing: IconName }) {
  const { brand, category } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity style={styles.link} onPress={() => Linking.openURL(url)} activeOpacity={0.8} accessibilityRole="link" accessibilityLabel={`Open ${label}`}>
      <View style={[styles.linkTile, { backgroundColor: tile }]}>
        <Ionicons name={icon} size={20} color={category.onCategory} />
      </View>
      <Text style={styles.linkText} numberOfLines={2}>
        {label}
      </Text>
      <Ionicons name={trailing} size={18} color={brand.textTertiary} />
    </TouchableOpacity>
  );
}

export function AnnouncementExpanded({ item }: { item: Announcement }) {
  const { brand, category } = useTheme();
  const styles = useThemedStyles(createStyles);
  const documents = (item.documents ?? []).filter((d) => d.url);
  const links = (item.links ?? []).filter((l) => l.url);
  const posted = postedLabel(item.createdAt);

  return (
    <View style={styles.wrap}>
      {posted ? (
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={15} color={brand.textTertiary} />
          <Text style={styles.metaText}>{posted}</Text>
        </View>
      ) : null}
      {item.imageUrl ? <MediaBlock url={item.imageUrl} mediaType={item.mediaType} /> : null}
      {item.body?.trim() ? <Text style={styles.body}>{item.body.trim()}</Text> : null}
      {documents.length ? <Text style={styles.section}>Files</Text> : null}
      {documents.map((d, i) => (
        <LinkTile key={`doc-${i}`} icon={docIcon(d.url)} tile={category.checkOut} label={d.label || d.name || 'Attachment'} url={d.url} trailing="download-outline" />
      ))}
      {links.length ? <Text style={styles.section}>Links</Text> : null}
      {links.map((l, i) => (
        <LinkTile key={`link-${i}`} icon="link-outline" tile={category.nappy} label={l.label || l.name || l.url} url={l.url} trailing="open-outline" />
      ))}
      {item.targetType === 'classes' ? (
        <View style={styles.audience}>
          <Ionicons name="people-outline" size={16} color={brand.textSecondary} />
          <Text style={styles.audienceText}>Shared with specific classes</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = ({ brand }: Theme) =>
  StyleSheet.create({
    wrap: { marginTop: 14, gap: 12 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontFamily: brandFont.body600, fontSize: 13, color: brand.textTertiary },
    body: { fontFamily: brandFont.body500, fontSize: 16, lineHeight: 24, color: brand.textPrimary },
    section: { ...typeTokens.overline, color: brand.textTertiary, marginTop: 4 },
    link: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, backgroundColor: brand.surfaceRaised },
    linkTile: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    linkText: { flex: 1, fontFamily: brandFont.body700, fontSize: 15, color: brand.textPrimary },
    audience: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16, backgroundColor: brand.surfaceRaised },
    audienceText: { fontFamily: brandFont.body600, fontSize: 13, color: brand.textSecondary },
  });
