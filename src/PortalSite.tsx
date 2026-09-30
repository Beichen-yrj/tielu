import { useEffect, useState } from 'react'
import {
  ArrowLeft, ArrowRight, CalendarDays, ChartNoAxesCombined, Check, ChevronDown, ClipboardCheck,
  Gauge, MapPin, Menu, Newspaper, Shield, ShieldAlert,
} from 'lucide-react'
import logo from './assets/logo.jpg'
import './Portal.css'

const heroSlides = [
  { src: '/portal/hero-locomotive.jpg', label: '铁路货运列车驶出隧道' },
  { src: '/portal/hero-heavy-transport.jpg', label: '铁路大型装备运输作业' },
  { src: '/portal/hero-container-yard.jpg', label: '铁路集装箱场站装卸作业' },
]
const overviewImage = '/portal/overview-terminal.jpg'
const showcaseImage = '/portal/showcase-container-loading.jpg'

type PortalNavItem = { path: string; label: string; desc: string }

const portalNav: PortalNavItem[] = [
  { path: '/', label: '首页', desc: '铁路危险货物运输“双重预防机制”一体化信息平台' },
  { path: '/overview', label: '平台概况', desc: '面向铁路局、场站与安全管理人员的统一安全运营入口' },
  { path: '/process', label: '业务流程', desc: '以风险为起点，以整改复核为闭环，形成可追溯的安全管理链路' },
  { path: '/features', label: '产品功能', desc: '围绕铁路危险货物运输安全运营，建设统一、清晰、可下钻的业务能力' },
  { path: '/strengths', label: '平台特点', desc: '兼顾铁路安全业务的专业性、全过程协同与数据可追溯要求' },
  { path: '/showcase', label: '产品展示', desc: '多端协同的安全运营平台，覆盖管理决策与现场作业' },
  { path: '/news', label: '新闻资讯', desc: '行业动态、监管案例与制度标准，来源随文标注' },
]

const featureItems = [
  { icon: ShieldAlert, title: '风险辨识评估', text: '覆盖危险货物装卸、仓储、运输组织及设备设施，形成静态检查、动态评分与专家意见相结合的风险结论。' },
  { icon: Gauge, title: '风险分级管控', text: '以 5 × 5 风险矩阵和四色分级展示风险态势，支持从局级、场站到作业环节逐级下钻。' },
  { icon: ClipboardCheck, title: '隐患排查任务', text: '按风险管控措施生成排查任务，明确责任人、周期、证据与整改期限，持续跟踪任务执行。' },
  { icon: Check, title: '整改闭环治理', text: '支持问题分派、进度记录、安全工程师复核与项目经理确认，保留全过程审计轨迹。' },
  { icon: ChartNoAxesCombined, title: '分析与预警', text: '汇总风险趋势、场站差异、整改时效和逾期任务，为管理决策提供可核对的数据依据。' },
]

const strengthItems = [
  { title: '专业', text: '围绕铁路危险货物运输场景设计业务流程' },
  { title: '融合', text: '风险评估、隐患治理、复核销号一体贯通' },
  { title: '闭环', text: '每项问题都有责任、期限、证据和审核记录' },
  { title: '可控', text: '指标、法规、阈值和模板均实行版本管理' },
]

const processSteps: Array<[string, string, string]> = [
  ['01', '风险辨识', '覆盖作业活动、设备设施与环境因素'],
  ['02', '评估分级', '静态检查、动态评分和专家意见'],
  ['03', '管控清单', '形成分级管控措施与责任清单'],
  ['04', '隐患排查', '按场站、岗位和周期生成任务'],
  ['05', '整改复核', '整改记录、双人复核和闭环销号'],
]

const overviewCards = [
  { title: '建设目标', text: '把风险分级管控与隐患排查治理打通为一条链路，避免风险评估结果与现场整改“两张皮”。' },
  { title: '覆盖范围', text: '覆盖危险货物受理、装卸、仓储、运输组织及设备设施等场景，兼顾静态检查与动态作业评分。' },
  { title: '应用对象', text: '面向铁路局安全管理部门、场站管理人员、安全工程师与项目经理，按角色提供不同视图。' },
]

