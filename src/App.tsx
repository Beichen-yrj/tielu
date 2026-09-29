import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRight, Bell, Boxes, CalendarDays,
  ChartNoAxesCombined, Check, ChevronDown, CircleHelp, ClipboardCheck, Clock3,
  Bot, Database, Download, FileClock, Filter, Gauge, LayoutDashboard, LogIn, LogOut, MapPin, Menu, MoreHorizontal,
  Plus, Search, Shield, ShieldAlert, TrainFront, TrendingUp, UserCircle, UserPlus, X,
} from 'lucide-react'
import {
  Area, CartesianGrid, Cell, ComposedChart, Line, LineChart, Pie,
  PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts'
import logo from './assets/logo.jpg'
import { ApiError, clearSession, getCurrentUser, hasSession, login, logout, register } from './api/auth'
import { askAi } from './api/ai'
import './App.css'
import './Portal.css'

type Page = '总览' | '风险评估' | '整改闭环' | '历史分析' | '基础资料' | 'AI助手' | '个人中心'
type Risk = '重大' | '较大' | '一般' | '低'
type Issue = { id: string; title: string; location: string; risk: Risk; owner: string; due: string; stage: number; type: string }
type AssessmentRecord = {
  id: string; name: string; station: string; area: string; cargo: string; unNumber: string; detector: string;
  temperature: number; pressure: number; concentration: number; staticChecks: boolean[]; likelihood: number; severity: number;
  risk: Risk; score: number; status: '评估中' | '已完成'; createdAt: string; findings: string[]; measures: string[]
}
type MasterKind = '评估指标库' | '法规依据库' | '风险规则配置' | '整改阶段模板'
type MasterRecord = { code: string; name: string; category: string; version: string; status: string; description: string }

const risks: Risk[] = ['重大', '较大', '一般', '低']
const colors: Record<Risk, string> = { 重大: '#d84343', 较大: '#e97825', 一般: '#e5aa27', 低: '#24816b' }
const navItems: { name: Page; icon: typeof LayoutDashboard }[] = [
  { name: '总览', icon: LayoutDashboard }, { name: '风险评估', icon: ShieldAlert },
  { name: '整改闭环', icon: ClipboardCheck }, { name: '历史分析', icon: ChartNoAxesCombined },
  { name: '基础资料', icon: Boxes }, { name: 'AI助手', icon: Bot }, { name: '个人中心', icon: UserCircle },
]

const riskFromScore = (score: number): Risk => score >= 20 ? '重大' : score >= 12 ? '较大' : score >= 5 ? '一般' : '低'
const readAssessments = (): AssessmentRecord[] => {
  try { return JSON.parse(localStorage.getItem('rail-assessments') || '[]') as AssessmentRecord[] } catch { return [] }
}
const initialIssues: Issue[] = [
  { id: 'ZG-2026-0218', title: '危险货物装卸区静电接地检测记录不完整', location: '南京西站 · 2号装卸线', risk: '较大', owner: '王建国', due: '09月28日', stage: 1, type: '设备设施' },
  { id: 'ZG-2026-0216', title: '罐车装卸作业现场监护人员未全程在岗', location: '上海南站 · 危货作业区', risk: '重大', owner: '李海宁', due: '09月26日', stage: 2, type: '作业行为' },
  { id: 'ZG-2026-0211', title: '消防器材巡检卡填写与现场状态不一致', location: '杭州东站 · 货运场', risk: '一般', owner: '陈志远', due: '09月30日', stage: 3, type: '安全管理' },
  { id: 'ZG-2026-0208', title: '危货仓库通风设施定期维护记录缺项', location: '合肥北站 · 1号库', risk: '一般', owner: '赵敏', due: '10月03日', stage: 2, type: '设备设施' },
]
const trendData = [
  { day: '09.19', score: 71, issue: 28 }, { day: '09.20', score: 66, issue: 24 }, { day: '09.21', score: 62, issue: 22 },
  { day: '09.22', score: 58, issue: 19 }, { day: '09.23', score: 55, issue: 17 }, { day: '09.24', score: 49, issue: 14 }, { day: '09.25', score: 44, issue: 11 },
]
const radarData = [
  { subject: '人员行为', A: 78, B: 65 }, { subject: '设备设施', A: 68, B: 58 }, { subject: '作业环境', A: 52, B: 70 },
  { subject: '安全管理', A: 72, B: 62 }, { subject: '应急保障', A: 55, B: 74 },
]
const scatterData = [
  { x: 1, y: 8, risk: '一般' }, { x: 2, y: 11, risk: '较大' }, { x: 3, y: 7, risk: '一般' }, { x: 4, y: 16, risk: '重大' },
  { x: 5, y: 9, risk: '较大' }, { x: 6, y: 5, risk: '低' }, { x: 7, y: 13, risk: '重大' }, { x: 8, y: 6, risk: '一般' },
  { x: 9, y: 18, risk: '重大' }, { x: 10, y: 10, risk: '较大' }, { x: 11, y: 4, risk: '低' }, { x: 12, y: 12, risk: '较大' },
]
const masterItems: { icon: typeof ClipboardCheck; title: MasterKind; desc: string; version: string; count: string }[] = [
  { icon: ClipboardCheck, title: '评估指标库', desc: '静态 31 项 · 动态 61 项', version: 'V1.0.3', count: '92 项' },
  { icon: FileClock, title: '法规依据库', desc: '安全生产与铁路运输相关依据', version: 'V1.0.2', count: '46 条' },
  { icon: Gauge, title: '风险规则配置', desc: '风险矩阵阈值与综合评估口径', version: '待确认', count: '4 级' },
  { icon: ClipboardCheck, title: '整改阶段模板', desc: '按问题类型配置进度阶段', version: 'V1.0.1', count: '12 类' },
]
const initialMasterRecords: Record<MasterKind, MasterRecord[]> = {
  评估指标库: [
    { code: 'ZB-JT-001', name: '装卸作业人员持证情况', category: '静态评估 · 人员管理', version: 'V1.0.3', status: '已发布', description: '核验危险货物装卸相关人员的岗位资格、培训记录及证件有效期。' },
    { code: 'ZB-SB-008', name: '静电接地装置完好性', category: '静态评估 · 设备设施', version: 'V1.0.3', status: '已发布', description: '检查接地装置外观、连接状态、检测记录和有效期。' },
    { code: 'ZB-DT-021', name: '罐车装卸过程现场监护', category: '动态评估 · 作业行为', version: 'V1.0.3', status: '已发布', description: '评估装卸全过程现场监护人员到岗履职和异常处置情况。' },
    { code: 'ZB-YJ-004', name: '应急器材配置与点检', category: '静态评估 · 应急保障', version: 'V1.0.2', status: '修订中', description: '核查应急物资种类、数量、布点及定期点检记录。' },
  ],
  法规依据库: [
    { code: 'FG-AQ-001', name: '中华人民共和国安全生产法', category: '法律 · 安全生产', version: '2021版', status: '有效', description: '平台安全生产责任、风险管控和隐患治理要求的上位法依据。' },
    { code: 'FG-TL-006', name: '铁路危险货物运输安全监督管理规定', category: '部门规章 · 铁路运输', version: '现行版', status: '有效', description: '铁路危险货物承运、装卸、储存和监督管理的主要依据。' },
    { code: 'FG-GB-014', name: '危险货物分类和品名编号', category: '国家标准 · 危险货物', version: 'GB 6944', status: '有效', description: '用于危险货物分类、品名编号及业务数据标准化。' },
  ],
  风险规则配置: [
    { code: 'RISK-01', name: '重大风险', category: '风险矩阵 · 红色', version: 'R >= 20', status: '待确认', description: '风险值达到重大等级时触发局级管控、即时告警和专项复核。' },
    { code: 'RISK-02', name: '较大风险', category: '风险矩阵 · 橙色', version: '12 <= R < 20', status: '待确认', description: '较大风险由场站负责人制定专项措施并跟踪整改。' },
    { code: 'RISK-03', name: '一般风险', category: '风险矩阵 · 黄色', version: '5 <= R < 12', status: '待确认', description: '一般风险纳入班组日常检查和周期性复核。' },
    { code: 'RISK-04', name: '低风险', category: '风险矩阵 · 绿色', version: 'R < 5', status: '待确认', description: '低风险执行常规岗位管控并保留检查记录。' },
  ],
  整改阶段模板: [
    { code: 'ZG-SB-01', name: '设备设施问题整改', category: '4 阶段 · 设备设施', version: 'V1.0.1', status: '已发布', description: '问题确认、维修处置、检测验证、双人复核。' },
    { code: 'ZG-RY-02', name: '人员行为问题整改', category: '4 阶段 · 作业行为', version: 'V1.0.1', status: '已发布', description: '立即纠正、教育培训、现场复查、闭环确认。' },
    { code: 'ZG-GL-03', name: '管理记录缺项整改', category: '3 阶段 · 安全管理', version: 'V1.0.0', status: '已发布', description: '资料补录、责任人复核、管理确认。' },
  ],
}

function PlatformApp({ onBack, onLogout, userName }: { onBack: () => void; onLogout: () => void; userName: string }) {
  const [page, setPage] = useState<Page>('总览')
  const [issues, setIssues] = useState(initialIssues)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('全部风险')
  const [period, setPeriod] = useState('近7日')
  const [showAssessment, setShowAssessment] = useState(false)
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(readAssessments)
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [masterKind, setMasterKind] = useState<MasterKind | null>(null)
  const [masterRecords, setMasterRecords] = useState(initialMasterRecords)
  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState('')
  const filteredIssues = useMemo(() => issues.filter((issue) =>
    (filter === '全部风险' || issue.risk === filter) && `${issue.title}${issue.location}${issue.owner}`.includes(search)), [issues, filter, search])
  const completed = issues.filter((issue) => issue.stage === 4).length
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }
  const moveStage = (id: string, stage: number) => setIssues((items) => items.map((issue) => issue.id === id ? { ...issue, stage } : issue))
  useEffect(() => { localStorage.setItem('rail-assessments', JSON.stringify(assessments)) }, [assessments])
  const saveAssessment = (record: AssessmentRecord) => setAssessments((items) => [record, ...items.filter((item) => item.id !== record.id)])
  const completeAssessment = (record: AssessmentRecord) => {
    saveAssessment(record)
    const generated = record.findings.map((finding, index): Issue => ({ id: `ZG-${record.id.slice(3)}-${index + 1}`, title: finding, location: `${record.station} · ${record.area}`, risk: record.risk, owner: userName, due: '7日内', stage: 1, type: '评估生成' }))
    setIssues((current) => [...generated.filter((item) => !current.some((old) => old.id === item.id)), ...current])
    notify('综合评估报告已生成，隐患已转入整改闭环')
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><img src={logo} alt="铁路危险货物运输双重预防机制平台标识" /><div><strong>铁路安险通</strong><span>危货运输 · 双重预防</span></div><button className="icon-btn mobile-close" aria-label="关闭导航" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
        <div className="org-switch"><div className="org-mark"><TrainFront size={17} /></div><div><span>当前管理组织</span><strong>华东铁路局 · 安全监察部</strong></div><ChevronDown size={15} /></div>
        <div className="nav-caption">安全运营</div>
        <nav className="main-nav" aria-label="主导航">{navItems.map(({ name, icon: Icon }) => <button key={name} className={`nav-item ${page === name ? 'active' : ''}`} onClick={() => { setPage(name); setMobileNav(false) }}><Icon size={18} strokeWidth={1.8} /><span>{name === '总览' ? '安全驾驶舱' : name}</span>{name === '整改闭环' && <b className="nav-count">{issues.length}</b>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="support"><CircleHelp size={16} /><span>平台帮助与支持</span><ArrowRight size={14} /></div><div className="user-card"><div className="avatar">{userName.slice(0, 1)}</div><div><strong>{userName}</strong><span>平台用户</span></div><button className="icon-btn sidebar-logout" title="退出登录" aria-label="退出登录" onClick={onLogout}><LogOut size={17} /></button></div><small>铁路危险货物运输安全管理平台</small></div>
      </aside>
      {mobileNav && <button className="scrim" aria-label="关闭菜单" onClick={() => setMobileNav(false)} />}
      <main className="main-area">
        <header className="topbar"><div className="topbar-left"><button className="icon-btn menu-toggle" aria-label="打开导航" onClick={() => setMobileNav(true)}><Menu size={20} /></button><button className="portal-back" onClick={onBack}>门户首页</button><div className="crumb"><span>安全运营</span><span>/</span><strong>{page === '总览' ? '安全驾驶舱' : page}</strong></div></div><div className="top-actions"><span className="environment"><i />演示环境</span><span className="top-date"><CalendarDays size={15} />2026年9月25日 星期五</span><button className="icon-btn notification" aria-label="通知" onClick={() => notify('当前有 3 条待办提醒')}><Bell size={18} /><b /></button><button className="top-user" onClick={() => setPage('个人中心')}><div className="avatar small-avatar">{userName.slice(0, 1)}</div><span>{userName}</span><ChevronDown size={14} /></button></div></header>
        {page === '总览' && <Dashboard issues={issues} period={period} setPeriod={setPeriod} setPage={setPage} setSelectedIssue={setSelectedIssue} onNew={() => setShowAssessment(true)} onNotify={notify} />}
        {page === '风险评估' && <Assessment key={activeAssessmentId || 'assessment-list'} records={assessments} activeId={activeAssessmentId} setActiveId={setActiveAssessmentId} onSave={saveAssessment} onComplete={completeAssessment} onNew={() => setShowAssessment(true)} onNotify={notify} />}
        {page === '整改闭环' && <Rectifications issues={filteredIssues} allIssues={issues} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} moveStage={moveStage} onSelect={setSelectedIssue} completed={completed} />}
        {page === '历史分析' && <><History period={period} setPeriod={setPeriod} /><HistoryRecords records={assessments} onOpen={(id) => { setActiveAssessmentId(id); setPage('风险评估') }} /></>}
        {page === '基础资料' && <MasterData selectedKind={masterKind} setSelectedKind={setMasterKind} records={masterRecords} setRecords={setMasterRecords} onNotify={notify} />}
        {page === 'AI助手' && <AiAssistant records={assessments} issues={issues} />}
        {page === '个人中心' && <Profile userName={userName} records={assessments} issues={issues} onLogout={onLogout} />}
      </main>
      {showAssessment && <AssessmentModal onClose={() => setShowAssessment(false)} onCreate={(record) => { saveAssessment(record); setActiveAssessmentId(record.id); setShowAssessment(false); setPage('风险评估'); notify('检测数据已录入，开始静态与动态评估') }} />}
      {selectedIssue && <IssueDrawer issue={selectedIssue} onClose={() => setSelectedIssue(null)} onAdvance={(stage) => { moveStage(selectedIssue.id, stage); setSelectedIssue({ ...selectedIssue, stage }); notify(stage === 4 ? '整改已提交复核' : '整改进度已保存') }} />}
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  )
}

const referenceBanner = '/reference-banner.png'
const referenceProduct = '/reference-product.png'
const referenceShowcase = '/reference-showcase.jpg'

function PortalHome({ onEnter }: { onEnter: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const requestEntry = () => { setMenuOpen(false); onEnter() }
  const features = [
    { icon: ShieldAlert, title: '风险辨识评估', text: '覆盖危险货物装卸、仓储、运输组织及设备设施，形成静态检查、动态评分与专家意见相结合的风险结论。' },
    { icon: Gauge, title: '风险分级管控', text: '以 5 × 5 风险矩阵和四色分级展示风险态势，支持从局级、场站到作业环节逐级下钻。' },
    { icon: ClipboardCheck, title: '隐患排查任务', text: '按风险管控措施生成排查任务，明确责任人、周期、证据与整改期限，持续跟踪任务执行。' },
    { icon: Check, title: '整改闭环治理', text: '支持问题分派、进度记录、安全工程师复核与项目经理确认，保留全过程审计轨迹。' },
    { icon: ChartNoAxesCombined, title: '分析与预警', text: '汇总风险趋势、场站差异、整改时效和逾期任务，为管理决策提供可核对的数据依据。' },
  ]
  const strengths = [
    { title: '专业', text: '围绕铁路危险货物运输场景设计业务流程' },
    { title: '融合', text: '风险评估、隐患治理、复核销号一体贯通' },
    { title: '闭环', text: '每项问题都有责任、期限、证据和审核记录' },
    { title: '可控', text: '指标、法规、阈值和模板均实行版本管理' },
  ]
  return <div className="portal-page">
    <header className="portal-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(3,28,48,.35), rgba(4,24,42,.12), rgba(6,25,42,.25)), url(${referenceBanner})` }}>
      <nav className="portal-nav">
        <button className="portal-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><img src={logo} alt="铁路安险通标识" /><span><strong>铁路安险通</strong><small>双重预防机制一体化平台</small></span></button>
        <button className="portal-menu-toggle" aria-label="打开门户导航" onClick={() => setMenuOpen((open) => !open)}><Menu size={25} /></button>
        <div className={`portal-links ${menuOpen ? 'open' : ''}`}>
          <a href="#home" onClick={() => setMenuOpen(false)}>首页</a><a href="#overview" onClick={() => setMenuOpen(false)}>平台概况</a><a href="#process" onClick={() => setMenuOpen(false)}>业务流程</a><a href="#features" onClick={() => setMenuOpen(false)}>产品功能</a><a href="#strengths" onClick={() => setMenuOpen(false)}>平台特点</a><a href="#showcase" onClick={() => setMenuOpen(false)}>产品展示</a>
          <button onClick={requestEntry}>进入管理平台</button>
        </div>
      </nav>
      <div className="portal-hero-copy" id="home"><span>RAILWAY DANGEROUS GOODS SAFETY</span><h1>铁路危险货物运输<br />“双重预防机制”<br className="portal-title-break" />一体化信息平台</h1><p>专注铁路危险货物运输风险分级管控与隐患排查治理</p><button className="portal-hero-enter" onClick={requestEntry}>进入管理平台 <ArrowRight size={16} /></button></div>
      <div className="portal-hero-note">参考站公开图片 · 临时占位，正式版将替换为铁路场景自有素材</div>
    </header>

    <div className="portal-breadcrumb"><MapPin size={17} /><span>您的当前位置：</span><a href="#home">首页</a><ChevronDown size={14} className="portal-bread-arrow" /><strong>铁路危险货物运输“双重预防机制”一体化信息平台</strong></div>

    <main>
      <section className="portal-overview portal-section" id="overview"><div className="portal-section-inner portal-overview-grid"><div><h2>铁路危险货物运输<br />“双重预防机制”一体化信息平台</h2><p>面向铁路局、场站及安全管理人员，将风险辨识、静态评估、动态作业评分、专家研判、隐患整改和双人复核统一到一套业务链路中。平台通过风险四色分级、5 × 5 矩阵、任务进度与历史趋势，帮助管理人员及时掌握风险变化，推动风险管控与隐患治理全过程闭环。</p><div className="portal-overview-actions"><button onClick={requestEntry}>进入平台演示 <ArrowRight size={16} /></button><span><Shield size={17} /> 当前为前端交互演示版</span></div></div><div className="portal-product-visual"><img src={referenceProduct} alt="参考站公开图片临时占位" /><small>参考站公开图片 · 临时占位</small></div></div></section>

      <section className="portal-process portal-section" id="process"><div className="portal-section-inner"><PortalHeading en="BUSINESS PROCESS" title="业务流程" desc="以风险为起点，以整改复核为闭环，形成可追溯的安全管理链路" /><div className="portal-process-list">{[
        ['01', '风险辨识', '覆盖作业活动、设备设施与环境因素'], ['02', '评估分级', '静态检查、动态评分和专家意见'], ['03', '管控清单', '形成分级管控措施与责任清单'], ['04', '隐患排查', '按场站、岗位和周期生成任务'], ['05', '整改复核', '整改记录、双人复核和闭环销号'],
      ].map(([n, title, text], index) => <div className="portal-process-item" key={n}><b>{n}</b><span><strong>{title}</strong><small>{text}</small></span>{index < 4 && <ArrowRight size={20} />}</div>)}</div></div></section>

      <section className="portal-features portal-section" id="features"><div className="portal-section-inner"><PortalHeading en="PRODUCT FUNCTIONS" title="产品功能" desc="围绕铁路危险货物运输安全运营，建设统一、清晰、可下钻的业务能力" /><div className="portal-feature-grid">{features.map(({ icon: Icon, title, text }, index) => <article key={title}><div><Icon size={28} /><span>0{index + 1}</span></div><h3>{title}</h3><p>{text}</p><button onClick={requestEntry}>进入功能演示 <ArrowRight size={15} /></button></article>)}</div></div></section>

      <section className="portal-strengths portal-section" id="strengths"><div className="portal-section-inner"><PortalHeading en="PLATFORM ADVANTAGES" title="平台特点" desc="兼顾铁路安全业务的专业性、全过程协同与数据可追溯要求" /><div className="portal-strength-grid">{strengths.map(({ title, text }, index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>

      <section className="portal-showcase portal-section" id="showcase"><div className="portal-section-inner portal-showcase-grid"><div><span className="portal-kicker">PRODUCT SHOWCASE</span><h2>多端协同的安全运营平台</h2><p>管理端聚焦风险态势、任务统筹和审核决策；移动端可用于现场检查、证据采集与整改反馈。当前演示已完成管理端核心页面，移动作业端作为后续扩展范围。</p><button onClick={requestEntry}>打开平台演示 <ArrowRight size={16} /></button></div><div className="portal-showcase-image"><img src={referenceShowcase} alt="平台产品展示临时占位图" /><span>临时占位图 · 待替换为铁路场景产品截图</span></div></div></section>
    </main>
    <footer className="portal-footer"><div><img src={logo} alt="铁路安险通标识" /><span><strong>铁路安险通</strong><small>铁路危险货物运输“双重预防机制”一体化信息平台</small></span></div><p>交互演示版 · 风险阈值、指标源表与正式部署边界待业务确认</p><button onClick={requestEntry}>进入管理平台</button></footer>
  </div>
}

function PortalHeading({ en, title, desc }: { en: string; title: string; desc: string }) {
  return <div className="portal-heading"><span>{en}</span><h2>{title}</h2><p>{desc}</p></div>
}

function App() {
  const [entered, setEntered] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [userName, setUserName] = useState('周明远')
  const requestEntry = async () => {
    if (hasSession()) {
      try {
        const user = await getCurrentUser()
        setUserName(user.display_name)
        setEntered(true)
        return
      } catch {
        clearSession()
      }
    }
    setAuthOpen(true)
  }
  const handleLogout = async () => {
    await logout()
    setEntered(false)
    setAuthOpen(false)
  }
  if (entered) return <PlatformApp onBack={() => setEntered(false)} onLogout={handleLogout} userName={userName} />
  if (authOpen) return <AuthPanel onClose={() => setAuthOpen(false)} onSuccess={(name) => { setUserName(name); setAuthOpen(false); setEntered(true) }} />
  return <PortalHome onEnter={requestEntry} />
}

type AuthMode = 'login' | 'register'

function AuthPanel({ onClose, onSuccess }: { onClose: () => void; onSuccess: (name: string) => void }) {
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
        onSuccess(user.display_name)
      }
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : '服务暂时不可用，请确认后端和数据库已启动')
    } finally {
      setSubmitting(false)
    }
  }
  return <main className="auth-page"><div className="auth-backdrop" role="presentation"><div className="auth-brand-panel"><button className="auth-brand" onClick={onClose} aria-label="返回门户首页"><img src={logo} alt="铁路安险通标识" /><span><strong>铁路安险通</strong><small>铁路危险货物运输双重预防机制一体化信息平台</small></span></button><div className="auth-brand-copy"><span>RAILWAY DANGEROUS GOODS SAFETY</span><h1>让风险可见<br />让整改闭环</h1><p>以风险分级管控与隐患排查治理为核心，支撑铁路危险货物运输安全运营。</p></div><small className="auth-background-credit">铁路运输场景 · 平台登录入口</small></div><section className="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div className="auth-panel-header"><div><span className="auth-kicker">SECURITY PLATFORM ACCESS</span><h2 id="auth-title">进入管理平台</h2></div><button className="icon-btn" aria-label="返回门户首页" onClick={onClose} disabled={submitting}><X size={19} /></button></div><p className="auth-intro">请先登录或注册平台账号，进入铁路危险货物运输风险评估与隐患治理工作台。</p><div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMessage('') }} disabled={submitting}><LogIn size={16} />账号登录</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMessage('') }} disabled={submitting}><UserPlus size={16} />新用户注册</button></div><form className="auth-form" onSubmit={submit}><label><span>账号</span><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入账号" autoComplete="username" disabled={submitting} /></label><label><span>密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 8 位密码" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} disabled={submitting} /></label>{mode === 'register' && <label><span>确认密码</span><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="再次输入密码" autoComplete="new-password" disabled={submitting} /></label>}{message && <p className="auth-message" role="status">{message}</p>}<button className="auth-submit" type="submit" disabled={submitting}>{submitting ? '正在提交...' : mode === 'login' ? '登录并进入平台' : '注册账号'}{!submitting && <ArrowRight size={16} />}</button></form><div className="auth-note"><Shield size={15} /><span>账号由 FastAPI 服务端管理，当前开发环境连接 MySQL；正式部署前仍需配置生产数据库和密钥。</span></div></section></div></main>
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{action}</div></div>
}
function Dashboard({ issues, period, setPeriod, setPage, setSelectedIssue, onNew, onNotify }: { issues: Issue[]; period: string; setPeriod: (v: string) => void; setPage: (v: Page) => void; setSelectedIssue: (v: Issue) => void; onNew: () => void; onNotify: (v: string) => void }) {
  return <div className="content dashboard-content">
    <PageHeading eyebrow="安全态势 · 2026年第39周" title="安全驾驶舱" description="铁路危险货物运输风险态势与整改闭环运行情况" action={<><button className="button secondary" onClick={() => onNotify('驾驶舱数据已刷新')}><Activity size={16} />刷新数据</button><button className="button primary" onClick={onNew}><Plus size={17} />新建评估</button></>} />
    <div className="filter-bar"><div className="filter-group"><span className="filter-label">统计范围</span>{['华东铁路局', '全部场站'].map((label) => <button className="select-chip" key={label} onClick={() => onNotify(`${label}筛选已应用`)}>{label}<ChevronDown size={14} /></button>)}<span className="vertical-rule" />{['近7日', '近30日', '本年度'].map((value) => <button key={value} className={`segmented ${period === value ? 'selected' : ''}`} onClick={() => setPeriod(value)}>{value}</button>)}</div><span className="updated"><i />数据更新于 09:42</span></div>
    <div className="metric-grid">
      <Metric icon={Gauge} label="综合风险指数" value="44.8" unit="分" delta="较上周期下降 8.6%" trend="down" color="blue" />
      <Metric icon={ShieldAlert} label="重大 / 较大风险" value="18" unit="项" delta="重大风险 4 项待处置" trend="up" color="red" />
      <Metric icon={ClipboardCheck} label="整改闭环率" value="86.4" unit="%" delta="较上周期提升 3.2%" trend="down" color="green" />
      <Metric icon={Clock3} label="逾期整改任务" value="7" unit="项" delta="其中高风险任务 2 项" trend="up" color="amber" />
    </div>
    <section className="overview-grid">
      <article className="panel trend-panel"><PanelTitle title="风险态势趋势" subtitle="综合风险指数与隐患数量变化" right={<button className="link-button" onClick={() => setPage('历史分析')}>查看分析 <ArrowRight size={14} /></button>} /><div className="chart-legend"><span><i className="legend-dot blue-dot" />综合风险指数</span><span><i className="legend-line orange-line" />隐患数量</span></div><div className="trend-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={trendData} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}><defs><linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1765b4" stopOpacity={0.17} /><stop offset="98%" stopColor="#1765b4" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#e8edf2" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 11 }} dy={8} /><YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 11 }} /><YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 11 }} /><Tooltip contentStyle={{ border: '1px solid #e4eaf0', borderRadius: 6, boxShadow: '0 6px 20px #17324d12' }} /><Area yAxisId="left" type="monotone" dataKey="score" name="综合风险指数" stroke="#1765b4" strokeWidth={2.5} fill="url(#scoreFill)" /><Line yAxisId="right" type="monotone" dataKey="issue" name="隐患数量" stroke="#e68b39" strokeWidth={2} dot={{ r: 3, fill: '#e68b39', strokeWidth: 0 }} /></ComposedChart></ResponsiveContainer></div><div className="chart-footnote">统计口径：各场站综合风险指数加权均值 · 样本：7 个统计周期</div></article>
      <article className="panel distribution-panel"><PanelTitle title="风险等级分布" subtitle="当前在册风险项 · 共 126 项" right={<button className="icon-btn subtle" title="更多风险分布" onClick={() => setPage('风险评估')}><MoreHorizontal size={18} /></button>} /><div className="distribution-body"><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: '重大', value: 4 }, { name: '较大', value: 14 }, { name: '一般', value: 38 }, { name: '低', value: 70 }]} dataKey="value" innerRadius="69%" outerRadius="91%" paddingAngle={3} stroke="none">{risks.map((risk) => <Cell key={risk} fill={colors[risk]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="donut-label"><strong>126</strong><span>风险项</span></div></div><div className="risk-legend">{risks.map((risk, index) => <button key={risk} className="risk-line" onClick={() => { setPage('整改闭环') }}><span className="risk-name"><i style={{ background: colors[risk] }} />{risk}风险</span><strong>{[4, 14, 38, 70][index]}<small>项</small></strong><span className="risk-percent">{[3, 11, 30, 56][index]}%</span></button>)}</div></div><div className="distribution-foot"><span>较上月</span><b className="good-text"><ArrowDownRight size={15} />重大风险减少 2 项</b></div></article>
      <article className="panel matrix-panel"><PanelTitle title="5 × 5 风险矩阵" subtitle="可能性 × 严重度" right={<button className="link-button" onClick={() => setPage('风险评估')}>进入评估 <ArrowRight size={14} /></button>} /><RiskMatrix compact /></article>
      <article className="panel priority-panel"><PanelTitle title="重点风险任务" subtitle="需要优先关注的场站与作业环节" right={<button className="link-button" onClick={() => setPage('风险评估')}>全部任务 <ArrowRight size={14} /></button>} /><div className="priority-list"><PriorityRow rank="01" name="危货装卸监护执行不到位" site="上海南站 · 罐车装卸" risk="重大" count="3项关联隐患" color={colors.重大} onClick={() => setPage('整改闭环')} /><PriorityRow rank="02" name="储罐区消防设施配置不规范" site="南京西站 · 危货仓储" risk="较大" count="2项关联隐患" color={colors.较大} onClick={() => setPage('整改闭环')} /><PriorityRow rank="03" name="静电接地检测记录缺失" site="合肥北站 · 装卸作业" risk="较大" count="2项关联隐患" color={colors.较大} onClick={() => setPage('整改闭环')} /></div></article>
    </section>
    <section className="panel tasks-panel"><PanelTitle title="整改任务跟踪" subtitle="高风险隐患优先 · 最近更新" right={<button className="link-button" onClick={() => setPage('整改闭环')}>查看全部 <ArrowRight size={14} /></button>} /><IssueTable issues={issues.slice(0, 3)} onSelect={setSelectedIssue} /></section>
    <div className="dashboard-bottom"><div className="data-note"><Shield size={15} />数据为演示数据，风险等级阈值待业务负责人确认</div><button className="text-action" onClick={() => setPage('历史分析')}>查看历史分析 <ArrowRight size={14} /></button></div>
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
function IssueTable({ issues, onSelect }: { issues: Issue[]; onSelect: (issue: Issue) => void }) {
  return <div className="table-scroll"><table className="issue-table"><thead><tr><th>隐患问题</th><th>风险等级</th><th>责任人</th><th>整改进度</th><th>整改期限</th><th aria-label="操作" /></tr></thead><tbody>{issues.map((issue) => <tr key={issue.id} onClick={() => onSelect(issue)}><td><strong>{issue.title}</strong><small>{issue.location} · {issue.id}</small></td><td><RiskBadge risk={issue.risk} /></td><td>{issue.owner}</td><td><ProgressRing stage={issue.stage} /><span className="table-stage">{stageLabel(issue.stage)}</span></td><td>{issue.due}</td><td><button className="row-action" onClick={(event) => { event.stopPropagation(); onSelect(issue) }}>查看 <ArrowRight size={13} /></button></td></tr>)}</tbody></table></div>
}
function RiskBadge({ risk }: { risk: Risk }) { return <span className="risk-badge" style={{ color: colors[risk], background: `${colors[risk]}15` }}><i style={{ background: colors[risk] }} />{risk}风险</span> }
function ProgressRing({ stage }: { stage: number }) { const percentage = [0, 25, 58, 82, 100][stage] ?? 0; return <span className="progress-ring" style={{ background: `conic-gradient(#16816c ${percentage}%, #e8edf0 ${percentage}% 100%)` }}><i>{stage === 4 ? <Check size={11} /> : `${percentage}%`}</i></span> }
function stageLabel(stage: number) { return ['待整改', '未戴 / 未落实', '少数完成', '多数完成', '已完成'][stage] ?? '待整改' }
function Rectifications({ issues, allIssues, filter, setFilter, search, setSearch, moveStage, onSelect, completed }: { issues: Issue[]; allIssues: Issue[]; filter: string; setFilter: (v: string) => void; search: string; setSearch: (v: string) => void; moveStage: (id: string, stage: number) => void; onSelect: (issue: Issue) => void; completed: number }) {
  void moveStage
  return <div className="content"><PageHeading eyebrow="隐患治理 · 任务跟踪" title="整改闭环" description="按风险等级、责任人和整改期限跟踪问题处置与双人复核" action={<button className="button secondary" onClick={() => window.print()}><Download size={16} />导出清单</button>} /><div className="metric-grid rect-metrics"><Metric icon={AlertTriangle} label="隐患总数" value={`${allIssues.length + 2}`} unit="项" delta="较上周期新增 2 项" trend="up" color="red" /><Metric icon={Clock3} label="待整改 / 整改中" value={`${allIssues.length - completed}`} unit="项" delta="高风险任务优先处理" trend="up" color="amber" /><Metric icon={ClipboardCheck} label="待双人复核" value="3" unit="项" delta="安全工程师 2 · 项目经理 1" trend="up" color="blue" /><Metric icon={Shield} label="已闭环问题" value={`${completed + 42}`} unit="项" delta="本月闭环率 86.4%" trend="down" color="green" /></div><div className="panel list-panel"><div className="list-toolbar"><div className="filter-group"><Filter size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>全部风险</option>{risks.map((risk) => <option key={risk}>{risk}</option>)}</select><span className="vertical-rule" /><div className="search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索问题、场站或责任人" /></div></div><div className="toolbar-info">共 <b>{issues.length}</b> 项任务</div></div><IssueTable issues={issues} onSelect={onSelect} />{issues.length === 0 && <div className="empty-state"><Search size={23} /><strong>没有匹配的整改任务</strong><span>调整筛选条件后再试</span></div>}</div><div className="process-note"><Shield size={16} /><span>整改销号须依次通过<span>安全工程师技术复核</span>与<span>项目经理管理确认</span>。高风险问题需上传整改后证据。</span></div></div>
}
function Assessment({ records, activeId, setActiveId, onSave, onComplete, onNew, onNotify }: { records: AssessmentRecord[]; activeId: string | null; setActiveId: (id: string | null) => void; onSave: (record: AssessmentRecord) => void; onComplete: (record: AssessmentRecord) => void; onNew: () => void; onNotify: (v: string) => void }) {
  const active = records.find((record) => record.id === activeId) || null
  const [draft, setDraft] = useState<AssessmentRecord | null>(active)
  const update = (values: Partial<AssessmentRecord>) => setDraft((current) => current ? { ...current, ...values } : current)
  if (!draft) return <div className="content"><PageHeading eyebrow="检测数据 · 动静结合" title="风险评估" description="先录入外部检测数据，再完成静态检查和动态评分，系统生成报告、隐患与整改措施" action={<button className="button primary" onClick={onNew}><Plus size={17} />新建评估任务</button>} /><div className="panel assessment-list"><div className="config-list-head"><div><strong>评估任务</strong><span>历史任务保存在当前浏览器，可继续填写或查看报告</span></div><span className="version-pill">{records.length} 项</span></div>{records.length ? records.map((record) => <article className="config-row" key={record.id}><div className="config-row-code">{record.id}</div><div className="config-row-main"><strong>{record.name}</strong><span>{record.station} · {record.cargo} · {record.createdAt}</span></div><RiskBadge risk={record.risk} /><button className="row-action" onClick={() => setActiveId(record.id)}>{record.status === '已完成' ? '查看报告' : '继续评估'} <ArrowRight size={13} /></button></article>) : <div className="empty-state"><Database size={24} /><strong>暂无评估任务</strong><span>新建任务并录入外部检测数据后开始评估</span></div>}</div></div>
  const failed = draft.staticChecks.reduce<number[]>((all, value, index) => value ? all : [...all, index], [])
  const score = draft.likelihood * draft.severity
  const risk = riskFromScore(score)
  const staticLabels = ['危险货物标识、品名与 UN 编号一致', '包装/罐体及阀门外观完好', '静电接地与消防设施检测有效', '作业人员资质和应急物资齐全']
  const findings = [
    ...failed.map((index) => `${staticLabels[index]}未通过`),
    ...(draft.temperature > 35 ? [`检测温度 ${draft.temperature}℃ 偏高`] : []),
    ...(draft.concentration > 25 ? [`可燃气体浓度 ${draft.concentration}%LEL 超过演示预警值`] : []),
    ...(score >= 12 ? [`动态作业风险值 R=${score}，达到${risk}风险`] : []),
  ]
  const safeFindings = findings.length ? findings : ['本次检测与评估未发现明显异常，建议继续执行常规巡检']
  const measures = findings.length ? findings.map((finding, index) => index === 0 ? `立即停止相关作业并隔离现场，针对“${finding}”完成复核` : `落实“${finding}”专项整改，上传检测记录和整改后证据`) : ['保持现有管控措施，按计划开展下一周期检测与复评']
  const finish = () => { const completed = { ...draft, score, risk, findings: safeFindings, measures, status: '已完成' as const }; setDraft(completed); onComplete(completed) }
  return <div className="content"><PageHeading eyebrow={`评估任务 · ${draft.id}`} title={draft.name} description={`${draft.station} · ${draft.area} · ${draft.cargo}（${draft.unNumber || '未填UN编号'}）`} action={<><button className="button secondary" onClick={() => { onSave(draft); setActiveId(null) }}><ArrowLeft size={16} />任务列表</button><button className="button primary" onClick={() => { onSave({ ...draft, score, risk }); onNotify('评估进度已暂存') }}><Check size={16} />暂存</button></>} /><div className="assessment-flow panel"><div className="flow-step done"><span><Check size={14} /></span><b>检测数据</b><small>外部设备/人工录入</small></div><i /><div className="flow-step done"><span><Check size={14} /></span><b>静态评估</b><small>{draft.staticChecks.filter(Boolean).length}/4 项通过</small></div><i /><div className="flow-step current"><span>03</span><b>动态评估</b><small>L × C = R</small></div><i /><div className={`flow-step ${draft.status === '已完成' ? 'done' : ''}`}><span>{draft.status === '已完成' ? <Check size={14} /> : '04'}</span><b>综合报告</b><small>隐患与整改措施</small></div></div><section className="assessment-input-grid"><article className="panel assessment-form-card"><PanelTitle title="外部检测数据" subtitle={`数据来源：${draft.detector}`} /><div className="sensor-summary"><div><span>温度</span><strong>{draft.temperature} ℃</strong></div><div><span>压力</span><strong>{draft.pressure} MPa</strong></div><div><span>气体浓度</span><strong>{draft.concentration} %LEL</strong></div></div><div className="data-note"><Database size={15} />当前为人工录入/设备导入演示，正式接口需按检测设备协议接入并校验签名与时间戳。</div></article><article className="panel assessment-form-card"><PanelTitle title="静态安全检查" subtitle="不通过项目会自动进入隐患清单" /><div className="check-list">{staticLabels.map((label, index) => <label key={label}><input type="checkbox" checked={draft.staticChecks[index]} onChange={(event) => { const next = [...draft.staticChecks]; next[index] = event.target.checked; update({ staticChecks: next }) }} /><span>{label}</span><b>{draft.staticChecks[index] ? '通过' : '待整改'}</b></label>)}</div></article><article className="panel assessment-form-card dynamic-score"><PanelTitle title="动态作业评分" subtitle="可能性 L × 严重度 C = 风险值 R（演示阈值待业务确认）" /><div className="score-controls"><label><span>可能性 L</span><select value={draft.likelihood} onChange={(event) => update({ likelihood: Number(event.target.value) })}>{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value} - {['极少','较少','可能','频繁','极高'][value - 1]}</option>)}</select></label><b>×</b><label><span>严重度 C</span><select value={draft.severity} onChange={(event) => update({ severity: Number(event.target.value) })}>{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value} - {['轻微','一般','较重','严重','灾难'][value - 1]}</option>)}</select></label><b>=</b><div className="score-result" style={{ borderColor: colors[risk] }}><strong>{score}</strong><RiskBadge risk={risk} /></div></div><RiskMatrix compact /></article></section><section className="panel assessment-report"><div className="report-heading"><div><span className="eyebrow">综合评估输出</span><h2>{draft.status === '已完成' ? '评估报告' : '报告预览'}</h2><p>根据检测数据、静态检查和动态评分汇总，人工确认后形成整改任务。</p></div><button className="button primary" onClick={finish}>{draft.status === '已完成' ? '重新生成报告' : '完成评估并生成报告'}<ArrowRight size={15} /></button></div><div className="report-summary"><div><span>危险货物</span><strong>{draft.cargo}</strong><small>{draft.unNumber || 'UN编号待补充'}</small></div><div><span>综合风险</span><strong style={{ color: colors[risk] }}>{risk}</strong><small>R = {score}</small></div><div><span>发现隐患</span><strong>{findings.length}</strong><small>静态 {failed.length} · 动态/检测 {findings.length - failed.length}</small></div><div><span>报告状态</span><strong>{draft.status}</strong><small>规则版本 V1.0-demo</small></div></div><div className="report-columns"><div><h3>总体隐患</h3>{safeFindings.map((finding, index) => <p key={finding}><b>{String(index + 1).padStart(2, '0')}</b><span>{finding}</span></p>)}</div><div><h3>整改措施</h3>{measures.map((measure, index) => <p key={measure}><b>{String(index + 1).padStart(2, '0')}</b><span>{measure}</span></p>)}</div></div><div className="report-note"><Shield size={16} />报告为辅助评估结果，检测异常、风险等级和整改销号均须由具备权限的人员复核确认。</div></section></div>
}
function History({ period, setPeriod }: { period: string; setPeriod: (v: string) => void }) {
  return <div className="content"><PageHeading eyebrow="历史档案 · 趋势洞察" title="历史分析" description="追踪风险变化、场站维度差异和整改周期，分析数据均可下钻核对" action={<button className="button secondary" onClick={() => window.print()}><Download size={16} />导出报告</button>} /><div className="filter-bar"><div className="filter-group"><span className="filter-label">分析周期</span>{['近7日', '近30日', '本年度'].map((value) => <button key={value} className={`segmented ${period === value ? 'selected' : ''}`} onClick={() => setPeriod(value)}>{value}</button>)}<span className="vertical-rule" /><button className="select-chip"><MapPin size={14} />全部场站<ChevronDown size={14} /></button></div><span className="updated">统计口径 · 最近更新 09:42</span></div><div className="metric-grid history-metrics"><Metric icon={FileClock} label="历史评估任务" value="248" unit="次" delta="覆盖 18 个场站" trend="down" color="blue" /><Metric icon={ShieldAlert} label="发现隐患" value="1,426" unit="项" delta="较上周期下降 12.8%" trend="down" color="red" /><Metric icon={ClipboardCheck} label="按期闭环率" value="91.2" unit="%" delta="较上周期提升 4.6%" trend="down" color="green" /><Metric icon={Clock3} label="平均整改周期" value="4.8" unit="天" delta="较上周期缩短 0.7 天" trend="down" color="amber" /></div><section className="analytics-grid"><article className="panel analytics-wide"><PanelTitle title="综合风险指数变化" subtitle="按周统计各场站加权平均风险值" right={<button className="icon-btn subtle" title="更多"><MoreHorizontal size={18} /></button>} /><div className="analytics-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData.concat([{ day: '09.26', score: 42, issue: 10 }, { day: '09.27', score: 39, issue: 9 }])} margin={{ top: 12, right: 15, bottom: 0, left: -15 }}><CartesianGrid stroke="#e8edf2" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 11 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8995a2', fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="score" name="综合风险指数" stroke="#1765b4" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div><div className="chart-footnote">解释：指数持续下降，风险管控措施正在发挥作用 · 样本量 18 个场站</div></article><article className="panel"><PanelTitle title="风险维度对比" subtitle="本周期 vs 上周期" /><div className="radar-chart"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData} outerRadius="70%"><PolarGrid stroke="#e5ebf0" /><PolarAngleAxis dataKey="subject" tick={{ fill: '#657383', fontSize: 11 }} /><Radar name="本周期" dataKey="A" stroke="#1765b4" fill="#1765b4" fillOpacity={0.2} /><Radar name="上周期" dataKey="B" stroke="#e58b3b" fill="#e58b3b" fillOpacity={0.12} /><Tooltip /></RadarChart></ResponsiveContainer></div><div className="chart-legend center-legend"><span><i className="legend-dot blue-dot" />本周期</span><span><i className="legend-dot orange-dot" />上周期</span></div></article><article className="panel"><PanelTitle title="风险值 × 整改用时" subtitle="每个点代表一项已完成整改的问题" /><div className="scatter-chart"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 10, right: 12, bottom: 2, left: -18 }}><CartesianGrid stroke="#e8edf2" /><XAxis type="number" dataKey="x" name="风险值" unit="分" tick={{ fill: '#8995a2', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis type="number" dataKey="y" name="整改用时" unit="天" tick={{ fill: '#8995a2', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ strokeDasharray: '3 3' }} /><Scatter data={scatterData} name="隐患整改" fill="#1765b4">{scatterData.map((point, index) => <Cell key={index} fill={colors[point.risk as Risk]} />)}</Scatter></ScatterChart></ResponsiveContainer></div><div className="chart-footnote">观察：高风险问题整改周期差异较大，建议加强逾期预警 · 样本 12 项</div></article><article className="panel"><PanelTitle title="各场站闭环表现" subtitle="本月整改闭环率排名" /><div className="station-bars">{[{ n: '南京西站', v: 96 }, { n: '杭州东站', v: 92 }, { n: '合肥北站', v: 87 }, { n: '上海南站', v: 82 }, { n: '徐州北站', v: 78 }].map((item, index) => <div className="station-bar" key={item.n}><span>{item.n}</span><i><b style={{ width: `${item.v}%` }} /></i><strong>{item.v}%</strong><small>0{index + 1}</small></div>)}</div><div className="chart-footnote">说明：闭环率 = 已完成整改问题 / 到期应完成问题</div></article></section></div>
}
function HistoryRecords({ records, onOpen }: { records: AssessmentRecord[]; onOpen: (id: string) => void }) {
  return <div className="content history-records-wrap"><div className="chart-explanation"><Activity size={17} /><div><strong>图表阅读说明</strong><span>折线图反映综合风险指数随时间的变化，数值下降表示总体风险缓解；雷达图比较人员、设备、环境、管理和应急五个维度；散点图用于识别高风险且整改耗时较长的异常任务。图表用于趋势研判，具体结论应下钻到原始检测数据和单项报告。</span></div></div><section className="panel history-records"><PanelTitle title="评估历史记录" subtitle="保留检测数据、评分、风险结论、隐患与整改措施" /><div className="table-scroll"><table className="task-table"><thead><tr><th>任务 / 危险货物</th><th>场站</th><th>检测来源</th><th>风险</th><th>隐患</th><th>状态</th><th /></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><strong>{record.name}</strong><small>{record.cargo} · {record.unNumber || '无UN编号'}</small></td><td>{record.station}</td><td>{record.detector}</td><td><RiskBadge risk={record.risk} /></td><td>{record.findings.length} 项</td><td>{record.status}</td><td><button className="row-action" onClick={() => onOpen(record.id)}>查看报告 <ArrowRight size={13} /></button></td></tr>)}</tbody></table></div>{records.length === 0 && <div className="empty-state"><FileClock size={23} /><strong>暂无评估历史</strong><span>完成风险评估后，报告会自动保留在这里</span></div>}</section></div>
}

