export type Bureau = { name: string; short: string; stations: string[] }

// 中国国家铁路集团 18 个铁路局集团公司及其危险货物运输主要办理场站（演示清单，正式版以业务确认为准）
export const bureaus: Bureau[] = [
  { name: '中国铁路哈尔滨局集团有限公司', short: '哈尔滨局', stations: ['哈尔滨南站', '齐齐哈尔站', '牡丹江站', '佳木斯站', '绥芬河站'] },
  { name: '中国铁路沈阳局集团有限公司', short: '沈阳局', stations: ['苏家屯站', '沈阳站', '大连站', '长春站', '通辽站'] },
  { name: '中国铁路北京局集团有限公司', short: '北京局', stations: ['丰台西站', '双桥站', '天津站', '石家庄站', '唐山站'] },
  { name: '中国铁路太原局集团有限公司', short: '太原局', stations: ['太原北站', '大同站', '介休站', '秦皇岛东站', '侯马北站'] },
  { name: '中国铁路呼和浩特局集团有限公司', short: '呼和浩特局', stations: ['呼和浩特站', '包头站', '集宁站', '临河站', '乌海站'] },
  { name: '中国铁路郑州局集团有限公司', short: '郑州局', stations: ['郑州北站', '洛阳站', '新乡站', '商丘站', '南阳站'] },
  { name: '中国铁路武汉局集团有限公司', short: '武汉局', stations: ['武汉北站', '襄阳北站', '宜昌东站', '信阳站', '麻城站'] },
  { name: '中国铁路西安局集团有限公司', short: '西安局', stations: ['西安国际港站', '宝鸡站', '安康站', '汉中站', '延安站'] },
  { name: '中国铁路济南局集团有限公司', short: '济南局', stations: ['济南西站', '青岛站', '烟台站', '淄博站', '临沂站'] },
  { name: '中国铁路上海局集团有限公司', short: '上海局', stations: ['南京东站', '南翔站', '杭州北站', '徐州北站', '合肥北站'] },
  { name: '中国铁路南昌局集团有限公司', short: '南昌局', stations: ['向塘西站', '鹰潭站', '福州东站', '厦门北站', '赣州站'] },
  { name: '中国铁路广州局集团有限公司', short: '广州局', stations: ['江村站', '株洲北站', '长沙东站', '深圳西站', '广州东站'] },
  { name: '中国铁路南宁局集团有限公司', short: '南宁局', stations: ['南宁南站', '柳州南站', '桂林北站', '湛江站', '防城港站'] },
  { name: '中国铁路成都局集团有限公司', short: '成都局', stations: ['成都北站', '重庆西站', '贵阳南站', '绵阳站', '宜宾站'] },
  { name: '中国铁路昆明局集团有限公司', short: '昆明局', stations: ['昆明东站', '曲靖站', '大理站', '开远站'] },
  { name: '中国铁路兰州局集团有限公司', short: '兰州局', stations: ['兰州北站', '银川站', '武威南站', '嘉峪关站'] },
  { name: '中国铁路乌鲁木齐局集团有限公司', short: '乌鲁木齐局', stations: ['乌鲁木齐西站', '库尔勒站', '哈密站', '吐鲁番站'] },
  { name: '中国铁路青藏集团有限公司', short: '青藏集团', stations: ['西宁站', '格尔木站', '拉萨西站', '那曲站'] },
]

export const allBureauCount = bureaus.length
export const allStationCount = bureaus.reduce((sum, bureau) => sum + bureau.stations.length, 0)

const hash = (text: string) => {
  let value = 0
  for (let index = 0; index < text.length; index += 1) {
    value = (value * 31 + text.charCodeAt(index)) % 100003
  }
  return value
}

export type StationRisk = { major: number; bigger: number; general: number; low: number; total: number; overdue: number; closing: number; index: number }

// 场站演示指标：按“铁路局 + 场站”确定性生成，保证同一场站每次展示一致
export function stationRisk(bureau: string, station: string): StationRisk {
  const seed = hash(`${bureau}｜${station}`)
  const major = seed % 2
  const bigger = seed % 3
  const general = 1 + (seed % 4)
  const low = 2 + (seed % 5)
  return {
    major,
    bigger,
    general,
    low,
    total: major + bigger + general + low,
    overdue: seed % 4,
    closing: 76 + (seed % 20),
    index: 42 + (seed % 17),
  }
}

export type ScopeMetrics = {
  bureaus: number
  stations: number
  major: number
  bigger: number
  general: number
  low: number
  total: number
  overdue: number
  closing: number
  index: number
  stationNames: string[]
}

