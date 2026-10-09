import type { ImportedAssessment } from './assessmentImport'
import type { HazardAssessmentRecord } from './api/hazardAssessments'

const normalize = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
const normalizeUn = (value: unknown) => String(value ?? '').replace(/\s+/g, '').toLocaleUpperCase()

type AssessmentLike = ImportedAssessment | HazardAssessmentRecord

/** Business fields that identify the same assessment; IDs, timestamps, photos and workflow fields are intentionally excluded. */
export const assessmentSignature = (record: AssessmentLike) => {
  const imported = 'taskName' in record
  if (imported) {
    const value = record as ImportedAssessment
    const dynamic = value.assessmentType === '动态'
    return [
      normalize(value.taskName), normalize(value.bureau), normalize(value.station), normalize(value.area), normalize(value.cargo),
      normalizeUn(value.unNumber), normalize(value.hazardCode), normalize(value.stage), normalize(value.dimension), normalize(value.assessmentType),
      normalize(value.dataName), normalize(value.measuredValue), normalize(value.unit), normalize(value.standardValue), dynamic ? '' : normalize(value.staticResult),
      String(value.likelihood), String(value.severity), dynamic ? '' : normalize(value.staticResult === '符合' ? '低' : value.staticRisk),
    ].join('\u001f')
  }
  const value = record as HazardAssessmentRecord
  const dynamic = value.assessment_type === '动态'
  return [
    normalize(value.task_name),
    normalize(value.bureau), normalize(value.station), normalize(value.area), normalize(value.cargo),
    normalizeUn(value.un_number), normalize(value.hazard_code), normalize(value.stage), normalize(value.dimension), normalize(value.assessment_type),
    normalize(value.data_name), normalize(value.measured_value), normalize(value.unit), normalize(value.standard_value), dynamic ? '' : normalize(value.static_result),
    String(value.likelihood), String(value.severity), dynamic ? '' : normalize(value.static_result === '符合' ? '低' : value.risk),
  ].join('\u001f')
}

export type DuplicateImportResult = {
  duplicateIndexes: number[]
  existingIndexes: number[]
  inFileIndexes: number[]
}

export function findDuplicateImportRows(rows: ImportedAssessment[], existing: HazardAssessmentRecord[]): DuplicateImportResult {
  const existingSignatures = new Set(existing.map(assessmentSignature))
  const seen = new Map<string, number>()
  const duplicateIndexes: number[] = []
  const existingIndexes: number[] = []
  const inFileIndexes: number[] = []
  rows.forEach((row, index) => {
    const signature = assessmentSignature(row)
    if (existingSignatures.has(signature)) {
      duplicateIndexes.push(index)
      existingIndexes.push(index)
      return
    }
    if (seen.has(signature)) {
      duplicateIndexes.push(index)
      inFileIndexes.push(index)
      return
    }
    seen.set(signature, index)
  })
  return { duplicateIndexes, existingIndexes, inFileIndexes }
}
