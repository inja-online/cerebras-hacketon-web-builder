// Types for the Chat UI components

// Base ChatEvent type (common properties)
export interface BaseChatEvent {
  id: string;
  timestamp: Date;
  updatedAt?: Date;
}

// User message event
export interface UserChatEvent extends BaseChatEvent {
  type: 'user';
  userId: string;
  avatar?: string | null;
  content: string;
}

// Bot message event
export interface BotChatEvent extends BaseChatEvent {
  type: 'bot';
  content: string;
  config?: {
    sources?: Array<{
      title: string;
      url: string;
    }>;
    requiresFeedback?: boolean;
    [key: string]: any; // Allow for additional config properties
  };
}

// Thinking indicator event
export interface ThinkingChatEvent extends BaseChatEvent {
  type: 'thinking';
}

// Server/system message event
export interface ServerChatEvent extends BaseChatEvent {
  type: 'server';
  content: string;
}

// Union type for all possible chat events
export type ChatEvent = UserChatEvent | BotChatEvent | ThinkingChatEvent | ServerChatEvent;

// Project types
export interface Project {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}
