import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Camera, Check, ChevronLeft, ChevronRight, CircleHelp, Clock3, Download, FileImage, Filter, Plus, Search, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { hazardCatalog, hazardDimensions, hazardStages } from './hazardCatalog'
import { bureaus } from './railwayScope'
import { dangerousGoods, type DangerousGood } from './dangerousGoods'
import { parseAssessmentWorkbook, type ImportedAssessment } from './assessmentImport'
import { compressImage } from './assessmentPhotos'
import { buildImportedRecord, defaultAction, riskFromScore } from './assessmentRecord'
import { findDuplicateImportRows } from './assessmentDuplicates'
import type { AssessmentType, HazardAssessmentRecord, RiskLevel } from './api/hazardAssessments'

const riskColors: Record<RiskLevel, string> = { 低: '#24816b', 一般: '#d99a1c', 较大: '#e56f22', 重大: '#d84343' }
const bureauShort = (name: string) => bureaus.find((item) => item.name === name)?.short || name

const createAssessmentId = () => {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID()
  const randomPart = () => Math.random().toString(36).slice(2)
  return `${Date.now().toString(36)}-${randomPart()}-${randomPart()}`
}

type Props = {
  records: HazardAssessmentRecord[]
  userName: string
  historyOnly?: boolean
  onHistory?: () => void
  onBack?: () => void
  onSave: (record: HazardAssessmentRecord) => Promise<void> | void
  onSaveMany: (records: HazardAssessmentRecord[]) => Promise<void> | void
  onDelete: (assessmentId: string) => Promise<void> | void
  onNotify: (message: string) => void
}

export function SafetyAssessmentPanel({ records, userName, historyOnly = false, onHistory, onBack, onSave, onSaveMany, onDelete, onNotify }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [reportSelection, setReportSelection] = useState<{ records: HazardAssessmentRecord[]; index: number } | null>(null)
  const selected = reportSelection?.records[reportSelection.index] ?? null
  const [query, setQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState('全部')
  const [photoPreview, setPhotoPreview] = useState<HazardAssessmentRecord | null>(null)
  const handleDelete = async (record: HazardAssessmentRecord) => {
    if (!window.confirm(`确定删除评估记录“${record.task_name}”吗？删除后无法恢复。`)) return
    await onDelete(record.id)
    if (selected?.id === record.id) setReportSelection(null)
    onNotify('评估记录已删除')
  }
  const filtered = useMemo(() => records.filter((record) => {
    const matchesQuery = `${record.task_name}${record.bureau || ''}${record.station}${record.cargo}${record.hazard_name}${record.inspector}`.includes(query)
    return matchesQuery && (riskFilter === '全部' || record.risk === riskFilter)
  }), [records, query, riskFilter])
  const risks = useMemo(() => ({
    total: records.length,
    hazard: records.filter((item) => item.has_hazard).length,
    dynamic: records.filter((item) => item.assessment_type === '动态').length,
    high: records.filter((item) => item.risk === '重大' || item.risk === '较大').length,
  }), [records])

  return <div className="content safety-assessment-page">
    <div className="page-heading">
      <div><div className="eyebrow">{historyOnly ? '评估档案 · 全程留痕' : '危险源数据 · 分类评估'}</div><h1>{historyOnly ? '历史评估' : '风险评估'}</h1><p>{historyOnly ? '查看静态和动态评估记录、检测照片、判定依据与整改建议' : '确定性检查采用静态评估；存在概率和后果不确定性的数据采用动态评估'}</p></div>
      <div className="heading-actions">{historyOnly ? <button className="button secondary" onClick={onBack}><ArrowLeft size={16} />返回风险评估</button> : <><button className="button secondary" onClick={onHistory}><Clock3 size={16} />历史评估</button><button className="button primary" onClick={() => setShowCreate(true)}><Plus size={17} />新建评估</button></>}</div>
    </div>

    <div className="metric-grid assessment-kpis">
      <Metric label="评估记录" value={risks.total} unit="次" icon={<Clock3 size={18} />} color="blue" />
      <Metric label="识别隐患" value={risks.hazard} unit="项" icon={<AlertTriangle size={18} />} color="red" />
      <Metric label="动态评估" value={risks.dynamic} unit="次" icon={<Filter size={18} />} color="amber" />
      <Metric label="较大及以上" value={risks.high} unit="项" icon={<ShieldCheck size={18} />} color="green" />
    </div>

    {!historyOnly && <section className="panel assessment-guidance">
      <div><span>01</span><strong>选择危险源</strong><small>61项指标覆盖进场、装卸、搬运</small></div>
      <ChevronRight size={18} />
      <div><span>02</span><strong>录入检测数据</strong><small>检测值、标准、现场照片和说明</small></div>
      <ChevronRight size={18} />
      <div><span>03</span><strong>选择评估方式</strong><small>确定结论为静态，不确定性为动态</small></div>
      <ChevronRight size={18} />
      <div><span>04</span><strong>生成隐患结论</strong><small>四级分类、整改措施与历史留存</small></div>
    </section>}

    <section className="panel hazard-records">
      <div className="panel-title"><div><h2>{historyOnly ? '历史评估记录' : '最近评估'}</h2><p>数据按账号保存，点击记录查看完整评估依据和照片</p></div></div>
      <div className="hazard-toolbar">
        <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索任务、场站、货物或危险源" /></label>
        <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}><option>全部</option><option>低</option><option>一般</option><option>较大</option><option>重大</option></select>
      </div>
      {filtered.length ? <div className="table-scroll"><table className="check-table hazard-history-table"><thead><tr><th>任务 / 时间</th><th>危险源</th><th>环节 / 维度</th><th>评估方式</th><th>检测结果</th><th>风险等级</th><th>照片</th><th>操作</th></tr></thead><tbody>
        {filtered.map((record) => <tr key={record.id}>
          <td><strong>{record.task_name}</strong><small>{record.created_at} · {record.bureau ? `${bureauShort(record.bureau)} · ` : ''}{record.station}</small></td>
          <td><strong>{record.hazard_name}</strong><small>{record.cargo}{record.un_number ? ` · ${record.un_number}` : ''}</small></td>
          <td>{record.stage} / {record.dimension}</td>
          <td><span className={`assessment-type ${record.assessment_type === '动态' ? 'dynamic' : ''}`}>{record.assessment_type}</span></td>
          <td>{record.data_name}：{record.measured_value}{record.unit}</td>
          <td><RiskBadge risk={record.risk} /></td>
          <td>{record.photo_data ? <button className="photo-status photo-button" onClick={() => setPhotoPreview(record)} title="查看检测照片"><FileImage size={13} />查看照片</button> : '无'}</td>
          <td><div className="row-actions"><button className="row-action" onClick={() => setReportSelection({ records: filtered, index: filtered.findIndex((item) => item.id === record.id) })}>查看报告 <ChevronRight size={12} /></button><button className="row-action danger" onClick={() => void handleDelete(record)} title="删除评估记录"><Trash2 size={13} />删除</button></div></td>
        </tr>)}
      </tbody></table></div> : <div className="empty-state"><ShieldCheck size={24} /><strong>暂无评估记录</strong><span>{historyOnly ? '完成新建评估后，记录会自动保留在这里' : '点击“新建评估”录入第一条危险源检测数据'}</span></div>}
    </section>

    {showCreate && <CreateAssessment userName={userName} existingRecords={records} onClose={() => setShowCreate(false)} onSubmit={async (records) => { await (records.length > 1 ? onSaveMany(records) : onSave(records[0])); setShowCreate(false); setReportSelection({ records, index: 0 }); onNotify(records.length > 1 ? `已批量保存 ${records.length} 条评估记录` : `评估已保存，风险等级：${records[0].risk}`) }} />}
    {selected && reportSelection && <AssessmentDetail key={selected.id} record={selected} index={reportSelection.index} total={reportSelection.records.length} onNavigate={(direction) => setReportSelection((current) => current ? { ...current, index: Math.max(0, Math.min(current.records.length - 1, current.index + direction)) } : null)} onClose={() => setReportSelection(null)} />}
    {photoPreview && <PhotoPreview record={photoPreview} onClose={() => setPhotoPreview(null)} />}
  </div>
}

