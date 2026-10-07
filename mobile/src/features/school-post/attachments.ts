import type { Ionicons } from '@expo/vector-icons';

export function isLikelyImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|#|$)/i.test(url);
}

export function docIcon(url: string): keyof typeof Ionicons.glyphMap {
  if (/\.pdf(\?|#|$)/i.test(url)) return 'document-text-outline';
  if (isLikelyImageUrl(url)) return 'image-outline';
  return 'attach-outline';
}
