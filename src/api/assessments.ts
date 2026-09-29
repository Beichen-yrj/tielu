import { ApiError } from './auth'

export type AssessmentDto = {
  id: string
  name: string
  station: string
  area: string
  cargo: string
  un_number: string
  detector: string
  temperature: number
  pressure: number
  concentration: number
  static_checks: boolean[]
  likelihood: number
  severity: number
  risk: '重大' | '较大' | '一般' | '低'
  score: number
  status: '评估中' | '已完成'
  findings: string[]
  measures: string[]
  created_at: string
}

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

async function assessmentRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = window.sessionStorage.getItem('rail-safety-access-token')
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  })
  if (!response.ok) throw new ApiError('评估数据服务暂时不可用', response.status)
  return response.json() as Promise<T>
}

export const listAssessments = () => assessmentRequest<AssessmentDto[]>('/assessments')
export const persistAssessment = (assessment: AssessmentDto) => assessmentRequest<AssessmentDto>(`/assessments/${assessment.id}`, { method: 'PUT', body: JSON.stringify(assessment) })
