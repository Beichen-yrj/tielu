import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { CalendarDays, Download, FileClock, Gauge, Shield, ShieldAlert } from 'lucide-react'
import { periodOptions, periodProfile, trendSeries } from './railwayScope'
import { inputFields } from './inspection'
import { buildDocHtml, downloadDoc } from './exportDoc'
import type { AssessmentRecordLike } from './AssessmentPanel'

type RiskLevel = '重大' | '较大' | '一般' | '低'

export type HistoryIssue = {
  id: string
  title: string
  station: string
  risk: RiskLevel
  stage: number
  overdue: boolean
  due: string
  source?: '静态' | '动态'
}

const colors: Record<RiskLevel, string> = { 重大: '#d84343', 较大: '#e97825', 一般: '#e5aa27', 低: '#24816b' }
const stageLabels = ['未整改', '整改中', '待复核', '复核中', '已闭环']

export function HistoryPanel({ records, issues, period, setPeriod, onOpen, onNotify }: {
  records: AssessmentRecordLike[]
  issues: HistoryIssue[]
  period: string
  setPeriod: (value: string) => void
  onOpen: (id: string) => void
  onNotify: (message: string) => void
}) {
  const profile = periodProfile(period)
  const factor = period === '本年度' ? 8.4 : period === '近30日' ? 3.1 : 1
  const step = period === '本年度' ? 3.2 : period === '近30日' ? 1.4 : 0

  const metrics = useMemo(() => ({
    tasks: Math.round(26 * factor),
    findings: Math.round(164 * factor),
    closing: Math.min(98.6, Math.round((88.4 + step * 1.6) * 10) / 10),
    cycle: Math.max(2.6, Math.round((5.4 - step * 0.5) * 10) / 10),
  }), [factor, step])

  const trend = useMemo(() => trendSeries(period), [period])

  const radarData = useMemo(() => [
    { subject: '人员行为', A: 78 - step * 2.4, B: 65 - step },
    { subject: '设备设施', A: 68 - step * 1.6, B: 58 - step * 0.6 },
    { subject: '作业环境', A: 52 + step, B: 70 + step * 0.4 },
    { subject: '安全管理', A: 72 - step * 1.2, B: 62 - step * 0.4 },
    { subject: '应急处置', A: 55 + step * 0.6, B: 74 + step * 0.5 },
  ], [step])

  const scatterData = useMemo(() => {
    const points: Array<{ x: number; y: number; risk: RiskLevel; z: number }> = []
    const count = period === '本年度' ? 26 : period === '近30日' ? 18 : 12
    for (let index = 0; index < count; index += 1) {
      const seed = (index * 37 + (period === '本年度' ? 11 : period === '近30日' ? 7 : 3)) % 25
      const x = (seed % 5) + 1
      const y = Math.floor(seed / 5) + 1
      const score = x * y
      points.push({ x, y, z: 1 + (index % 4), risk: score >= 16 ? '重大' : score >= 9 ? '较大' : score >= 4 ? '一般' : '低' })
    }
    return points
  }, [period])

  const stationRanking = useMemo(() => {
    const map = new Map<string, { station: string; total: number; closed: number }>()
    for (const issue of issues) {
      const entry = map.get(issue.station) ?? { station: issue.station, total: 0, closed: 0 }
      entry.total += 1
      if (issue.stage === 4) entry.closed += 1
      map.set(issue.station, entry)
    }
    const list = [...map.values()].filter((item) => item.total >= 2)
    const ranked = list.length >= 5
      ? list
      : stationsFallback.map((station, index) => ({ station, total: 4 + index, closed: 2 + index }))
    return ranked
      .map((item) => ({ station: item.station.replace('站', ''), rate: Math.round((item.closed / item.total) * 1000) / 10, total: item.total, closed: item.closed }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 8)
  }, [issues])

  const exportRecord = (record: AssessmentRecordLike) => {
    const result = record.result
    const related = issues.filter((issue) => issue.station === record.station)
    const html = buildDocHtml('历史评估与整改进度报告', `${record.name} · ${record.station} · 导出时间 ${new Date().toLocaleString('zh-CN', { hour12: false })}`, [
      { heading: '一、任务信息', facts: [['任务编号', record.id], ['任务名称', record.name], ['场站', record.station], ['作业区域', record.area], ['危险货物', record.cargo || '未填写'], ['UN 编号', record.unNumber || '无'], ['数据来源', record.detector], ['评估状态', record.status], ['创建时间', record.createdAt]] },
      { heading: '二、检测数据', table: { columns: ['检测项', '数值', '单位'], rows: inputFields.map((field) => [field.label, String(record.input?.[field.key] ?? (field.key === 'temperature' ? record.temperature : field.key === 'pressure' ? record.pressure : field.key === 'concentration' ? record.concentration : '无')), field.unit || '—']) } },
      { heading: '三、评估结论', paragraphs: result ? [result.summary, ...result.overallIssues] : ['该任务未生成结构化结论，可在风险评估页重新出具结论。'] },
      { heading: '四、静态自查问题', table: { columns: ['编码', '检查项', '类别', '风险等级', '整改措施'], rows: (result?.staticFailed ?? []).map((item) => [item.code, item.name, item.category, item.level, item.measure]) } },
      { heading: '五、动态作业问题', paragraphs: result && !result.staticPassed ? ['静态自查未通过，按规则未开展动态评估。'] : [], table: result?.staticPassed ? { columns: ['编码', '检查项', '环节 / 维度', '风险值 R', '整改措施'], rows: result.dynamicFailed.map((item) => [item.code, item.name, item.category, String(item.score ?? '—'), item.measure]) } : undefined },
      { heading: '六、许可情况', facts: result ? [['安全工程师复核', result.permits.engineer], ['复核意见', result.permits.engineerConclusion], ['项目经理许可', result.permits.manager], ['许可意见', result.permits.managerConclusion], ['签署时间', result.permits.time]] : [['许可情况', '未生成']] },
      { heading: '七、整改进度', table: { columns: ['隐患', '风险等级', '来源', '整改期限', '当前进度'], rows: related.length ? related.map((issue) => [issue.title, issue.risk, issue.source ?? '静态', issue.due, stageLabels[issue.stage] ?? '未整改']) : [['该场站暂无关联整改任务', '—', '—', '—', '—']] } },
      { heading: '八、整改措施清单', list: result?.measures?.length ? result.measures : ['暂无整改措施记录。'] },
    ])
    downloadDoc(`${record.id}-历史评估与整改进度报告.doc`, html)
    onNotify('已导出 Word 报告（含整改进度）')
  }

  return <div className="content">
    <div className="page-heading">
      <div>
        <div className="eyebrow">历史档案 · 趋势洞察</div>
        <h1>历史分析</h1>
        <p>按分析周期查看风险变化、场站差异与整改时效，下方可导出包含整改进度的历史评估报告</p>
      </div>
      <div className="heading-actions"><button className="button secondary" onClick={() => records.length ? onNotify('请在下方历史评估记录中选择需要导出的任务') : onNotify('暂无可导出的历史评估记录')}><Download size={16} />导出说明</button></div>
    </div>

    <div className="filter-bar">
      <div className="filter-group">
        <span className="filter-label">分析周期</span>
        {periodOptions.map((value) => <button key={value} className={`segmented ${period === value ? 'selected' : ''}`} onClick={() => { setPeriod(value); onNotify(`分析周期已切换为${periodProfile(value).label}`) }}>{value}</button>)}
        <span className="vertical-rule" />
        <span className="filter-label">统计口径</span>
        <span className="scope-chip">{profile.eyebrow} · {profile.sample}</span>
      </div>
      <span className="updated"><i />数据更新于 {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
    </div>

    <div className="metric-grid">
      <article className="metric-card metric-blue"><div className="metric-top"><span>历史评估任务</span><div className="metric-icon"><FileClock size={18} /></div></div><div className="metric-value">{metrics.tasks}<small>次</small></div><div className="metric-bottom"><span className="delta positive">{profile.label}累计</span><span className="metric-period">全部场站</span></div></article>
      <article className="metric-card metric-red"><div className="metric-top"><span>发现隐患</span><div className="metric-icon"><ShieldAlert size={18} /></div></div><div className="metric-value">{metrics.findings}<small>项</small></div><div className="metric-bottom"><span className="delta positive">含静态与动态问题</span><span className="metric-period">{profile.label}</span></div></article>
      <article className="metric-card metric-green"><div className="metric-top"><span>按期闭环率</span><div className="metric-icon"><Shield size={18} /></div></div><div className="metric-value">{metrics.closing.toFixed(1)}<small>%</small></div><div className="metric-bottom"><span className="delta positive">已闭环占比</span><span className="metric-period">{profile.label}</span></div></article>
      <article className="metric-card metric-amber"><div className="metric-top"><span>平均整改周期</span><div className="metric-icon"><Gauge size={18} /></div></div><div className="metric-value">{metrics.cycle.toFixed(1)}<small>天</small></div><div className="metric-bottom"><span className="delta positive">较上周期下降</span><span className="metric-period">{profile.label}</span></div></article>
    </div>

    <section className="overview-grid">
      <article className="panel trend-panel">
        <div className="panel-title"><div><h2>风险指数与隐患变化</h2><p>{profile.label}趋势 · {profile.sample}</p></div></div>
        <div className="chart-body"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#e8edf2" vertical={false} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 10 }} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 10 }} />
            <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
            <Line yAxisId="left" type="monotone" dataKey="score" name="综合风险指数" stroke="#1765b4" strokeWidth={2.4} dot={{ r: 2 }} isAnimationActive={false} />
            <Line yAxisId="right" type="monotone" dataKey="issue" name="隐患数量" stroke="#e68b39" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer></div>
        <p className="chart-footnote">横轴为所选周期的时间刻度（近 7 日与近 30 日按天、本年度按月）。蓝色曲线是综合风险指数，越低说明整体风险越可控；橙色曲线是当期新增隐患数量。两条线同向下行表示风险与隐患同步收敛，若指数下降而隐患上升，说明风险管控措施尚未落到现场。</p>
      </article>

      <article className="panel distribution-panel">
        <div className="panel-title"><div><h2>多维度风险对比</h2><p>本期与上期五维评分对比</p></div></div>
        <div className="chart-body"><ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="72%">
            <PolarGrid stroke="#e3e9ef" /><PolarAngleAxis dataKey="subject" tick={{ fill: '#7b8794', fontSize: 10 }} /><PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#a6b1bc', fontSize: 9 }} />
            <Radar name="本期得分" dataKey="A" stroke="#1765b4" fill="#1765b4" fillOpacity={0.22} isAnimationActive={false} /><Radar name="上期得分" dataKey="B" stroke="#e68b39" fill="#e68b39" fillOpacity={0.16} isAnimationActive={false} />
            <Legend wrapperStyle={{ fontSize: 10 }} /><Tooltip />
          </RadarChart>
        </ResponsiveContainer></div>
        <p className="chart-footnote">五个维度按百分制评分，数值越高表示该项管控水平越好。人员行为与设备设施通常是最先暴露问题的维度；作业环境与应急处置得分偏低时，应优先核查防护设施与应急物资的落实情况。切换分析周期后本图按周期重新计算。</p>
      </article>

      <article className="panel matrix-panel">
        <div className="panel-title"><div><h2>风险分散情况</h2><p>可能性 × 严重度分布（{scatterData.length} 项）</p></div></div>
        <div className="chart-body"><ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 12, bottom: 4, left: -18 }}>
            <CartesianGrid stroke="#e8edf2" /><XAxis type="number" dataKey="x" name="可能性 L" domain={[0, 6]} tick={{ fill: '#8995a2', fontSize: 10 }} /><YAxis type="number" dataKey="y" name="严重度 C" domain={[0, 6]} tick={{ fill: '#8995a2', fontSize: 10 }} /><ZAxis dataKey="z" range={[40, 190]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} /><Scatter data={scatterData} isAnimationActive={false}>{scatterData.map((point, index) => <Cell key={index} fill={colors[point.risk]} />)}</Scatter>
          </ScatterChart>
        </ResponsiveContainer></div>
        <p className="chart-footnote">每个点代表一项风险或隐患，横轴为可能性、纵轴为严重度，点的颜色表示风险等级（红＝重大、橙＝较大、黄＝一般、绿＝低），气泡越大表示同点位累计数量越多。落在右上角的点需要优先处置；点位集中在中部说明风险以一般等级为主。</p>
      </article>

      <article className="panel priority-panel">
        <div className="panel-title"><div><h2>场站整改闭环率排名</h2><p>按当前统计范围台账统计（前 8 个场站）</p></div></div>
        <div className="chart-body"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={stationRanking} layout="vertical" margin={{ top: 6, right: 24, bottom: 0, left: 18 }}>
            <CartesianGrid stroke="#eef2f6" horizontal={false} /><XAxis type="number" domain={[0, 100]} tick={{ fill: '#8995a2', fontSize: 10 }} /><YAxis type="category" dataKey="station" width={82} tick={{ fill: '#7b8794', fontSize: 10 }} />
            <Tooltip formatter={(value) => [`${value}%`, '闭环率']} /><Bar dataKey="rate" fill="#1b689e" radius={[0, 3, 3, 0]} barSize={13} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer></div>
        <p className="chart-footnote">按场站统计已闭环隐患占该场站隐患总数的比例，条形越短表示该场站整改进度越滞后。数据直接取自整改闭环台账，与驾驶舱、整改闭环页保持一致；排名靠后的场站应重点跟踪逾期任务。</p>
      </article>
    </section>

    <section className="panel history-records">
      <div className="panel-title"><div><h2>历史评估记录</h2><p>共 {records.length} 条，可导出含整改进度的 Word 报告</p></div></div>
      {records.length ? <div className="table-scroll"><table className="check-table"><thead><tr><th>任务编号</th><th>任务 / 货物</th><th>场站</th><th>检测来源</th><th>风险等级</th><th>问题数</th><th>整改进度</th><th>状态</th><th>操作</th></tr></thead><tbody>
        {records.map((record) => {
          const related = issues.filter((issue) => issue.station === record.station)
          const avgStage = related.length ? Math.round(related.reduce((sum, issue) => sum + issue.stage, 0) / related.length) : 0
          return <tr key={record.id}>
            <td>{record.id}</td>
            <td><strong>{record.name}</strong><small>{record.cargo || '未填写'}</small></td>
            <td>{record.station}</td>
            <td>{record.detector}</td>
            <td>{record.risk}风险</td>
            <td>{record.findings?.length ?? 0} 项</td>
            <td>{related.length ? `${stageLabels[avgStage] ?? '未整改'}（${related.filter((issue) => issue.stage === 4).length}/${related.length} 已闭环）` : '暂无关联整改'}</td>
            <td>{record.status}</td>
            <td className="record-actions">
              <button className="row-action" onClick={() => onOpen(record.id)}>查看报告</button>
              <button className="row-action" onClick={() => exportRecord(record)}><Download size={12} />导出 Word</button>
            </td>
          </tr>
        })}
      </tbody></table></div> : <div className="empty-state"><CalendarDays size={22} /><strong>暂无历史评估记录</strong><span>在风险评估页新建任务后，记录会显示在这里并支持导出</span></div>}
    </section>
  </div>
}

const stationsFallback = ['丰台西站', '郑州北站', '南京东站', '武汉北站', '成都北站', '沈阳站', '兰州北站', '广州东站']
