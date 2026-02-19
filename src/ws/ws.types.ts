export type AuthUser = {
  id: string;
  email?: string | null;
  fullName?: string | null;
  status: 'PENDING' | 'APPROVED';
};

export type WsAuthPayload = { token?: string };

export type JoinLeaveDto = { conversationId: string };

export type SendMessageDto = {
  conversationId: string;
  clientMsgId: string;
  text: string;
};

export type ReceiptDto = {
  messageId: string;
  conversationId: string;
};

export type WsAck<T> = {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
};

export const roomId = (conversationId: string) => `conv:${conversationId}`;
