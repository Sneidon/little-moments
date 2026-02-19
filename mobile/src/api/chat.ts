import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../config/firebase';

const functions = getFunctions(app);

export type GetOrCreateChatResult = { chatId: string; schoolId: string };

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
