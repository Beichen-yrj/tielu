import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowRight, Bell, Boxes, CalendarDays,
  Check, ChevronDown, CircleHelp, ClipboardCheck, Clock3,
  Bot, Download, Filter, Gauge, LayoutDashboard, LogIn, LogOut, MapPin, Menu, MoreHorizontal,
  Search, Shield, ShieldAlert, TrainFront, TrendingUp, UserCircle, UserPlus, X,
} from 'lucide-react'
import {
  Area, CartesianGrid, Cell, ComposedChart, Line, Pie,
  PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import logo from './assets/logo.webp'
import { SOFTWARE_ALT_TEXT, SOFTWARE_FULL_NAME, SOFTWARE_SHORT_NAME } from './brand'
import { ApiError, clearSession, getCurrentUser, hasSession, login, logout, register, type PublicRole } from './api/auth'
import { deleteHazardAssessment, listHazardAssessments, persistHazardAssessment, updateRectificationStatus, type HazardAssessmentRecord, type RectificationUpdate } from './api/hazardAssessments'
import { rectificationStages, rectificationStatus, isOpenIssue, isActiveHazard } from './rectificationWorkflow'
import { canAccessPage, type PlatformPage } from './permissions'
import { askAi } from './api/ai'
import { answerQuickQuestion, getQuickQuestions, type AiIssue } from './aiKnowledge'
import { allBureauCount, allStationCount, buildHazards, bureaus, findBureauOfStation, periodOptions, periodProfile, scopeLabel, scopeMetrics, timeLabel, todayLabel, trendSeries } from './railwayScope'
import { AssessmentPanel } from './AssessmentPanel'
import { RectificationGroups } from './RectificationGroups'
import { RectificationDrawer } from './RectificationDrawer'
import { HistoryPanel } from './HistoryPanel'
import { MasterPanel } from './MasterPanel'
import { ProfilePanel, type ProfileStats } from './ProfilePanel'
import { SafetyAssessmentPanel } from './SafetyAssessmentPanel'
import { HazardAnalysisPanel, SafetyTrendPanel } from './HazardAnalysisPanel'
import type { InspectionResult } from './inspection'
import './App.css'
import './Portal.css'
import { PortalSite } from './PortalSite'

type Page = PlatformPage
type Risk = '重大' | '较大' | '一般' | '低'
type HazardDataSource = 'loading' | 'database' | 'cache' | 'demo'
type Issue = { id: string; title: string; location: string; bureau: string; station: string; risk: Risk; owner: string; due: string; stage: number; type: string; overdue: boolean; source?: '静态' | '动态'; score?: number; likelihood?: number; severity?: number; record?: HazardAssessmentRecord }
type AssessmentRecord = {
  id: string; name: string; station: string; area: string; cargo: string; unNumber: string; detector: string;
  temperature: number; pressure: number; concentration: number; staticChecks: boolean[]; likelihood: number; severity: number;
  risk: Risk; score: number; status: '评估中' | '已完成'; createdAt: string; findings: string[]; measures: string[];
  input?: Record<string, string>; result?: InspectionResult | null
}
const risks: Risk[] = ['重大', '较大', '一般', '低']
const colors: Record<Risk, string> = { 重大: '#d84343', 较大: '#e97825', 一般: '#e5aa27', 低: '#24816b' }
const defaultNavItems: { name: Page; icon: typeof LayoutDashboard }[] = [
  { name: '总览', icon: LayoutDashboard }, { name: '风险评估', icon: ShieldAlert },
  { name: '整改闭环', icon: ClipboardCheck }, { name: '隐患分析', icon: AlertTriangle },
  { name: '基础资料', icon: Boxes }, { name: 'AI助手', icon: Bot }, { name: '个人中心', icon: UserCircle },
]

const safetyNavItems: { name: Page; icon: typeof LayoutDashboard }[] = [
  { name: '总览', icon: LayoutDashboard }, { name: '风险评估', icon: ShieldAlert },
  { name: '隐患分析', icon: AlertTriangle }, { name: '整改闭环', icon: ClipboardCheck }, { name: 'AI助手', icon: Bot },
  { name: '个人中心', icon: UserCircle },
]
const projectNavItems: { name: Page; icon: typeof LayoutDashboard }[] = [
  { name: '总览', icon: LayoutDashboard }, { name: '整改闭环', icon: ClipboardCheck }, { name: 'AI助手', icon: Bot }, { name: '个人中心', icon: UserCircle },
]
const ordinaryNavItems: { name: Page; icon: typeof LayoutDashboard }[] = [
  { name: '总览', icon: LayoutDashboard }, { name: 'AI助手', icon: Bot }, { name: '个人中心', icon: UserCircle },
]
const roleLabels: Record<string, string> = { safety_manager: '安全管理员', project_manager: '项目经理', ordinary: '普通人员', operator: '普通人员', admin: '系统超级管理员' }

const readAssessments = (): AssessmentRecord[] => {
  try { return JSON.parse(localStorage.getItem('rail-assessments') || '[]') as AssessmentRecord[] } catch { return [] }
}
const initialIssues: Issue[] = buildHazards().map((record) => ({ ...record, stage: record.stage === 4 ? 5 : record.stage }))
const assessmentIssues = (records: HazardAssessmentRecord[]): Issue[] => records.filter((record) => record.has_hazard).map((record) => ({
  id: `ZG-${record.id}`,
  title: record.finding || `${record.hazard_name}存在隐患`,
  location: `${record.station} · ${record.area}`,
  bureau: record.bureau,
  station: record.station,
  risk: record.risk,
  owner: record.inspector,
  due: rectificationStatus(record.status) === '已闭环' ? '已完成' : '待整改',
  stage: rectificationStages.indexOf(rectificationStatus(record.status)),
  type: record.stage,
  overdue: false,
  source: record.assessment_type,
  score: record.score,
  likelihood: record.likelihood,
  severity: record.severity,
  record,
}))
const assessmentTrend = (records: HazardAssessmentRecord[], period: string) => {
  const limit = period === '本年度' ? 12 : period === '近30日' ? 14 : 7
  const map = new Map<string, { day: string; scoreTotal: number; count: number; issue: number }>()
  for (const record of [...records].reverse()) {
    const day = record.created_at.split(' ')[0] || record.created_at.slice(0, 10)
    const current = map.get(day) ?? { day, scoreTotal: 0, count: 0, issue: 0 }
    current.scoreTotal += record.score
    current.count += 1
    current.issue += record.has_hazard ? 1 : 0
    map.set(day, current)
  }
  return [...map.values()].slice(-limit).map((item) => ({ day: item.day, score: Math.round((item.scoreTotal / item.count) * 40) / 10, issue: item.issue }))
}
function PlatformApp({ onBack, onLogout, onAvatarChange, userName, userRole, userId, avatarData, offline }: { onBack: () => void; onLogout: () => void; onAvatarChange: (avatarData: string) => void; userName: string; userRole: string; userId: number; avatarData: string; offline: boolean }) {
  const role = userRole === 'operator' ? 'ordinary' : userRole
  const isAssessor = role === 'safety_manager' || role === 'admin'
  const canRectify = canAccessPage(role, '整改闭环')
  const [requestedPage, setRequestedPage] = useState<Page>(role === 'safety_manager' ? '风险评估' : '总览')
  const page = canAccessPage(role, requestedPage) ? requestedPage : '总览'
  const [issues, setIssues] = useState(initialIssues)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('全部风险')
  const [rectificationView, setRectificationView] = useState<'active' | 'closed'>('active')
  const [period, setPeriod] = useState('近7日')
  const [scopeBureau, setScopeBureau] = useState('')
  const [scopeStation, setScopeStation] = useState('')
  const [createSignal] = useState(0)
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(readAssessments)
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const hazardStorageKey = `rail-hazard-assessments:${userName}`
  const [hazardRecords, setHazardRecords] = useState<HazardAssessmentRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem(hazardStorageKey) || '[]') as HazardAssessmentRecord[] } catch { return [] }
  })
  const [hazardDataSource, setHazardDataSource] = useState<HazardDataSource>(offline ? 'demo' : 'loading')

  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState('')
  const navItems = (role === 'safety_manager' ? safetyNavItems : role === 'project_manager' ? projectNavItems : role === 'ordinary' ? ordinaryNavItems : defaultNavItems).filter((item) => canAccessPage(role, item.name))
  const activeNavPage = page === '历史评估' ? '风险评估' : page === '历史分析' ? (isAssessor ? '隐患分析' : '总览') : page
  const syncedIssues = useMemo(() => offline ? issues : assessmentIssues(hazardRecords), [hazardRecords, issues, offline])
  const scopeIssues = useMemo(() => syncedIssues.filter((issue) =>
    (!scopeBureau || issue.bureau === scopeBureau) && (!scopeStation || issue.station === scopeStation)), [syncedIssues, scopeBureau, scopeStation])
  const scopeRecords = useMemo(() => hazardRecords.filter((record) =>
    (!scopeBureau || record.bureau === scopeBureau) && (!scopeStation || record.station === scopeStation)), [hazardRecords, scopeBureau, scopeStation])
  const filteredIssues = useMemo(() => scopeIssues.filter((issue) =>
    (rectificationView === 'active' ? isOpenIssue(issue) : !isOpenIssue(issue)) &&
    (filter === '全部风险' || issue.risk === filter) && `${issue.title}${issue.location}${issue.owner}`.includes(search)), [scopeIssues, filter, search, rectificationView])
  const completed = scopeIssues.filter((issue) => issue.stage === rectificationStages.length - 1).length
  const profileStats = useMemo<ProfileStats>(() => {
    if (isAssessor) {
      const ownRecords = hazardRecords.filter((record) => record.user_id === userId)
      const isClosed = (status: string) => rectificationStatus(status) === '已闭环'
      return {
        pendingAssessments: ownRecords.filter((record) => record.status === '评估中').length,
        pendingRectifications: ownRecords.filter((record) => record.has_hazard && !isClosed(record.status)).length,
        closedRectifications: ownRecords.filter((record) => record.has_hazard && isClosed(record.status)).length,
        reports: ownRecords.length,
      }
    }
    const ownAssessments = assessments.filter((record) => record.detector === userName)
    const ownIssues = scopeIssues.filter((issue) => issue.owner === userName)
    return {
      pendingAssessments: ownAssessments.filter((record) => record.status !== '已完成').length,
      pendingRectifications: ownIssues.filter((issue) => issue.stage < 5).length,
      closedRectifications: ownIssues.filter((issue) => issue.stage === 5).length,
      reports: ownAssessments.filter((record) => record.status === '已完成').length,
    }
  }, [assessments, hazardRecords, isAssessor, scopeIssues, userName, userId])
  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }, [])
  const setPage = (next: Page) => {
    if (!canAccessPage(role, next)) { notify('当前账号无权访问该功能'); return }
    setRequestedPage(next)
  }
  const refreshHazardRecords = useCallback(async (showNotice = false) => {
    try {
      const items = await listHazardAssessments()
      setHazardRecords(items)
      setHazardDataSource('database')
      try { localStorage.setItem(hazardStorageKey, JSON.stringify(items)) } catch { /* MySQL remains authoritative. */ }
      if (showNotice) notify(`驾驶舱数据已同步，共 ${items.length} 条评估记录`)
    } catch {
      setHazardDataSource('cache')
      if (showNotice) notify('数据库暂不可用，当前显示本机缓存数据')
    }
  }, [hazardStorageKey, notify])
  const updateIssue = async (id: string, update: RectificationUpdate) => {
    if (!canRectify || offline) throw new ApiError('请登录在线账号后保存处理记录', 403)
    try {
      const updated = await updateRectificationStatus(id.slice(3), update)
      const next = hazardRecords.map((record) => record.id === updated.id ? updated : record)
      setHazardRecords(next)
      setHazardDataSource('database')
      try { localStorage.setItem(hazardStorageKey, JSON.stringify(next)) } catch { /* Database save succeeded. */ }
      notify(update.operation === 'withdraw' ? '已撤回到上一个阶段' : update.status === '已闭环' ? '整改已完成闭环' : '处理记录已保存')
      return true
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) await refreshHazardRecords()
      throw error
    }
  }
  useEffect(() => { localStorage.setItem('rail-assessments', JSON.stringify(assessments)) }, [assessments])
  // Loading persisted assessments on entry is the intended external synchronization effect.
  // oxlint-disable react/set-state-in-effect
  useEffect(() => {
    if (!offline) void refreshHazardRecords()
  }, [offline, refreshHazardRecords])
  // oxlint-enable react/set-state-in-effect
  const saveHazardAssessment = async (record: HazardAssessmentRecord) => {
    await saveHazardAssessments([record])
  }
  const saveHazardAssessments = async (records: HazardAssessmentRecord[]) => {
    if (!isAssessor) throw new ApiError('当前账号无风险评估权限', 403)
    const saved: HazardAssessmentRecord[] = []
    try {
      for (const record of records) saved.push(offline ? record : await persistHazardAssessment(record))
    } finally {
      const ids = new Set(saved.map((record) => record.id))
      const next = [...saved, ...hazardRecords.filter((item) => !ids.has(item.id))]
      setHazardRecords(next)
      if (!offline && saved.length) setHazardDataSource('database')
      try { localStorage.setItem(hazardStorageKey, JSON.stringify(next)) } catch { /* Saved records remain in the database. */ }
    }
  }
  const removeHazardAssessment = async (assessmentId: string) => {
    if (!isAssessor) throw new ApiError('当前账号无评估记录删除权限', 403)
    if (!offline) {
      try { await deleteHazardAssessment(assessmentId); setHazardDataSource('database') } catch { setHazardDataSource('cache'); notify('数据库删除失败，记录仍保留'); return }
    }
    const next = hazardRecords.filter((item) => item.id !== assessmentId)
    setHazardRecords(next)
    try { localStorage.setItem(hazardStorageKey, JSON.stringify(next)) } catch { /* The in-memory list is still updated. */ }
  }
  const saveAssessment = (record: AssessmentRecord) => {
    if (!isAssessor) { notify('当前账号无风险评估权限'); return }
    setAssessments((items) => [record, ...items.filter((item) => item.id !== record.id)])
  }
  const completeAssessment = (record: AssessmentRecord) => {
    if (!isAssessor) { notify('当前账号无风险评估权限'); return }
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
        <div className="brand"><img src={logo} alt={SOFTWARE_ALT_TEXT} /><div><strong>{SOFTWARE_SHORT_NAME}</strong></div><button className="icon-btn mobile-close" aria-label="关闭导航" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
        <div className="org-switch"><div className="org-mark"><TrainFront size={17} /></div><div><span>当前统计范围</span><strong>{scopeLabel(scopeBureau, scopeStation)}</strong></div><ChevronDown size={15} /></div>
        <div className="nav-caption">{roleLabels[role] || '安全运营'}</div>
        <nav className="main-nav" aria-label="主导航">{navItems.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${activeNavPage === name ? 'active' : ''}`} onClick={() => { setPage(name); setMobileNav(false) }}><Icon size={18} strokeWidth={1.8} /><span>{name === '总览' ? '安全驾驶舱' : name}</span>{name === '整改闭环' && <b className="nav-count">{syncedIssues.filter(isOpenIssue).length}</b>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="support"><CircleHelp size={16} /><span>平台帮助与支持</span><ArrowRight size={14} /></div><div className="user-card"><div className={`avatar ${avatarData ? 'has-image' : ''}`}>{avatarData ? <img src={avatarData} alt="用户头像" /> : userName.slice(0, 1)}</div><div><strong>{userName}</strong><span>{roleLabels[role] || '平台用户'}</span></div><button className="icon-btn sidebar-logout" title="退出登录" aria-label="退出登录" onClick={onLogout}><LogOut size={17} /></button></div><small>{SOFTWARE_FULL_NAME}</small></div>
      </aside>
      {mobileNav && <button className="scrim" aria-label="关闭菜单" onClick={() => setMobileNav(false)} />}
      <main className="main-area">
        <header className="topbar"><div className="topbar-left"><button className="icon-btn menu-toggle" aria-label="打开导航" onClick={() => setMobileNav(true)}><Menu size={20} /></button><button className="portal-back" onClick={onBack}>门户首页</button><div className="crumb"><span>安全运营</span><span>/</span><strong>{page === '总览' ? '安全驾驶舱' : page}</strong></div></div><div className="top-actions"><span className="environment"><i />{hazardDataSource === 'demo' ? '演示环境' : hazardDataSource === 'cache' ? '缓存数据' : hazardDataSource === 'loading' ? '同步中' : '在线数据'}</span><span className="top-date"><CalendarDays size={15} />{todayLabel()}</span><button className="icon-btn notification" aria-label="通知" onClick={() => notify('当前有 3 条待办提醒')}><Bell size={18} /><b /></button><button className="top-user" onClick={() => setPage('个人中心')}><div className={`avatar small-avatar ${avatarData ? 'has-image' : ''}`}>{avatarData ? <img src={avatarData} alt="用户头像" /> : userName.slice(0, 1)}</div><span>{userName}</span><ChevronDown size={14} /></button></div></header>
        {page === '总览' && <Dashboard issues={scopeIssues} records={hazardRecords} dataLoaded={hazardDataSource !== 'loading'} dataSource={hazardDataSource} demoMode={offline} canAssess={isAssessor} canAnalyze={canAccessPage(role, '历史分析')} canRectify={canRectify} period={period} setPeriod={setPeriod} setPage={setPage} setSelectedIssue={setSelectedIssue} onRefresh={async () => { if (offline) notify('演示数据已刷新'); else await refreshHazardRecords(true) }} onNotify={notify} scopeBureau={scopeBureau} setScopeBureau={setScopeBureau} scopeStation={scopeStation} setScopeStation={setScopeStation} />}
        {page === '风险评估' && (isAssessor ? <SafetyAssessmentPanel records={hazardRecords} userName={userName} onHistory={() => setPage('历史评估')} onSave={saveHazardAssessment} onSaveMany={saveHazardAssessments} onDelete={removeHazardAssessment} onNotify={notify} /> : <AssessmentPanel key={`assessment-${createSignal}`} records={assessments} activeId={activeAssessmentId} setActiveId={setActiveAssessmentId} onSave={saveAssessment} onComplete={completeAssessment} onNotify={notify} userName={userName} createSignal={createSignal} />)}
        {page === '历史评估' && <SafetyAssessmentPanel records={hazardRecords} userName={userName} historyOnly onBack={() => setPage('风险评估')} onSave={saveHazardAssessment} onSaveMany={saveHazardAssessments} onDelete={removeHazardAssessment} onNotify={notify} />}
        {page === '隐患分析' && <HazardAnalysisPanel records={hazardRecords} onHistory={() => setPage('历史分析')} />}
        {page === '整改闭环' && <Rectifications view={rectificationView} setView={setRectificationView} issues={filteredIssues} allIssues={scopeIssues} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} onSelect={setSelectedIssue} onRefresh={async () => { await refreshHazardRecords(true) }} completed={completed} scopeText={scopeLabel(scopeBureau, scopeStation)} />}
        {page === '历史分析' && (isAssessor ? <SafetyTrendPanel records={hazardRecords} onBack={() => setPage('隐患分析')} /> : <HistoryPanel records={assessments} issues={scopeIssues} period={period} setPeriod={setPeriod} onBack={() => setPage('总览')} onOpen={(id) => { setActiveAssessmentId(id); setPage('风险评估') }} onNotify={notify} />)}
        {page === '基础资料' && <MasterPanel onNotify={notify} />}
        {page === 'AI助手' && <RoleAiAssistant key={role} records={scopeRecords} issues={scopeIssues} role={role} />}
        {page === '个人中心' && <ProfilePanel userName={userName} userRole={userRole} avatarData={avatarData} stats={profileStats} onAvatarChange={onAvatarChange} onLogout={onLogout} onNotify={notify} offline={offline} />}
      </main>
      {selectedIssue && <RectificationDrawer key={selectedIssue.id} issue={syncedIssues.find((item) => item.id === selectedIssue.id) ?? selectedIssue} role={role} userId={userId} readOnly={!canRectify || offline} onClose={() => setSelectedIssue(null)} onUpdate={async (_stage, update) => updateIssue(selectedIssue.id, update)} />}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  )
}


function App({ startAtEntry = false }: { startAtEntry?: boolean }) {
  const [entered, setEntered] = useState(false)
  const [authOpen, setAuthOpen] = useState(startAtEntry && !hasSession())
  const [userName, setUserName] = useState('周明远')
  const [userId, setUserId] = useState(0)
  const [userRole, setUserRole] = useState('operator')
  const [avatarData, setAvatarData] = useState('')
  const [offline, setOffline] = useState(false)
  const requestEntry = useCallback(async () => {
    if (hasSession()) {
      try {
        const user = await getCurrentUser()
        setUserId(user.id)
        setUserName(user.display_name)
        setUserRole(user.role)
        setAvatarData(user.avatar_data || '')
        setEntered(true)
        return
      } catch {
        clearSession()
      }
    }
    setAuthOpen(true)
  }, [])
  useEffect(() => {
    if (startAtEntry && hasSession()) queueMicrotask(() => void requestEntry())
  }, [requestEntry, startAtEntry])
  const backToPortal = () => { window.location.hash = '#/'; setEntered(false) }
  const handleLogout = async () => {
    await logout()
    setEntered(false)
    setAuthOpen(false)
    window.location.hash = '#/'
  }
  if (entered) return <PlatformApp onBack={backToPortal} onLogout={handleLogout} onAvatarChange={setAvatarData} userName={userName} userRole={userRole} userId={userId} avatarData={avatarData} offline={offline} />
  if (authOpen) return <AuthPanel onClose={() => setAuthOpen(false)} onSuccess={(name, role, isOffline, avatar, id) => { setUserId(id ?? 0); setUserName(name); setUserRole(role); setAvatarData(isOffline ? localStorage.getItem(`rail-avatar:${name}`) || '' : avatar || ''); setOffline(Boolean(isOffline)); setAuthOpen(false); setEntered(true) }} />
  return <PortalSite onEnter={requestEntry} />
}

type AuthMode = 'login' | 'register'

function AuthPanel({ onClose, onSuccess }: { onClose: () => void; onSuccess: (name: string, role: string, offline?: boolean, avatarData?: string, userId?: number) => void }) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState<PublicRole>('safety_manager')
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
        await register(name, password, role)
        setPassword(''); setConfirm(''); setMessage('注册成功，请使用新账号登录')
        setMode('login')
      } else {
        const user = await login(name, password)
        onSuccess(user.display_name, user.role, false, user.avatar_data || '', user.id)
      }
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : '服务暂时不可用，请确认后端和数据库已启动')
    } finally {
      setSubmitting(false)
    }
  }
  const selectMode = (next: AuthMode) => { setMode(next); setMessage('') }
  return <main className="auth-page"><div className="auth-backdrop" role="presentation"><div className="auth-brand-panel"><button className="auth-brand" onClick={onClose} aria-label="返回门户首页"><img src={logo} alt={SOFTWARE_ALT_TEXT} /><span><strong>{SOFTWARE_SHORT_NAME}</strong></span></button><div className="auth-brand-copy"><span>RAILWAY DANGEROUS GOODS SAFETY</span><h1>让风险可见<br />让整改闭环</h1><p>以风险分级管控与隐患排查治理为核心，支撑铁路危险货物运输安全运营。</p></div><small className="auth-background-credit">铁路运输场景 · 平台登录入口</small></div><section className="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div className="auth-panel-header"><div><span className="auth-kicker">SECURITY PLATFORM ACCESS</span><h2 id="auth-title">进入管理平台</h2></div><button className="icon-btn" aria-label="返回门户首页" onClick={onClose} disabled={submitting}><X size={19} /></button></div><p className="auth-intro">{mode === 'register' ? '选择岗位角色并创建账号，账号注册后不可重复。' : '输入账号和密码，平台将按账号权限进入对应工作台。'}</p><div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => selectMode('login')} disabled={submitting}><LogIn size={16} />账号登录</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => selectMode('register')} disabled={submitting}><UserPlus size={16} />新用户注册</button></div><form className="auth-form" onSubmit={submit}>{mode === 'register' && <fieldset className="auth-role-field"><legend>岗位角色</legend><div className="auth-role-options"><RoleOption value="safety_manager" current={role} label="安全管理员" desc="风险评估与隐患分析" onSelect={setRole} /><RoleOption value="project_manager" current={role} label="项目经理" desc="驾驶舱与整改闭环" onSelect={setRole} /><RoleOption value="ordinary" current={role} label="普通人员" desc="安全驾驶舱与个人中心" onSelect={setRole} /></div></fieldset>}<label><span>账号</span><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入账号" autoComplete="username" disabled={submitting} /></label><label><span>密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位密码" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} disabled={submitting} /></label>{mode === 'register' && <label><span>确认密码</span><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="再次输入密码" autoComplete="new-password" disabled={submitting} /></label>}{message && <p className="auth-message" role="status">{message}</p>}<button className="auth-submit" type="submit" disabled={submitting}>{submitting ? '正在提交...' : mode === 'login' ? '登录并进入平台' : '注册账号'}{!submitting && <ArrowRight size={16} />}</button></form><button type="button" className="auth-offline" onClick={() => onSuccess('安全管理员演示账号', 'safety_manager', true)} disabled={submitting}>后端未启动？以安全管理员演示身份进入 <ArrowRight size={15} /></button><div className="auth-note"><Shield size={15} /><span>{mode === 'register' ? '账号名称全局唯一；岗位角色注册后由服务端保存。' : '岗位角色由账号权限自动识别，系统超级管理员同样直接使用账号登录。'}</span></div></section></div></main>
}

function RoleOption({ value, current, label, desc, onSelect }: { value: PublicRole; current: PublicRole; label: string; desc: string; onSelect: (value: PublicRole) => void }) {
  return <button type="button" className={current === value ? 'active' : ''} onClick={() => onSelect(value)}><span>{label}</span><small>{desc}</small>{current === value && <Check size={14} />}</button>
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{action}</div></div>
}
function Dashboard({ issues, records, dataLoaded, dataSource, demoMode, canAssess, canAnalyze, canRectify, period, setPeriod, setPage, setSelectedIssue, onRefresh, onNotify, scopeBureau, setScopeBureau, scopeStation, setScopeStation }: { issues: Issue[]; records: HazardAssessmentRecord[]; dataLoaded: boolean; dataSource: HazardDataSource; demoMode: boolean; canAssess: boolean; canAnalyze: boolean; canRectify: boolean; period: string; setPeriod: (v: string) => void; setPage: (v: Page) => void; setSelectedIssue: (v: Issue) => void; onRefresh: () => Promise<void>; onNotify: (v: string) => void; scopeBureau: string; setScopeBureau: (v: string) => void; scopeStation: string; setScopeStation: (v: string) => void }) {
  const [updatedAt, setUpdatedAt] = useState(() => new Date())
  const [refreshing, setRefreshing] = useState(false)
  const scope = useMemo(() => scopeMetrics(scopeBureau, scopeStation), [scopeBureau, scopeStation])
  const profile = periodProfile(period)
  const scopedRecords = useMemo(() => records.filter((record) => (!scopeBureau || record.bureau === scopeBureau) && (!scopeStation || record.station === scopeStation)), [records, scopeBureau, scopeStation])
  const trendPoints = useMemo(() => demoMode ? trendSeries(period) : assessmentTrend(scopedRecords, period), [demoMode, period, scopedRecords])
  const scopeStations = scopeBureau
    ? (bureaus.find((item) => item.name === scopeBureau)?.stations ?? [])
    : bureaus.flatMap((item) => item.stations)
  const activeIssues = useMemo(() => issues.filter(isOpenIssue), [issues])
  const activeRecords = useMemo(() => scopedRecords.filter(isActiveHazard), [scopedRecords])
  // Current hazard metrics exclude closed records; closure statistics retain history.
  const riskCounts = useMemo(() => {
    const counts: Record<Risk, number> = { 重大: 0, 较大: 0, 一般: 0, 低: 0 }
    for (const issue of activeIssues) counts[issue.risk] += 1
    return counts
  }, [activeIssues])
  const hazardTotal = activeIssues.length
  const overdueTotal = activeIssues.filter((issue) => issue.overdue).length
  const closedTotal = issues.filter((issue) => issue.stage === 5).length
  const closingRate = issues.length ? Math.round((closedTotal / issues.length) * 1000) / 10 : 0
  const weightedRisk = hazardTotal
    ? (riskCounts.重大 * 4 + riskCounts.较大 * 3 + riskCounts.一般 * 2 + riskCounts.低 * 1) / hazardTotal
    : 0
  const periodIndex = demoMode
    ? Math.round((38 + weightedRisk * 4.6 + profile.indexDelta) * 10) / 10
    : activeRecords.length ? Math.round((activeRecords.reduce((total, record) => total + record.score, 0) / activeRecords.length) * 40) / 10 : 0
  const matrixCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const record of activeRecords) {
      const x = record.likelihood || Math.max(1, Math.min(5, Math.round(record.score / Math.max(record.severity || 1, 1))))
      const y = record.severity || Math.max(1, Math.min(5, Math.round(record.score / Math.max(x, 1))))
      counts[`${x}-${y}`] = (counts[`${x}-${y}`] || 0) + 1
    }
    return counts
  }, [activeRecords])
  const priorityItems = useMemo(() => {
    const order: Record<Risk, number> = { 重大: 0, 较大: 1, 一般: 2, 低: 3 }
    const seen = new Set<string>()
    const unique = [...activeIssues]
      .sort((a, b) => order[a.risk] - order[b.risk] || b.stage - a.stage)
      .filter((issue) => (seen.has(issue.title) ? false : seen.add(issue.title) && true))
    return unique.slice(0, 3)
  }, [activeIssues])
  const refresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setUpdatedAt(new Date())
    setRefreshing(false)
  }
  return <div className="content dashboard-content">
    <PageHeading eyebrow={`${profile.eyebrow} · ${profile.label}`} title="安全驾驶舱" description={`${scopeLabel(scopeBureau, scopeStation)} · 铁路危险货物运输风险态势与整改闭环运行情况`} action={<button className="button secondary" onClick={() => void refresh()} disabled={refreshing}><Activity size={16} />{refreshing ? '同步中...' : '刷新数据'}</button>} />
    <div className="filter-bar"><div className="filter-group"><span className="filter-label">统计范围</span><select className="scope-select" value={scopeBureau} onChange={(event) => { setScopeBureau(event.target.value); setScopeStation(''); onNotify(event.target.value ? `统计范围：${event.target.value.replace('中国铁路', '')}` : '统计范围：全国 18 个铁路局') }}><option value="">全部铁路局（18 局）</option>{bureaus.map((bureau) => <option key={bureau.name} value={bureau.name}>{bureau.short}</option>)}</select><select className="scope-select" value={scopeStation} onChange={(event) => { setScopeStation(event.target.value); onNotify(event.target.value ? `统计范围：${event.target.value}` : '统计范围：所选铁路局全部场站') }}><option value="">全部场站</option>{scopeStations.map((station) => <option key={station} value={station}>{station}</option>)}</select><span className="vertical-rule" />{periodOptions.map((value) => <button key={value} className={`segmented ${period === value ? 'selected' : ''}`} onClick={() => { setPeriod(value); onNotify(`统计周期已切换为${periodProfile(value).label}`) }}>{value}</button>)}</div><span className="updated"><i />数据更新于 {timeLabel(updatedAt)}</span></div>
    <div className="metric-grid">
      <Metric icon={Gauge} label="综合风险指数" value={periodIndex.toFixed(1)} unit="分" delta={`覆盖 ${scope.stations} 个场站 · ${profile.label}`} trend="down" color="blue" />
      <Metric icon={ShieldAlert} label="重大 / 较大风险" value={`${riskCounts.重大 + riskCounts.较大}`} unit="项" delta={`其中重大风险 ${riskCounts.重大} 项`} trend="up" color="red" />
      <Metric icon={ClipboardCheck} label="整改闭环率" value={closingRate.toFixed(1)} unit="%" delta={`已闭环 ${closedTotal} / ${issues.length} 项`} trend="down" color="green" />
      <Metric icon={Clock3} label="逾期整改任务" value={`${overdueTotal}`} unit="项" delta={overdueTotal ? '高风险任务优先处理' : '暂无逾期任务'} trend={overdueTotal ? 'up' : 'down'} color="amber" />
    </div>
    <section className="overview-grid">
      <article className="panel trend-panel"><PanelTitle title="风险态势趋势" subtitle="综合风险指数与隐患数量变化" right={canAnalyze && <button className="link-button" onClick={() => setPage('历史分析')}>查看分析 <ArrowRight size={14} /></button>} /><div className="chart-legend"><span><i className="legend-dot blue-dot" />综合风险指数</span><span><i className="legend-line orange-line" />隐患数量</span></div><div className="trend-chart">{trendPoints.length ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={trendPoints} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}><defs><linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1765b4" stopOpacity={0.17} /><stop offset="98%" stopColor="#1765b4" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#e8edf2" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 11 }} dy={8} /><YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 11 }} /><YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 11 }} /><Tooltip contentStyle={{ border: '1px solid #e4eaf0', borderRadius: 6, boxShadow: '0 6px 20px #17324d12' }} /><Area yAxisId="left" type="monotone" dataKey="score" name="综合风险指数" stroke="#1765b4" strokeWidth={2.5} fill="url(#scoreFill)" isAnimationActive={false} /><Line yAxisId="right" type="monotone" dataKey="issue" name="隐患数量" stroke="#e68b39" strokeWidth={2} dot={{ r: 3, fill: '#e68b39', strokeWidth: 0 }} isAnimationActive={false} /></ComposedChart></ResponsiveContainer> : <div className="dashboard-empty">{dataLoaded ? '当前范围暂无评估趋势数据' : '正在同步评估数据...'}</div>}</div><div className="chart-footnote">统计口径：{scope.stations} 个场站综合风险指数加权均值 · {profile.sample}（{profile.label}）</div></article>
      <article className="panel distribution-panel"><PanelTitle title="风险等级分布" subtitle={`与整改闭环台账同步 · 共 ${hazardTotal} 项`} right={canRectify && <button className="icon-btn subtle" title="查看整改闭环台账" onClick={() => setPage('整改闭环')}><MoreHorizontal size={18} /></button>} /><div className="distribution-body"><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={risks.map((risk) => ({ name: risk, value: riskCounts[risk] }))} dataKey="value" innerRadius="69%" outerRadius="91%" paddingAngle={3} stroke="none" isAnimationActive={false}>{risks.map((risk) => <Cell key={risk} fill={colors[risk]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="donut-label"><strong>{hazardTotal}</strong><span>风险项</span></div></div><div className="risk-legend">{risks.map((risk) => <button key={risk} className="risk-line" disabled={!canRectify} onClick={() => { if (canRectify) setPage('整改闭环') }}><span className="risk-name"><i style={{ background: colors[risk] }} />{risk}风险</span><strong>{riskCounts[risk]}<small>项</small></strong><span className="risk-percent">{hazardTotal ? Math.round((riskCounts[risk] / hazardTotal) * 100) : 0}%</span></button>)}</div></div><div className="distribution-foot"><span>统计范围</span><b className="good-text"><ArrowDownRight size={15} />{scopeLabel(scopeBureau, scopeStation)}</b></div><p className="chart-footnote">环图按重大、较大、一般、低四级展示当前范围在册风险项的构成，右侧列出各级数量与占比，数据与“整改闭环”台账逐条对应；切换统计范围或场站后两处数值同步变化。</p></article>
      <article className="panel matrix-panel"><PanelTitle title="5 × 5 风险矩阵" subtitle="可能性 × 严重度" right={canAssess && <button className="link-button" onClick={() => setPage('风险评估')}>进入评估 <ArrowRight size={14} /></button>} /><RiskMatrix compact counts={demoMode ? undefined : matrixCounts} /><p className="chart-footnote">纵轴为可能性 L、横轴为严重度 C，色块内数值为风险值 R = L × C：R ≥ 16 为重大风险、9–15 为较大、4–8 为一般、≤ 3 为低。色块右下角数字表示落在该组合下的风险条数。评估人员可在风险评估页按检测数据判定等级。</p></article>
      <article className="panel priority-panel"><PanelTitle title="重点风险任务" subtitle="按风险等级取自当前范围隐患台账" right={canRectify && <button className="link-button" onClick={() => setPage('整改闭环')}>全部任务 <ArrowRight size={14} /></button>} /><div className="priority-list">{priorityItems.length ? priorityItems.map((issue, index) => <PriorityRow key={issue.id} rank={`0${index + 1}`} name={issue.title} site={issue.location} risk={issue.risk} count={`${riskCounts[issue.risk]}项同等级隐患`} color={colors[issue.risk]} onClick={() => setSelectedIssue(issue)} />) : <div className="dashboard-empty">当前范围暂无待处置隐患</div>}</div><p className="chart-footnote">按风险等级从当前统计范围的隐患台账中取优先级最高的 3 条：先比较风险等级，同等级再比较整改进度（进度越靠前越优先）。点击条目可直接查看该隐患的详情、措施与整改进度。</p></article>
    </section>
    <div className="dashboard-bottom"><div className="data-note"><Shield size={15} />{demoMode ? `数据为演示数据，统计范围含 ${allBureauCount} 个铁路局、${allStationCount} 个场站` : dataSource === 'cache' ? `数据库暂不可用，当前显示本机缓存的 ${records.length} 条评估记录` : `数据来自评估记录数据库，已同步 ${records.length} 条评估记录、识别 ${hazardTotal} 项隐患`}</div>{canAnalyze && <button className="text-action" onClick={() => setPage('历史分析')}>查看历史分析 <ArrowRight size={14} /></button>}</div>
  </div>
}
function Metric({ icon: Icon, label, value, unit, delta, trend, color }: { icon: typeof Gauge; label: string; value: string; unit: string; delta: string; trend: 'up' | 'down'; color: string }) {
  return <article className={`metric-card metric-${color}`}><div className="metric-top"><span>{label}</span><div className="metric-icon"><Icon size={18} /></div></div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-bottom"><span className={`delta ${trend === 'down' && color !== 'red' ? 'positive' : color === 'red' || color === 'amber' ? 'attention' : 'positive'}`}>{trend === 'down' ? <ArrowDownRight size={14} /> : <TrendingUp size={14} />}{delta}</span><span className="metric-period">对比上周期</span></div></article>
}
function PanelTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return <div className="panel-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{right}</div>
}
function RiskMatrix({ compact = false, counts }: { compact?: boolean; counts?: Record<string, number> }) {
  const demoCounts: Record<string, number> = { '5-4': 1, '4-4': 1, '3-4': 2, '4-3': 1, '5-3': 1, '3-3': 2, '4-2': 1, '2-2': 1, '2-1': 1 }
  return <div className={`matrix-layout ${compact ? 'matrix-compact' : ''}`}><div className="matrix-y-label">可能性</div><div className="matrix-y-ticks">{[5, 4, 3, 2, 1].map((n) => <span key={n}>{n}</span>)}</div><div className="matrix-core">{Array.from({ length: 25 }, (_, index) => { const x = index % 5 + 1; const y = 5 - Math.floor(index / 5); const score = x * y; const risk = score >= 16 ? '重大' : score >= 9 ? '较大' : score >= 4 ? '一般' : '低'; const count = (counts || demoCounts)[`${x}-${y}`] || 0; return <button className="matrix-cell" key={`${x}-${y}`} style={{ backgroundColor: `${colors[risk]}${count ? 'e6' : '2a'}`, color: count ? '#fff' : '#3c4c5b' }} title={`可能性 ${x} × 严重度 ${y}：${score} 分，${risk}风险，${count} 项`}><b>{score}</b>{count > 0 && <small>{count}</small>}</button> })}</div><div className="matrix-x-ticks">{[1, 2, 3, 4, 5].map((n) => <span key={n}>{n}</span>)}</div><div className="matrix-x-label">严重度</div><div className="matrix-legend">{risks.map((risk) => <span key={risk}><i style={{ background: colors[risk] }} />{risk}风险</span>)}</div></div>
}
function PriorityRow({ rank, name, site, risk, count, color, onClick }: { rank: string; name: string; site: string; risk: string; count: string; color: string; onClick: () => void }) {
  return <button className="priority-row" onClick={onClick}><span className="priority-rank">{rank}</span><span className="priority-main"><strong>{name}</strong><small><MapPin size={12} />{site}</small></span><span className="priority-meta"><b style={{ color, background: `${color}15` }}>{risk}风险</b><small>{count}</small></span><ArrowRight size={15} className="priority-arrow" /></button>
}
function Rectifications({ view, setView, issues, allIssues, filter, setFilter, search, setSearch, onSelect, onRefresh, completed, scopeText }: { view: 'active' | 'closed'; setView: (view: 'active' | 'closed') => void; issues: Issue[]; allIssues: Issue[]; filter: string; setFilter: (v: string) => void; search: string; setSearch: (v: string) => void; onSelect: (issue: Issue) => void; onRefresh: () => Promise<void>; completed: number; scopeText: string }) {
  const total = allIssues.length
  const closingRate = total ? Math.round((completed / total) * 1000) / 10 : 0
  const activeIssues = allIssues.filter(isOpenIssue)
  const activeTotal = activeIssues.length
  const majorCount = activeIssues.filter((issue) => issue.risk === '重大').length
  const biggerCount = activeIssues.filter((issue) => issue.risk === '较大').length
  const reviewCount = allIssues.filter((issue) => [2, 3, 4].includes(issue.stage)).length
  const rectifyingCount = allIssues.filter((issue) => issue.stage < 2).length
  const overdueCount = activeIssues.filter((issue) => issue.overdue).length
  return <div className="content"><PageHeading eyebrow={`隐患治理 · 任务跟踪 · ${scopeText}`} title="整改闭环" description="按风险等级、责任人和整改期限跟踪问题处置与双人复核，与安全驾驶舱共用同一统计范围" action={<><button className="button secondary" onClick={() => void onRefresh()}>刷新记录</button><button className="button secondary" onClick={() => window.print()}><Download size={16} />导出清单</button></>} /><div className="metric-grid rect-metrics"><Metric icon={AlertTriangle} label="隐患总数" value={`${activeTotal}`} unit="项" delta={`重大 ${majorCount} 项 · 较大 ${biggerCount} 项`} trend="up" color="red" /><Metric icon={Clock3} label="待整改 / 整改中" value={`${rectifyingCount}`} unit="项" delta={`其中逾期 ${overdueCount} 项`} trend="up" color="amber" /><Metric icon={ClipboardCheck} label="复核 / 待确认" value={`${reviewCount}`} unit="项" delta="原评估安全员复核后项目经理确认" trend="up" color="blue" /><Metric icon={Shield} label="已闭环问题" value={`${completed}`} unit="项" delta={`闭环率 ${closingRate.toFixed(1)}%`} trend="down" color="green" /></div><div className="panel list-panel"><div className="rectification-view-tabs" role="tablist" aria-label="整改记录视图"><button type="button" role="tab" aria-selected={view === 'active'} onClick={() => setView('active')}>待处理隐患（{activeTotal}）</button><button type="button" role="tab" aria-selected={view === 'closed'} onClick={() => setView('closed')}>已闭环记录（{completed}）</button></div><div className="list-toolbar"><div className="filter-group"><Filter size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>全部风险</option>{risks.map((risk) => <option key={risk}>{risk}</option>)}</select><span className="vertical-rule" /><div className="search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索问题、场站或责任人" /></div></div><div className="toolbar-info">共 <b>{issues.length}</b> 项任务</div></div><RectificationGroups issues={issues} onSelect={(issue) => onSelect(issue as unknown as Issue)} scopeText={scopeText} />{issues.length === 0 && <div className="empty-state"><Search size={23} /><strong>{view === 'active' && activeTotal === 0 ? '当前没有待处理隐患' : view === 'closed' ? '没有匹配的已闭环记录' : '没有匹配的整改任务'}</strong><span>{view === 'active' && activeTotal === 0 ? '已闭环项目已归档' : '调整筛选条件后再试'}</span></div>}</div><div className="process-note"><Shield size={16} /><span>整改销号须依次通过<span>原评估安全员现场复核</span>与<span>项目经理管理确认</span>。复核须上传现场照片并确认检测数据达标。</span></div></div>
}
type AiMessage = { role: 'user' | 'assistant'; text: string; source?: '本地知识库' | 'DeepSeek' | '系统' }

function RoleAiAssistant({ records, issues, role }: { records: HazardAssessmentRecord[]; issues: AiIssue[]; role: string }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const quickQuestions = getQuickQuestions(role)
  const roleName = roleLabels[role] || '平台用户'
  const [messages, setMessages] = useState<AiMessage[]>([{ role: 'assistant', text: `您好，${roleName}。快捷问题按当前岗位提供本地知识库回答；自由提问会调用 DeepSeek。AI 只做辅助研判，正式评估和整改结论仍以平台记录与专业复核为准。`, source: '系统' }])
  const answerLocalQuestion = (query: string) => {
    return answerQuickQuestion(role, query, { records, issues })
  }
  const ask = async (preset?: string) => {
    const query = (preset || question).trim(); if (!query || loading) return
    setQuestion('')
    const localAnswer = answerLocalQuestion(query)
    if (localAnswer) {
      setMessages((current) => [...current, { role: 'user', text: query }, { role: 'assistant', text: localAnswer, source: '本地知识库' }])
      return
    }
    setMessages((current) => [...current, { role: 'user', text: query }])
    setLoading(true)
    try {
      const latest = [...records].sort((a, b) => b.created_at.localeCompare(a.created_at, 'zh-CN', { numeric: true }))[0]
      const result = await askAi(query, {
        assessment_count: records.length,
        open_issue_count: issues.filter((issue) => issue.stage < 5).length,
        major_issue_count: issues.filter((issue) => issue.risk === '重大' && issue.stage < 5).length,
        latest_assessment: latest ? { id: latest.id, name: latest.task_name, cargo: latest.cargo, station: latest.station, risk: latest.risk, score: latest.score, finding_count: latest.has_hazard ? 1 : 0 } : null,
      })
      setMessages((current) => [...current, { role: 'assistant', text: result.answer, source: 'DeepSeek' }])
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'AI 服务暂时不可用，请检查后端配置或稍后重试。'
      setMessages((current) => [...current, { role: 'assistant', text: message, source: '系统' }])
    } finally {
      setLoading(false)
    }
  }
  return <div className="content"><PageHeading eyebrow={`辅助研判 · ${roleName}`} title="AI 安全助手" description="快捷问题使用本地知识库，自由提问调用 DeepSeek，不替代专业判断" /><div className="ai-layout"><aside className="panel ai-suggestions"><PanelTitle title="快捷提问" subtitle={`${roleName}专属 · 本地知识库即时回答`} />{quickQuestions.map((text) => <button key={text} disabled={loading} onClick={() => void ask(text)}><Bot size={16} />{text}<ArrowRight size={14} /></button>)}</aside><section className="panel ai-chat"><div className="ai-chat-head"><Bot size={20} /><div><strong>铁路危货安全助手</strong><span>当前数据：{records.length} 份评估 · {issues.length} 项整改</span></div></div><div className="ai-messages">{messages.map((message, index) => <div key={index} className={`ai-message ${message.role}`}><span>{message.role === 'assistant' ? <Bot size={16} /> : <UserCircle size={16} />}</span><p>{message.text}{message.source && <small className="ai-source">{message.source}</small>}</p></div>)}{loading && <div className="ai-message assistant"><span><Bot size={16} /></span><p>正在请求 DeepSeek…</p></div>}</div><div className="ai-input"><input value={question} disabled={loading} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void ask() }} placeholder="快捷问题可本地回答，自由提问将调用 DeepSeek" /><button className="button primary" disabled={loading || !question.trim()} onClick={() => void ask()}>{loading ? '请求中…' : '发送'}</button></div><div className="report-note"><Shield size={15} />AI 建议仅供辅助研判，不得直接改变风险等级、生成正式隐患或完成整改销号。DeepSeek 密钥仅保存在后端环境变量。</div></section></div></div>
}

export default App
