import { StateCreator } from 'zustand';
import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  topic?: string;
}

interface ChatMemory {
  messages: Record<string, ChatMessage[]>; // Key is the topic/context
  currentTopic: string;
  maxMessagesPerTopic: number;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setCurrentTopic: (topic: string) => void;
  getContextForTopic: (topic: string, maxMessages?: number) => ChatMessage[];
  clearTopic: (topic: string) => void;
  clearAllTopics: () => void;
}

type ChatMemoryPersist = (
  config: StateCreator<ChatMemory>,
  options: PersistOptions<ChatMemory>
) => StateCreator<ChatMemory>;

export const useChatMemory = create<ChatMemory>()(
  (persist as ChatMemoryPersist)(
    (set, get) => ({
      messages: {},
      currentTopic: 'general',
      maxMessagesPerTopic: 10,

      addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        set((state: ChatMemory) => {
          const topic = message.topic || state.currentTopic;
          const topicMessages = state.messages[topic] || [];
          const newMessage: ChatMessage = {
            ...message,
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now(),
          };

          // Keep only the last maxMessagesPerTopic messages
          const updatedMessages = [...topicMessages, newMessage]
            .slice(-state.maxMessagesPerTopic);

          return {
            messages: {
              ...state.messages,
              [topic]: updatedMessages,
            },
          };
        });
      },

      setCurrentTopic: (topic: string) => {
        set({ currentTopic: topic });
      },

      getContextForTopic: (topic: string, maxMessages: number = 5) => {
        const state = get();
        const topicMessages = state.messages[topic] || [];
        return topicMessages.slice(-maxMessages);
      },

      clearTopic: (topic: string) => {
        set((state: ChatMemory) => ({
          messages: {
            ...state.messages,
            [topic]: [],
          },
        }));
      },

      clearAllTopics: () => {
        set({ messages: {} });
      },
    }),
    {
      name: 'chat-memory',
      version: 1,
    }
  )
); 