function MasterData({ selectedKind, setSelectedKind, records, setRecords, onNotify }: { selectedKind: MasterKind | null; setSelectedKind: (kind: MasterKind | null) => void; records: Record<MasterKind, MasterRecord[]>; setRecords: React.Dispatch<React.SetStateAction<Record<MasterKind, MasterRecord[]>>>; onNotify: (v: string) => void }) {
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const items = masterItems
  const activeMeta = selectedKind ? items.find((item) => item.title === selectedKind) : null
  const activeRecords = selectedKind ? records[selectedKind].filter((record) => `${record.code}${record.name}${record.category}`.includes(search)) : []
  const openKind = (kind: MasterKind) => { setSelectedKind(kind); setSearch(''); setShowNew(false) }
  const createRecord = () => {
    if (!selectedKind || !newName.trim()) return
    const record: MasterRecord = { code: `${selectedKind === '法规依据库' ? 'FG' : selectedKind === '风险规则配置' ? 'RISK' : 'CFG'}-${String(records[selectedKind].length + 1).padStart(3, '0')}`, name: newName.trim(), category: `${selectedKind} · 新增条目`, version: '草稿', status: '待编辑', description: '新建配置条目，完成字段维护并经业务负责人确认后发布。' }
    setRecords((all) => ({ ...all, [selectedKind]: [record, ...all[selectedKind]] }))
    setNewName(''); setShowNew(false); onNotify(`已新增${selectedKind}条目`)
  }
  if (selectedKind && activeMeta) return <div className="content"><PageHeading eyebrow={`平台配置 · ${selectedKind}`} title={selectedKind} description={activeMeta.desc} action={<><button className="button secondary" onClick={() => setSelectedKind(null)}><ArrowLeft size={16} />返回基础资料</button><button className="button primary" onClick={() => setShowNew(true)}><Plus size={16} />新增配置</button></>} /><div className="filter-bar"><div className="filter-group"><Search size={15} /><div className="search-field"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`搜索${selectedKind}名称或编号`} /></div></div><span className="updated">当前版本 · {activeMeta.version} · 共 {records[selectedKind].length} 项</span></div>{showNew && <div className="panel config-editor"><div><span className="eyebrow">新建配置</span><h2>添加{selectedKind}条目</h2></div><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={`请输入${selectedKind}名称`} autoFocus /><div className="config-editor-actions"><button className="button secondary" onClick={() => setShowNew(false)}>取消</button><button className="button primary" disabled={!newName.trim()} onClick={createRecord}>保存配置</button></div></div>}<div className="panel config-list"><div className="config-list-head"><div><strong>{selectedKind}清单</strong><span>配置均为当前演示环境数据，可继续编辑接入后端接口</span></div><span className="version-pill">{activeMeta.version}</span></div>{activeRecords.length ? activeRecords.map((record) => <article className="config-row" key={record.code}><div className="config-row-code">{record.code}</div><div className="config-row-main"><strong>{record.name}</strong><span>{record.category} · {record.description}</span></div><span className={`config-status ${record.status === '待确认' || record.status === '待编辑' ? 'pending' : ''}`}>{record.status}</span><button className="row-action" onClick={() => onNotify(`已打开${record.name}详情`)}>查看 <ArrowRight size={13} /></button></article>) : <div className="empty-state"><Search size={23} /><strong>没有匹配的配置</strong><span>调整搜索条件后再试</span></div>}</div></div>
  return <div className="content"><PageHeading eyebrow="平台配置 · 版本管理" title="基础资料" description="维护指标、法规、规则和整改模板版本；更新不影响已启动任务" action={<button className="button primary" onClick={() => openKind('评估指标库')}><Plus size={16} />新增配置</button>} /><div className="master-banner"><div className="master-mark"><Boxes size={24} /></div><div><strong>配置版本统一管理</strong><span>所有评估任务保存创建时采用的指标、法规与风险规则快照</span></div><span className="banner-badge"><Shield size={14} />版本受控</span></div><div className="master-grid">{items.map(({ icon: Icon, title, desc, version, count }) => <article className="panel master-card" key={title}><div className="master-card-icon"><Icon size={20} /></div><div className="master-card-top"><span className="version-pill">{version}</span><button className="icon-btn subtle" aria-label={`${title}更多操作`} onClick={() => openKind(title)}><MoreHorizontal size={17} /></button></div><h2>{title}</h2><p>{desc}</p><div className="master-card-footer"><span>{count}</span><button className="link-button" onClick={() => openKind(title)}>查看配置 <ArrowRight size={14} /></button></div></article>)}</div><div className="panel rules-panel"><PanelTitle title="待业务确认的规则" subtitle="未确认前仅用于交互演示，不应用于正式业务结论" /><div className="rule-row"><span className="rule-number">01</span><div><strong>重大风险阈值</strong><small>计划书与现有矩阵对 R = 15 的分级存在差异</small></div><span className="rule-status">待确认</span><button className="text-action" onClick={() => openKind('风险规则配置')}>查看差异 <ArrowRight size={13} /></button></div><div className="rule-row"><span className="rule-number">02</span><div><strong>综合风险计算方式</strong><small>静态与动态权重、专家意见和否决条件需明确</small></div><span className="rule-status">待确认</span><button className="text-action" onClick={() => openKind('风险规则配置')}>查看差异 <ArrowRight size={13} /></button></div></div></div>
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