// 统计范围聚合：全部铁路局 / 单个铁路局 / 单个场站
export function scopeMetrics(bureauName: string, stationName: string): ScopeMetrics {
  const scopedBureaus = bureauName ? bureaus.filter((bureau) => bureau.name === bureauName) : bureaus
  const targets: Array<{ bureau: string; station: string }> = []
  for (const bureau of scopedBureaus) {
    const stations = stationName ? bureau.stations.filter((station) => station === stationName) : bureau.stations
    for (const station of stations) targets.push({ bureau: bureau.name, station })
  }
  if (!targets.length) return scopeMetrics('', '')

  let major = 0
  let bigger = 0
  let general = 0
  let low = 0
  let overdue = 0
  let closingWeighted = 0
  let indexSum = 0
  const stationNames: string[] = []
  for (const target of targets) {
    const risk = stationRisk(target.bureau, target.station)
    major += risk.major
    bigger += risk.bigger
    general += risk.general
    low += risk.low
    overdue += risk.overdue
    closingWeighted += risk.closing * risk.total
    indexSum += risk.index
    stationNames.push(target.station)
  }
  const total = major + bigger + general + low
  return {
    bureaus: scopedBureaus.length,
    stations: targets.length,
    major,
    bigger,
    general,
    low,
    total,
    overdue,
    closing: Math.round((closingWeighted / total) * 10) / 10,
    index: Math.round((indexSum / targets.length) * 10) / 10,
    stationNames,
  }
}

export function scopeLabel(bureauName: string, stationName: string) {
  if (stationName) {
    const bureau = bureaus.find((item) => item.stations.includes(stationName))
    return `${bureau ? bureau.short : ''} · ${stationName}`.replace(/^ · /, '')
  }
  if (bureauName) {
    const bureau = bureaus.find((item) => item.name === bureauName)
    return bureau ? `${bureau.short} · 全部场站` : '全部场站'
  }
  return `全国 ${allBureauCount} 个铁路局 · ${allStationCount} 个场站`
}

export type PeriodKey = '近7日' | '近30日' | '本年度'

export const periodOptions: PeriodKey[] = ['近7日', '近30日', '本年度']

export type PeriodProfile = {
  label: string
  eyebrow: string
  sample: string
  riskFactor: number
  indexDelta: number
  closingDelta: number
  overdueFactor: number
}

// 当前日期信息：用于顶栏日期、统计周期口径文案
export function currentDateInfo(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const start = new Date(year, 0, 1)
  const passedDays = Math.floor((date.getTime() - start.getTime()) / 86400000)
  const week = Math.ceil((passedDays + start.getDay() + 1) / 7)
  return { year, month, week }
}

export function todayLabel(date = new Date()) {
  const day = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(date)
  return `${day} ${weekday}`
}

