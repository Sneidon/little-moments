import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { assertVideoFileSize } from '@/lib/media';
import {
  uploadAnnouncementDocument,
  uploadAnnouncementImage,
  uploadAnnouncementVideo,
  uploadEventDocument,
  uploadEventImage,
  uploadEventVideo,
} from '@/utils/uploadImage';
import type { EventDocumentLink } from 'shared/types';
import type { PendingDocument, PendingLink, TargetType } from '@/hooks/usePostAttachments';

export type PostKind = 'events' | 'announcements';

const UPLOADERS = {
  events: { image: uploadEventImage, video: uploadEventVideo, document: uploadEventDocument },
  announcements: { image: uploadAnnouncementImage, video: uploadAnnouncementVideo, document: uploadAnnouncementDocument },
};

type AttachmentInput = {
  imageFile: File | null;
  videoFile: File | null;
  documents: PendingDocument[];
  links: PendingLink[];
};

type AttachmentUpdates = { imageUrl?: string; mediaType?: string; documents?: EventDocumentLink[]; links?: EventDocumentLink[] };

const labelled = (label: string, url: string): EventDocumentLink => ({ label: label.trim() || undefined, name: label.trim() || undefined, url });

// When editing, documents and links are always written so removed rows are deleted; new posts only get non-empty lists.
export async function uploadAttachments(kind: PostKind, schoolId: string, postId: string, input: AttachmentInput, editing: boolean) {
  const upload = UPLOADERS[kind];
  const updates: AttachmentUpdates = {};
  if (input.imageFile) {
    updates.imageUrl = await upload.image(input.imageFile, schoolId, postId);
    updates.mediaType = 'image';
  } else if (input.videoFile) {
    assertVideoFileSize(input.videoFile);
    updates.imageUrl = await upload.video(input.videoFile, schoolId, postId);
    updates.mediaType = 'video';
  }

  const docs = await Promise.all(
    input.documents.map(async (d, idx) => {
      if (d.file) return labelled(d.label, await upload.document(d.file, schoolId, postId, `doc-${idx}-${Date.now()}`));
      return d.existingUrl ? labelled(d.label, d.existingUrl) : null;
    })
  );
  const documents = docs.filter((d): d is EventDocumentLink => d !== null);
  const links = input.links.filter((l) => l.url?.trim()).map((l) => labelled(l.label, l.url.trim()));
  if (editing || documents.length) updates.documents = documents;
  if (editing || links.length) updates.links = links;
  return updates;
}

export function targetFields(targetType: TargetType, targetClassIds: string[], editing: boolean): Record<string, unknown> {
  if (editing) return { targetType, targetClassIds: targetType === 'classes' ? targetClassIds : [] };
  return targetType === 'classes' && targetClassIds.length > 0 ? { targetType, targetClassIds } : { targetType };
}

export async function savePost(
  kind: PostKind,
  schoolId: string,
  editingId: string | null,
  fields: Record<string, unknown>,
  attachments: AttachmentInput
): Promise<void> {
  if (editingId) {
    const media = await uploadAttachments(kind, schoolId, editingId, attachments, true);
    await updateDoc(doc(db, 'schools', schoolId, kind, editingId), { ...fields, ...media });
    return;
  }
  const ref = await addDoc(collection(db, 'schools', schoolId, kind), fields);
  const media = await uploadAttachments(kind, schoolId, ref.id, attachments, false);
  if (Object.keys(media).length > 0) await updateDoc(doc(db, 'schools', schoolId, kind, ref.id), media);
}