const architectureItems = [
  { title: '数据接入层', text: '汇总检查记录、作业数据、设备状态与隐患台账，统一字段口径与责任单位。' },
  { title: '风险评价层', text: '以指标库、法规库和规则配置为基础，完成静态评分、动态评分与专家研判。' },
  { title: '治理执行层', text: '按风险等级生成排查任务，跟踪整改证据、复核意见与销号结论。' },
  { title: '分析展示层', text: '输出风险态势、趋势对比、逾期提醒与历史分析，支撑管理决策。' },
]

type NewsItem = {
  id: string
  date: string
  category: string
  title: string
  summary: string
  cover: string
  source: string
  imageNote: string
  body: string[]
}

const newsItems: NewsItem[] = [
  {
    id: 'xiangyang-north-drill',
    date: '2026-07-13',
    category: '行业动态',
    title: '襄阳北站开展危险货物运输事故应急演练',
    summary: '演练围绕汽油罐车泄漏险情展开，检验从险情发现、信息报告到现场堵漏处置的全过程衔接。',
    cover: '/portal/news-tank-wagons.jpg',
    source: '人民铁道网（据公开报道整理）',
    imageNote: '配图：铁路危险货物罐车运输场景（项目素材，仅作场景示意）。',
    body: [
      '据公开报道，襄阳北站组织开展铁路危险货物运输事故应急演练，着力提升危险货物事故应急救援能力。',
      '演练围绕“汽油罐车泄漏”场景设置处置科目，重点检验从险情发现、报警响应到现场堵漏处置的全流程衔接，警戒、抢险、环境监测等环节分工协作。',
      '铁路危险货物运输应急处置要求路企协同、快速响应，演练是检验预案可操作性与队伍协同能力的常用方式；演练中暴露的问题通常回写为风险项与隐患记录，进入整改闭环。',
    ],
  },
  {
    id: 'qingdao-aviation-drill',
    date: '2026-06-26',
    category: '行业动态',
    title: '路企联动开展铁路航煤罐车泄漏应急演练',
    summary: '中国石化青岛炼化公司联合铁路青岛车务段黄岛站、济南铁路物流中心黄岛营业部，在铁路航煤栈台开展罐车泄漏处置演练。',
    cover: '/portal/news-oil-tankers.jpg',
    source: '青岛新闻网',
    imageNote: '配图：铁路液体货物罐车运输场景（项目素材，仅作场景示意）。',
    body: [
      '据青岛新闻网报道，6 月 26 日 14 时，中国石化青岛炼化公司联合铁路青岛车务段黄岛站、济南铁路物流中心黄岛营业部，在铁路航煤栈台开展航煤罐车泄漏应急演练。',
      '演练模拟罐车泄漏险情，参演人员按预案开展警戒隔离、堵漏处置与稀释覆盖，检验路企双方信息互通与应急联动效率。',
      '铁路危险货物装车作业区域的栈台是风险管控重点部位，需要按作业环节逐项落实检查内容与应急物资准备，这也是静态自查指标中“消防灭火器材配置”“应急救援物资配备”等条目的设置依据。',
    ],
  },
  {
    id: 'taiyuan-north-drill',
    date: '2026-02-13',
    category: '行业动态',
    title: '太原北站开展危险货物应急救援实战演练',
    summary: '演练模拟柴油罐车渗漏险情，重点检验从事故发现、报警响应到现场堵漏处置的全流程。',
    cover: '/portal/news-chemical-tank.jpg',
    source: '人民铁道网（据公开报道整理）',
    imageNote: '配图：铁路化工品罐车场景（项目素材，仅作场景示意）。',
    body: [
      '据公开报道，为提升危险货物运输应急处置能力、保障春运期间运输安全，中国铁路太原局集团有限公司太原北站组织开展危险货物应急救援实战演练。',
      '演练模拟柴油罐车发生渗漏险情，重点检验从事故发现、报警响应到现场堵漏处置的全流程；演练中，警戒、联络、抢险、环境监测、货损处理等多支队伍分工协作，严格按照预案执行处置程序。',
      '柴油等易燃液体泄漏后存在火灾与环境污染风险，处置过程需要同步落实警戒隔离、火源控制和围堵收集措施。',
    ],
  },
  {
    id: 'falsified-dangerous-goods-penalty',
    date: '2026-01-09',
    category: '监管与案例',
    title: '危险货物谎报品名办理铁路运输被处罚',
    summary: '将实际品名为“烟花”的危险货物谎报为“杯子”委托铁路运输，成都铁路监督管理局责令改正并处罚款。',
    cover: '/portal/news-rail-containers.jpg',
    source: '成都铁路监督管理局（据公开报道整理）',
    imageNote: '配图：中国铁路集装箱运输场景（项目素材，与本案无关，仅作铁路货运场景示意）。',
    body: [
      '据公开报道，2025 年 11 月 12 日，云南铁联物流有限公司作为铁路运输托运人，将实际品名为“烟花”的 2 件危险货物谎报为“杯子”，作为普通货物委托铁路运输企业办理铁路货物混装运输。',
      '成都铁路监督管理局认定该行为违反《铁路安全管理条例》有关规定，责令其改正，并作出罚款 16000 元的行政处罚。',
      '匿报、谎报危险货物品名，会使危险货物脱离相应的包装、装卸、隔离与应急防护条件，按普通货物条件运输，是铁路危险货物运输环节的重点查处行为。对承运方而言，受理环节的品名核对与开箱抽查是识别此类风险的关键控制点。',
    ],
  },
  {
    id: 'changsha-crossing-drill',
    date: '2025-11-21',
    category: '行业动态',
    title: '长沙组织铁路专用线道口危化品事故综合应急演练',
    summary: '演练模拟危化品槽罐车在铁路道口发生事故导致泄漏、列车即将通过的道口险情，检验路地联动处置能力。',
    cover: '/portal/news-tank-containers.jpg',
    source: '人民网湖南频道',
    imageNote: '配图：铁路罐式集装箱运输场景（项目素材，非本次演练现场照片）。',
    body: [
      '据人民网湖南频道报道，11 月 21 日，2025 年长沙市铁路专用线道口危化品事故综合应急演练举行，演练地点设于城陵矶港口集团长沙（新港）相关专用线道口。',
      '演练模拟一辆装有危化品的槽罐车在经过铁路道口时因雨天路滑发生事故、装载物泄漏、一名司乘人员被困，同时一列火车即将通过道口；道口值班人员发现事故后第一时间通知车站信号楼并采取紧急措施。',
      '铁路道口属于道路与铁路交叉的风险点位，事故后果容易叠加，这一场景也提示风险辨识需要关注“交叉作业环境”因素。',
    ],
  },
  {
    id: 'dangerous-goods-safety-standard',
    date: '2025-10-24',
    category: '制度与标准',
    title: '《危险货物道路运输企业安全管理规范》施行',
    summary: '交通运输部会同公安部、应急管理部联合印发（交运规〔2025〕6 号），自 2025 年 10 月 24 日起施行，强化风险辨识与隐患排查要求。',
    cover: '/portal/news-terminal-crane.jpg',
    source: '中国政府网（据公开信息整理）',
    imageNote: '配图：铁路集装箱场站装卸作业场景（项目素材，仅作行业场景示意）。',
    body: [
      '《危险货物道路运输企业安全管理规范》（交运规〔2025〕6 号）由交通运输部会同公安部、应急管理部联合印发，自 2025 年 10 月 24 日起施行。规范明确危货运输企业是安全生产的责任主体，要求建立健全全员安全生产责任制与安全生产管理制度，完善安全生产条件，严格执行安全生产操作规程。',
      '规范要求企业从“货、车、人、企”等方面系统辨识安全风险，深化落实安全隐患排查工作，推动行业安全管理由事后应对向事前预防转型。',
      '危险货物道路运输与铁路运输的管理要求各有侧重，但“风险分级管控在前、隐患排查治理在后”的双重预防机制逻辑一致，可作为指标库、法规依据库与排查清单设计的对照参考。',
    ],
  },
]

