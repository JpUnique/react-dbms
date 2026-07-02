import { api } from './api';

export interface DocumentComment {
  id: string;
  document_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const commentsService = {
  async list(documentId: string): Promise<DocumentComment[]> {
    const data = await api.get<{ comments: DocumentComment[] }>(`/documents/${documentId}/comments/`);
    return data.comments ?? [];
  },

  async create(documentId: string, content: string): Promise<DocumentComment> {
    const data = await api.post<{ comment: DocumentComment }>(`/documents/${documentId}/comments/`, { content });
    return data.comment;
  },

  async remove(documentId: string, commentId: string): Promise<void> {
    await api.delete(`/documents/${documentId}/comments/${commentId}`);
  },
};