function Metric({ label, value, unit, icon, color }: { label: string; value: number; unit: string; icon: React.ReactNode; color: string }) {
  return <article className={`metric-card metric-${color}`}><div className="metric-top"><span>{label}</span><div className="metric-icon">{icon}</div></div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-bottom"><span className="delta positive">来自实际评估记录</span></div></article>
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <span className="risk-badge" style={{ color: riskColors[risk], background: `${riskColors[risk]}16` }}><i style={{ background: riskColors[risk] }} />{risk}风险</span>
}

function CreateAssessment({ userName, existingRecords, onClose, onSubmit }: { userName: string; existingRecords: HazardAssessmentRecord[]; onClose: () => void; onSubmit: (records: HazardAssessmentRecord[]) => Promise<void> | void }) {
  const [taskName, setTaskName] = useState('')
  const [bureau, setBureau] = useState(bureaus[0]?.name ?? '')
  const availableStations = bureaus.find((item) => item.name === bureau)?.stations ?? []
  const [station, setStation] = useState(availableStations[0] ?? '')
  const [area, setArea] = useState('')
  const [cargo, setCargo] = useState('')
  const [unNumber, setUnNumber] = useState('')
  const [showUnLookup, setShowUnLookup] = useState(false)
  const [stage, setStage] = useState<(typeof hazardStages)[number]>('进场')
  const [dimension, setDimension] = useState<(typeof hazardDimensions)[number]>('人')
  const available = hazardCatalog.filter((item) => item.stage === stage && item.dimension === dimension)
  const [hazardCode, setHazardCode] = useState(available[0]?.code ?? hazardCatalog[0].code)
  const selected = hazardCatalog.find((item) => item.code === hazardCode) ?? available[0] ?? hazardCatalog[0]
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('静态')
  const [dataName, setDataName] = useState('现场检查结论')
  const [measuredValue, setMeasuredValue] = useState('')
  const [unit, setUnit] = useState('')
  const [standardValue, setStandardValue] = useState('')
  const [staticResult, setStaticResult] = useState('符合')
  const [staticRisk, setStaticRisk] = useState<RiskLevel>('一般')
  const [likelihood, setLikelihood] = useState(2)
  const [severity, setSeverity] = useState(2)
  const [finding, setFinding] = useState('')
  const [action, setAction] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [photoData, setPhotoData] = useState('')
  const [message, setMessage] = useState('')
  const [importing, setImporting] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [importedRows, setImportedRows] = useState<ImportedAssessment[]>([])
  const [duplicatePrompt, setDuplicatePrompt] = useState<{ rows: ImportedAssessment[]; duplicateIndexes: number[]; existingIndexes: number[]; inFileIndexes: number[] } | null>(null)
  const dynamicScore = likelihood * severity
  const risk: RiskLevel = assessmentType === '动态' ? riskFromScore(dynamicScore) : staticResult === '符合' ? '低' : staticRisk
  const hasHazard = assessmentType === '动态' ? risk !== '低' : staticResult === '不符合'

  const changeCatalog = (nextStage: typeof stage, nextDimension: typeof dimension) => {
    setStage(nextStage); setDimension(nextDimension)
    const first = hazardCatalog.find((item) => item.stage === nextStage && item.dimension === nextDimension)
    if (first) setHazardCode(first.code)
  }
  const changeBureau = (nextBureau: string) => {
    setBureau(nextBureau)
    const nextStations = bureaus.find((item) => item.name === nextBureau)?.stations ?? []
    setStation(nextStations[0] ?? '')
  }
  const uploadPhoto = async (file: File) => {
    if (importing || uploadingPhoto) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setMessage('请上传 JPG、PNG 或 WebP 图片'); return }
    setUploadingPhoto(true)
    try {
      const data = await compressImage(file)
      setPhotoName(file.name); setPhotoData(data); setMessage('')
    } catch { setMessage('图片读取失败，请重新选择') }
    finally { setUploadingPhoto(false) }
  }
  const uploadRowPhoto = async (index: number, file: File) => {
    if (importing || uploadingPhoto) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setMessage(`第 ${index + 1} 条请上传 JPG、PNG 或 WebP 图片`); return }
    setUploadingPhoto(true)
    try {
      const photoData = await compressImage(file)
      setImportedRows((items) => items.map((row, rowIndex) => rowIndex === index ? { ...row, photoName: file.name, photoData } : row))
      setMessage(`第 ${index + 1} 条检测照片已更新`)
    } catch { setMessage(`第 ${index + 1} 条图片读取失败，请重新选择`) }
    finally { setUploadingPhoto(false) }
  }
  const applyImportedRows = (rows: ImportedAssessment[], notice?: string) => {
    setImportedRows(rows)
    const imported = rows[0]
    if (!imported) {
      setTaskName('')
      setBureau(bureaus[0]?.name ?? '')
      setStation(bureaus[0]?.stations[0] ?? '')
      setArea('')
      setCargo('')
      setUnNumber('')
      setStage('进场')
      setDimension('人')
      setHazardCode(hazardCatalog[0]?.code ?? '')
      setAssessmentType('静态')
      setDataName('现场检查结论')
      setMeasuredValue('')
      setUnit('')
      setStandardValue('')
      setStaticResult('符合')
      setStaticRisk('一般')
      setLikelihood(2)
      setSeverity(2)
      setFinding('')
      setAction('')
      setPhotoName('')
      setPhotoData('')
      setMessage(notice || '没有可导入的新数据')
      return
    }
    setTaskName(imported.taskName)
    setBureau(imported.bureau)
    setStation(imported.station)
    setArea(imported.area)
    setCargo(imported.cargo)
    setUnNumber(imported.unNumber)
    setStage(imported.stage)
    setDimension(imported.dimension)
    setHazardCode(imported.hazardCode)
    setAssessmentType(imported.assessmentType)
    setDataName(imported.dataName)
    setMeasuredValue(imported.measuredValue)
    setUnit(imported.unit)
    setStandardValue(imported.standardValue)
    setStaticResult(imported.staticResult)
    setStaticRisk(imported.staticRisk)
    setLikelihood(imported.likelihood)
    setSeverity(imported.severity)
    setFinding(imported.finding)
    setAction(imported.action)
    setPhotoName(imported.photoName)
    setPhotoData(imported.photoData)
    setMessage(notice || `已导入 ${rows.length} 条数据。照片、隐患描述和整改建议按行独立保存；未读取到照片的行请分别上传。`)
  }
  const importExcel = async (file: File) => {
    setImporting(true)
    setMessage('正在读取 Excel 数据...')
    try {
      const rows = await parseAssessmentWorkbook(file)
      const duplicates = findDuplicateImportRows(rows, existingRecords)
      if (duplicates.duplicateIndexes.length) {
        setDuplicatePrompt({ rows, ...duplicates })
      } else {
        applyImportedRows(rows)
      }
    } catch (error) {
      setMessage(error instanceof Error ? `导入失败：${error.message}` : 'Excel 读取失败，请使用平台模板后重试')
    } finally {
      setImporting(false)
    }
  }
  const continueDuplicateImport = () => {
    if (!duplicatePrompt) return
    const count = duplicatePrompt.duplicateIndexes.length
    applyImportedRows(duplicatePrompt.rows, `已导入 ${duplicatePrompt.rows.length} 条数据，其中 ${count} 条与已有数据重复，已按“继续添加”保留。` + (duplicatePrompt.inFileIndexes.length ? ' 文件内重复项也已保留。' : ''))
    setDuplicatePrompt(null)
  }
  const skipDuplicateImport = () => {
    if (!duplicatePrompt) return
    const duplicateSet = new Set(duplicatePrompt.duplicateIndexes)
    const rows = duplicatePrompt.rows.filter((_, index) => !duplicateSet.has(index))
    applyImportedRows(rows, rows.length ? `已跳过 ${duplicatePrompt.duplicateIndexes.length} 条重复数据，保留 ${rows.length} 条新数据。` : `检测到 ${duplicatePrompt.duplicateIndexes.length} 条重复数据，已全部跳过，未导入新记录。`)
    setDuplicatePrompt(null)
  }
  const cancelDuplicateImport = () => setDuplicatePrompt(null)
  const submit = async () => {
    if (importedRows.length > 1) {
      const invalidIndex = importedRows.findIndex((row) => !row.taskName.trim() || !row.bureau || !row.station || !row.area.trim() || !row.cargo.trim() || !row.dataName.trim() || !row.measuredValue.trim())
      if (invalidIndex >= 0) { setMessage(`第 ${invalidIndex + 1} 行仍缺少必填数据，请补充任务、局站、区域、危险货物、检测名称和检测值`); return }
      const missingPhoto = importedRows.findIndex((row) => !row.photoData)
      if (missingPhoto >= 0) { setMessage(`第 ${missingPhoto + 1} 条评估缺少检测照片，请在该条记录中上传`); return }
      const createdAt = new Date().toLocaleString('zh-CN', { hour12: false })
      const batchId = createAssessmentId().replace(/-/g, '')
      await onSubmit(importedRows.map((row, index) => buildImportedRecord(row, userName, `HA-${batchId}-${index + 1}`, createdAt)))
      return
    }
    if (!taskName.trim() || !bureau || !station || !area.trim() || !cargo.trim() || !measuredValue.trim()) { setMessage('请填写任务、办理局、办理站、区域、危险货物和检测结果'); return }
    if (!photoData) { setMessage('请上传一张现场检测照片作为评估证据'); return }
    const createdAt = new Date().toLocaleString('zh-CN', { hour12: false })
    const finalFinding = finding.trim() || (hasHazard ? `${selected.stage}${selected.dimension}类危险源“${selected.name}”存在异常：${dataName}${measuredValue}${unit ? ` ${unit}` : ''}。` : `未发现“${selected.name}”相关隐患。`)
    await onSubmit([{
      id: `HA-${createAssessmentId().replace(/-/g, '')}`,
      task_name: taskName.trim(), bureau, station, area: area.trim(), cargo: cargo.trim(), un_number: unNumber.trim(), inspector: userName,
      hazard_code: selected.code, stage: selected.stage, dimension: selected.dimension, hazard_name: selected.name, basis: selected.basis,
      assessment_type: assessmentType, data_name: dataName.trim(), measured_value: measuredValue.trim(), unit: unit.trim(), standard_value: standardValue.trim(),
      static_result: assessmentType === '静态' ? staticResult : '', likelihood, severity, score: assessmentType === '动态' ? dynamicScore : risk === '低' ? 1 : risk === '一般' ? 4 : risk === '较大' ? 9 : 16,
      risk, has_hazard: hasHazard, finding: finalFinding, action: action.trim() || defaultAction(risk, selected.name), photo_name: photoName, photo_data: photoData,
      status: '已完成', created_at: createdAt,
    }])
  }

  return <div className="modal-backdrop"><section className="modal hazard-create-modal" role="dialog" aria-modal="true" aria-label="新建危险源评估">
    <div className="modal-header"><div><span className="eyebrow">61项危险源评估库</span><h2>新建评估</h2></div><div className="assessment-import-actions"><label className={`button secondary ${importing || uploadingPhoto ? 'is-disabled' : ''}`}><Upload size={15} />{importing ? '正在导入' : '导入 Excel'}<input type="file" accept=".xlsx" hidden disabled={importing || uploadingPhoto} onChange={(event) => { const file = event.target.files?.[0]; if (file) void importExcel(file); event.target.value = '' }} /></label><a className="button secondary" href={`${import.meta.env.BASE_URL}templates/assessment-import-template.xlsx`} download="铁路危险货物风险评估导入模板.xlsx"><Download size={15} />下载模板</a><button className="icon-btn" onClick={onClose} aria-label="关闭"><X size={19} /></button></div></div>
    <div className="modal-body hazard-form-body">
      {importedRows.length > 1 && <BatchAssessmentEditor rows={importedRows} uploadingPhoto={uploadingPhoto} onUpload={uploadRowPhoto} onChange={(index, patch) => setImportedRows((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))} />}
      {importedRows.length <= 1 && <>
      <div className="hazard-form-section"><h3>任务信息</h3><div className="form-grid">
        <label><span>任务名称 *</span><input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="如 航煤罐车装卸专项评估" /></label>
        <label><span>办理局 *</span><select value={bureau} onChange={(e) => changeBureau(e.target.value)}>{bureaus.map((item) => <option key={item.name} value={item.name}>{item.short}</option>)}</select></label>
        <label><span>办理站 *</span><select value={station} onChange={(e) => setStation(e.target.value)}>{availableStations.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>作业区域 *</span><input value={area} onChange={(e) => setArea(e.target.value)} placeholder="如 3号装卸线" /></label>
        <div className="hazard-cargo-field"><div className="field-label-row"><label htmlFor="hazard-cargo">危险货物 *</label><button type="button" className="field-help-button" aria-label="查看危险货物与UN编号对照" title="查看危险货物与UN编号对照" onClick={() => setShowUnLookup(true)}><CircleHelp size={15} /></button></div><input id="hazard-cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="如 航空煤油" /></div>
        <label><span>UN编号</span><input value={unNumber} onChange={(e) => setUnNumber(e.target.value)} placeholder="如 UN1863" /></label>
      </div></div>
      <div className="hazard-form-section"><h3>危险源选择</h3><div className="form-grid">
        <label><span>作业环节</span><select value={stage} onChange={(e) => changeCatalog(e.target.value as typeof stage, dimension)}>{hazardStages.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>指标维度</span><select value={dimension} onChange={(e) => changeCatalog(stage, e.target.value as typeof dimension)}>{hazardDimensions.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="form-full"><span>危险源</span><select value={selected.code} onChange={(e) => setHazardCode(e.target.value)}>{available.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}</select></label>
      </div><p className="hazard-basis"><b>判定依据</b>{selected.basis}</p></div>
      <div className="hazard-form-section"><h3>检测数据与评估方式</h3><div className="assessment-mode-switch"><button className={assessmentType === '静态' ? 'active' : ''} onClick={() => setAssessmentType('静态')}>静态评估<small>结果确定，可直接判定符合/不符合</small></button><button className={assessmentType === '动态' ? 'active' : ''} onClick={() => setAssessmentType('动态')}>动态评估<small>结果不确定，按可能性 × 严重度计算</small></button></div><div className="form-grid">
        <label><span>检测数据名称 *</span><input value={dataName} onChange={(e) => setDataName(e.target.value)} placeholder="如 可燃气体浓度" /></label>
        <label><span>检测值 / 结论 *</span><input value={measuredValue} onChange={(e) => setMeasuredValue(e.target.value)} placeholder="如 18 或 报警器失效" /></label>
        <label><span>单位</span><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="如 %LEL、℃、m" /></label>
        <label><span>标准或阈值</span><input value={standardValue} onChange={(e) => setStandardValue(e.target.value)} placeholder="如 ≤ 10%LEL" /></label>
      </div>
      {assessmentType === '静态' ? <div className="static-evaluation"><label><span>确定性结论</span><select value={staticResult} onChange={(e) => setStaticResult(e.target.value)}><option>符合</option><option>不符合</option></select></label>{staticResult === '不符合' && <label><span>风险等级</span><select value={staticRisk} onChange={(e) => setStaticRisk(e.target.value as RiskLevel)}><option>低</option><option>一般</option><option>较大</option><option>重大</option></select></label>}</div> : <div className="dynamic-evaluation"><label><span>发生可能性 L</span><select value={likelihood} onChange={(e) => setLikelihood(Number(e.target.value))}>{[1,2,3,4,5].map((v) => <option key={v} value={v}>{v}级</option>)}</select></label><b>×</b><label><span>后果严重度 C</span><select value={severity} onChange={(e) => setSeverity(Number(e.target.value))}>{[1,2,3,4,5].map((v) => <option key={v} value={v}>{v}级</option>)}</select></label><div className="dynamic-result" style={{ borderColor: riskColors[risk], color: riskColors[risk] }}><strong>R={dynamicScore}</strong><span>{risk}风险</span></div></div>}
      </div>
      <div className="hazard-form-section"><h3>照片与隐患说明</h3><div className="photo-upload-row"><label className="photo-upload"><Camera size={20} /><strong>{photoName || '上传检测照片 *'}</strong><small>支持 JPG、PNG、WebP，保存前自动压缩</small><input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadPhoto(file) }} /></label>{photoData && <img src={photoData} alt="检测照片预览" />}</div><div className="form-grid">
        <label className="form-full"><span>隐患描述</span><textarea value={finding} onChange={(e) => setFinding(e.target.value)} placeholder="可留空，平台会根据检测结果自动生成" /></label>
        <label className="form-full"><span>整改建议</span><textarea value={action} onChange={(e) => setAction(e.target.value)} placeholder="可留空，平台会根据风险等级自动生成" /></label>
      </div></div>
      <div className="assessment-result-strip"><span>本次结论</span><RiskBadge risk={risk} /><b>{hasHazard ? '识别为隐患，进入隐患分析' : '未识别出需整改隐患'}</b></div>
      </>}
      {message && <p className="auth-message" role="status">{message}</p>}
    </div>
    <div className="modal-actions"><span className="modal-hint">评估完成后将保留历史记录和检测照片</span><div><button className="button secondary" onClick={onClose}>取消</button><button className="button primary" disabled={importing || uploadingPhoto} onClick={() => void submit()}><Check size={16} />生成评估结论</button></div></div>
    {showUnLookup && <DangerousGoodsLookup onClose={() => setShowUnLookup(false)} onSelect={(item) => { setCargo(item.name); setUnNumber(item.unNumber); setShowUnLookup(false) }} />}
    {duplicatePrompt && <DuplicateImportPrompt duplicate={duplicatePrompt} onContinue={continueDuplicateImport} onSkip={skipDuplicateImport} onCancel={cancelDuplicateImport} />}
  </section></div>
}

