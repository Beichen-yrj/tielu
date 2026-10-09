import { useMemo, useState } from 'react'
import { AlertOctagon, AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Filter, ShieldAlert } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HazardAssessmentRecord, RiskLevel } from './api/hazardAssessments'
import { bureaus } from './railwayScope'
import { isActiveHazard } from './rectificationWorkflow'

const levels: RiskLevel[] = ['低', '一般', '较大', '重大']
const colors: Record<RiskLevel, string> = { 低: '#24816b', 一般: '#d99a1c', 较大: '#e56f22', 重大: '#d84343' }
const bureauShort = (name: string) => bureaus.find((item) => item.name === name)?.short || name

export function HazardAnalysisPanel({ records, onHistory }: { records: HazardAssessmentRecord[]; onHistory: () => void }) {
  const [typeFilter, setTypeFilter] = useState('全部')
  const [riskFilter, setRiskFilter] = useState('全部')
  const hazards = useMemo(() => records.filter(isActiveHazard), [records])
  const filtered = hazards.filter((item) => (typeFilter === '全部' || item.assessment_type === typeFilter) && (riskFilter === '全部' || item.risk === riskFilter))
  const riskData = levels.map((name) => ({ name, value: hazards.filter((item) => item.risk === name).length, color: colors[name] }))
  const typeData = levels.map((risk) => ({ risk, 静态: hazards.filter((item) => item.risk === risk && item.assessment_type === '静态').length, 动态: hazards.filter((item) => item.risk === risk && item.assessment_type === '动态').length }))
  const major = hazards.filter((item) => item.risk === '重大').length
  const bigger = hazards.filter((item) => item.risk === '较大').length
  const general = hazards.filter((item) => item.risk === '一般').length
  const low = hazards.filter((item) => item.risk === '低').length

  return <div className="content">
    <div className="page-heading"><div><div className="eyebrow">静态 + 动态 · 四级分类</div><h1>隐患分析</h1><p>仅统计评估中识别出的隐患，按低、一般、较大、重大分类并保留对应整改措施</p></div><div className="heading-actions"><button className="button secondary" onClick={onHistory}><Clock3 size={16} />历史分析</button></div></div>
    <div className="metric-grid hazard-level-cards">
      <LevelCard risk="重大" value={major} icon={<AlertOctagon size={18} />} />
      <LevelCard risk="较大" value={bigger} icon={<ShieldAlert size={18} />} />
      <LevelCard risk="一般" value={general} icon={<AlertTriangle size={18} />} />
      <LevelCard risk="低" value={low} icon={<CheckCircle2 size={18} />} />
    </div>
    <section className="hazard-analysis-grid">
      <article className="panel"><div className="panel-title"><div><h2>隐患等级分布</h2><p>当前共识别 {hazards.length} 项隐患</p></div></div><div className="hazard-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={riskData} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="78%" paddingAngle={3} isAnimationActive={false}>{riskData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value) => [`${value} 项`, '数量']} /><Legend /></PieChart></ResponsiveContainer></div><p className="chart-footnote">重大和较大风险应优先制定责任、措施和期限；一般与低风险仍保留复核记录，避免重复出现。</p></article>
      <article className="panel"><div className="panel-title"><div><h2>静态与动态风险对比</h2><p>按评估方式和风险等级交叉统计</p></div></div><div className="hazard-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={typeData} margin={{ top: 12, right: 16, bottom: 0, left: -18 }}><CartesianGrid stroke="#e8edf2" vertical={false} /><XAxis dataKey="risk" tick={{ fontSize: 10, fill: '#788797' }} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#788797' }} /><Tooltip /><Legend /><Bar dataKey="静态" fill="#1d6fa5" radius={[3,3,0,0]} isAnimationActive={false} /><Bar dataKey="动态" fill="#e08b2e" radius={[3,3,0,0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div><p className="chart-footnote">静态隐患来自明确的不符合结论；动态隐患来自可能性 L 与后果严重度 C 的矩阵计算。</p></article>
    </section>
    <section className="panel hazard-analysis-table"><div className="panel-title"><div><h2>隐患明细与整改建议</h2><p>可按评估方式和风险等级筛选</p></div></div><div className="hazard-toolbar"><div className="hazard-filter"><Filter size={14} /><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option>全部</option><option>静态</option><option>动态</option></select><select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}><option>全部</option>{levels.map((item) => <option key={item}>{item}</option>)}</select></div><span>共 {filtered.length} 项</span></div>{filtered.length ? <div className="table-scroll"><table className="check-table"><thead><tr><th>危险源</th><th>环节 / 维度</th><th>评估方式</th><th>风险等级</th><th>检测证据</th><th>隐患分析</th><th>整改措施</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td><strong>{record.hazard_name}</strong><small>{record.bureau ? `${bureauShort(record.bureau)} · ` : ''}{record.station} · {record.area}</small></td><td>{record.stage} / {record.dimension}</td><td>{record.assessment_type}</td><td><span style={{ color: colors[record.risk] }}>{record.risk}风险</span></td><td>{record.data_name}：{record.measured_value}{record.unit}</td><td>{record.finding}</td><td>{record.action}</td></tr>)}</tbody></table></div> : <div className="empty-state"><CheckCircle2 size={24} /><strong>当前筛选条件下没有隐患</strong><span>可调整评估方式或风险等级筛选条件</span></div>}</section>
  </div>
}

