import { hazardCatalog } from './hazardCatalog'
import type { ImportedAssessment } from './assessmentImport'
import type { HazardAssessmentRecord, RiskLevel } from './api/hazardAssessments'

export const riskFromScore = (score: number): RiskLevel => score >= 16 ? '重大' : score >= 9 ? '较大' : score >= 4 ? '一般' : '低'
export const defaultAction = (risk: RiskLevel, hazard: string) => risk === '低'
  ? `保持${hazard}当前管控措施，按检查周期复核。`
  : `${risk}风险：立即核查${hazard}，明确责任人和整改期限；整改完成后重新评估并留存复核证据。`

export function buildImportedRecord(source: ImportedAssessment, userName: string, id: string, createdAt: string): HazardAssessmentRecord {
  const hazard = hazardCatalog.find((item) => item.code === source.hazardCode)
  if (!hazard) throw new Error(`危险源编号“${source.hazardCode}”不存在`)
  const score = source.assessmentType === '动态' ? source.likelihood * source.severity : source.staticResult === '符合' ? 1 : source.staticRisk === '一般' ? 4 : source.staticRisk === '较大' ? 9 : source.staticRisk === '重大' ? 16 : 1
  const risk = source.assessmentType === '动态' ? riskFromScore(score) : source.staticResult === '符合' ? '低' : source.staticRisk
  const hasHazard = source.assessmentType === '动态' ? risk !== '低' : source.staticResult === '不符合'
  return {
    id, task_name: source.taskName, bureau: source.bureau, station: source.station, area: source.area,
    cargo: source.cargo, un_number: source.unNumber, inspector: userName,
    hazard_code: hazard.code, stage: hazard.stage, dimension: hazard.dimension, hazard_name: hazard.name, basis: hazard.basis,
    assessment_type: source.assessmentType, data_name: source.dataName, measured_value: source.measuredValue, unit: source.unit, standard_value: source.standardValue,
    static_result: source.assessmentType === '静态' ? source.staticResult : '', likelihood: source.likelihood, severity: source.severity, score,
    risk, has_hazard: hasHazard,
    finding: source.finding.trim() || (hasHazard ? `${hazard.stage}${hazard.dimension}类危险源“${hazard.name}”存在异常：${source.dataName}${source.measuredValue}${source.unit ? ` ${source.unit}` : ''}。` : `未发现“${hazard.name}”相关隐患。`),
    action: source.action.trim() || defaultAction(risk, hazard.name),
    photo_name: source.photoName, photo_data: source.photoData, status: '已完成', created_at: createdAt,
  }
}
