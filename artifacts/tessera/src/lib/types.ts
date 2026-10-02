export interface Message {
  id?: string | number;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
  agentId?: string;
  agentName?: string;
  [key: string]: any;
}

export interface Conversation {
  id: number;
  title: string;
  createdAt: number;
  updatedAt?: number;
  messages?: Message[];
  [key: string]: any;
}

export interface InsertConversation {
  title: string;
  [key: string]: any;
}

export interface IndexedRepo {
  id: number;
  url: string;
  name: string;
  status: string;
  indexedAt?: number;
  [key: string]: any;
}

export interface InsertRepo {
  url: string;
  name?: string;
  [key: string]: any;
}
