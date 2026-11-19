import type { SceneDraft, SceneSource } from './railScenario'
import { classifyHazardIssue, type ProblemKind } from './railHazardCatalog'

export const materialTypes = { unknown: '性质待核实', flammable_liquid: '易燃液体', flammable_gas: '易燃气体', toxic_gas: '有毒气体', corrosive_liquid: '腐蚀性液体', other: '其他 / 非燃烧类' } as const
export type MaterialType = keyof typeof materialTypes
export type ScenarioAdvice = {
  origin: 'rules' | 'deepseek'; summary: string; zone: SceneDraft['zone']; event: SceneDraft['event']; material: MaterialType
  problemType: ProblemKind; issue: string; consequence: string; caption: string; modelPrompt: string
  reasons: string[]; missing: string[]; actions: string[]; model?: string
}
// Screening hints only. The UN/name table never replaces a cargo SDS or transport classification.
export function inferMaterial(cargo: string, un = ''): MaterialType {
  if (/1017|1005/.test(un) || /氯气|液氯|氨气|液氨/.test(cargo)) return 'toxic_gas'
  if (/1075|1978|1011|1049/.test(un) || /液化石油气|丙烷|丁烷|氢气|天然气/.test(cargo)) return 'flammable_gas'
  if (/1203|1202|1223|1170|1230|1114/.test(un) || /汽油|柴油|煤油|乙醇|甲醇|苯/.test(cargo)) return 'flammable_liquid'
  if (/1830|1789|1824/.test(un) || /硫酸|盐酸|氢氧化钠/.test(cargo)) return 'corrosive_liquid'
  return 'unknown'
}
export function adviseScenario(d: SceneDraft): ScenarioAdvice {
  const s = d.source, text = `${s?.hazardName || ''} ${s?.area || ''} ${d.problem}`
  const profile = classifyHazardIssue(s?.hazardName || '', d.problem, s?.dimension || '')
  const material = d.material === 'unknown' ? inferMaterial(s?.cargo || '', s?.un || '') : d.material
  const administrative = profile.kind === '人' || profile.kind === '环' || profile.kind === '管' || s?.dimension === '管'
  const zone = profile.zoneHint || (/包装|货位|搬运/.test(text) ? 'Z03' : /交接|暂存|罐箱/.test(text) ? 'Z05' : 'Z02')
  const event = administrative ? 'control' : profile.event === 'dispersion' && material === 'toxic_gas' ? 'dispersion' : profile.event === 'fire' && ['flammable_liquid', 'flammable_gas'].includes(material) ? 'fire' : material === 'toxic_gas' ? 'dispersion' : profile.event === 'leak' ? 'leak' : 'control'
  const missing = []
  if (!s) missing.push('尚未绑定平台危险源评估记录')
  if (material === 'unknown') missing.push('货物 SDS、物态和燃烧 / 毒性特征')
  if (!d.wind.trim() || !d.direction.trim()) missing.push('现场风速、风向（未知不自动当作静风）')
  missing.push('现场总平面与实际坐标、容器容量 / 压力、泄漏尺寸和持续时间')
  if (event === 'fire') missing.push('点火源是否存在；须人工确认后方可展示燃烧')
  const consequence = profile.consequence
  const caption = `${profile.kind}类问题：${s?.cargo || materialTypes[material]}${event === 'control' ? '作业防控风险' : event === 'dispersion' ? '气体逸散' : event === 'fire' ? '可能起火' : '可能泄漏'}（演练假设）`
  const modelPrompt = `铁路危货${profile.kind}类问题建模：${profile.issue}。对象为${materialTypes[material]}，在${zone}展示${event === 'control' ? '人员巡检、警戒和防控处置' : event === 'leak' ? '局部泄漏、液池或收集隔离' : event === 'dispersion' ? '气体逸散与风向示意' : '受控火焰与报警响应'}；只做定性演示，不计算浓度、半径、超压或经济损失。弹幕：${caption}`
  return { origin: 'rules', summary: administrative ? '该记录优先展示人员、环境或管理防控后果，不直接渲染成火灾或爆炸。' : '按隐患目录、危险源对象和货物性质生成候选后果，应用前需核实条件。', zone, event, material, problemType: profile.kind, issue: profile.issue, consequence, caption, modelPrompt,
    reasons: [s ? `危险源 ${s.hazardCode || '编号待补'} · ${s.hazardName || d.problem}` : d.problem || '请填写问题描述', s ? `${s.stage || '环节未知'} / ${s.dimension || '维度未知'}；原等级 ${s.risk}，治理状态 ${s.status}` : '当前仅为人工演练草稿', `${materialTypes[material]}；问题属性：${profile.kind}；建议仅用于场景配置，不重新判定风险等级`],
    missing, actions: [d.measure || '按原评估措施落实防控，补齐现场检查证据', '核查装卸连接、接地、防溜、报警与事故收集设施的适用性', '回到原评估与整改流程提交检测和照片，按既有权限复核'] }
}
export function scenarioConditions(d: SceneDraft): string[] {
  const errors: string[] = []
  if (['fire', 'explosion'].includes(d.event) && !['flammable_liquid', 'flammable_gas'].includes(d.material)) errors.push('火灾或爆炸情景需核实货物具有可燃性；毒性、腐蚀性或未知性质不能直接点燃')
  if (['fire', 'explosion'].includes(d.event) && !d.ignitionConfirmed) errors.push('请明确确认点火源这一演练条件')
  if (d.event === 'explosion' && !d.accumulationConfirmed) errors.push('爆炸情景需确认可燃物积聚与混合条件；风险等级高不等于必然爆炸')
  if (d.event === 'dispersion' && !['toxic_gas', 'flammable_gas'].includes(d.material)) errors.push('气体扩散情景需确认气态或可形成气云的物料性质')
  return errors
}
export function sceneEngineConfig(d: SceneDraft) {
  return { region: d.region, zone: d.zone, event: d.event, problem: d.problem, material: d.material, release: d.release, problemType: d.problemType, issue: d.issue, consequence: d.consequence, caption: d.caption, modelPrompt: d.modelPrompt,
    wind: d.wind.trim() === '' ? null : Number(d.wind), direction: d.direction.trim() === '' ? null : Number(d.direction),
    ignition: d.ignitionConfirmed, accumulation: d.accumulationConfirmed, mitigated: d.mitigated,
    source: d.source ? { id: d.source.id, hazardCode: d.source.hazardCode, name: d.source.hazardName, cargo: d.source.cargo, risk: d.source.risk, status: d.source.status } : null }
}
export function platformSceneRecord(s: SceneSource, d: SceneDraft) {
  return { id: s.id, station: s.station, title: s.finding, hazardName: s.hazardName, zone: adviseScenario({ ...d, source: s, problem: s.finding }).zone, risk: s.risk, status: s.status, hasHazard: s.hasHazard, basis: s.basis, measure: s.action, measured: s.measured, standard: s.standard, created: s.created, closedAt: s.closedAt || '' }
}
