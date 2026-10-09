import type { HazardAssessmentRecord, RectificationStatus } from './api/hazardAssessments.ts'

export const rectificationStages: RectificationStatus[] = ['待整改', '整改中', '待复核', '复核中', '待项目经理确认', '已闭环']

export function rectificationStatus(status: string): RectificationStatus {
  if (status === '已整改') return '已闭环'
  return rectificationStages.includes(status as RectificationStatus) ? status as RectificationStatus : '待整改'
}

export function isOpenIssue(issue: { stage: number }): boolean {
  return issue.stage < rectificationStages.length - 1
}

export function isActiveHazard(record: Pick<HazardAssessmentRecord, 'has_hazard' | 'status'>): boolean {
  return record.has_hazard && rectificationStatus(record.status) !== '已闭环'
}

export function rectificationAccess(record: HazardAssessmentRecord, role: string, userId: number) {
  const status = rectificationStatus(record.status)
  const index = rectificationStages.indexOf(status)
  const logs = record.rectification_log ?? []
  const assignedManager = [...logs].reverse().find((event) => event.operation !== 'assessment' && ['project_manager', 'admin'].includes(event.role))
  const manager = role === 'admin' || (role === 'project_manager' && (!assignedManager || assignedManager.actor_id === userId))
  const reviewer = ['safety_manager', 'admin'].includes(role)
  const canProcess = (['待复核', '复核中'].includes(status) ? reviewer : manager) && status !== '已闭环'
  const lastTransition = logs.find((event) => ['advance', 'withdraw', 'reject'].includes(event.operation))
  return {
    status, index, canProcess,
    editableEventId: canProcess && logs[0]?.actor_id === userId && logs[0]?.to_status === status && ['save_progress', 'advance', 'edit'].includes(logs[0]?.operation) ? logs[0].id : null,
    canReview: reviewer && status === '复核中',
    canReject: canProcess && ['待复核', '复核中', '待项目经理确认'].includes(status),
    canWithdraw: index > 0 && lastTransition?.operation === 'advance' && lastTransition.to_status === status && (lastTransition.actor_id === userId || role === 'admin'),
    managerName: assignedManager?.actor ?? '待项目经理接办',
  }
}