function DuplicateImportPrompt({ duplicate, onContinue, onSkip, onCancel }: { duplicate: { rows: ImportedAssessment[]; duplicateIndexes: number[]; existingIndexes: number[]; inFileIndexes: number[] }; onContinue: () => void; onSkip: () => void; onCancel: () => void }) {
  const existingSet = new Set(duplicate.existingIndexes)
  return <div className="duplicate-import-backdrop"><section className="duplicate-import-modal" role="dialog" aria-modal="true" aria-labelledby="duplicate-import-title">
    <div className="duplicate-import-header"><div><span className="eyebrow">导入前检查</span><h3 id="duplicate-import-title">发现重复评估数据</h3></div><button className="icon-btn" onClick={onCancel} aria-label="取消导入"><X size={18} /></button></div>
    <div className="duplicate-import-body"><p>本次导入有 <strong>{duplicate.duplicateIndexes.length}</strong> 条数据与已有记录或文件内其他行重复。请选择如何处理重复项：</p><div className="duplicate-import-summary"><span>导入总数 <b>{duplicate.rows.length}</b></span><span>重复项 <b>{duplicate.duplicateIndexes.length}</b></span><span>已有记录 <b>{duplicate.existingIndexes.length}</b></span><span>文件内重复 <b>{duplicate.inFileIndexes.length}</b></span></div><div className="duplicate-import-list">{duplicate.duplicateIndexes.map((index) => <div key={index}><strong>第 {index + 1} 行</strong><span>{duplicate.rows[index].taskName} · {duplicate.rows[index].hazardCode}</span><em>{existingSet.has(index) ? '与已有记录重复' : '与本次导入其他行重复'}</em></div>)}</div></div>
    <div className="duplicate-import-actions"><button className="button secondary" onClick={onCancel}>取消导入</button><div><button className="button secondary" onClick={onSkip}>跳过已有数据</button><button className="button primary" onClick={onContinue}><Plus size={15} />继续添加</button></div></div>
  </section></div>
}

