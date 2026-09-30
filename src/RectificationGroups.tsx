import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, ChevronDown, Clock3 } from 'lucide-react'

type RiskLevel = '重大' | '较大' | '一般' | '低'

export type RectificationIssue = {
  id: string
  title: string
  location: string
  risk: RiskLevel
  owner: string
  due: string
  stage: number
  type: string
  overdue: boolean
  source?: '静态' | '动态'
}

const colors: Record<RiskLevel, string> = { 重大: '#d84343', 较大: '#e97825', 一般: '#e5aa27', 低: '#24816b' }
const stageLabels = ['未整改', '整改中', '待复核', '复核中', '已闭环']
const order: Record<RiskLevel, number> = { 重大: 0, 较大: 1, 一般: 2, 低: 3 }

function RiskChip({ risk }: { risk: RiskLevel }) {
  return <span className="risk-badge" style={{ color: colors[risk], background: `${colors[risk]}15` }}><i style={{ background: colors[risk] }} />{risk}风险</span>
}

function StageBar({ stage }: { stage: number }) {
  return <span className="stage-bar">{[0, 1, 2, 3, 4].map((step) => <i key={step} className={step <= stage ? 'on' : ''} />)}<b>{stageLabels[stage] ?? '未整改'}</b></span>
}

export function RectificationGroups({ issues, onSelect, moveStage, scopeText }: {
  issues: RectificationIssue[]
  onSelect: (issue: RectificationIssue) => void
  moveStage: (id: string, stage: number) => void
  scopeText: string
}) {
  const groups = useMemo(() => {
    const map = new Map<string, RectificationIssue[]>()
    for (const issue of issues) {
      const source = issue.source === '动态' ? '动态作业问题' : '静态自查问题'
      const key = `${source} · ${issue.type}`
      const list = map.get(key) ?? []
      list.push(issue)
      map.set(key, list)
    }
    return [...map.entries()]
      .map(([title, list]) => ({
        title,
        list: [...list].sort((a, b) => order[a.risk] - order[b.risk] || a.stage - b.stage),
        stage: Math.round(list.reduce((sum, item) => sum + item.stage, 0) / list.length),
        major: list.filter((item) => item.risk === '重大').length,
        overdue: list.filter((item) => item.overdue).length,
      }))
      .sort((a, b) => b.major - a.major || b.list.length - a.list.length)
  }, [issues])

  const [openTitle, setOpenTitle] = useState<string>('')
  const staticGroups = groups.filter((group) => group.title.startsWith('静态'))
  const dynamicGroups = groups.filter((group) => group.title.startsWith('动态'))

  if (!groups.length) return null

  return <div className="rect-groups">
    <div className="rect-groups-head">
      <div>
        <strong>整改分组（{groups.length} 组 · 共 {issues.length} 项）</strong>
        <span>统计范围：{scopeText}。点击标题展开该组问题；静态自查未通过时不开展动态评估，因此不会出现动态问题组。</span>
      </div>
      {!dynamicGroups.length && <span className="rect-groups-note"><AlertTriangle size={13} />当前范围暂无动态问题：静态自查存在未通过项</span>}
    </div>

    {[...staticGroups, ...dynamicGroups].map((group) => {
      const open = openTitle === group.title
      return <section className={`rect-group ${open ? 'open' : ''}`} key={group.title}>
        <button className="rect-group-title" onClick={() => setOpenTitle(open ? '' : group.title)} aria-expanded={open}>
          <span className="rect-group-mark">{group.title.startsWith('静态') ? '静态' : '动态'}</span>
          <span className="rect-group-name">{group.title.replace(/^(静态自查问题|动态作业问题) · /, '')}<small>{group.list.length} 项 · 平均进度 {stageLabels[group.stage]} · 重大 {group.major} 项{group.overdue ? ` · 逾期 ${group.overdue} 项` : ''}</small></span>
          <ChevronDown size={16} className="rect-group-arrow" />
        </button>
        {open && <div className="rect-group-body">
          {group.list.map((issue) => <article className="rect-item" key={issue.id}>
            <div className="rect-item-main">
              <strong>{issue.title}</strong>
              <small>{issue.location} · {issue.id}{issue.overdue ? ' · 已逾期' : ''}</small>
            </div>
            <RiskChip risk={issue.risk} />
            <div className="rect-item-meta"><span>{issue.owner}</span><span><Clock3 size={12} />{issue.due}</span></div>
            <StageBar stage={issue.stage} />
            <div className="rect-item-actions">
              {issue.stage < 4 && <button className="row-action" onClick={() => moveStage(issue.id, issue.stage + 1)}>{issue.stage === 3 ? '提交销号' : '推进整改'} <ArrowRight size={13} /></button>}
              {issue.stage === 4 && <span className="rect-done"><Check size={13} />已闭环</span>}
              <button className="row-action" onClick={() => onSelect(issue)}>查看</button>
            </div>
          </article>)}
        </div>}
      </section>
    })}
  </div>
}