function usePortalRoute() {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#/, '') || '/')
  useEffect(() => {
    const sync = () => setRoute(window.location.hash.replace(/^#/, '') || '/')
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  return route
}

function PortalHeading({ en, title, desc }: { en: string; title: string; desc: string }) {
  return <div className="portal-heading"><span>{en}</span><h2>{title}</h2><p>{desc}</p></div>
}

function NewsCard({ item, onOpen }: { item: NewsItem; onOpen: (id: string) => void }) {
  return <article className="portal-news-card">
    <button className="portal-news-cover" onClick={() => onOpen(item.id)} aria-label={`查看 ${item.title}`}>
      <img src={item.cover} alt={item.title} />
    </button>
    <div className="portal-news-body">
      <div className="portal-news-meta"><span className="portal-news-tag"><Newspaper size={12} />{item.category}</span><span><CalendarDays size={12} />{item.date}</span></div>
      <h3><button onClick={() => onOpen(item.id)}>{item.title}</button></h3>
      <p>{item.summary}</p>
      <div className="portal-news-foot"><span className="portal-news-source">来源：{item.source}</span><button className="portal-news-more" onClick={() => onOpen(item.id)}>查看详情 <ArrowRight size={13} /></button></div>
    </div>
  </article>
}

export function PortalSite({ onEnter }: { onEnter: () => void }) {
  const route = usePortalRoute()
  const [menuOpen, setMenuOpen] = useState(false)
  const [heroIndex, setHeroIndex] = useState(0)
  const [heroPaused, setHeroPaused] = useState(false)
  useEffect(() => { window.scrollTo({ top: 0 }) }, [route])
  useEffect(() => {
    if (route !== '/' || heroPaused) return
    const timer = window.setInterval(() => setHeroIndex((current) => (current + 1) % heroSlides.length), 6200)
    return () => window.clearInterval(timer)
  }, [route, heroPaused])

  const newsId = route.startsWith('/news/') ? route.slice('/news/'.length) : ''
  const activePath = newsId ? '/news' : route
  const activeNav = portalNav.find((item) => item.path === activePath) ?? portalNav[0]
  const detail = newsId ? newsItems.find((item) => item.id === newsId) : undefined
  const isHome = route === '/'
  const navigate = (path: string) => { setMenuOpen(false); window.location.hash = `#${path}` }
  const requestEntry = () => { setMenuOpen(false); onEnter() }
  const openNews = (id: string) => navigate(`/news/${id}`)
  const hero = heroSlides[heroIndex]

  let page: React.ReactNode
  if (detail) {
    page = <NewsDetail item={detail} onBack={() => navigate('/news')} />
  } else {
    switch (route) {
      case '/overview':
        page = <OverviewPage onEnter={requestEntry} />
        break
      case '/process':
        page = <ProcessPage />
        break
      case '/features':
        page = <FeaturesPage onEnter={requestEntry} />
        break
      case '/strengths':
        page = <StrengthsPage />
        break
      case '/showcase':
        page = <ShowcasePage onEnter={requestEntry} />
        break
      case '/news':
        page = <NewsPage onOpen={openNews} />
        break
      default:
        page = <HomePage onEnter={requestEntry} onNavigate={navigate} />
    }
  }

  return <div className="portal-page">
    <header
      className={`portal-hero ${isHome ? '' : 'portal-sub-hero'}`}
      onMouseEnter={() => isHome && setHeroPaused(true)}
      onMouseLeave={() => setHeroPaused(false)}
    >
      <div className="portal-hero-media" aria-hidden="true">
        {(isHome ? heroSlides : [heroSlides[0]]).map((slide, index) => <span key={slide.src} className={!isHome || index === heroIndex ? 'active' : ''} style={{ backgroundImage: `url(${slide.src})` }} />)}
      </div>
      <nav className="portal-nav">
        <button className="portal-brand" onClick={() => navigate('/')}><img src={logo} alt="铁路危货双重预防机制评估系统标识" /><span><strong>铁路危货双重预防机制评估系统</strong><small>石家庄铁道大学 · 大学生创新创业训练计划</small></span></button>
        <button className="portal-menu-toggle" aria-label="打开门户导航" onClick={() => setMenuOpen((open) => !open)}><Menu size={25} /></button>
        <div className={`portal-links ${menuOpen ? 'open' : ''}`}>
          {portalNav.map((item) => <a
            key={item.path}
            href={`#${item.path}`}
            className={item.path === activePath ? 'active' : ''}
            aria-current={item.path === activePath ? 'page' : undefined}
            onClick={() => setMenuOpen(false)}
          >{item.label}</a>)}
          <button onClick={requestEntry}>进入管理平台</button>
        </div>
      </nav>
      {isHome
        ? <div className="portal-hero-copy"><span>RAILWAY DANGEROUS GOODS SAFETY</span><h1>铁路危险货物运输<br />“双重预防机制”<br className="portal-title-break" />一体化信息平台</h1><p>专注铁路危险货物运输风险分级管控与隐患排查治理</p><button className="portal-hero-enter" onClick={requestEntry}>进入管理平台 <ArrowRight size={16} /></button></div>
        : <div className="portal-sub-copy"><span>{activeNav.label}</span><h1>{detail ? '新闻详情' : activeNav.label}</h1><p>{detail ? detail.title : activeNav.desc}</p></div>}
      {isHome && <div className="portal-hero-controls" aria-label="首屏图片轮播控制">
        <button type="button" className="portal-hero-arrow" aria-label="上一张图片" onClick={() => setHeroIndex((heroIndex - 1 + heroSlides.length) % heroSlides.length)}><ArrowLeft size={17} /></button>
        <div className="portal-hero-dots">{heroSlides.map((slide, index) => <button type="button" key={slide.src} className={`portal-hero-dot ${index === heroIndex ? 'active' : ''}`} aria-label={`切换到第 ${index + 1} 张：${slide.label}`} aria-current={index === heroIndex ? 'true' : undefined} onClick={() => setHeroIndex(index)} />)}</div>
        <button type="button" className="portal-hero-arrow" aria-label="下一张图片" onClick={() => setHeroIndex((heroIndex + 1) % heroSlides.length)}><ArrowRight size={17} /></button>
        <span className="portal-hero-caption">{hero.label}</span>
      </div>}
    </header>

    <div className="portal-breadcrumb">
      <MapPin size={17} /><span>您的当前位置：</span>
      <a href="#/">首页</a>
      {!isHome && !detail && <><ChevronDown size={14} className="portal-bread-arrow" /><strong>{activeNav.label}</strong></>}
      {detail && <><ChevronDown size={14} className="portal-bread-arrow" /><a href="#/news">新闻资讯</a><ChevronDown size={14} className="portal-bread-arrow" /><strong>新闻详情</strong></>}
      {isHome && <><ChevronDown size={14} className="portal-bread-arrow" /><strong>铁路危险货物运输“双重预防机制”一体化信息平台</strong></>}
    </div>

    <main>{page}</main>

    <footer className="portal-footer">
      <div><img src={logo} alt="铁路危货双重预防机制评估系统标识" /><span><strong>铁路危货双重预防机制评估系统</strong><small>铁路危险货物运输“双重预防机制”一体化信息平台</small></span></div>
      <p>交互演示版 · 风险阈值、指标源表与正式部署边界待业务确认</p>
      <button onClick={requestEntry}>进入管理平台</button>
    </footer>
  </div>
}

function HomePage({ onEnter, onNavigate }: { onEnter: () => void; onNavigate: (path: string) => void }) {
  return <>
    <section className="portal-overview portal-section">
      <div className="portal-section-inner portal-overview-grid">
        <div>
          <h2>铁路危险货物运输<br />“双重预防机制”一体化信息平台</h2>
          <p>面向铁路局、场站及安全管理人员，将风险辨识、静态评估、动态作业评分、专家研判、隐患整改和双人复核统一到一套业务链路中。平台通过风险四色分级、5 × 5 矩阵、任务进度与历史趋势，帮助管理人员及时掌握风险变化，推动风险管控与隐患治理全过程闭环。</p>
          <div className="portal-overview-actions"><button onClick={onEnter}>进入平台演示 <ArrowRight size={16} /></button><span><Shield size={17} /> 当前为前端交互演示版</span></div>
        </div>
        <div className="portal-product-visual"><img src={overviewImage} alt="铁路集装箱货运场站" /><small>铁路集装箱货运场站</small></div>
      </div>
    </section>

    <section className="portal-quick portal-section">
      <div className="portal-section-inner">
        <PortalHeading en="QUICK ENTRY" title="栏目直达" desc="按主题进入对应栏目，快速查看平台能力与建设进展" />
        <div className="portal-quick-grid">
          {[
            { path: '/overview', label: '平台概况', text: '建设背景、覆盖范围与总体架构' },
            { path: '/process', label: '业务流程', text: '从风险辨识到整改复核的完整链路' },
            { path: '/features', label: '产品功能', text: '五项核心业务能力一览' },
            { path: '/news', label: '新闻资讯', text: '行业动态、监管案例与制度标准' },
          ].map((item) => <button className="portal-quick-card" key={item.path} onClick={() => onNavigate(item.path)}>
            <strong>{item.label}</strong><small>{item.text}</small><span>进入栏目 <ArrowRight size={14} /></span>
          </button>)}
        </div>
      </div>
    </section>

    <section className="portal-news-preview portal-section">
      <div className="portal-section-inner">
        <PortalHeading en="LATEST NEWS" title="最新动态" desc="铁路危险货物运输安全动态、监管案例与制度标准，更多内容请进入新闻资讯栏目" />
        <div className="portal-news-grid">{newsItems.slice(0, 3).map((item) => <NewsCard key={item.id} item={item} onOpen={(id) => onNavigate(`/news/${id}`)} />)}</div>
        <div className="portal-news-actions"><button onClick={() => onNavigate('/news')}>查看全部资讯 <ArrowRight size={15} /></button></div>
      </div>
    </section>

    <section className="portal-showcase portal-section">
      <div className="portal-section-inner portal-showcase-grid">
        <div>
          <span className="portal-kicker">PRODUCT SHOWCASE</span>
          <h2>多端协同的安全运营平台</h2>
          <p>管理端聚焦风险态势、任务统筹和审核决策；移动端可用于现场检查、证据采集与整改反馈。当前演示已完成管理端核心页面，移动作业端作为后续扩展范围。</p>
          <button onClick={onEnter}>打开平台演示 <ArrowRight size={16} /></button>
        </div>
        <div className="portal-showcase-image"><img src={showcaseImage} alt="铁路货运列车作业场景" /><span>铁路货运作业场景</span></div>
      </div>
    </section>
  </>
}

function OverviewPage({ onEnter }: { onEnter: () => void }) {
  return <>
    <section className="portal-text portal-section">
      <div className="portal-section-inner">
        <PortalHeading en="PLATFORM OVERVIEW" title="建设背景" desc="让风险分级管控与隐患排查治理在同一套数据中贯通" />
        <p className="portal-lead">铁路危险货物运输涉及受理、装卸、仓储、运输组织等多个环节，风险点分散、检查记录分散、整改口径不统一，容易出现风险评估结果与现场治理相互脱节的情况。平台以“风险辨识—评估分级—管控措施—隐患排查—整改复核—分析改进”为主线，把风险清单与隐患清单放在同一套责任体系中管理。</p>
        <div className="portal-card-grid">{overviewCards.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
      </div>
    </section>

    <section className="portal-architecture portal-section">
      <div className="portal-section-inner">
        <PortalHeading en="ARCHITECTURE" title="总体架构" desc="从数据接入到分析展示，逐层支撑风险管控与隐患治理业务" />
        <ol className="portal-architecture-list">{architectureItems.map((item, index) => <li key={item.title}><b>0{index + 1}</b><div><strong>{item.title}</strong><p>{item.text}</p></div></li>)}</ol>
        <div className="portal-overview-actions"><button onClick={onEnter}>进入平台演示 <ArrowRight size={16} /></button><span><Shield size={17} /> 当前为前端交互演示版</span></div>
      </div>
    </section>
  </>
}

function ProcessPage() {
  return <>
    <section className="portal-process portal-section">
      <div className="portal-section-inner">
        <PortalHeading en="BUSINESS PROCESS" title="业务流程" desc="以风险为起点，以整改复核为闭环，形成可追溯的安全管理链路" />
        <div className="portal-process-list">
          {processSteps.map(([n, title, text], index) => <div className="portal-process-item" key={n}><b>{n}</b><span><strong>{title}</strong><small>{text}</small></span>{index < processSteps.length - 1 && <ArrowRight size={20} />}</div>)}
        </div>
      </div>
    </section>
    <section className="portal-text portal-section">
      <div className="portal-section-inner">
        <PortalHeading en="CLOSED LOOP" title="闭环说明" desc="每一步都保留责任部门、时间记录与证据材料" />
        <div className="portal-card-grid">
          {[
            { title: '风险清单落到管控措施', text: '风险点评估后生成分级管控措施，明确责任岗位、检查周期与检查内容。' },
            { title: '管控措施生成排查任务', text: '隐患排查任务由管控措施派生，避免排查内容与风险管控要求脱节。' },
            { title: '整改过程双人复核', text: '整改完成后由安全工程师复核、项目经理确认，形成可追溯的销号记录。' },
          ].map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>)}
        </div>
      </div>
    </section>
  </>
}

function FeaturesPage({ onEnter }: { onEnter: () => void }) {
  return <section className="portal-features portal-section">
    <div className="portal-section-inner">
      <PortalHeading en="PRODUCT FUNCTIONS" title="产品功能" desc="围绕铁路危险货物运输安全运营，建设统一、清晰、可下钻的业务能力" />
      <div className="portal-feature-grid">
        {featureItems.map(({ icon: Icon, title, text }, index) => <article key={title}>
          <div><Icon size={28} /><span>0{index + 1}</span></div>
          <h3>{title}</h3><p>{text}</p>
          <button onClick={onEnter}>进入功能演示 <ArrowRight size={15} /></button>
        </article>)}
      </div>
    </div>
  </section>
}

function StrengthsPage() {
  return <>
    <section className="portal-strengths portal-section">
      <div className="portal-section-inner">
        <PortalHeading en="PLATFORM ADVANTAGES" title="平台特点" desc="兼顾铁路安全业务的专业性、全过程协同与数据可追溯要求" />
        <div className="portal-strength-grid">{strengthItems.map(({ title, text }, index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </div>
    </section>
    <section className="portal-text portal-section">
      <div className="portal-section-inner">
        <PortalHeading en="VERSION CONTROL" title="版本化管理" desc="指标、法规、阈值与模板均可配置，口径变化有据可查" />
        <div className="portal-card-grid">
          {[
            { title: '评估指标库', text: '指标项、权重与评分规则按版本留档，评估结论可复算。' },
            { title: '法规依据库', text: '检查项对应法规条款，条款更新后同步提示受影响的风险点。' },
            { title: '整改阶段模板', text: '整改阶段与复核要求按模板执行，避免不同场站口径不一致。' },
          ].map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>)}
        </div>
      </div>
    </section>
  </>
}

function ShowcasePage({ onEnter }: { onEnter: () => void }) {
  return <>
    <section className="portal-showcase portal-section">
      <div className="portal-section-inner portal-showcase-grid">
        <div>
          <span className="portal-kicker">PRODUCT SHOWCASE</span>
          <h2>多端协同的安全运营平台</h2>
          <p>管理端聚焦风险态势、任务统筹和审核决策；移动端可用于现场检查、证据采集与整改反馈。当前演示已完成管理端核心页面，移动作业端作为后续扩展范围。</p>
          <button onClick={onEnter}>打开平台演示 <ArrowRight size={16} /></button>
        </div>
        <div className="portal-showcase-image"><img src={showcaseImage} alt="铁路货运列车作业场景" /><span>铁路货运作业场景</span></div>
      </div>
    </section>
    <section className="portal-text portal-section">
      <div className="portal-section-inner">
        <PortalHeading en="SCREEN PREVIEW" title="界面预览" desc="当前演示提供的页面范围" />
        <div className="portal-card-grid">
          {[
            { title: '总览', text: '风险态势、逾期任务与场站排名一屏呈现' },
            { title: '风险评估', text: '静态检查、动态评分与专家意见合并出结论' },
            { title: '整改闭环', text: '阶段推进、证据上传与双人复核销号' },
            { title: '历史分析', text: '趋势对比、分布统计与整改时效分析' },
          ].map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>)}
        </div>
      </div>
    </section>
  </>
}

function NewsPage({ onOpen }: { onOpen: (id: string) => void }) {
  return <section className="portal-news portal-section">
    <div className="portal-section-inner">
      <PortalHeading en="NEWS & INFORMATION" title="新闻资讯" desc="行业动态、监管案例与制度标准，引用来源随文标注" />
      <div className="portal-news-grid">{newsItems.map((item) => <NewsCard key={item.id} item={item} onOpen={onOpen} />)}</div>
    </div>
  </section>
}

function NewsDetail({ item, onBack }: { item: NewsItem; onBack: () => void }) {
  return <section className="portal-article portal-section">
    <div className="portal-section-inner portal-article-inner">
      <button className="portal-back-btn" onClick={onBack}><ArrowLeft size={14} />返回新闻资讯</button>
      <div className="portal-article-head">
        <span className="portal-news-tag"><Newspaper size={12} />{item.category}</span>
        <span className="portal-article-date"><CalendarDays size={13} />{item.date}</span>
      </div>
      <h1>{item.title}</h1>
      <p className="portal-article-summary">{item.summary}</p>
      <div className="portal-article-cover"><img src={item.cover} alt={item.title} /></div>
      <p className="portal-article-caption">{item.imageNote}</p>
      <div className="portal-article-body">{item.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      <p className="portal-article-note">来源：{item.source}。本栏目内容用于平台门户演示，引用信息以原始发布渠道为准。</p>
      <div className="portal-article-actions"><button onClick={onBack}><ArrowLeft size={14} />返回列表</button></div>
    </div>
  </section>
}
