import { api } from './api';

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChunkSource {
  chunk_id: string;
  document_id: string;
  document_title: string;
  file_name: string;
  chunk_index: number;
  content: string;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChunkSource[];
  created_at: string;
}

export interface AskResult {
  session_id: string;
  answer: string;
  sources: ChunkSource[];
}

export const chatService = {
  async ask(question: string, sessionId?: string): Promise<AskResult> {
    const data = await api.post<{ result: AskResult }>('/chat/ask', {
      question,
      session_id: sessionId ?? '',
    });
    return data.result;
  },

  async listSessions(): Promise<ChatSession[]> {
    const data = await api.get<{ sessions: ChatSession[] }>('/chat/sessions');
    return data.sessions ?? [];
  },

  async createSession(title?: string): Promise<ChatSession> {
    const data = await api.post<{ session: ChatSession }>('/chat/sessions', { title: title ?? '' });
    return data.session;
  },

  async getSession(id: string): Promise<{ session: ChatSession; messages: ChatMessage[] }> {
    const data = await api.get<{ session: ChatSession; messages: ChatMessage[] }>(`/chat/sessions/${id}`);
    // sources is stored as JSON bytes on backend; parse if needed
    const messages = (data.messages ?? []).map(m => ({
      ...m,
      sources: m.sources ? (typeof m.sources === 'string' ? JSON.parse(m.sources) : m.sources) : [],
    }));
    return { session: data.session, messages };
  },

  async deleteSession(id: string): Promise<void> {
    await api.delete(`/chat/sessions/${id}`);
  },
};
