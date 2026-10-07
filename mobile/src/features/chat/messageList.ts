import type { ViewStyle } from 'react-native';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import type { ChatMessage } from '@shared/types';

const GROUP_GAP_MS = 5 * 60 * 1000;

export type ChatListItem =
  | { type: 'date'; id: string; label: string }
  | {
      type: 'message';
      message: ChatMessage;
      isFirstInGroup: boolean;
      isLastInGroup: boolean;
      showSenderName: boolean;
      showAvatar: boolean;
    };

function localDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dividerLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  if (day.getTime() === today.getTime()) return 'Today';
  if (day.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function startsNewGroup(prev: ChatMessage | undefined, curr: ChatMessage): boolean {
  if (!prev || prev.senderId !== curr.senderId) return true;
  const gap = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return Number.isNaN(gap) || gap > GROUP_GAP_MS;
}

export function bubbleRadii(isMe: boolean, isFirst: boolean, isLast: boolean): ViewStyle {
  const big = 20;
  const small = 5;
  return isMe
    ? {
        borderTopLeftRadius: big,
        borderTopRightRadius: isFirst ? big : small,
        borderBottomLeftRadius: big,
        borderBottomRightRadius: isLast ? big : small,
      }
    : {
        borderTopLeftRadius: isFirst ? big : small,
        borderTopRightRadius: big,
        borderBottomLeftRadius: isLast ? big : small,
        borderBottomRightRadius: big,
      };
}

export function buildChatListItems(messages: ChatMessage[], myUid: string | undefined): ChatListItem[] {
  const items: ChatListItem[] = [];
  let lastDay = '';
  messages.forEach((m, i) => {
    const day = localDayKey(m.createdAt);
    if (day !== lastDay) {
      items.push({ type: 'date', id: `date-${day}`, label: dividerLabel(m.createdAt) });
      lastDay = day;
    }
    const isMe = m.senderId === myUid;
    const isFirstInGroup = startsNewGroup(messages[i - 1], m);
    const isLastInGroup = !messages[i + 1] || startsNewGroup(m, messages[i + 1]);
    items.push({
      type: 'message',
      message: m,
      isFirstInGroup,
      isLastInGroup,
      showSenderName: !isMe && isFirstInGroup,
      showAvatar: !isMe && isLastInGroup,
    });
  });
  return items;
}

export function docToChatMessage(d: QueryDocumentSnapshot): ChatMessage {
  const data = d.data();
  const raw = data.createdAt as unknown;
  const createdAt =
    raw && typeof (raw as { toDate?: () => Date }).toDate === 'function'
      ? (raw as { toDate: () => Date }).toDate().toISOString()
      : typeof raw === 'string'
        ? raw
        : String(raw ?? '');
  return { ...(data as ChatMessage), id: d.id, createdAt };
}

export function mergeMessagesByIdAsc(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of [...a, ...b]) map.set(m.id, m);
  return Array.from(map.values()).sort((x, y) => x.createdAt.localeCompare(y.createdAt));
}
