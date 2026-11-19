import { ApiError } from './auth'
import type { SceneDraft } from '../railScenario'
import type { adviseScenario } from '../railHazardModel'

export type SceneSuggestion = Omit<ReturnType<typeof adviseScenario>, 'origin'> & { origin: 'rules' | 'deepseek'; model?: string }
export async function askScenarioAi(d: SceneDraft, signal: AbortSignal): Promise<SceneSuggestion> {
  const token = sessionStorage.getItem('rail-safety-access-token')
  if (!token) throw new Error('当前为本地演示，在线 AI 需要登录已启动的后端，并由超级管理员在平台管理中配置智能体 API；可先使用本地规则分析。')
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/ai/scenario-plan`, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ source_id: d.source?.id || null, source_version: d.source?.version || '', problem: d.problem, cargo: d.source?.cargo || '', material: d.material }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(typeof body.detail === 'string' ? body.detail : 'AI 服务暂时不可用，未应用建议', response.status)
  }
  return response.json()
}