function Profile({ userName, records, issues, onLogout }: { userName: string; records: AssessmentRecord[]; issues: Issue[]; onLogout: () => void }) {
  return <div className="content"><PageHeading eyebrow="账号与工作台" title="个人中心" description="查看本人任务、待办事项和最近操作记录" action={<button className="button secondary" onClick={onLogout}><LogOut size={16} />退出登录</button>} /><section className="profile-grid"><article className="panel profile-card"><div className="profile-avatar">{userName.slice(0, 1)}</div><h2>{userName}</h2><p>平台用户 · 华东铁路局安全监察部</p><span><Shield size={15} />账号状态正常</span></article><article className="panel profile-stats"><PanelTitle title="我的工作" subtitle="当前账号相关业务概览" /><div><span><b>{records.filter((item) => item.status === '评估中').length}</b>待完成评估</span><span><b>{issues.filter((item) => item.stage < 4).length}</b>待整改任务</span><span><b>{issues.filter((item) => item.stage >= 3).length}</b>待复核任务</span><span><b>{records.filter((item) => item.status === '已完成').length}</b>历史报告</span></div></article></section><section className="panel profile-activity"><PanelTitle title="最近操作" subtitle="本地演示环境中的任务活动" />{records.slice(0, 5).map((record) => <div key={record.id}><FileClock size={16} /><span><strong>{record.name}</strong><small>{record.createdAt} · {record.status}</small></span><RiskBadge risk={record.risk} /></div>)}{records.length === 0 && <div className="empty-state"><FileClock size={22} /><strong>暂无操作记录</strong></div>}</section></div>
}

