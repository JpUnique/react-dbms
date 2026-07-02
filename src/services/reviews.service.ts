import { api } from './api';

export interface DocumentReview {
  id: string;
  document_id: string;
  document_title?: string;
  submitter_id: string;
  submitter_name?: string;
  reviewer_id?: string;
  reviewer_name?: string;
  decision: 'pending' | 'approved' | 'rejected';
  note?: string;
  created_at: string;
  reviewed_at?: string;
}

export const reviewsService = {
  async submit(documentId: string): Promise<DocumentReview> {
    const data = await api.post<{ review: DocumentReview }>(`/documents/${documentId}/submit-review`, {});
    return data.review;
  },

  async approve(documentId: string, note?: string): Promise<DocumentReview> {
    const data = await api.post<{ review: DocumentReview }>(`/documents/${documentId}/approve`, { note: note ?? '' });
    return data.review;
  },

  async reject(documentId: string, note?: string): Promise<DocumentReview> {
    const data = await api.post<{ review: DocumentReview }>(`/documents/${documentId}/reject`, { note: note ?? '' });
    return data.review;
  },

  async getByDocument(documentId: string): Promise<DocumentReview[]> {
    const data = await api.get<{ reviews: DocumentReview[] }>(`/documents/${documentId}/reviews`);
    return data.reviews ?? [];
  },

  async pendingQueue(): Promise<DocumentReview[]> {
    const data = await api.get<{ queue: DocumentReview[] }>('/review-queue');
    return data.queue ?? [];
  },
};
