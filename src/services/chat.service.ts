import api from './api';

const BASE = '/member/chat';

export interface ChatUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

export interface MessageStatus {
  userId: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  sender: ChatUser;
  content: string;
  type: 'TEXT' | 'IMAGE';
  createdAt: string;
  statuses: MessageStatus[];
  isDeleted?: boolean;
  clientId?: string | null;
  pending?: boolean;
  failed?: boolean;
}

export interface ChatRoom {
  id: string;
  type: 'GROUP' | 'DIRECT';
  name?: string | null;
  tenantId: string;
  createdAt?: string;
  members: { user: ChatUser }[];
  messages: ChatMessage[];
  unreadCount: number;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const chatService = {
  getRooms: async (): Promise<ChatRoom[]> => {
    const res = await api.get<{ success: boolean; data: { rooms: ChatRoom[] } }>(`${BASE}/rooms`);
    return res.data.data.rooms;
  },

  getMessages: async (roomId: string, cursor?: string, limit?: number): Promise<MessagesResponse> => {
    const params: Record<string, string | number> = {};
    if (cursor) params.cursor = cursor;
    if (limit) params.limit = limit;
    const res = await api.get<{ success: boolean; data: MessagesResponse }>(
      `${BASE}/rooms/${roomId}/messages`,
      { params }
    );
    return res.data.data;
  },

  markRead: async (roomId: string, messageIds: string[]): Promise<void> => {
    await api.post(`${BASE}/rooms/${roomId}/read`, { messageIds });
  },
};
