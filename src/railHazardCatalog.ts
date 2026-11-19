export type ProblemKind = '人' | '物' | '环' | '管'

export type HazardIssueProfile = {
  kind: ProblemKind
  issue: string
  consequence: string
  event: 'leak' | 'dispersion' | 'fire' | 'control'
  materialHint?: 'flammable_liquid' | 'flammable_gas' | 'toxic_gas' | 'corrosive_liquid' | 'other'
  zoneHint?: 'Z02' | 'Z03' | 'Z05'
}

/**
 * The catalog is distilled from the dynamic assessment workbook supplied with
 * the platform. Patterns intentionally stay human-readable so a reviewer can
 * trace an imported finding to the mapped object and consequence.
 */
export const hazardIssueCatalog: HazardIssueProfile[] = [
  { kind: '人', issue: '劳动防护与身体状态', consequence: '作业人员可能发生吸入、中毒、灼伤或机械伤害，且异常处置反应变慢。', event: 'control', zoneHint: 'Z03' },
  { kind: '人', issue: '资质、培训与操作规程', consequence: '人员误操作或未按隔离、接地、装卸步骤作业，可能诱发泄漏并扩大暴露范围。', event: 'control', zoneHint: 'Z03' },
  { kind: '人', issue: '应急处置与责任意识', consequence: '报警、撤离、警戒和初期处置可能延迟，导致原有危险源后果扩大。', event: 'control', zoneHint: 'Z05' },
  { kind: '人', issue: '危险货物押运人员配置', consequence: '运输途中缺少押运监护，包装破损、货物异常或泄漏可能不能及时发现。', event: 'control', zoneHint: 'Z05' },
  { kind: '物', issue: '包装、标识与货签', consequence: '包装破损可能造成液体渗漏或气体逸散；标识不清可能导致错装、错处置。', event: 'leak', zoneHint: 'Z03' },
  { kind: '物', issue: '输送管道、阀门与装卸设备', consequence: '连接、管道或阀门失效可能形成持续液体泄漏、气体喷漏或腐蚀性物料外溢。', event: 'leak', zoneHint: 'Z02' },
  { kind: '物', issue: '有毒气体检测报警仪', consequence: '检测报警失效可能使有毒气体逸散未被及时识别，人员暴露和疏散风险增加。', event: 'dispersion', materialHint: 'toxic_gas', zoneHint: 'Z02' },
  { kind: '物', issue: '静电、防雷与防爆设施', consequence: '静电积聚、雷击或非防爆设备可能提供点火条件，使可燃蒸气发生着火。', event: 'fire', materialHint: 'flammable_liquid', zoneHint: 'Z02' },
  { kind: '物', issue: '消防、应急设备与事故报警', consequence: '初期火灾、泄漏或人员暴露可能得不到及时报警、冷却、隔离和救援。', event: 'control', zoneHint: 'Z05' },
  { kind: '物', issue: '通风、降温与事故照明', consequence: '通风或照明不足可能导致有害气体积聚、人员误操作和夜间应急处置困难。', event: 'control', zoneHint: 'Z03' },
  { kind: '物', issue: '人体导除静电装置', consequence: '人员静电未有效释放，接触易燃货物或装卸设备时可能形成点火条件。', event: 'fire', materialHint: 'flammable_liquid', zoneHint: 'Z02' },
  { kind: '物', issue: '专用搬运工具防爆防静电', consequence: '搬运摩擦、碰撞或静电火花可能点燃可燃蒸气，造成局部火灾。', event: 'fire', materialHint: 'flammable_liquid', zoneHint: 'Z03' },
  { kind: '物', issue: '防溜、隔离与安全距离', consequence: '车辆移动、作业交叉或隔离不足可能造成碰撞、挤压、泄漏和人员暴露。', event: 'control', zoneHint: 'Z02' },
  { kind: '环', issue: '站场、储罐、仓库与装卸线布局', consequence: '危险源与建筑、线路或人员活动区距离不足，事故影响可能向周边扩散。', event: 'control', zoneHint: 'Z02' },
  { kind: '环', issue: '作业通道、地面、防渗漏与排水', consequence: '液体泄漏后可能沿地面扩散、积聚或渗入环境，人员也可能滑倒受伤。', event: 'leak', zoneHint: 'Z03' },
  { kind: '环', issue: '栈桥防雨、防热与环境条件', consequence: '高温、降雨或湿滑环境可能加速包装和设备异常，增加泄漏与作业伤害风险。', event: 'control', zoneHint: 'Z02' },
  { kind: '环', issue: '区域照明、警示与标识配置', consequence: '警示或照明不足可能导致人员误入、误操作和异常未及时发现。', event: 'control', zoneHint: 'Z03' },
  { kind: '管', issue: '制度、许可、监督与闭环管理', consequence: '风险责任、审批、检查或整改链条断裂，隐患可能持续存在并在异常时扩大。', event: 'control', zoneHint: 'Z05' },
  { kind: '管', issue: '突发事件应急预案', consequence: '缺少预案或演练时，人员撤离、停作业、报告和应急资源调度可能延迟。', event: 'control', zoneHint: 'Z05' },
  { kind: '管', issue: '货物交接、混装混运与数量管控', consequence: '货物属性或数量核对错误可能导致不相容货物混装、超限或错误处置。', event: 'control', zoneHint: 'Z05' },
]

export function classifyHazardIssue(hazardName = '', problem = '', dimension = ''): HazardIssueProfile {
  const text = `${hazardName} ${problem}`
  const profile = hazardIssueCatalog.find(item => {
    const words = item.issue.split(/[、，与及]/).filter(word => word.length >= 2)
    return words.some(word => text.includes(word))
  })
  if (profile) return profile
  if (dimension === '人') return hazardIssueCatalog[0]
  if (dimension === '物') return hazardIssueCatalog[4]
  if (dimension === '环') return hazardIssueCatalog[13]
  if (dimension === '管') return hazardIssueCatalog[17]
  return { kind: '管', issue: '问题属性待核实', consequence: '问题属性和现场条件尚未核实，暂不推断具体事故后果。', event: 'control', zoneHint: 'Z05' }
}

export function issueCatalogText(): string {
  return hazardIssueCatalog.map(item => `${item.kind}｜${item.issue}｜候选后果：${item.consequence}`).join('\n')
}