export function timeLabel(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

// 统计周期口径：周期越长，累计类指标越大，闭环率与样本口径随之变化
export function periodProfile(period: string): PeriodProfile {
  const { year, month, week } = currentDateInfo()
  if (period === '近30日') {
    return { label: '近 30 日', eyebrow: `安全态势 · ${year}年${month}月`, sample: '样本：30 个统计日', riskFactor: 2.4, indexDelta: 2.4, closingDelta: 1.8, overdueFactor: 2.2 }
  }
  if (period === '本年度') {
    return { label: '本年度', eyebrow: `安全态势 · ${year}年度`, sample: `样本：${month} 个统计月`, riskFactor: 7.6, indexDelta: 5.8, closingDelta: 3.4, overdueFactor: 5.4 }
  }
  return { label: '近 7 日', eyebrow: `安全态势 · ${year}年第${week}周`, sample: '样本：7 个统计日', riskFactor: 1, indexDelta: 0, closingDelta: 0, overdueFactor: 1 }
}

export type RiskLevel = '重大' | '较大' | '一般' | '低'

export type HazardRecord = {
  id: string
  title: string
  location: string
  bureau: string
  station: string
  risk: RiskLevel
  owner: string
  due: string
  stage: number
  type: string
  overdue: boolean
  source: '静态' | '动态'
}

const hazardTemplates: Array<{ type: string; area: string; title: string; risk: RiskLevel }> = [
  { type: '作业行为', area: '罐车装卸区', title: '装卸作业未按规定设置安全警戒', risk: '重大' },
  { type: '作业行为', area: '罐车装卸区', title: '罐体密封状态检查流于形式', risk: '重大' },
  { type: '作业行为', area: '装卸作业区', title: '装卸前未核对危险货物品名与包装', risk: '较大' },
  { type: '作业行为', area: '罐车装卸区', title: '危险货物装卸监护人员未按时到岗', risk: '较大' },
  { type: '作业行为', area: '装卸作业区', title: '押运人员个体防护装备佩戴不规范', risk: '一般' },
  { type: '设备设施', area: '装卸作业区', title: '危险货物装卸区静电接地检测记录不完整', risk: '较大' },
  { type: '设备设施', area: '罐车装卸栈台', title: '罐车装卸栈台消防器材配置数量不足', risk: '重大' },
  { type: '设备设施', area: '储罐区', title: '储罐区可燃气体报警器未按期校验', risk: '较大' },
  { type: '设备设施', area: '危货仓库', title: '危货仓库防爆照明灯具防护等级不达标', risk: '一般' },
  { type: '设备设施', area: '装卸作业区', title: '装卸作业区防雷接地电阻测试记录缺失', risk: '一般' },
  { type: '设备设施', area: '罐车检修线', title: '罐车紧急切断装置动作试验记录不全', risk: '较大' },
  { type: '设备设施', area: '危货仓库', title: '危货仓库通风设施定期维护记录缺项', risk: '一般' },
  { type: '管理制度', area: '安全管理室', title: '危险货物运输应急预案未按期组织演练', risk: '较大' },
  { type: '管理制度', area: '安全管理室', title: '从业人员危险货物运输资格证复审超期', risk: '较大' },
  { type: '管理制度', area: '安全管理室', title: '隐患排查治理台账更新不及时', risk: '一般' },
  { type: '管理制度', area: '货运业务室', title: '危险货物运输单据归档不完整', risk: '低' },
  { type: '管理制度', area: '货运业务室', title: '承运人资质复核记录缺少签署', risk: '一般' },
  { type: '应急准备', area: '应急物资库', title: '危险货物事故应急物资清单未按季度核对', risk: '一般' },
  { type: '应急准备', area: '装卸作业区', title: '装卸区消防通道被临时占用', risk: '重大' },
  { type: '应急准备', area: '应急物资库', title: '泄漏应急处置器材取用位置标识不明确', risk: '一般' },
  { type: '应急准备', area: '装卸作业区', title: '应急救援演练记录缺少影像证据', risk: '低' },
  { type: '设备设施', area: '罐车检修线', title: '罐车走行部检查记录缺少复核签字', risk: '较大' },
]

const ownerPool = ['王建国', '李海涛', '张卫国', '刘志强', '陈晓东', '赵敏', '孙立新', '周文斌', '郑海峰', '马继东', '许庆丰', '何晓林', '杨春华', '徐立成']

const formatDue = (offsetDays: number) => {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return `${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`
}

// 隐患台账：覆盖 18 个铁路局集团公司的主要危货办理场站，驾驶舱统计与整改闭环共用同一份数据
export function buildHazards(): HazardRecord[] {
  const records: HazardRecord[] = []
  let serial = 1
  for (const bureau of bureaus) {
    for (const station of bureau.stations) {
      const seed = hash(`${bureau.name}｜${station}`)
      const count = seed % 3
      for (let index = 0; index < count; index += 1) {
        const local = seed + index * 977
        const template = hazardTemplates[local % hazardTemplates.length]
        const stage = [4, 4, 4, 4, 4, 4, 3, 3, 1][local % 9]
        const overdue = stage < 4 && local % 4 === 0
        records.push({
          id: `ZG-${new Date().getFullYear()}-${String(serial).padStart(4, '0')}`,
          title: template.title,
          location: `${station} · ${template.area}`,
          bureau: bureau.name,
          station,
          risk: template.risk,
          owner: ownerPool[local % ownerPool.length],
          due: formatDue(overdue ? -(4 + (local % 14)) : 1 + (local % 16)),
          stage,
          type: template.type,
          overdue,
          source: template.type === '作业行为' ? '动态' : '静态',
        })
        serial += 1
      }
    }
  }
  return records
}

export function findBureauOfStation(station: string) {
  const matched = bureaus.find((bureau) => bureau.stations.includes(station))
  return matched ? matched.name : ''
}

export type TrendPoint = { day: string; score: number; issue: number }

const weeklyValues: Array<[number, number]> = [[71, 28], [66, 24], [62, 22], [58, 19], [55, 17], [49, 14], [44, 11]]

// 按当前日期生成刻度：offset 为相对今天的天数（0 表示今天）
function dayLabel(offsetDays: number) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function monthLabel(offsetMonths: number) {
  const date = new Date()
  date.setMonth(date.getMonth() + offsetMonths)
  return `${String(date.getMonth() + 1).padStart(2, '0')}月`
}

// 趋势序列：近 7 日与近 30 日按当前日期回推，本年度按当前月份回推
export function trendSeries(period: string): TrendPoint[] {
  if (period === '近30日') {
    return Array.from({ length: 30 }, (_, index) => ({
      day: dayLabel(index - 29),
      score: Math.round(74 - index * 1.05 + 3 * Math.sin(index / 1.6)),
      issue: Math.max(6, Math.round(31 - index * 0.78 + 2.4 * Math.sin(index / 1.2))),
    }))
  }
  if (period === '本年度') {
    const monthCount = currentDateInfo().month
    return Array.from({ length: monthCount }, (_, index) => ({
      day: monthLabel(index - monthCount + 1),
      score: Math.round(78 - index * 3.6 + 4.2 * Math.sin(index / 1.1)),
      issue: Math.max(12, Math.round(64 - index * 5.4 + 5 * Math.sin(index / 0.9))),
    }))
  }
  return weeklyValues.map(([score, issue], index) => ({ day: dayLabel(index - 6), score, issue }))
}