function AssessmentModal({ onClose, onCreate }: { onClose: () => void; onCreate: (record: AssessmentRecord) => void }) {
  const [name, setName] = useState('')
  const [station, setStation] = useState('南京西站')
  const [area, setArea] = useState('危货装卸区')
  const [cargo, setCargo] = useState('汽油')
  const [unNumber, setUnNumber] = useState('UN1203')
  const [detector, setDetector] = useState('便携式气体检测仪')
  const [temperature, setTemperature] = useState(26)
  const [pressure, setPressure] = useState(0.1)
  const [concentration, setConcentration] = useState(8)
  const create = () => onCreate({ id: `PG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, name: name.trim(), station, area, cargo, unNumber: unNumber.trim(), detector, temperature, pressure, concentration, staticChecks: [true, true, true, true], likelihood: 2, severity: 3, score: 6, risk: '一般', status: '评估中', createdAt: new Date().toLocaleString('zh-CN', { hour12: false }), findings: [], measures: [] })
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal assessment-create-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><span className="eyebrow">外部检测数据接入</span><h2 id="modal-title">创建危险货物风险评估</h2></div><button className="icon-btn" aria-label="关闭" onClick={onClose}><X size={19} /></button></div><p className="modal-intro">录入检测设备或外部系统采集的数据，创建后继续完成静态检查和动态 L/C 评分。</p><div className="assessment-create-grid"><label className="form-field full"><span>任务名称 <b>*</b></span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：南京西站汽油罐车装卸风险评估" autoFocus /></label><label className="form-field"><span>场站</span><select value={station} onChange={(event) => setStation(event.target.value)}><option>南京西站</option><option>上海南站</option><option>杭州东站</option><option>合肥北站</option></select></label><label className="form-field"><span>作业区域</span><input value={area} onChange={(event) => setArea(event.target.value)} /></label><label className="form-field"><span>危险货物名称</span><input value={cargo} onChange={(event) => setCargo(event.target.value)} /></label><label className="form-field"><span>UN 编号</span><input value={unNumber} onChange={(event) => setUnNumber(event.target.value)} placeholder="如 UN1203" /></label><label className="form-field full"><span>数据来源 / 检测设备</span><select value={detector} onChange={(event) => setDetector(event.target.value)}><option>便携式气体检测仪</option><option>罐体压力传感器</option><option>场站物联网平台</option><option>第三方检测报告</option><option>人工现场录入</option></select></label><label className="form-field"><span>温度（℃）</span><input type="number" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} /></label><label className="form-field"><span>压力（MPa）</span><input type="number" step="0.01" value={pressure} onChange={(event) => setPressure(Number(event.target.value))} /></label><label className="form-field"><span>气体浓度（%LEL）</span><input type="number" value={concentration} onChange={(event) => setConcentration(Number(event.target.value))} /></label></div><div className="data-import-note"><Database size={17} /><span><b>数据接口预留</b> 当前支持表单录入；后续可按检测设备协议接入 API、CSV/Excel 或物联网消息。</span></div><div className="modal-actions"><button className="button secondary" onClick={onClose}>取消</button><button className="button primary" disabled={!name.trim() || !cargo.trim()} onClick={create}>录入并开始评估 <ArrowRight size={15} /></button></div></section></div>
}

function IssueDrawer({ issue, onClose, onAdvance }: { issue: Issue; onClose: () => void; onAdvance: (stage: number) => void }) {
  const [note, setNote] = useState('')
  const stages = ['未戴 / 未落实', '少数完成', '多数完成', '全部完成']
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="issue-drawer"><div className="drawer-header"><div><span className="eyebrow">整改任务 · {issue.id}</span><button className="icon-btn" aria-label="关闭详情" onClick={onClose}><X size={19} /></button></div><h2>{issue.title}</h2><div className="drawer-meta"><RiskBadge risk={issue.risk} /><span><MapPin size={13} />{issue.location}</span></div></div><div className="drawer-content"><div className="detail-grid"><div><span>责任人</span><strong>{issue.owner}</strong></div><div><span>整改期限</span><strong>{issue.due}</strong></div><div><span>问题类型</span><strong>{issue.type}</strong></div><div><span>当前状态</span><strong>{stageLabel(issue.stage)}</strong></div></div><section className="detail-section"><h3>针对性整改建议</h3><p>立即暂停相关作业并设置安全隔离，核查现场设施与作业记录；由责任班组补齐整改措施，安排专人复查关键点位，并将整改前后照片、复查记录一并提交。</p><ul><li>完成现场风险告知与作业人员再培训</li><li>按规程检查设备状态并留存检测凭证</li><li>由安全管理人员组织现场复核</li></ul></section><section className="detail-section"><div className="section-heading"><h3>整改阶段</h3><span>当前：{stageLabel(issue.stage)}</span></div><div className="stage-list">{stages.map((stage, index) => <button className={`stage-option ${issue.stage === index + 1 ? 'stage-current' : ''} ${issue.stage > index + 1 ? 'stage-done' : ''}`} key={stage} onClick={() => onAdvance(index + 1)}><span>{issue.stage > index + 1 ? <Check size={13} /> : index + 1}</span><b>{stage}</b><small>{[0, 25, 58, 100][index]}%</small></button>)}</div><div className="stage-progress"><i style={{ width: `${[0, 25, 58, 82, 100][issue.stage]}%` }} /></div></section><section className="detail-section"><h3>进展说明</h3><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="填写本次整改进度、剩余问题或复查结果" rows={3} /><button className="button secondary full-button" onClick={() => onAdvance(issue.stage)}><Plus size={15} />保存进度记录</button></section><section className="timeline"><h3>处理记录</h3><div><i /><span><b>责任人更新整改进度</b><small>王建国 · 今日 09:18 · {stageLabel(issue.stage)}</small></span></div><div><i /><span><b>任务已分派</b><small>周明远 · 09月23日 16:42</small></span></div><div><i /><span><b>评估问题自动生成</b><small>系统 · 09月22日 14:08</small></span></div></section></div><div className="drawer-footer"><button className="button secondary" onClick={onClose}>稍后处理</button><button className="button primary" onClick={() => onAdvance(Math.min(issue.stage + 1, 4))}>{issue.stage >= 3 ? '提交复核' : '更新整改阶段'}<ArrowRight size={15} /></button></div></aside></div>
}

export default App
