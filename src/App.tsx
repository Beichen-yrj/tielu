import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, Bell, Boxes, CalendarDays,
  ChartNoAxesCombined, Check, ChevronDown, CircleHelp, ClipboardCheck, Clock3,
  Bot, Download, Filter, Gauge, LayoutDashboard, LogIn, LogOut, MapPin, Menu, MoreHorizontal,
  Plus, Search, Shield, ShieldAlert, TrainFront, TrendingUp, UserCircle, UserPlus, X,
} from 'lucide-react'
import {
  Area, CartesianGrid, Cell, ComposedChart, Line, Pie,
  PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import logo from './assets/logo.jpg'
import { ApiError, clearSession, getCurrentUser, hasSession, login, logout, register } from './api/auth'
import { askAi } from './api/ai'
import { allBureauCount, allStationCount, buildHazards, bureaus, findBureauOfStation, periodOptions, periodProfile, scopeLabel, scopeMetrics, timeLabel, todayLabel, trendSeries } from './railwayScope'
import { AssessmentPanel } from './AssessmentPanel'
import { RectificationGroups } from './RectificationGroups'
import { HistoryPanel } from './HistoryPanel'
import { MasterPanel } from './MasterPanel'
import { ProfilePanel } from './ProfilePanel'
import type { InspectionResult } from './inspection'
import './App.css'
import './Portal.css'
import { PortalSite } from './PortalSite'

type Page = '总览' | '风险评估' | '整改闭环' | '历史分析' | '基础资料' | 'AI助手' | '个人中心'
type Risk = '重大' | '较大' | '一般' | '低'
type Issue = { id: string; title: string; location: string; bureau: string; station: string; risk: Risk; owner: string; due: string; stage: number; type: string; overdue: boolean; source?: '静态' | '动态' }
type AssessmentRecord = {
  id: string; name: string; station: string; area: string; cargo: string; unNumber: string; detector: string;
  temperature: number; pressure: number; concentration: number; staticChecks: boolean[]; likelihood: number; severity: number;
  risk: Risk; score: number; status: '评估中' | '已完成'; createdAt: string; findings: string[]; measures: string[];
  input?: Record<string, string>; result?: InspectionResult | null
}
const risks: Risk[] = ['重大', '较大', '一般', '低']
const colors: Record<Risk, string> = { 重大: '#d84343', 较大: '#e97825', 一般: '#e5aa27', 低: '#24816b' }
const navItems: { name: Page; icon: typeof LayoutDashboard }[] = [
  { name: '总览', icon: LayoutDashboard }, { name: '风险评估', icon: ShieldAlert },
  { name: '整改闭环', icon: ClipboardCheck }, { name: '历史分析', icon: ChartNoAxesCombined },
  { name: '基础资料', icon: Boxes }, { name: 'AI助手', icon: Bot }, { name: '个人中心', icon: UserCircle },
]

const readAssessments = (): AssessmentRecord[] => {
  try { return JSON.parse(localStorage.getItem('rail-assessments') || '[]') as AssessmentRecord[] } catch { return [] }
}
const initialIssues: Issue[] = buildHazards().map((record) => ({ ...record }))
function PlatformApp({ onBack, onLogout, userName, userRole }: { onBack: () => void; onLogout: () => void; userName: string; userRole: string }) {
  const [page, setPage] = useState<Page>('总览')
  const [issues, setIssues] = useState(initialIssues)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('全部风险')
  const [period, setPeriod] = useState('近7日')
  const [scopeBureau, setScopeBureau] = useState('')
  const [scopeStation, setScopeStation] = useState('')
  const [createSignal, setCreateSignal] = useState(0)
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(readAssessments)
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)

  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState('')
  const scopeIssues = useMemo(() => issues.filter((issue) =>
    (!scopeBureau || issue.bureau === scopeBureau) && (!scopeStation || issue.station === scopeStation)), [issues, scopeBureau, scopeStation])
  const filteredIssues = useMemo(() => scopeIssues.filter((issue) =>
    (filter === '全部风险' || issue.risk === filter) && `${issue.title}${issue.location}${issue.owner}`.includes(search)), [scopeIssues, filter, search])
  const completed = scopeIssues.filter((issue) => issue.stage === 4).length
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }
  const moveStage = (id: string, stage: number) => setIssues((items) => items.map((issue) => issue.id === id ? { ...issue, stage } : issue))
  useEffect(() => { localStorage.setItem('rail-assessments', JSON.stringify(assessments)) }, [assessments])
  const saveAssessment = (record: AssessmentRecord) => setAssessments((items) => [record, ...items.filter((item) => item.id !== record.id)])
  const completeAssessment = (record: AssessmentRecord) => {
    saveAssessment(record)
    const staticFindings = record.result?.staticFailed ?? []
    const dynamicFindings = record.result?.dynamicFailed ?? []
    const generated: Issue[] = staticFindings.length || dynamicFindings.length
      ? [
        ...staticFindings.map((item, index): Issue => ({ id: `ZG-${record.id.slice(3)}-S${index + 1}`, title: `${item.category}：${item.name}`, location: `${record.station} · ${record.area}`, bureau: findBureauOfStation(record.station), station: record.station, risk: item.level, owner: userName, due: '7日内', stage: 1, type: item.category, overdue: false, source: '静态' })),
        ...dynamicFindings.map((item, index): Issue => ({ id: `ZG-${record.id.slice(3)}-D${index + 1}`, title: `${item.category}：${item.name}`, location: `${record.station} · ${record.area}`, bureau: findBureauOfStation(record.station), station: record.station, risk: item.level, owner: userName, due: '7日内', stage: 1, type: item.category.split(' · ')[0] || '动态作业', overdue: false, source: '动态' })),
      ]
      : record.findings.map((finding, index): Issue => ({ id: `ZG-${record.id.slice(3)}-${index + 1}`, title: finding, location: `${record.station} · ${record.area}`, bureau: findBureauOfStation(record.station), station: record.station, risk: record.risk, owner: userName, due: '7日内', stage: 1, type: '评估生成', overdue: false, source: '静态' }))
    setIssues((current) => [...generated.filter((item) => !current.some((old) => old.id === item.id)), ...current])
    notify('综合评估报告已生成，隐患已转入整改闭环')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><img src={logo} alt="铁路危货双重预防机制评估系统标识" /><div><strong>铁路危货双重预防机制评估系统</strong><span>石家庄铁道大学 · 大学生创新创业训练计划</span></div><button className="icon-btn mobile-close" aria-label="关闭导航" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
        <div className="org-switch"><div className="org-mark"><TrainFront size={17} /></div><div><span>当前统计范围</span><strong>{scopeLabel(scopeBureau, scopeStation)}</strong></div><ChevronDown size={15} /></div>
        <div className="nav-caption">安全运营</div>
        <nav className="main-nav" aria-label="主导航">{navItems.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${page === name ? 'active' : ''}`} onClick={() => { setPage(name); setMobileNav(false) }}><Icon size={18} strokeWidth={1.8} /><span>{name === '总览' ? '安全驾驶舱' : name}</span>{name === '整改闭环' && <b className="nav-count">{issues.length}</b>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="support"><CircleHelp size={16} /><span>平台帮助与支持</span><ArrowRight size={14} /></div><div className="user-card"><div className="avatar">{userName.slice(0, 1)}</div><div><strong>{userName}</strong><span>平台用户</span></div><button className="icon-btn sidebar-logout" title="退出登录" aria-label="退出登录" onClick={onLogout}><LogOut size={17} /></button></div><small>铁路危险货物运输安全管理平台</small></div>
      </aside>
      {mobileNav && <button className="scrim" aria-label="关闭菜单" onClick={() => setMobileNav(false)} />}
      <main className="main-area">
        <header className="topbar"><div className="topbar-left"><button className="icon-btn menu-toggle" aria-label="打开导航" onClick={() => setMobileNav(true)}><Menu size={20} /></button><button className="portal-back" onClick={onBack}>门户首页</button><div className="crumb"><span>安全运营</span><span>/</span><strong>{page === '总览' ? '安全驾驶舱' : page}</strong></div></div><div className="top-actions"><span className="environment"><i />演示环境</span><span className="top-date"><CalendarDays size={15} />{todayLabel()}</span><button className="icon-btn notification" aria-label="通知" onClick={() => notify('当前有 3 条待办提醒')}><Bell size={18} /><b /></button><button className="top-user" onClick={() => setPage('个人中心')}><div className="avatar small-avatar">{userName.slice(0, 1)}</div><span>{userName}</span><ChevronDown size={14} /></button></div></header>
        {page === '总览' && <Dashboard issues={scopeIssues} period={period} setPeriod={setPeriod} setPage={setPage} setSelectedIssue={setSelectedIssue} onNew={() => { setPage('风险评估'); setCreateSignal((value) => value + 1) }} onNotify={notify} scopeBureau={scopeBureau} setScopeBureau={setScopeBureau} scopeStation={scopeStation} setScopeStation={setScopeStation} />}
        {page === '风险评估' && <AssessmentPanel key={`assessment-${createSignal}`} records={assessments} activeId={activeAssessmentId} setActiveId={setActiveAssessmentId} onSave={saveAssessment} onComplete={completeAssessment} onNotify={notify} userName={userName} createSignal={createSignal} />}
        {page === '整改闭环' && <Rectifications issues={filteredIssues} allIssues={scopeIssues} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} moveStage={moveStage} onSelect={setSelectedIssue} completed={completed} scopeText={scopeLabel(scopeBureau, scopeStation)} />}
        {page === '历史分析' && <HistoryPanel records={assessments} issues={scopeIssues} period={period} setPeriod={setPeriod} onOpen={(id) => { setActiveAssessmentId(id); setPage('风险评估') }} onNotify={notify} />}
        {page === '基础资料' && <MasterPanel onNotify={notify} />}
        {page === 'AI助手' && <AiAssistant records={assessments} issues={issues} />}
        {page === '个人中心' && <ProfilePanel userName={userName} userRole={userRole} records={assessments} issues={scopeIssues} onLogout={onLogout} onNotify={notify} />}
      </main>
      {selectedIssue && <IssueDrawer issue={selectedIssue} onClose={() => setSelectedIssue(null)} onAdvance={(stage) => { moveStage(selectedIssue.id, stage); setSelectedIssue({ ...selectedIssue, stage }); notify(stage === 4 ? '整改已提交复核' : '整改进度已保存') }} />}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  )
}


function App() {
  const [entered, setEntered] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [userName, setUserName] = useState('周明远')
  const [userRole, setUserRole] = useState('operator')
  const requestEntry = async () => {
    if (hasSession()) {
      try {
        const user = await getCurrentUser()
        setUserName(user.display_name)
        setUserRole(user.role)
        setEntered(true)
        return
      } catch {
        clearSession()
      }
    }
    setAuthOpen(true)
  }
  const backToPortal = () => { window.location.hash = '#/'; setEntered(false) }
  const handleLogout = async () => {
    await logout()
    setEntered(false)
    setAuthOpen(false)
    window.location.hash = '#/'
  }
  if (entered) return <PlatformApp onBack={backToPortal} onLogout={handleLogout} userName={userName} userRole={userRole} />
  if (authOpen) return <AuthPanel onClose={() => setAuthOpen(false)} onSuccess={(name, role) => { setUserName(name); setUserRole(role); setAuthOpen(false); setEntered(true) }} />
  return <PortalSite onEnter={requestEntry} />
}

type AuthMode = 'login' | 'register'

function AuthPanel({ onClose, onSuccess }: { onClose: () => void; onSuccess: (name: string, role: string) => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = username.trim()
    if (name.length < 2) { setMessage('请输入至少 2 个字符的账号'); return }
    if (password.length < 8) { setMessage('密码至少需要 8 位'); return }
    if (mode === 'register' && password !== confirm) { setMessage('两次输入的密码不一致'); return }
    setSubmitting(true)
    setMessage('')
    try {
      if (mode === 'register') {
        await register(name, password)
        setPassword(''); setConfirm(''); setMessage('注册成功，请使用新账号登录')
        setMode('login')
      } else {
        const user = await login(name, password)
        onSuccess(user.display_name, user.role)
      }
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : '服务暂时不可用，请确认后端和数据库已启动')
    } finally {
      setSubmitting(false)
    }
  }
  return <main className="auth-page"><div className="auth-backdrop" role="presentation"><div className="auth-brand-panel"><button className="auth-brand" onClick={onClose} aria-label="返回门户首页"><img src={logo} alt="铁路危货双重预防机制评估系统标识" /><span><strong>铁路危货双重预防机制评估系统</strong><small>石家庄铁道大学 · 大学生创新创业训练计划</small></span></button><div className="auth-brand-copy"><span>RAILWAY DANGEROUS GOODS SAFETY</span><h1>让风险可见<br />让整改闭环</h1><p>以风险分级管控与隐患排查治理为核心，支撑铁路危险货物运输安全运营。</p></div><small className="auth-background-credit">铁路运输场景 · 平台登录入口</small></div><section className="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div className="auth-panel-header"><div><span className="auth-kicker">SECURITY PLATFORM ACCESS</span><h2 id="auth-title">进入管理平台</h2></div><button className="icon-btn" aria-label="返回门户首页" onClick={onClose} disabled={submitting}><X size={19} /></button></div><p className="auth-intro">请先登录或注册平台账号，进入铁路危险货物运输风险评估与隐患治理工作台。</p><div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMessage('') }} disabled={submitting}><LogIn size={16} />账号登录</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMessage('') }} disabled={submitting}><UserPlus size={16} />新用户注册</button></div><form className="auth-form" onSubmit={submit}><label><span>账号</span><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入账号" autoComplete="username" disabled={submitting} /></label><label><span>密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位密码" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} disabled={submitting} /></label>{mode === 'register' && <label><span>确认密码</span><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="再次输入密码" autoComplete="new-password" disabled={submitting} /></label>}{message && <p className="auth-message" role="status">{message}</p>}<button className="auth-submit" type="submit" disabled={submitting}>{submitting ? '正在提交...' : mode === 'login' ? '登录并进入平台' : '注册账号'}{!submitting && <ArrowRight size={16} />}</button></form><div className="auth-note"><Shield size={15} /><span>账号由 FastAPI 服务端管理，当前开发环境连接 MySQL；正式部署前仍需配置生产数据库和密钥。</span></div></section></div></main>
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{action}</div></div>
}
function Dashboard({ issues, period, setPeriod, setPage, setSelectedIssue, onNew, onNotify, scopeBureau, setScopeBureau, scopeStation, setScopeStation }: { issues: Issue[]; period: string; setPeriod: (v: string) => void; setPage: (v: Page) => void; setSelectedIssue: (v: Issue) => void; onNew: () => void; onNotify: (v: string) => void; scopeBureau: string; setScopeBureau: (v: string) => void; scopeStation: string; setScopeStation: (v: string) => void }) {
  const [updatedAt, setUpdatedAt] = useState(() => new Date())
  const scope = useMemo(() => scopeMetrics(scopeBureau, scopeStation), [scopeBureau, scopeStation])
  const profile = periodProfile(period)
  const trendPoints = useMemo(() => trendSeries(period), [period])
  const scopeStations = scopeBureau
    ? (bureaus.find((item) => item.name === scopeBureau)?.stations ?? [])
    : bureaus.flatMap((item) => item.stations)
  // 风险等级分布与指标直接取自整改闭环台账，保证两处数据同步
  const riskCounts = useMemo(() => {
    const counts: Record<Risk, number> = { 重大: 0, 较大: 0, 一般: 0, 低: 0 }
    for (const issue of issues) counts[issue.risk] += 1
    return counts
  }, [issues])
  const hazardTotal = issues.length
  const overdueTotal = issues.filter((issue) => issue.overdue).length
  const closedTotal = issues.filter((issue) => issue.stage === 4).length
  const closingRate = hazardTotal ? Math.round((closedTotal / hazardTotal) * 1000) / 10 : 0
  const weightedRisk = hazardTotal
    ? (riskCounts.重大 * 4 + riskCounts.较大 * 3 + riskCounts.一般 * 2 + riskCounts.低 * 1) / hazardTotal
    : 0
  const periodIndex = Math.round((38 + weightedRisk * 4.6 + profile.indexDelta) * 10) / 10
  const priorityItems = useMemo(() => {
    const order: Record<Risk, number> = { 重大: 0, 较大: 1, 一般: 2, 低: 3 }
    return [...issues].sort((a, b) => order[a.risk] - order[b.risk] || b.stage - a.stage).slice(0, 3)
  }, [issues])
  return <div className="content dashboard-content">
    <PageHeading eyebrow={`${profile.eyebrow} · ${profile.label}`} title="安全驾驶舱" description={`${scopeLabel(scopeBureau, scopeStation)} · 铁路危险货物运输风险态势与整改闭环运行情况`} action={<><button className="button secondary" onClick={() => { setUpdatedAt(new Date()); onNotify('驾驶舱数据已刷新') }}><Activity size={16} />刷新数据</button><button className="button primary" onClick={onNew}><Plus size={17} />新建评估</button></>} />
    <div className="filter-bar"><div className="filter-group"><span className="filter-label">统计范围</span><select className="scope-select" value={scopeBureau} onChange={(event) => { setScopeBureau(event.target.value); setScopeStation(''); onNotify(event.target.value ? `统计范围：${event.target.value.replace('中国铁路', '')}` : '统计范围：全国 18 个铁路局') }}><option value="">全部铁路局（18 局）</option>{bureaus.map((bureau) => <option key={bureau.name} value={bureau.name}>{bureau.short}</option>)}</select><select className="scope-select" value={scopeStation} onChange={(event) => { setScopeStation(event.target.value); onNotify(event.target.value ? `统计范围：${event.target.value}` : '统计范围：所选铁路局全部场站') }}><option value="">全部场站</option>{scopeStations.map((station) => <option key={station} value={station}>{station}</option>)}</select><span className="vertical-rule" />{periodOptions.map((value) => <button key={value} className={`segmented ${period === value ? 'selected' : ''}`} onClick={() => { setPeriod(value); onNotify(`统计周期已切换为${periodProfile(value).label}`) }}>{value}</button>)}</div><span className="updated"><i />数据更新于 {timeLabel(updatedAt)}</span></div>
    <div className="metric-grid">
      <Metric icon={Gauge} label="综合风险指数" value={periodIndex.toFixed(1)} unit="分" delta={`覆盖 ${scope.stations} 个场站 · ${profile.label}`} trend="down" color="blue" />
      <Metric icon={ShieldAlert} label="重大 / 较大风险" value={`${riskCounts.重大 + riskCounts.较大}`} unit="项" delta={`其中重大风险 ${riskCounts.重大} 项`} trend="up" color="red" />
      <Metric icon={ClipboardCheck} label="整改闭环率" value={closingRate.toFixed(1)} unit="%" delta={`已闭环 ${closedTotal} / ${hazardTotal} 项`} trend="down" color="green" />
      <Metric icon={Clock3} label="逾期整改任务" value={`${overdueTotal}`} unit="项" delta={overdueTotal ? '高风险任务优先处理' : '暂无逾期任务'} trend={overdueTotal ? 'up' : 'down'} color="amber" />
    </div>
    <section className="overview-grid">
      <article className="panel trend-panel"><PanelTitle title="风险态势趋势" subtitle="综合风险指数与隐患数量变化" right={<button className="link-button" onClick={() => setPage('历史分析')}>查看分析 <ArrowRight size={14} /></button>} /><div className="chart-legend"><span><i className="legend-dot blue-dot" />综合风险指数</span><span><i className="legend-line orange-line" />隐患数量</span></div><div className="trend-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={trendPoints} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}><defs><linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1765b4" stopOpacity={0.17} /><stop offset="98%" stopColor="#1765b4" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#e8edf2" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 11 }} dy={8} /><YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 11 }} /><YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 11 }} /><Tooltip contentStyle={{ border: '1px solid #e4eaf0', borderRadius: 6, boxShadow: '0 6px 20px #17324d12' }} /><Area yAxisId="left" type="monotone" dataKey="score" name="综合风险指数" stroke="#1765b4" strokeWidth={2.5} fill="url(#scoreFill)" /><Line yAxisId="right" type="monotone" dataKey="issue" name="隐患数量" stroke="#e68b39" strokeWidth={2} dot={{ r: 3, fill: '#e68b39', strokeWidth: 0 }} /></ComposedChart></ResponsiveContainer></div><div className="chart-footnote">统计口径：{scope.stations} 个场站综合风险指数加权均值 · {profile.sample}（{profile.label}）</div></article>
      <article className="panel distribution-panel"><PanelTitle title="风险等级分布" subtitle={`与整改闭环台账同步 · 共 ${hazardTotal} 项`} right={<button className="icon-btn subtle" title="查看整改闭环台账" onClick={() => setPage('整改闭环')}><MoreHorizontal size={18} /></button>} /><div className="distribution-body"><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={risks.map((risk) => ({ name: risk, value: riskCounts[risk] }))} dataKey="value" innerRadius="69%" outerRadius="91%" paddingAngle={3} stroke="none">{risks.map((risk) => <Cell key={risk} fill={colors[risk]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="donut-label"><strong>{hazardTotal}</strong><span>风险项</span></div></div><div className="risk-legend">{risks.map((risk) => <button key={risk} className="risk-line" onClick={() => { setPage('整改闭环') }}><span className="risk-name"><i style={{ background: colors[risk] }} />{risk}风险</span><strong>{riskCounts[risk]}<small>项</small></strong><span className="risk-percent">{hazardTotal ? Math.round((riskCounts[risk] / hazardTotal) * 100) : 0}%</span></button>)}</div></div><div className="distribution-foot"><span>统计范围</span><b className="good-text"><ArrowDownRight size={15} />{scopeLabel(scopeBureau, scopeStation)}</b></div><p className="chart-footnote">环图按重大、较大、一般、低四级展示当前范围在册风险项的构成，右侧列出各级数量与占比，数据与“整改闭环”台账逐条对应；切换统计范围或场站后两处数值同步变化。</p></article>
      <article className="panel matrix-panel"><PanelTitle title="5 × 5 风险矩阵" subtitle="可能性 × 严重度" right={<button className="link-button" onClick={() => setPage('风险评估')}>进入评估 <ArrowRight size={14} /></button>} /><RiskMatrix compact /><p className="chart-footnote">纵轴为可能性 L、横轴为严重度 C，色块内数值为风险值 R = L × C：R ≥ 16 为重大风险、9–15 为较大、4–8 为一般、≤ 3 为低。色块右下角数字表示落在该组合下的风险条数，点击“进入评估”可按检测数据自动判定风险等级。</p></article>
      <article className="panel priority-panel"><PanelTitle title="重点风险任务" subtitle="按风险等级取自当前范围隐患台账" right={<button className="link-button" onClick={() => setPage('整改闭环')}>全部任务 <ArrowRight size={14} /></button>} /><div className="priority-list">{priorityItems.map((issue, index) => <PriorityRow key={issue.id} rank={`0${index + 1}`} name={issue.title} site={issue.location} risk={issue.risk} count={`${riskCounts[issue.risk]}项同等级隐患`} color={colors[issue.risk]} onClick={() => setSelectedIssue(issue)} />)}</div><p className="chart-footnote">按风险等级从当前统计范围的隐患台账中取优先级最高的 3 条：先比较风险等级，同等级再比较整改进度（进度越靠前越优先）。点击条目可直接查看该隐患的详情、措施与整改进度。</p></article>
    </section>
    <div className="dashboard-bottom"><div className="data-note"><Shield size={15} />数据为演示数据，统计范围含 {allBureauCount} 个铁路局、{allStationCount} 个场站，风险等级阈值待业务负责人确认</div><button className="text-action" onClick={() => setPage('历史分析')}>查看历史分析 <ArrowRight size={14} /></button></div>
  </div>
}
function Metric({ icon: Icon, label, value, unit, delta, trend, color }: { icon: typeof Gauge; label: string; value: string; unit: string; delta: string; trend: 'up' | 'down'; color: string }) {
  return <article className={`metric-card metric-${color}`}><div className="metric-top"><span>{label}</span><div className="metric-icon"><Icon size={18} /></div></div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-bottom"><span className={`delta ${trend === 'down' && color !== 'red' ? 'positive' : color === 'red' || color === 'amber' ? 'attention' : 'positive'}`}>{trend === 'down' ? <ArrowDownRight size={14} /> : <TrendingUp size={14} />}{delta}</span><span className="metric-period">对比上周期</span></div></article>
}
function PanelTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return <div className="panel-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{right}</div>
}
function RiskMatrix({ compact = false }: { compact?: boolean }) {
  return <div className={`matrix-layout ${compact ? 'matrix-compact' : ''}`}><div className="matrix-y-label">可能性</div><div className="matrix-y-ticks">{[5, 4, 3, 2, 1].map((n) => <span key={n}>{n}</span>)}</div><div className="matrix-core">{Array.from({ length: 25 }, (_, index) => { const x = index % 5 + 1; const y = 5 - Math.floor(index / 5); const score = x * y; const risk = score >= 16 ? '重大' : score >= 10 ? '较大' : score >= 5 ? '一般' : '低'; const count = ({ '5-4': 1, '4-4': 1, '3-4': 2, '4-3': 1, '5-3': 1, '3-3': 2, '4-2': 1, '2-2': 1, '2-1': 1 } as Record<string, number>)[`${x}-${y}`] || 0; return <button className="matrix-cell" key={`${x}-${y}`} style={{ backgroundColor: `${colors[risk]}${count ? 'e6' : '2a'}`, color: count ? '#fff' : '#3c4c5b' }} title={`可能性 ${x} × 严重度 ${y}：${score} 分，${risk}风险，${count} 项`}><b>{score}</b>{count > 0 && <small>{count}</small>}</button> })}</div><div className="matrix-x-ticks">{[1, 2, 3, 4, 5].map((n) => <span key={n}>{n}</span>)}</div><div className="matrix-x-label">严重度</div><div className="matrix-legend">{risks.map((risk) => <span key={risk}><i style={{ background: colors[risk] }} />{risk}风险</span>)}</div></div>
}
function PriorityRow({ rank, name, site, risk, count, color, onClick }: { rank: string; name: string; site: string; risk: string; count: string; color: string; onClick: () => void }) {
  return <button className="priority-row" onClick={onClick}><span className="priority-rank">{rank}</span><span className="priority-main"><strong>{name}</strong><small><MapPin size={12} />{site}</small></span><span className="priority-meta"><b style={{ color, background: `${color}15` }}>{risk}风险</b><small>{count}</small></span><ArrowRight size={15} className="priority-arrow" /></button>
}
function RiskBadge({ risk }: { risk: Risk }) { return <span className="risk-badge" style={{ color: colors[risk], background: `${colors[risk]}15` }}><i style={{ background: colors[risk] }} />{risk}风险</span> }
function stageLabel(stage: number) { return ['未整改', '整改中', '待复核', '复核中', '已闭环'][stage] ?? '未整改' }
function Rectifications({ issues, allIssues, filter, setFilter, search, setSearch, moveStage, onSelect, completed, scopeText }: { issues: Issue[]; allIssues: Issue[]; filter: string; setFilter: (v: string) => void; search: string; setSearch: (v: string) => void; moveStage: (id: string, stage: number) => void; onSelect: (issue: Issue) => void; completed: number; scopeText: string }) {
  void moveStage
  const total = allIssues.length
  const closingRate = total ? Math.round((completed / total) * 1000) / 10 : 0
  const majorCount = allIssues.filter((issue) => issue.risk === '重大').length
  const biggerCount = allIssues.filter((issue) => issue.risk === '较大').length
  const reviewCount = allIssues.filter((issue) => issue.stage === 3).length
  const overdueCount = allIssues.filter((issue) => issue.overdue).length
  return <div className="content"><PageHeading eyebrow={`隐患治理 · 任务跟踪 · ${scopeText}`} title="整改闭环" description="按风险等级、责任人和整改期限跟踪问题处置与双人复核，与安全驾驶舱共用同一统计范围" action={<button className="button secondary" onClick={() => window.print()}><Download size={16} />导出清单</button>} /><div className="metric-grid rect-metrics"><Metric icon={AlertTriangle} label="隐患总数" value={`${total}`} unit="项" delta={`重大 ${majorCount} 项 · 较大 ${biggerCount} 项`} trend="up" color="red" /><Metric icon={Clock3} label="待整改 / 整改中" value={`${total - completed}`} unit="项" delta={`其中逾期 ${overdueCount} 项`} trend="up" color="amber" /><Metric icon={ClipboardCheck} label="待双人复核" value={`${reviewCount}`} unit="项" delta="安全工程师复核后项目经理确认" trend="up" color="blue" /><Metric icon={Shield} label="已闭环问题" value={`${completed}`} unit="项" delta={`闭环率 ${closingRate.toFixed(1)}%`} trend="down" color="green" /></div><div className="panel list-panel"><div className="list-toolbar"><div className="filter-group"><Filter size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>全部风险</option>{risks.map((risk) => <option key={risk}>{risk}</option>)}</select><span className="vertical-rule" /><div className="search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索问题、场站或责任人" /></div></div><div className="toolbar-info">共 <b>{issues.length}</b> 项任务</div></div><RectificationGroups issues={issues} onSelect={(issue) => onSelect(issue as unknown as Issue)} moveStage={moveStage} scopeText={scopeText} />{issues.length === 0 && <div className="empty-state"><Search size={23} /><strong>没有匹配的整改任务</strong><span>调整筛选条件后再试</span></div>}</div><div className="process-note"><Shield size={16} /><span>整改销号须依次通过<span>安全工程师技术复核</span>与<span>项目经理管理确认</span>。高风险问题需上传整改后证据。</span></div></div>
}
type AiMessage = { role: 'user' | 'assistant'; text: string; source?: '本地知识库' | 'DeepSeek' | '系统' }

const localKnowledge: { triggers: string[]; answer: (records: AssessmentRecord[], issues: Issue[]) => string }[] = [
  {
    triggers: ['汇总当前重大隐患', '重大隐患'],
    answer: (_, issues) => {
      const majorIssues = issues.filter((issue) => issue.risk === '重大')
      return majorIssues.length
        ? `当前识别到 ${majorIssues.length} 项重大风险隐患：${majorIssues.map((issue) => issue.title).join('、')}。建议立即落实临时管控，明确责任人和整改期限，并在整改后补充复核证据。`
        : '当前没有标记为重大风险的隐患。仍需持续关注未闭环任务和临期任务，最终结论以现场复核为准。'
    },
  },
  {
    triggers: ['分析最近一次评估', '最近一次评估'],
    answer: (records) => {
      const latest = records[0]
      return latest
        ? `最近评估为“${latest.name}”，危险货物 ${latest.cargo}，场站 ${latest.station}，综合风险为${latest.risk}（R=${latest.score}），识别 ${latest.findings.length} 项隐患。请结合原始检测数据和报告措施进行人工复核。`
        : '当前还没有评估报告。请先在“风险评估”中新建任务并录入外部检测数据。'
    },
  },
  {
    triggers: ['给出整改优先级建议', '整改优先级'],
    answer: (_, issues) => {
      const open = issues.filter((issue) => issue.stage < 4)
      const major = open.filter((issue) => issue.risk === '重大').length
      const high = open.filter((issue) => issue.risk === '较大').length
      return `当前有 ${open.length} 项未闭环任务，其中重大风险 ${major} 项、较大风险 ${high} 项。建议顺序为：1）重大风险和已超期任务；2）较大风险及临近期限任务；3）一般和低风险任务。每项整改都应留存整改后检测或复核证据。`
    },
  },
  {
    triggers: ['说明风险矩阵口径', '风险矩阵'],
    answer: () => '当前演示规则以 R=可能性×后果严重度计算：R≥20 为重大，12≤R<20 为较大，5≤R<12 为一般，R<5 为低。该阈值和静动态权重仍需业务负责人确认，不能替代正式行业标准。',
  },
]

function AiAssistant({ records, issues }: { records: AssessmentRecord[]; issues: Issue[] }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<AiMessage[]>([{ role: 'assistant', text: '您好，我可以基于当前评估报告和整改任务，汇总风险、解释指标或回答自由问题。快捷问题使用本地知识库，自由提问会调用 DeepSeek；所有输出都必须经过安全专业人员确认。', source: '系统' }])
  const answerLocalQuestion = (query: string) => {
    const item = localKnowledge.find(({ triggers }) => triggers.some((trigger) => query === trigger || query.includes(trigger)))
    return item?.answer(records, issues)
  }
  const ask = async (preset?: string) => {
    const query = (preset || question).trim(); if (!query) return
    setQuestion('')
    const localAnswer = answerLocalQuestion(query)
    if (localAnswer) {
      setMessages((current) => [...current, { role: 'user', text: query }, { role: 'assistant', text: localAnswer, source: '本地知识库' }])
      return
    }
    setMessages((current) => [...current, { role: 'user', text: query }])
    setLoading(true)
    try {
      const latest = records[0]
      const result = await askAi(query, {
        assessment_count: records.length,
        open_issue_count: issues.filter((issue) => issue.stage < 4).length,
        major_issue_count: issues.filter((issue) => issue.risk === '重大' && issue.stage < 4).length,
        latest_assessment: latest ? { id: latest.id, name: latest.name, cargo: latest.cargo, station: latest.station, risk: latest.risk, score: latest.score, finding_count: latest.findings.length } : null,
      })
      setMessages((current) => [...current, { role: 'assistant', text: result.answer, source: 'DeepSeek' }])
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'AI 服务暂时不可用，请检查后端配置或稍后重试。'
      setMessages((current) => [...current, { role: 'assistant', text: message, source: '系统' }])
    } finally {
      setLoading(false)
    }
  }
  return <div className="content"><PageHeading eyebrow="辅助研判 · 人工复核" title="AI 安全助手" description="快捷问题使用本地知识库，自由提问调用 DeepSeek，不替代专业判断" /><div className="ai-layout"><aside className="panel ai-suggestions"><PanelTitle title="快捷提问" subtitle="本地知识库即时回答" />{['汇总当前重大隐患', '分析最近一次评估', '给出整改优先级建议', '说明风险矩阵口径'].map((text) => <button key={text} disabled={loading} onClick={() => void ask(text)}><Bot size={16} />{text}<ArrowRight size={14} /></button>)}</aside><section className="panel ai-chat"><div className="ai-chat-head"><Bot size={20} /><div><strong>铁路危货安全助手</strong><span>当前数据：{records.length} 份评估 · {issues.length} 项整改</span></div></div><div className="ai-messages">{messages.map((message, index) => <div key={index} className={`ai-message ${message.role}`}><span>{message.role === 'assistant' ? <Bot size={16} /> : <UserCircle size={16} />}</span><p>{message.text}{message.source && <small className="ai-source">{message.source}</small>}</p></div>)}{loading && <div className="ai-message assistant"><span><Bot size={16} /></span><p>正在请求 DeepSeek…</p></div>}</div><div className="ai-input"><input value={question} disabled={loading} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void ask() }} placeholder="快捷问题可本地回答，自由提问将调用 DeepSeek" /><button className="button primary" disabled={loading || !question.trim()} onClick={() => void ask()}>{loading ? '请求中…' : '发送'}</button></div><div className="report-note"><Shield size={15} />AI 建议仅供辅助研判，不得直接改变风险等级、生成正式隐患或完成整改销号。DeepSeek 密钥仅保存在后端环境变量。</div></section></div></div>
}

function IssueDrawer({ issue, onClose, onAdvance }: { issue: Issue; onClose: () => void; onAdvance: (stage: number) => void }) {
  const [note, setNote] = useState('')
  const stages = ['未戴 / 未落实', '少数完成', '多数完成', '全部完成']
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="issue-drawer"><div className="drawer-header"><div><span className="eyebrow">整改任务 · {issue.id}</span><button className="icon-btn" aria-label="关闭详情" onClick={onClose}><X size={19} /></button></div><h2>{issue.title}</h2><div className="drawer-meta"><RiskBadge risk={issue.risk} /><span><MapPin size={13} />{issue.location}</span></div></div><div className="drawer-content"><div className="detail-grid"><div><span>责任人</span><strong>{issue.owner}</strong></div><div><span>整改期限</span><strong>{issue.due}</strong></div><div><span>问题类型</span><strong>{issue.type}</strong></div><div><span>当前状态</span><strong>{stageLabel(issue.stage)}</strong></div></div><section className="detail-section"><h3>针对性整改建议</h3><p>立即暂停相关作业并设置安全隔离，核查现场设施与作业记录；由责任班组补齐整改措施，安排专人复查关键点位，并将整改前后照片、复查记录一并提交。</p><ul><li>完成现场风险告知与作业人员再培训</li><li>按规程检查设备状态并留存检测凭证</li><li>由安全管理人员组织现场复核</li></ul></section><section className="detail-section"><div className="section-heading"><h3>整改阶段</h3><span>当前：{stageLabel(issue.stage)}</span></div><div className="stage-list">{stages.map((stage, index) => <button className={`stage-option ${issue.stage === index + 1 ? 'stage-current' : ''} ${issue.stage > index + 1 ? 'stage-done' : ''}`} key={stage} onClick={() => onAdvance(index + 1)}><span>{issue.stage > index + 1 ? <Check size={13} /> : index + 1}</span><b>{stage}</b><small>{[0, 25, 58, 100][index]}%</small></button>)}</div><div className="stage-progress"><i style={{ width: `${[0, 25, 58, 82, 100][issue.stage]}%` }} /></div></section><section className="detail-section"><h3>进展说明</h3><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="填写本次整改进度、剩余问题或复查结果" rows={3} /><button className="button secondary full-button" onClick={() => onAdvance(issue.stage)}><Plus size={15} />保存进度记录</button></section><section className="timeline"><h3>处理记录</h3><div><i /><span><b>责任人更新整改进度</b><small>王建国 · 今日 09:18 · {stageLabel(issue.stage)}</small></span></div><div><i /><span><b>任务已分派</b><small>周明远 · 09月23日 16:42</small></span></div><div><i /><span><b>评估问题自动生成</b><small>系统 · 09月22日 14:08</small></span></div></section></div><div className="drawer-footer"><button className="button secondary" onClick={onClose}>稍后处理</button><button className="button primary" onClick={() => onAdvance(Math.min(issue.stage + 1, 4))}>{issue.stage >= 3 ? '提交复核' : '更新整改阶段'}<ArrowRight size={15} /></button></div></aside></div>
}

export default App