function BatchAssessmentEditor({ rows, onChange, onUpload, uploadingPhoto }: { rows: ImportedAssessment[]; onChange: (index: number, patch: Partial<ImportedAssessment>) => void; onUpload: (index: number, file: File) => Promise<void>; uploadingPhoto: boolean }) {
  return <section className="batch-import-editor">
    <div className="batch-import-editor-heading"><div><h3>批量数据编辑</h3><p>每一条独立保存照片、隐患描述和整改建议。请逐条检查，缺少照片时在对应条目上传。</p></div><span>{rows.length} 行</span></div>
    <div className="batch-import-rows">{rows.map((row, index) => {
      const stations = bureaus.find((item) => item.name === row.bureau)?.stations ?? []
      const hazards = hazardCatalog.filter((item) => item.stage === row.stage && item.dimension === row.dimension)
      return <article className="batch-import-row" key={`${row.hazardCode}-${index}`}>
        <div className="batch-import-row-heading"><strong>第 {index + 1} 行</strong><span>{row.taskName || '未命名任务'} · {row.hazardCode}</span><em className={row.assessmentType === '动态' ? 'dynamic' : ''}>{row.assessmentType}评估</em></div>
        <div className="batch-import-grid">
          <label><span>任务名称 *</span><input value={row.taskName} onChange={(event) => onChange(index, { taskName: event.target.value })} /></label>
          <label><span>办理局 *</span><select value={row.bureau} onChange={(event) => { const next = event.target.value; const nextStations = bureaus.find((item) => item.name === next)?.stations ?? []; onChange(index, { bureau: next, station: nextStations[0] ?? '' }) }}>{bureaus.map((item) => <option key={item.name} value={item.name}>{item.short}</option>)}</select></label>
          <label><span>办理站 *</span><select value={row.station} onChange={(event) => onChange(index, { station: event.target.value })}>{stations.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>作业区域 *</span><input value={row.area} onChange={(event) => onChange(index, { area: event.target.value })} /></label>
          <label><span>危险货物 *</span><input value={row.cargo} onChange={(event) => onChange(index, { cargo: event.target.value })} /></label>
          <label><span>UN编号</span><input value={row.unNumber} onChange={(event) => onChange(index, { unNumber: event.target.value })} /></label>
          <label><span>作业环节 *</span><select value={row.stage} onChange={(event) => { const nextStage = event.target.value as ImportedAssessment['stage']; const nextHazards = hazardCatalog.filter((item) => item.stage === nextStage && item.dimension === row.dimension); onChange(index, { stage: nextStage, hazardCode: nextHazards[0]?.code ?? row.hazardCode }) }}>{hazardStages.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>指标维度 *</span><select value={row.dimension} onChange={(event) => { const nextDimension = event.target.value as ImportedAssessment['dimension']; const nextHazards = hazardCatalog.filter((item) => item.stage === row.stage && item.dimension === nextDimension); onChange(index, { dimension: nextDimension, hazardCode: nextHazards[0]?.code ?? row.hazardCode }) }}>{hazardDimensions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="batch-import-full"><span>危险源 *</span><select value={row.hazardCode} onChange={(event) => onChange(index, { hazardCode: event.target.value })}>{hazards.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}</select></label>
          <label><span>评估方式 *</span><select value={row.assessmentType} onChange={(event) => onChange(index, { assessmentType: event.target.value as AssessmentType })}><option>静态</option><option>动态</option></select></label>
          <label><span>检测数据名称 *</span><input value={row.dataName} onChange={(event) => onChange(index, { dataName: event.target.value })} /></label>
          <label><span>检测值 / 结论 *</span><input value={row.measuredValue} onChange={(event) => onChange(index, { measuredValue: event.target.value })} /></label>
          <label><span>单位</span><input value={row.unit} onChange={(event) => onChange(index, { unit: event.target.value })} /></label>
          <label><span>标准或阈值</span><input value={row.standardValue} onChange={(event) => onChange(index, { standardValue: event.target.value })} /></label>
          {row.assessmentType === '静态' ? <><label><span>确定性结论 *</span><select value={row.staticResult} onChange={(event) => onChange(index, { staticResult: event.target.value })}><option>符合</option><option>不符合</option></select></label>{row.staticResult === '不符合' && <label><span>静态风险等级 *</span><select value={row.staticRisk} onChange={(event) => onChange(index, { staticRisk: event.target.value as RiskLevel })}>{(['低', '一般', '较大', '重大'] as RiskLevel[]).map((item) => <option key={item}>{item}</option>)}</select></label>}</> : <><label><span>发生可能性 L *</span><select value={row.likelihood} onChange={(event) => onChange(index, { likelihood: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}级</option>)}</select></label><label><span>后果严重度 C *</span><select value={row.severity} onChange={(event) => onChange(index, { severity: Number(event.target.value) })}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}级</option>)}</select></label></>}
        </div>
        <div className="batch-row-evidence">
          <h4>第 {index + 1} 条 · 照片与隐患说明</h4>
          <div className="photo-upload-row"><label className="photo-upload"><Camera size={20} /><strong>{row.photoData ? '更换该条检测照片' : '上传该条检测照片 *'}</strong><small>{row.photoName || 'JPG、PNG、WebP'}</small><input aria-label={`第${index + 1}条检测照片`} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={uploadingPhoto} onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload(index, file); event.target.value = '' }} /></label>{row.photoData && <img src={row.photoData} alt={`第${index + 1}条检测照片预览`} />}</div>
          <div className="batch-import-grid"><label className="batch-import-full"><span>隐患描述</span><textarea aria-label={`第${index + 1}条隐患描述`} value={row.finding} onChange={(event) => onChange(index, { finding: event.target.value })} placeholder="留空时，根据本条危险源和检测结果生成" /></label><label className="batch-import-full"><span>整改建议</span><textarea aria-label={`第${index + 1}条整改建议`} value={row.action} onChange={(event) => onChange(index, { action: event.target.value })} placeholder="留空时，根据本条危险源和风险等级生成" /></label></div>
        </div>
      </article>
    })}</div>
  </section>
}

