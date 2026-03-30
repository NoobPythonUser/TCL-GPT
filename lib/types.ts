export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Exclude<Role, "system">;
  content: string;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface ChatRequestBody {
  messages: Array<Pick<ChatMessage, "role" | "content">>;
}