export function SafetyTrendPanel({ records, onBack }: { records: HazardAssessmentRecord[]; onBack: () => void }) {
  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; 评估数: number; 隐患数: number; 风险指数: number; count: number }>()
    for (const record of [...records].reverse()) {
      const date = record.created_at.split(' ')[0]
      const item = map.get(date) ?? { date, 评估数: 0, 隐患数: 0, 风险指数: 0, count: 0 }
      item.评估数 += 1; item.隐患数 += record.has_hazard ? 1 : 0; item.风险指数 += record.score; item.count += 1
      map.set(date, item)
    }
    return [...map.values()].slice(-14).map((item) => ({ ...item, 风险指数: Math.round((item.风险指数 / item.count) * 10) / 10 }))
  }, [records])
  const stageData = ['进场', '装卸', '搬运'].map((stage) => ({ stage, 评估数: records.filter((item) => item.stage === stage).length, 隐患数: records.filter((item) => item.stage === stage && item.has_hazard).length }))
  return <div className="content">
    <div className="page-heading"><div><div className="eyebrow">历史记录 · 趋势追踪</div><h1>历史分析</h1><p>基于已保存的真实评估记录展示数量、隐患和风险值变化</p></div><div className="heading-actions"><button className="button secondary" onClick={onBack}><ArrowLeft size={16} />返回隐患分析</button></div></div>
    <section className="hazard-analysis-grid history-analysis-grid">
      <article className="panel"><div className="panel-title"><div><h2>评估与隐患变化</h2><p>最近 14 个有记录的日期</p></div></div><div className="hazard-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 12, right: 18, bottom: 0, left: -18 }}><CartesianGrid stroke="#e8edf2" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 9, fill: '#788797' }} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#788797' }} /><Tooltip /><Legend /><Line dataKey="评估数" stroke="#1d6fa5" strokeWidth={2} isAnimationActive={false} /><Line dataKey="隐患数" stroke="#d84343" strokeWidth={2} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><p className="chart-footnote">评估数反映当日完成的危险源评估记录；隐患数只统计形成隐患的静态或动态评估。</p></article>
      <article className="panel"><div className="panel-title"><div><h2>作业环节分布</h2><p>进场、装卸和搬运评估对比</p></div></div><div className="hazard-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={stageData} margin={{ top: 12, right: 18, bottom: 0, left: -18 }}><CartesianGrid stroke="#e8edf2" vertical={false} /><XAxis dataKey="stage" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="评估数" fill="#1d6fa5" isAnimationActive={false} /><Bar dataKey="隐患数" fill="#e08b2e" isAnimationActive={false} /></BarChart></ResponsiveContainer></div><p className="chart-footnote">对比各作业环节评估覆盖量与隐患数量，隐患占比偏高的环节应增加复核频次。</p></article>
    </section>
    {records.length === 0 && <section className="panel empty-state"><CheckCircle2 size={24} /><strong>暂无可分析的历史数据</strong><span>完成评估后，趋势图会按真实记录更新</span></section>}
  </div>
}

function LevelCard({ risk, value, icon }: { risk: RiskLevel; value: number; icon: React.ReactNode }) {
  return <article className="metric-card" style={{ borderTop: `3px solid ${colors[risk]}` }}><div className="metric-top"><span>{risk}风险</span><div className="metric-icon" style={{ color: colors[risk], background: `${colors[risk]}14` }}>{icon}</div></div><div className="metric-value">{value}<small>项</small></div><div className="metric-bottom"><span style={{ color: colors[risk], fontSize: 10 }}>占已识别隐患</span></div></article>
}
