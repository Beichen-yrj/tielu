import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ClipboardCheck, Database, Download, FileUp, Gauge, Plus, Shield, ShieldAlert, X } from 'lucide-react'
import { bureaus } from './railwayScope'
import { dynamicItems, emptyInput, evaluateInspection, importTemplate, inputFields, staticItems, type InspectionInput, type InspectionResult, type RiskLevel } from './inspection'
import { buildDocHtml, downloadDoc, downloadText } from './exportDoc'

export type AssessmentRecordLike = {
  id: string
  name: string
  station: string
  area: string
  cargo: string
  unNumber: string
  detector: string
  temperature: number
  pressure: number
  concentration: number
  staticChecks: boolean[]
  likelihood: number
  severity: number
  risk: RiskLevel
  score: number
  status: '评估中' | '已完成'
  createdAt: string
  findings: string[]
  measures: string[]
  input?: Record<string, string>
  result?: InspectionResult | null
}

const colors: Record<RiskLevel, string> = { 重大: '#d84343', 较大: '#e97825', 一般: '#e5aa27', 低: '#24816b' }

const stationOptions = bureaus.flatMap((bureau) => bureau.stations)

function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <span className="risk-badge" style={{ color: colors[risk], background: `${colors[risk]}15` }}><i style={{ background: colors[risk] }} />{risk}风险</span>
}

function Stat({ icon: Icon, label, value, unit, delta, color }: { icon: typeof Gauge; label: string; value: string; unit: string; delta: string; color: string }) {
  return <article className={`metric-card metric-${color}`}><div className="metric-top"><span>{label}</span><div className="metric-icon"><Icon size={18} /></div></div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-bottom"><span className="delta positive">{delta}</span><span className="metric-period">自动判定</span></div></article>
}

export function AssessmentPanel({ records, activeId, setActiveId, onSave, onComplete, onNotify, userName, createSignal = 0 }: {
  records: AssessmentRecordLike[]
  activeId: string | null
  setActiveId: (id: string | null) => void
  onSave: (record: AssessmentRecordLike) => void
  onComplete: (record: AssessmentRecordLike) => void
  onNotify: (message: string) => void
  userName: string
  createSignal?: number
}) {
  const [showCreate, setShowCreate] = useState(() => createSignal > 0)
  const [filterMode, setFilterMode] = useState<'全部' | '仅不符合'>('全部')

  const active = records.find((record) => record.id === activeId) || null

  return <div className="content">
    <div className="page-heading">
      <div>
        <div className="eyebrow">检测数据 · 自动评估</div>
        <h1>风险评估</h1>
        <p>录入或导入检测数据后，平台自动完成静态 31 项与动态 61 项判定，直接输出存在问题、整改措施与许可情况</p>
      </div>
      <div className="heading-actions">
        <button className="button primary" onClick={() => setShowCreate(true)}><Plus size={17} />新建评估任务</button>
      </div>
    </div>

    {!active && <div className="panel assessment-list">
      <div className="config-list-head">
        <div><strong>评估任务</strong><span>新建任务后自动出具结论，可导出 Word 报告并转入整改闭环</span></div>
        <span className="version-pill">{records.length} 项</span>
      </div>
      {records.length ? records.map((record) => <article className="config-row" key={record.id}>
        <div className="config-row-code">{record.id}</div>
        <div className="config-row-main"><strong>{record.name}</strong><span>{record.station} · {record.cargo} · {record.createdAt} · 隐患 {record.findings?.length ?? 0} 项</span></div>
        <RiskBadge risk={record.risk} />
        <button className="row-action" onClick={() => setActiveId(record.id)}>{record.status === '已完成' ? '查看报告' : '继续评估'} <ArrowRight size={13} /></button>
      </article>) : <div className="empty-state"><Database size={24} /><strong>暂无评估任务</strong><span>点击“新建评估任务”，录入或导入检测数据后自动生成结论</span></div>}
    </div>}

    {active && <AssessmentReport
      record={active}
      filterMode={filterMode}
      setFilterMode={setFilterMode}
      onBack={() => setActiveId(null)}
      onReevaluate={() => {
        const result = evaluateInspection({ ...emptyInput(), ...(active.input ?? {}) }, { id: active.id, cargo: active.cargo, station: active.station })
        onSave({ ...active, result, risk: result.conclusions.risk, findings: [...result.staticFailed, ...result.dynamicFailed].map((item) => `${item.category}：${item.name}`), measures: result.measures, staticChecks: result.staticResults.map((item) => item.passed), status: '已完成' })
        onNotify('已按当前检测数据重新出具评估结论')
      }}
      onComplete={() => {
        if (active.status === '已完成' && active.findings?.length) { onComplete(active); return }
        onNotify('该任务暂无需要转入整改闭环的问题')
      }}
      onNotify={onNotify}
      userName={userName}
    />}

    {showCreate && <CreateDialog
      onClose={() => setShowCreate(false)}
      onCreate={(record) => { onSave(record); setActiveId(record.id); setShowCreate(false); onNotify(`评估已完成：发现隐患 ${record.findings.length} 项`) }}
      onNotify={onNotify}
    />}
  </div>
}

