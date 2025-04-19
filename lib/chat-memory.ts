import { create } from "zustand"

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  topic: string
}

interface ChatMemoryState {
  messages: ChatMessage[]
  currentTopic: string | null
  addMessage: (message: ChatMessage) => void
  setCurrentTopic: (topic: string) => void
  clearTopic: (topic: string) => void
  getContextForTopic: (topic: string) => ChatMessage[]
}

export const useChatMemory = create<ChatMemoryState>((set, get) => ({
  messages: [],
  currentTopic: null,
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  setCurrentTopic: (topic) =>
    set(() => ({
      currentTopic: topic,
    })),
  clearTopic: (topic) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.topic !== topic),
    })),
  getContextForTopic: (topic) => {
    const state = get()
    return state.messages.filter((msg) => msg.topic === topic)
  },
})) 