import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createInAppNotificationsForUserIds, getEligibleParentUserIds, getFcmTokensForParentUserIds } from '../lib/notifications/recipients';

// New chat message: notify the other participant (parent or teacher), respecting notificationPreferences.messages.
export const onChatMessageCreated = functions.firestore
  .document('schools/{schoolId}/chats/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const { schoolId, chatId } = context.params;
    const msg = snap.data() as { senderId?: string; text?: string };
    const senderId = msg.senderId && String(msg.senderId).trim();
    if (!senderId) return null;

    const rawText = msg.text != null ? String(msg.text).trim() : '';
    const body =
      rawText.length > 0 ? (rawText.length > 120 ? `${rawText.slice(0, 120)}…` : rawText) : 'Tap to open the conversation.';

    const db = admin.firestore();
    const chatSnap = await db.collection('schools').doc(schoolId).collection('chats').doc(chatId).get();
    if (!chatSnap.exists) return null;
    const chat = chatSnap.data() as { teacherId?: string; parentId?: string; childId?: string };
    const { teacherId, parentId, childId } = chat;
    if (!teacherId || !parentId) return null;

    let recipientId: string | null = null;
    if (senderId === teacherId) {
      recipientId = parentId;
    } else if (senderId === parentId) {
      recipientId = teacherId;
    } else {
      return null;
    }

    const eligibleRecipientIds = await getEligibleParentUserIds(db, [recipientId], 'messages');
    if (eligibleRecipientIds.length === 0) return null;
    const tokens = await getFcmTokensForParentUserIds(db, eligibleRecipientIds, 'messages');
    if (tokens.length === 0) {
      functions.logger.info('onChatMessageCreated: no FCM tokens for recipient', recipientId);
      return null;
    }

    const senderSnap = await db.collection('users').doc(senderId).get();
    const senderName = senderSnap.exists
      ? (senderSnap.data() as { displayName?: string })?.displayName?.trim() || 'Someone'
      : 'Someone';

    let title = `Message from ${senderName}`;
    if (childId) {
      const childSnap = await db
        .collection('schools')
        .doc(schoolId)
        .collection('children')
        .doc(childId)
        .get();
      const childName = childSnap.exists
        ? (childSnap.data() as { name?: string })?.name?.trim()
        : null;
      if (childName) title = `${senderName} · ${childName}`;
    }

    const fcmMsg: admin.messaging.MulticastMessage = {
      tokens,
      notification: { title, body },
      data: { type: 'chat_message', schoolId, chatId },
      android: { priority: 'high' as const },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    };
    try {
      await createInAppNotificationsForUserIds(db, eligibleRecipientIds, {
        title,
        body,
        data: { type: 'chat_message', schoolId, chatId },
      });
      const res = await admin.messaging().sendEachForMulticast(fcmMsg);
      functions.logger.info('onChatMessageCreated: sent', res.successCount, 'failed', res.failureCount, chatId);
    } catch (e) {
      functions.logger.error('onChatMessageCreated: send failed', e);
    }
    return null;
  });
