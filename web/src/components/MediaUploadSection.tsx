'use client';

import { useEffect, useState } from 'react';
import { isVideoMedia } from '@/lib/media';

export interface MediaUploadSectionProps {
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  videoFile: File | null;
  setVideoFile: (f: File | null) => void;
  existingUrl?: string | null;
  existingMediaType?: string;
  inputBase: string;
  inputFile: string;
}

export function MediaUploadSection({
  imageFile,
  setImageFile,
  videoFile,
  setVideoFile,
  existingUrl,
  existingMediaType,
  inputBase,
  inputFile,
}: MediaUploadSectionProps) {
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [newVideoPreview, setNewVideoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setNewImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setNewImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (!videoFile) {
      setNewVideoPreview(null);
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setNewVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const showExisting = existingUrl && !imageFile && !videoFile;
  const existingIsVideo = isVideoMedia(existingMediaType, existingUrl ?? undefined);

  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Optional photo or video
      </label>
      {showExisting ? (
        <div className="mb-2">
          <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
            Current {existingIsVideo ? 'video' : 'image'}
          </p>
          {existingIsVideo ? (
            <video
              src={existingUrl}
              controls
              className="max-h-56 max-w-full rounded-lg border border-slate-200 dark:border-slate-600"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={existingUrl}
              alt=""
              className="max-h-56 max-w-full rounded-lg border border-slate-200 object-contain dark:border-slate-600"
            />
          )}
        </div>
      ) : null}
      {newImagePreview ? (
        <div className="mb-2">
          <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">New image preview</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={newImagePreview}
            alt=""
            className="max-h-56 max-w-full rounded-lg border border-slate-200 object-contain dark:border-slate-600"
          />
        </div>
      ) : null}
      {newVideoPreview ? (
        <div className="mb-2">
          <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">New video preview</p>
          <video
            src={newVideoPreview}
            controls
            className="max-h-56 max-w-full rounded-lg border border-slate-200 dark:border-slate-600"
          />
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Upload image
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setImageFile(file);
              if (file) setVideoFile(null);
            }}
            className={`${inputBase} w-full text-sm ${inputFile}`}
            title={showExisting ? 'Choose an image to replace the current media' : undefined}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
            Upload video
          </span>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setVideoFile(file);
              if (file) setImageFile(null);
            }}
            className={`${inputBase} w-full text-sm ${inputFile}`}
            title={showExisting ? 'Choose a video to replace the current media' : undefined}
          />
        </div>
      </div>
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Videos must be under 100 MB.</p>
    </div>
  );
}
