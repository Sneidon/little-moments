import { getFunctions, httpsCallable } from 'firebase/functions';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import app, { db } from '../config/firebase';
import { getChatReadField } from '../utils/chatUnread';

const functions = getFunctions(app);

type GetOrCreateChatResult = { chatId: string; schoolId: string };

export async function getOrCreateChat(
  schoolId: string,
  childId: string,
  otherParticipantId: string
): Promise<GetOrCreateChatResult> {
  const fn = httpsCallable<
    { schoolId: string; childId: string; otherParticipantId: string },
    GetOrCreateChatResult
  >(functions, 'getOrCreateChat');
  const res = await fn({ schoolId, childId, otherParticipantId });
  return res.data;
}

export async function sendChatMessage(schoolId: string, chatId: string, senderId: string, text: string, readField: string | null) {
  const now = new Date().toISOString();
  await addDoc(collection(db, 'schools', schoolId, 'chats', chatId, 'messages'), { senderId, text, createdAt: now });
  await updateDoc(doc(db, 'schools', schoolId, 'chats', chatId), {
    lastMessageText: text.slice(0, 100),
    lastMessageAt: now,
    lastMessageSenderId: senderId,
    updatedAt: now,
    ...(readField ? { [readField]: now } : {}),
  });
}

export async function broadcastToParents(
  schoolId: string,
  senderId: string,
  text: string,
  pairs: [parentId: string, childId: string][],
  onChatsReady?: () => void
): Promise<number> {
  const chats = await Promise.all(pairs.map(([parentId, childId]) => getOrCreateChat(schoolId, childId, parentId)));
  onChatsReady?.();
  await Promise.all(chats.map((c) => sendChatMessage(c.schoolId, c.chatId, senderId, text, getChatReadField('teacher'))));
  return chats.length;
}
