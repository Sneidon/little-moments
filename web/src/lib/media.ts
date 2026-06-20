/** Whether a stored media URL is a video (uses mediaType or file extension). */
export function isVideoMedia(mediaType?: string, url?: string): boolean {
  if (mediaType?.toLowerCase().includes('video')) return true;
  if (url && /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(url)) return true;
  return false;
}

export const MAX_UPLOAD_VIDEO_BYTES = 100 * 1024 * 1024;

export function assertVideoFileSize(file: File): void {
  if (file.size > MAX_UPLOAD_VIDEO_BYTES) {
    throw new Error('Video must be under 100 MB.');
  }
}
