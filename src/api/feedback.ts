import { ApiError } from './auth'

export type FeedbackItem = {
  id: number
  category: string
  title: string
  content: string
  status: string
  reply: string | null
  replied_by: string | null
  created_at: string
  replied_at: string | null
  submitter: string
  username: string
}

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

async function feedbackRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = window.sessionStorage.getItem('rail-safety-access-token')
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string }
    throw new ApiError(body.detail || '意见反馈服务暂时不可用', response.status)
  }
  return response.json() as Promise<T>
}

export const listFeedback = () => feedbackRequest<FeedbackItem[]>('/feedback')

export const createFeedback = (payload: { category: string; title: string; content: string }) =>
  feedbackRequest<FeedbackItem>('/feedback', { method: 'POST', body: JSON.stringify(payload) })

export const replyFeedback = (id: number, reply: string) =>
  feedbackRequest<FeedbackItem>(`/feedback/${id}/reply`, { method: 'POST', body: JSON.stringify({ reply }) })
