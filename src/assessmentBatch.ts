import type { HazardAssessmentRecord } from './api/hazardAssessments'

export class AssessmentBatchSaveError extends Error {
  readonly savedRecords: HazardAssessmentRecord[]
  readonly total: number
  constructor(savedRecords: HazardAssessmentRecord[], total: number, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : '保存请求失败'
    super(`本次 ${total} 条已确认入库 ${savedRecords.length} 条，第 ${savedRecords.length + 1} 条保存失败：${reason}。剩余 ${total - savedRecords.length} 条待确认，请重试；已入库记录保留。`)
    this.savedRecords = savedRecords
    this.total = total
  }
}

// Preserve confirmed saves so an interrupted import can retry only the remaining rows.
export async function saveAssessmentBatch(records: HazardAssessmentRecord[], persist: (record: HazardAssessmentRecord) => Promise<HazardAssessmentRecord>) {
  const saved: HazardAssessmentRecord[] = []
  for (const record of records) {
    try { saved.push(await persist(record)) }
    catch (error) { throw new AssessmentBatchSaveError(saved, records.length, error) }
  }
  return saved
}
