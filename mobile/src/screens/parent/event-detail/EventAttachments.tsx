import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles, type Theme } from '../../../hooks/useThemedStyles';
import { font } from '../../../theme/typography';
import type { Event } from '@shared/types';
import { docIcon, isLikelyImageUrl } from './eventDetail';

type Attachment = { url: string; label?: string; name?: string };
type IoniconName = keyof typeof Ionicons.glyphMap;

type RowProps = {
  label: string;
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
  trailing: IoniconName;
  url: string;
  link?: boolean;
};

function AttachmentRow({ label, icon, iconColor, iconBg, trailing, url, link }: RowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.75}
      accessibilityRole={link ? 'link' : 'button'}
      accessibilityLabel={link ? undefined : `Open ${label}`}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.rowText} numberOfLines={2}>
        {label}
      </Text>
      <Ionicons name={trailing} size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function withUrl<T extends { url?: string }>(items: T[] | undefined): (T & Attachment)[] {
  return (items ?? []).filter((d): d is T & Attachment => !!d.url);
}

export function EventAttachments({ event }: { event: Event }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const imageWidth = useWindowDimensions().width - 34;
  const documents = withUrl(event.documents);
  const images = documents.filter((d) => isLikelyImageUrl(d.url));
  const files = documents.filter((d) => !isLikelyImageUrl(d.url));
  const links = withUrl(event.links);

  return (
    <>
      {event.description ? (
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>About</Text>
          <Text style={styles.body}>{event.description}</Text>
        </View>
      ) : null}

      {images.length > 0 ? <Text style={styles.sectionLabel}>More photos</Text> : null}
      {images.map((d, i) => (
        <TouchableOpacity key={`img-doc-${i}`} activeOpacity={0.9} onPress={() => Linking.openURL(d.url)} style={styles.imageCard}>
          <Image source={{ uri: d.url }} style={[styles.image, { width: imageWidth }]} resizeMode="cover" />
          <Text style={styles.imageCaption} numberOfLines={2}>
            {d.label || d.name || 'Photo'}
          </Text>
        </TouchableOpacity>
      ))}

      {files.length > 0 ? <Text style={styles.sectionLabel}>Files & documents</Text> : null}
      {files.map((d, i) => (
        <AttachmentRow
          key={`doc-${i}`}
          url={d.url}
          label={d.label || d.name || 'Attachment'}
          icon={docIcon(d.url)}
          iconColor={colors.primary}
          iconBg={colors.primaryMuted}
          trailing="chevron-forward"
        />
      ))}

      {links.length > 0 ? <Text style={styles.sectionLabel}>Links</Text> : null}
      {links.map((d, i) => (
        <AttachmentRow
          key={`link-${i}`}
          url={d.url}
          link
          label={d.label || d.name || d.url}
          icon="link-outline"
          iconColor={colors.accentTeal}
          iconBg={colors.accentTealSoft}
          trailing="open-outline"
        />
      ))}
    </>
  );
}

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    aboutCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, backgroundColor: colors.card, borderColor: colors.cardBorder },
    aboutTitle: {
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      fontFamily: font.semiBold,
      marginBottom: 10,
      color: colors.textMuted,
    },
    body: { fontSize: 16, lineHeight: 24, fontFamily: font.regular, color: colors.textSecondary },
    sectionLabel: {
      fontSize: 12,
      letterSpacing: 0.5,
      fontFamily: font.semiBold,
      marginTop: 4,
      marginBottom: 10,
      textTransform: 'uppercase',
      color: colors.textMuted,
    },
    imageCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 12, borderColor: colors.cardBorder, backgroundColor: colors.card },
    image: { height: 180 },
    imageCaption: { fontSize: 13, padding: 12, fontFamily: font.medium, color: colors.textSecondary },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 8,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
    },
    rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    rowText: { flex: 1, fontSize: 15, fontFamily: font.semiBold, color: colors.text },
  });
