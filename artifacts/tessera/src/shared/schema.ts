export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  initiatedBy?: string;
}

export interface InsertConversation {
  title: string;
}

export interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface IndexedRepo {
  id: number;
  name: string;
  url: string;
  description?: string;
  createdAt: string;
}

export interface InsertRepo {
  name: string;
  url: string;
  description?: string;
}