function CreateDialog({ onClose, onCreate, onNotify }: { onClose: () => void; onCreate: (record: AssessmentRecordLike) => void; onNotify: (message: string) => void }) {
  const [form, setForm] = useState({ name: '', station: stationOptions[0] ?? '', area: '罐车装卸区', cargo: '', unNumber: '', detector: '便携式气体检测仪' })
  const [input, setInput] = useState<InspectionInput>(() => emptyInput())
  const [fileName, setFileName] = useState('')
  const setField = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const setInputValue = (key: string, value: string) => setInput((current) => ({ ...current, [key]: value }))

  const importFile = async (file: File) => {
    const text = await file.text()
    const parsed = (await import('./inspection')).parseImportedData(text, file.name)
    const keys = Object.keys(parsed)
    if (!keys.length) { onNotify('未从文件中识别到可导入字段，请使用模板格式'); return }
    setInput((current) => ({ ...current, ...parsed }))
    setFileName(file.name)
    onNotify(`已导入 ${keys.length} 个字段（${file.name}）`)
  }

  const submit = () => {
    if (!form.name.trim()) { onNotify('请填写任务名称'); return }
    const result = evaluateInspection(input, { id: `PG-${Date.now()}`, cargo: form.cargo || '未填写货物', station: form.station })
    const failed = [...result.staticFailed, ...result.dynamicFailed]
    const record: AssessmentRecordLike = {
      id: `PG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      name: form.name.trim(),
      station: form.station,
      area: form.area,
      cargo: form.cargo || '未填写',
      unNumber: form.unNumber || '无',
      detector: form.detector,
      temperature: Number(input.temperature) || 0,
      pressure: Number(input.pressure) || 0,
      concentration: Number(input.concentration) || 0,
      staticChecks: result.staticResults.map((item) => item.passed),
      likelihood: Math.max(0, ...result.dynamicResults.map((item) => item.score ?? 0)),
      severity: Math.max(0, ...result.dynamicResults.map((item) => (item.score ? Math.ceil(item.score / Math.max(1, item.score)) : 0))),
      risk: result.conclusions.risk,
      score: result.conclusions.total,
      status: '已完成',
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      findings: failed.map((item) => `${item.category}：${item.name}`),
      measures: result.measures,
      input,
      result,
    }
    onCreate(record)
  }

  return <div className="modal-backdrop" role="presentation">
    <section className="modal assessment-create-modal" role="dialog" aria-modal="true" aria-label="新建评估任务">
      <div className="modal-header">
        <div><span className="eyebrow">DETECTION DATA</span><h2>新建评估任务</h2></div>
        <button className="icon-btn" aria-label="关闭" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="modal-body">
        <div className="form-grid">
          <label><span>任务名称 *</span><input value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="如 丰台西站航煤罐车装卸评估" /></label>
          <label><span>场站</span><input list="station-options" value={form.station} onChange={(event) => setField('station', event.target.value)} placeholder="选择或输入场站名称" /></label>
          <datalist id="station-options">{stationOptions.map((station) => <option key={station} value={station} />)}</datalist>
          <label><span>作业区域</span><input value={form.area} onChange={(event) => setField('area', event.target.value)} /></label>
          <label><span>危险货物名称</span><input value={form.cargo} onChange={(event) => setField('cargo', event.target.value)} placeholder="如 航空煤油" /></label>
          <label><span>UN 编号</span><input value={form.unNumber} onChange={(event) => setField('unNumber', event.target.value)} placeholder="如 UN1863" /></label>
          <label><span>数据来源 / 检测设备</span><select value={form.detector} onChange={(event) => setField('detector', event.target.value)}>{['便携式气体检测仪', '固定式报警装置', '车载监测终端', '人工巡检记录', '第三方检测报告'].map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>

        <div className="import-bar">
          <div><strong>检测数据</strong><span>共 {inputFields.length} 项，没有数据的项可保留“无”</span></div>
          <div className="import-actions">
            <label className="button secondary"><FileUp size={15} />导入数据<input type="file" accept=".csv,.json,.txt" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file) }} /></label>
            <button className="button secondary" onClick={() => { downloadText('检测数据导入模板.csv', importTemplate()); onNotify('已下载导入模板，按列填写后可直接导入') }}><Download size={15} />下载模板</button>
          </div>
        </div>
        {fileName && <p className="import-note">已导入文件：{fileName}，可在下方核对或修改</p>}

        <div className="form-grid data-grid">
          {inputFields.map((field) => <label key={field.key}><span>{field.label}{field.unit ? `（${field.unit}）` : ''}</span><input value={input[field.key] ?? ''} onChange={(event) => setInputValue(field.key, event.target.value)} placeholder={field.placeholder} /></label>)}
        </div>
      </div>
      <div className="modal-actions">
        <span className="modal-hint">提交后平台自动完成静态 {staticItems.length} 项与动态 {dynamicItems.length} 项判定</span>
        <div>
          <button className="button secondary" onClick={onClose}>取消</button>
          <button className="button primary" onClick={submit}><Check size={16} />提交并自动评估</button>
        </div>
      </div>
    </section>
  </div>
}

function AssessmentReport({ record, filterMode, setFilterMode, onBack, onReevaluate, onComplete, onNotify, userName }: {
  record: AssessmentRecordLike
  filterMode: '全部' | '仅不符合'
  setFilterMode: (mode: '全部' | '仅不符合') => void
  onBack: () => void
  onReevaluate: () => void
  onComplete: () => void
  onNotify: (message: string) => void
  userName: string
}) {
  const result = record.result ?? evaluateInspection({ ...emptyInput(), ...(record.input ?? {}) }, { id: record.id, cargo: record.cargo, station: record.station })
  const inputRows = useMemo(() => inputFields.map((field) => ({ ...field, value: record.input?.[field.key] ?? result ? (record.input?.[field.key] ?? '无') : '无' })), [record, result])
  const staticRows = filterMode === '仅不符合' ? result.staticResults.filter((item) => !item.passed) : result.staticResults
  const dynamicRows = filterMode === '仅不符合' ? result.dynamicResults.filter((item) => !item.passed) : result.dynamicResults

  const exportWord = () => {
    const html = buildDocHtml('铁路危险货物运输“双重预防机制”评估报告', `${record.name} · ${record.station} · 生成时间 ${result.generatedAt}`, [
      { heading: '一、任务信息', facts: [['任务编号', record.id], ['任务名称', record.name], ['场站', record.station], ['作业区域', record.area], ['危险货物', record.cargo], ['UN 编号', record.unNumber], ['数据来源', record.detector], ['评估状态', record.status], ['填表人', userName]] },
      { heading: '二、检测数据', table: { columns: ['检测项', '数值', '单位'], rows: inputRows.map((row) => [row.label, String(row.value), row.unit || '—']) } },
      { heading: '三、总体结论', paragraphs: [result.summary, ...result.overallIssues] },
      { heading: '四、许可情况', facts: [['安全工程师复核', result.permits.engineer], ['复核意见', result.permits.engineerConclusion], ['项目经理许可', result.permits.manager], ['许可意见', result.permits.managerConclusion], ['签署时间', result.permits.time]] },
      { heading: `五、静态自查明细（${staticItems.length} 项，不符合 ${result.staticFailed.length} 项）`, table: { columns: ['编码', '检查项', '类别', '结论', '依据'], rows: result.staticResults.map((item) => [item.code, item.name, item.category, item.passed ? '符合' : `不符合（${item.level}风险）`, item.basis]) } },
      { heading: result.staticPassed ? `六、动态作业检查明细（${dynamicItems.length} 项，不符合 ${result.dynamicFailed.length} 项）` : '六、动态作业检查', paragraphs: result.staticPassed ? [] : ['静态自查存在不符合项，按“静态不通过不开展动态评估”的规则，本次未出具动态检查结论。'], table: result.staticPassed ? { columns: ['编码', '检查项', '环节 / 维度', '结论', '风险值 R', '依据'], rows: result.dynamicResults.map((item) => [item.code, item.name, item.category, item.passed ? '符合' : `不符合（${item.level}风险）`, item.passed ? '—' : String(item.score ?? '—'), item.basis]) } : undefined },
      { heading: '七、整改措施清单', list: result.measures.length ? result.measures : ['本次评估未发现需要整改的问题，维持现有安全条件即可。'] },
    ])
    downloadDoc(`${record.id}-评估报告.doc`, html)
    onNotify('评估报告已导出为 Word 文档')
  }

  return <>
    <div className="report-toolbar">
      <button className="button secondary" onClick={onBack}><ArrowLeft size={16} />返回任务列表</button>
      <div className="heading-actions">
        <button className="button secondary" onClick={onReevaluate}>重新出具结论</button>
        <button className="button secondary" onClick={exportWord}><Download size={16} />导出 Word 报告</button>
        <button className="button primary" onClick={onComplete}><ClipboardCheck size={16} />转入整改闭环</button>
      </div>
    </div>

    <div className="panel report-head">
      <div>
        <span className="eyebrow">ASSESSMENT REPORT</span>
        <h2>{record.name}</h2>
        <p>{record.station} · {record.area} · {record.cargo}（{record.unNumber}）· 数据来源：{record.detector}</p>
      </div>
      <div className="report-head-side">
        <RiskBadge risk={record.risk} />
        <span className="report-status">{record.status}</span>
        <small>{record.createdAt}</small>
      </div>
    </div>

    <div className="metric-grid">
      <Stat icon={ShieldAlert} label="静态达标率" value={result.staticRate.toFixed(1)} unit="%" delta={`${result.staticResults.length - result.staticFailed.length} / ${result.staticResults.length} 项符合`} color={result.staticPassed ? 'green' : 'red'} />
      <Stat icon={Gauge} label="动态受控率" value={result.staticPassed ? result.dynamicRate.toFixed(1) : '—'} unit="%" delta={result.staticPassed ? `${result.dynamicResults.length - result.dynamicFailed.length} / ${result.dynamicResults.length} 项符合` : '静态未通过，暂不评估'} color={result.staticPassed ? 'blue' : 'amber'} />
      <Stat icon={AlertTriangle} label="发现问题合计" value={`${result.conclusions.total}`} unit="项" delta={`重大 ${result.conclusions.major} · 较大 ${result.conclusions.bigger}`} color="red" />
      <Stat icon={Shield} label="综合风险指数" value={result.conclusions.index.toFixed(1)} unit="分" delta={`综合等级：${result.conclusions.risk}风险`} color="blue" />
    </div>

    <article className="panel report-block">
      <div className="panel-title"><div><h2>总体结论</h2><p>平台根据检测数据与检查项要求自动判定</p></div></div>
      <p className="report-summary-line">{result.summary}</p>
      <ul className="report-issue-list">{result.overallIssues.map((text) => <li key={text}>{text}</li>)}</ul>
    </article>

    <article className="panel report-block">
      <div className="panel-title"><div><h2>安全工程师复核与项目经理许可</h2><p>按双重预防机制要求，评估结论需经技术复核与管理许可</p></div></div>
      <div className="permit-grid">
        <div className="permit-card"><span>安全工程师复核</span><strong>{result.permits.engineer}</strong><p>{result.permits.engineerConclusion}</p></div>
        <div className="permit-card"><span>项目经理许可</span><strong>{result.permits.manager}</strong><p>{result.permits.managerConclusion}</p></div>
        <div className="permit-card"><span>签署时间</span><strong>{result.permits.time}</strong><p>复核与许可记录随报告一并归档，可在整改闭环中追溯</p></div>
      </div>
    </article>

    <article className="panel report-block">
      <div className="panel-title">
        <div><h2>静态自查明细（{staticItems.length} 项）</h2><p>不符合 {result.staticFailed.length} 项；静态未通过时按规则不开展动态评估</p></div>
        <div className="segmented-group">{['全部', '仅不符合'].map((mode) => <button key={mode} className={`segmented ${filterMode === mode ? 'selected' : ''}`} onClick={() => setFilterMode(mode as '全部' | '仅不符合')}>{mode}</button>)}</div>
      </div>
      <div className="table-scroll"><table className="check-table"><thead><tr><th>编码</th><th>检查项</th><th>类别</th><th>结论</th><th>依据</th><th>判定说明</th></tr></thead><tbody>
        {staticRows.map((item) => <tr key={item.code} className={item.passed ? '' : 'row-failed'}>
          <td>{item.code}</td><td><strong>{item.name}</strong></td><td>{item.category}</td>
          <td>{item.passed ? <span className="pass-tag">符合</span> : <span className="fail-tag">不符合 · {item.level}</span>}</td>
          <td>{item.basis}</td><td>{item.passed ? '现场检查符合要求' : item.issue}</td>
        </tr>)}
      </tbody></table></div>
    </article>

    <article className="panel report-block">
      <div className="panel-title"><div><h2>动态作业检查明细（{dynamicItems.length} 项）</h2><p>{result.staticPassed ? `按进场、装卸、搬运环节与人／物／环境／管理维度自动判定，不符合 ${result.dynamicFailed.length} 项` : '静态自查未通过，按规则暂不开展动态评估'}</p></div></div>
      {result.staticPassed ? <div className="table-scroll"><table className="check-table"><thead><tr><th>编码</th><th>检查项</th><th>环节 / 维度</th><th>结论</th><th>风险值 R</th><th>判定依据</th></tr></thead><tbody>
        {dynamicRows.map((item) => <tr key={item.code} className={item.passed ? '' : 'row-failed'}>
          <td>{item.code}</td><td><strong>{item.name}</strong></td><td>{item.category}</td>
          <td>{item.passed ? <span className="pass-tag">符合</span> : <span className="fail-tag">不符合 · {item.level}</span>}</td>
          <td>{item.passed ? '—' : item.score}</td><td>{item.evidence}</td>
        </tr>)}
      </tbody></table></div> : <p className="block-note">静态自查存在 {result.staticFailed.length} 项不符合，动态评估按“静态不通过不写动态结论”的规则暂缓；静态问题整改复核通过后可重新出具结论。</p>}
    </article>

    <article className="panel report-block">
      <div className="panel-title"><div><h2>整改措施清单</h2><p>共 {result.measures.length} 条，含责任期限与判定依据</p></div></div>
      {result.measures.length ? <ol className="measure-list">{result.measures.map((text, index) => <li key={index}>{text}</li>)}</ol> : <p className="block-note">本次评估未发现需要整改的问题，维持现有安全条件即可。</p>}
    </article>

    <article className="panel report-block">
      <div className="panel-title"><div><h2>检测数据</h2><p>用于自动判定的原始数据，来源：{record.detector}</p></div></div>
      <div className="table-scroll"><table className="check-table"><thead><tr><th>检测项</th><th>数值</th><th>单位</th><th>说明</th></tr></thead><tbody>
        {inputRows.map((row) => <tr key={row.key}><td>{row.label}</td><td><strong>{String(row.value)}</strong></td><td>{row.unit || '—'}</td><td>{String(row.value) === '无' ? '未提供检测数据，按现场检查记录判定' : '按该项限值自动判定'}</td></tr>)}
      </tbody></table></div>
    </article>
  </>
}
