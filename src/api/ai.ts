import { ApiError } from './auth'

export type AiAssessmentContext = {
  id: string
  name: string
  cargo: string
  station: string
  risk: string
  score: number
  finding_count: number
}

export type AiContext = {
  assessment_count: number
  open_issue_count: number
  major_issue_count: number
  latest_assessment: AiAssessmentContext | null
}

export type AiResponse = {
  answer: string
  provider: 'deepseek'
  model: string
}

const tokenKey = 'rail-safety-access-token'
const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

export async function askAi(question: string, context: AiContext): Promise<AiResponse> {
  const token = window.sessionStorage.getItem(tokenKey)
  const response = await fetch(`${apiBase}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question, context }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string | Array<{ msg?: string }> }
    const detail = Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail
    throw new ApiError(detail || 'AI 服务暂时不可用，请稍后重试', response.status)
  }
  return response.json() as Promise<AiResponse>
}