function DangerousGoodsLookup({ onClose, onSelect }: { onClose: () => void; onSelect: (item: DangerousGood) => void }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const filteredGoods = dangerousGoods.filter((item) => !normalizedQuery || [item.name, item.formalName, item.unNumber, item.category, ...(item.aliases ?? [])].join(' ').toLowerCase().includes(normalizedQuery))

  return <div className="un-lookup-backdrop" onMouseDown={onClose}><section className="un-lookup-modal" role="dialog" aria-modal="true" aria-labelledby="un-lookup-title" onMouseDown={(event) => event.stopPropagation()}>
    <div className="un-lookup-header"><div><span className="eyebrow">DANGEROUS GOODS REFERENCE</span><h3 id="un-lookup-title">危险货物与 UN 编号</h3></div><button type="button" className="icon-btn" onClick={onClose} aria-label="关闭UN编号查询"><X size={18} /></button></div>
    <label className="un-lookup-search"><Search size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索品名、别名或 UN 编号" /></label>
    <div className="un-lookup-columns"><span>危险货物 / 正式运输品名</span><span>分类</span><span>UN编号</span></div>
    <div className="un-lookup-list">
      {filteredGoods.map((item) => <button type="button" key={`${item.unNumber}-${item.name}`} onClick={() => onSelect(item)}>
        <span><strong>{item.name}</strong><small>{item.formalName !== item.name ? item.formalName : '正式运输品名同左'}</small></span><em>{item.category}</em><b>{item.unNumber}</b>
      </button>)}
      {!filteredGoods.length && <div className="un-lookup-empty">未找到匹配项，请核对品名或直接填写。</div>}
    </div>
    <p className="un-lookup-note">本清单用于常用品名快速查询。正式运输申报请以现行危险货物品名表、货物成分和托运单据为准。</p>
  </section></div>
}

