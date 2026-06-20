/** Whether a stored media URL is a video (uses mediaType or file extension). */
export function isVideoMedia(mediaType?: string, url?: string): boolean {
  if (mediaType?.toLowerCase().includes('video')) return true;
  if (url && /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(url)) return true;
  return false;
}
