import { apiClient } from './client'

export interface AiMessageResponse {
  conversationId: number
  conversationTitle: string
  messageId: number
  content: string
  role: 'USER' | 'ASSISTANT'
  toolCalls: { tool: string; summary: string }[]
  createdAt: string
}

export interface ConversationSummary {
  id: number
  title: string | null
  createdAt: string
  updatedAt: string
  messages: MessageItem[]
}

export interface MessageItem {
  id: number
  role: 'USER' | 'ASSISTANT'
  content: string
  toolCalls: { tool: string; summary: string }[]
  createdAt: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export const chatApi = {
  sendMessage: (message: string, conversationId?: number) =>
    apiClient.post<AiMessageResponse>('/ai/chat/message', { message, conversationId })
      .then(r => r.data),

  listConversations: (page = 0, size = 30) =>
    apiClient.get<PageResponse<ConversationSummary>>('/ai/chat/conversations', { params: { page, size } })
      .then(r => r.data),

  getConversation: (id: number) =>
    apiClient.get<ConversationSummary>(`/ai/chat/conversations/${id}`)
      .then(r => r.data),

  deleteConversation: (id: number) =>
    apiClient.delete(`/ai/chat/conversations/${id}`),
}
