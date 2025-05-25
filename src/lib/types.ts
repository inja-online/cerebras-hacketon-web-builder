// Types for the Chat UI components

// Base ChatEvent type (common properties)
export interface BaseChatEvent {
  id: string;
  timestamp: Date;
  updatedAt?: Date;
  projectId?: string; // Link events to projects
}

// User message event
export interface UserChatEvent extends BaseChatEvent {
  type: 'user';
  userId: string;
  avatar?: string;
  content: string;
  isSent?: boolean; // Track if message has been sent to server for processing
}

// Bot message event
export interface BotChatEvent extends BaseChatEvent {
  type: 'bot';
  content: string; // This will be the display text
  rawContent?: string; // The full raw response from the bot
  htmlContent?: string; // Extracted HTML content for iframe
  originalMessage?: string; // Original response before parsing
  config?: {
    sources?: string[];
    requiresFeedback?: boolean;
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

// API request/response types
export interface ChatRequest {
  message: string;
  chatId: string;
}

export interface ChatResponse {
  content: string;
  success: boolean;
  error?: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}
