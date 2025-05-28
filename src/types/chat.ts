// lib/types/chat.ts

export interface ChatMessageComponentProps {
  isUser: boolean;
  rawContent: string;
  // timestamp?: string | number; // from msg.createdAt if needed
}
