import type { HazardAssessmentRecord } from './api/hazardAssessments'
import { adviseScenario, scenarioConditions, type MaterialType } from './railHazardModel'

export const openRailScenario = (id: string) => window.dispatchEvent(new CustomEvent('rail-open-scenario', { detail: id }))

export const sceneRegions = { NE: '东北 · 寒地平原', NC: '华北 · 平原枢纽', EC: '华东 · 临港水网', SC: '华南 · 湿热多雨', SW: '西南 · 山地谷地', NW: '西北 · 干旱开阔' } as const
export const sceneObjects = { Z02: '罐车装卸栈台 · 罐车连接部位', Z03: '包装危货站台 · 包装货位', Z05: '暂存交接区 · 交接容器' } as const
export const sceneEvents = { leak: '泄漏', fire: '火灾', explosion: '爆炸', dispersion: '气体扩散', control: '作业防控检查' } as const
export const sceneStages = ['作业背景', '问题定位', '过程演示', '后果与整改'] as const
export const sceneBoundary = '定性情景演示，非现场复原；不计算超压、热辐射、危害半径或经济损失，不改变原风险等级与整改状态。'
function regionFromBureau(bureau: string): keyof typeof sceneRegions {
  if (/哈尔滨|沈阳/.test(bureau)) return 'NE'
  if (/北京|太原|呼和浩特|郑州/.test(bureau)) return 'NC'
  if (/济南|上海|南昌|武汉/.test(bureau)) return 'EC'
  if (/广州|南宁/.test(bureau)) return 'SC'
  if (/成都|昆明/.test(bureau)) return 'SW'
  if (/西安|兰州|乌鲁木齐|青藏/.test(bureau)) return 'NW'
  return 'NC'
}
export type SceneSource = {
  id: string; title: string; bureau: string; station: string; area: string; cargo: string; un: string
  risk: string; finding: string; basis: string; action: string; measured: string; standard: string
  status: string; version: string; photo: string; photoName: string; created: string; provenance: string
  hazardCode: string; hazardName: string; stage: string; dimension: string; assessmentType: string; hasHazard: boolean
  closedAt?: string
}
export type SceneDraft = {
  schema: 1; region: keyof typeof sceneRegions; zone: keyof typeof sceneObjects; event: keyof typeof sceneEvents
  title: string; problem: string; cause: string; causeConfirmed: boolean; causeEvidence: string; measure: string
  temperature: string; wind: string; direction: string; mappingConfirmed: boolean
  source: SceneSource | null; photo: string; photoName: string; annotation: { x: number; y: number; note: string } | null
  savedAt: string; isTeaching: boolean
  material: MaterialType; release: 'seep' | 'jet' | 'rupture'; ignitionConfirmed: boolean; accumulationConfirmed: boolean; mitigated: boolean
}
export const emptyScene = (): SceneDraft => ({ schema: 1, region: 'NE', zone: 'Z02', event: 'leak', title: '', problem: '', cause: '', causeConfirmed: false, causeEvidence: '', measure: '', temperature: '', wind: '', direction: '', mappingConfirmed: false, source: null, photo: '', photoName: '', annotation: null, savedAt: '', isTeaching: false, material: 'unknown', release: 'seep', ignitionConfirmed: false, accumulationConfirmed: false, mitigated: false })
export function sourceFromAssessment(r: HazardAssessmentRecord, provenance: string): SceneSource {
  const closedAt = r.status === '已闭环' ? (r.rectification_log || []).filter(log => log.operation === 'advance' && log.to_status === '已闭环').map(log => log.created_at).filter(value => Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(b) - Date.parse(a))[0] || '' : ''
  return { id: r.id, title: r.task_name, bureau: r.bureau, station: r.station, area: r.area, cargo: r.cargo, un: r.un_number, risk: r.risk, finding: r.finding || r.hazard_name, basis: r.basis, action: r.action, measured: `${r.data_name}：${r.measured_value}${r.unit}`, standard: r.standard_value, status: r.status, version: String(r.workflow_version ?? '未提供'), photo: r.photo_data, photoName: r.photo_name, created: r.created_at, closedAt, provenance, hazardCode: r.hazard_code || '', hazardName: r.hazard_name || '', stage: r.stage || '', dimension: r.dimension || '', assessmentType: r.assessment_type || '', hasHazard: r.has_hazard === true }
}
export function sceneFromSource(source: SceneSource): SceneDraft {
  const draft = { ...emptyScene(), source, title: source.title, problem: source.finding, measure: source.action, photo: safePhoto(source.photo), photoName: source.photoName }
  const advice = adviseScenario(draft)
  // Platform records are the authoritative source for the scenario. The derived
  // mapping is confirmed by the rule layer so the operator does not retype or
  // manually remap the original finding before opening the demonstration.
  return { ...draft, region: regionFromBureau(source.bureau), zone: advice.zone, event: advice.event, material: advice.material, mappingConfirmed: true }
}
export function demoScene(): SceneDraft {
  return { ...emptyScene(), material: 'flammable_liquid', isTeaching: true, title: '罐车连接部位泄漏教学案例', problem: '假设装卸连接部位出现泄漏，需要定位并检查密封与连接状态。', cause: '连接部位密封失效（教学假设，未经现场核实）', measure: '按现场预案停止相关作业、设置警戒，由专业人员核查连接与密封，整改后按原流程复核。' }
}
export function validateScene(d: SceneDraft): string[] {
  const errors: string[] = []
  if (!d.source) errors.push('请先从原平台选择一条评估记录；独立手动配置已关闭')
  if (!d.title.trim()) errors.push('请填写演示名称')
  if (!d.problem.trim()) errors.push('请填写问题描述')
  if (!d.mappingConfirmed) errors.push('请确认问题与模板对象的映射；未知位置不能直接应用')
  if (d.causeConfirmed && (!d.cause.trim() || !d.causeEvidence.trim())) errors.push('已确认原因必须填写原因和证据依据')
  for (const [key, min, max, label] of [['temperature', -80, 80, '温度'], ['wind', 0, 100, '风速'], ['direction', 0, 359, '风向']] as const) {
    const v = d[key].trim()
    if (v !== '' && (!Number.isFinite(Number(v)) || Number(v) < min || Number(v) > max)) errors.push(`${label}超出可输入范围（${min}–${max}）`)
  }
  if (d.annotation && !d.annotation.note.trim()) errors.push('请填写照片标注说明')
  return [...errors, ...scenarioConditions(d)]
}
export function safePhoto(value: string): string {
  return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length < 4_000_000 ? value : ''
}
// Imported files are configuration snapshots, never authority to modify business records.
export function parseSceneFile(text: string): SceneDraft {
  if (text.length > 5_000_000) throw new Error('配置文件超过 5 MB')
  const v = JSON.parse(text)
  if (!v || v.schema !== 1 || !Object.hasOwn(sceneRegions, v.region) || !Object.hasOwn(sceneObjects, v.zone) || !Object.hasOwn(sceneEvents, v.event)) throw new Error('配置版本、地区、对象或情景无效')
  const d = emptyScene()
  for (const key of ['title', 'problem', 'cause', 'causeEvidence', 'measure', 'temperature', 'wind', 'direction', 'photoName', 'savedAt'] as const) {
    if (v[key] != null && typeof v[key] !== 'string') throw new Error(`字段 ${key} 应为文字`)
    d[key] = (v[key] || '').slice(0, 4000)
  }
  d.region = v.region; d.zone = v.zone; d.event = v.event
  if (v.material != null && !['unknown', 'flammable_liquid', 'flammable_gas', 'toxic_gas', 'corrosive_liquid', 'other'].includes(v.material)) throw new Error('物料性质无效')
  if (v.release != null && !['seep', 'jet', 'rupture'].includes(v.release)) throw new Error('泄漏形态无效')
  d.material = v.material || 'unknown'; d.release = v.release || 'seep'
  d.ignitionConfirmed = v.ignitionConfirmed === true; d.accumulationConfirmed = v.accumulationConfirmed === true; d.mitigated = v.mitigated === true
  d.causeConfirmed = v.causeConfirmed === true
  d.isTeaching = v.isTeaching === true
  d.photo = safePhoto(typeof v.photo === 'string' ? v.photo : '')
  if (v.annotation) {
    const { x, y, note } = v.annotation
    if (!d.photo || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1 || typeof note !== 'string') throw new Error('照片标注坐标无效')
    d.annotation = { x, y, note: note.slice(0, 1000) }
  }
  if (v.source) {
    const source = v.source
    const keys = ['id', 'title', 'bureau', 'station', 'area', 'cargo', 'un', 'risk', 'finding', 'basis', 'action', 'measured', 'standard', 'status', 'version', 'photoName', 'created', 'provenance'] as const
    if (keys.some(k => typeof source[k] !== 'string')) throw new Error('来源快照字段不完整')
    const extra = Object.fromEntries(['hazardCode', 'hazardName', 'stage', 'dimension', 'assessmentType'].map(k => [k, typeof source[k] === 'string' ? source[k].slice(0, 4000) : '']))
    d.source = { ...Object.fromEntries(keys.map(k => [k, source[k].slice(0, 4000)])), ...extra, hasHazard: source.hasHazard === true, photo: '', provenance: '文件导入快照（非实时业务数据）' } as SceneSource
  }
  // Reconfirm the physical mapping even when a saved file says it was confirmed.
  d.mappingConfirmed = false
  return d
}
export function sceneFacts(d: SceneDraft): [string, string][] {
  const s = d.source
  return [
    ['演示名称', d.title], ['资料属性', s?.provenance || (d.isTeaching ? '教学案例 / 非正式业务记录' : '独立演练 / 人工填写')], ['来源编号', s?.id || '未绑定业务记录'],
    ['来源版本 / 时间', s ? `${s.version} / ${s.created}` : '未绑定'], ['来源局站 / 区域', s ? `${s.bureau} / ${s.station} / ${s.area}` : '未绑定'],
    ['模板', `${sceneRegions[d.region]} / 程序化示范 v3`], ['模板对象', sceneObjects[d.zone]], ['情景', `${sceneEvents[d.event]}（人工确认条件）`],
    ['危险源指标', s ? `${s.hazardCode} / ${s.hazardName} / ${s.stage} / ${s.dimension}` : '未绑定'],
    ['物料特征', d.material], ['泄漏形态', d.release], ['点火源 / 积聚条件', `${d.ignitionConfirmed ? '演练确认' : '未确认'} / ${d.accumulationConfirmed ? '演练确认' : '未确认'}`], ['防控对比', d.mitigated ? '假设施加隔离与收集措施，不代表已整改' : '未施加对比措施'],
    ['问题描述', d.problem], ['原因状态', d.causeConfirmed ? '已由填写人确认，依据见下项' : '待核实 / 演练假设'], ['原因', d.cause || '待核实'], ['原因依据', d.causeEvidence || '未提供'],
    ['货物 / UN', s ? `${s.cargo || '未知'} / ${s.un || '未知'}` : '未知'], ['原风险等级', s?.risk || '未带入'], ['原评估依据', s?.basis || '未带入'],
    ['原检测数据', s?.measured || '未带入'], ['原标准 / 阈值', s?.standard || '未带入'], ['原治理状态', s?.status || '未带入'],
    ['整改措施 / 建议', d.measure || '待补充；正式整改在原流程办理'],
    ['温度', d.temperature.trim() === '' ? '未知' : `${d.temperature} °C（演练假设）`], ['风速', d.wind.trim() === '' ? '未知' : `${d.wind} m/s（演练假设）`], ['风向', d.direction.trim() === '' ? '未知' : `${d.direction}°（气象来向 / 演练假设）`],
    ['照片', d.photoName || '未提供'], ['照片标注', d.annotation ? `归一化位置 (${d.annotation.x.toFixed(3)}, ${d.annotation.y.toFixed(3)})：${d.annotation.note}` : '未标注'],
    ['空间标定', '未标定，模板位置不代表实际距离'], ['影响范围 / 经济损失', '未计算 / 未评估'], ['配置快照时间', d.savedAt || '尚未应用'], ['适用边界', sceneBoundary],
  ]
}
export function stageExplanation(d: SceneDraft, stage: number): string {
  return [
    `使用${sceneRegions[d.region]}通用模板；${d.source ? '来源记录仅作为配置快照带入' : d.isTeaching ? '当前为教学案例' : '当前为独立演练'}，布局不是现场测绘。`,
    `${sceneObjects[d.zone]}：${d.problem}；原因${d.causeConfirmed ? '已由填写人确认' : '待核实'}。`,
    `${d.event === 'control' ? '只展示作业检查、防控与应急资源，不生成泄漏或燃烧。' : `按${d.material}与${d.release}形态展示${sceneEvents[d.event]}；已知风向用于可视化漂移，未知时标注中性示意。`} 动画不证明实际发生概率，不表示泄漏必然起火或爆炸。`,
    `${d.measure || '请补充整改措施，并由专业人员确认。'} 影响范围未计算、经济损失未评估；正式复核在原业务流程办理。`,
  ][stage] || ''
}
