import { ApiError } from './auth'

export type RiskLevel = '低' | '一般' | '较大' | '重大'
export type AssessmentType = '静态' | '动态'
export type RectificationStatus = '待整改' | '整改中' | '待复核' | '复核中' | '待项目经理确认' | '已闭环'
export type RectificationLog = {
  id: string; operation: 'assessment' | 'save_progress' | 'advance' | 'withdraw' | 'reject' | 'edit'
  actor_id: number; actor: string; role: string; created_at: string
  from_status: string; to_status: string; note: string
  photo_name: string; photo_data: string; measured_value: string; standard_value: string; review_result: string
  edited_event_id?: string
}
export type RectificationUpdate = {
  status: RectificationStatus; operation: 'save_progress' | 'advance' | 'withdraw' | 'reject' | 'edit'
  expected_version: number; note: string; rectification_photo_name?: string; rectification_photo_data?: string
  edit_event_id?: string
  review_result?: '' | '合格' | '不合格'; review_measured_value?: string; review_standard_value?: string
}

export type HazardAssessmentRecord = {
  id: string
  task_name: string
  bureau: string
  station: string
  area: string
  cargo: string
  un_number: string
  inspector: string
  hazard_code: string
  stage: string
  dimension: string
  hazard_name: string
  basis: string
  assessment_type: AssessmentType
  data_name: string
  measured_value: string
  unit: string
  standard_value: string
  static_result: string
  likelihood: number
  severity: number
  score: number
  risk: RiskLevel
  has_hazard: boolean
  finding: string
  action: string
  photo_name: string
  photo_data: string
  status: string
  created_at: string
  user_id?: number
  reviewer_name?: string
  rectification_photo_name?: string
  rectification_photo_data?: string
  review_result?: string
  review_measured_value?: string
  review_standard_value?: string
  rectification_log?: RectificationLog[]
  workflow_version?: number
}

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = window.sessionStorage.getItem('rail-safety-access-token')
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string | Array<{ msg?: string }> }
    throw new ApiError((Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail) || '评估数据服务暂时不可用', response.status)
  }
  return response.json() as Promise<T>
}

export const listHazardAssessments = () => request<HazardAssessmentRecord[]>('/hazard-assessments')
export const persistHazardAssessment = (record: HazardAssessmentRecord) => request<HazardAssessmentRecord>(`/hazard-assessments/${record.id}`, {
  method: 'PUT',
  body: JSON.stringify(record),
})
export const deleteHazardAssessment = (assessmentId: string) => request<{ deleted: boolean }>(`/hazard-assessments/${encodeURIComponent(assessmentId)}`, {
  method: 'DELETE',
})

export const updateRectificationStatus = (assessmentId: string, update: RectificationUpdate) => request<HazardAssessmentRecord>(`/hazard-assessments/${encodeURIComponent(assessmentId)}/rectification`, {
  method: 'PATCH',
  body: JSON.stringify(update),
})