function AssessmentDetail({ record, index, total, onNavigate, onClose }: { record: HazardAssessmentRecord; index: number; total: number; onNavigate: (direction: number) => void; onClose: () => void }) {
  const [photoPreview, setPhotoPreview] = useState(false)
  return <div className="modal-backdrop"><section className="modal hazard-detail-modal" role="dialog" aria-modal="true" aria-label="评估报告">
    <div className="modal-header"><div><span className="eyebrow">{record.id} · {record.created_at}</span><h2>{record.task_name}</h2>{total > 1 && <span className="report-position" aria-live="polite">第 {index + 1} 条 / 共 {total} 条评估结论</span>}</div><button className="icon-btn" onClick={onClose} aria-label="关闭"><X size={19} /></button></div>
    <div className="modal-body">
      <div className="detail-summary"><div><span>风险结论</span><RiskBadge risk={record.risk} /></div><div><span>评估方式</span><strong>{record.assessment_type}评估</strong></div><div><span>评估人</span><strong>{record.inspector}</strong></div><div><span>隐患状态</span><strong>{record.has_hazard ? '存在隐患' : '未发现隐患'}</strong></div></div>
      <section className="report-section"><h3>任务与危险源</h3><dl><div><dt>办理局 / 办理站</dt><dd>{record.bureau ? `${bureauShort(record.bureau)} / ` : ''}{record.station}</dd></div><div><dt>作业区域</dt><dd>{record.area}</dd></div><div><dt>危险货物</dt><dd>{record.cargo} {record.un_number}</dd></div><div><dt>危险源</dt><dd>{record.hazard_code} · {record.stage} / {record.dimension} · {record.hazard_name}</dd></div><div><dt>判定依据</dt><dd>{record.basis}</dd></div></dl></section>
      <section className="report-section"><h3>检测与计算</h3><dl><div><dt>检测数据</dt><dd>{record.data_name}：{record.measured_value}{record.unit}</dd></div><div><dt>标准 / 阈值</dt><dd>{record.standard_value || '未填写'}</dd></div>{record.assessment_type === '静态' ? <div><dt>确定性结论</dt><dd>{record.static_result}</dd></div> : <div><dt>动态风险值</dt><dd>L={record.likelihood} × C={record.severity} = R={record.score}</dd></div>}</dl></section>
      <section className="report-section"><h3>隐患与整改措施</h3><p>{record.finding}</p><p className="action-note">{record.action}</p></section>
      {record.photo_data && <section className="report-section"><h3>检测照片</h3><figure className="assessment-photo"><button type="button" onClick={() => setPhotoPreview(true)} title="点击放大查看检测照片"><img src={record.photo_data} alt={record.photo_name || '检测照片'} /></button><figcaption>{record.photo_name} · 点击图片查看大图</figcaption></figure></section>}
    </div>
    <div className="modal-actions report-actions"><span className="modal-hint">该记录已进入历史评估与隐患分析</span><div className="report-navigation">{total > 1 && <><button type="button" className="button secondary" disabled={index === 0} onClick={() => onNavigate(-1)}><ChevronLeft size={16} />上一条</button><span className="report-page-count">{index + 1} / {total}</span><button type="button" className="button secondary" disabled={index === total - 1} onClick={() => onNavigate(1)}>下一条<ChevronRight size={16} /></button></>}<button className="button primary" onClick={onClose}>关闭报告</button></div></div>
  </section>{photoPreview && <PhotoPreview record={record} onClose={() => setPhotoPreview(false)} />}</div>
}

function PhotoPreview({ record, onClose }: { record: HazardAssessmentRecord; onClose: () => void }) {
  return <div className="photo-preview-backdrop" role="dialog" aria-modal="true" aria-label="检测照片预览" onMouseDown={onClose}><section className="photo-preview-modal" onMouseDown={(event) => event.stopPropagation()}><div className="photo-preview-header"><strong>{record.photo_name || '检测照片'}</strong><button type="button" className="icon-btn" onClick={onClose} aria-label="关闭照片预览"><X size={19} /></button></div><img src={record.photo_data} alt={record.photo_name || '检测照片'} /></section></div>
}
