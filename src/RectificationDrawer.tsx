import { useRef, useState } from 'react'
import { ArrowRight, Camera, Check, MapPin, Pencil, RotateCcw, Save, X } from 'lucide-react'
import type { HazardAssessmentRecord, RectificationUpdate } from './api/hazardAssessments'
import type { RectificationIssue } from './RectificationGroups'
import { compressImage } from './assessmentPhotos'
import { rectificationAccess, rectificationStages } from './rectificationWorkflow'
import './Rectification.css'

type Props = {
  issue: RectificationIssue & { record?: HazardAssessmentRecord }
  role: string; userId: number; readOnly: boolean
  onClose: () => void
  onUpdate: (stage: number, update: RectificationUpdate) => Promise<boolean>
}
const eventNames = { assessment: '评估发现隐患', save_progress: '保存处理进展', advance: '提交下一阶段', withdraw: '撤回上一阶段', reject: '退回整改', edit: '修改处理记录' }

export function RectificationDrawer({ issue, role, userId, readOnly, onClose, onUpdate }: Props) {
  const record = issue.record
  const access = record ? rectificationAccess(record, role, userId) : null
  const status = access?.status ?? rectificationStages[issue.stage]
  const index = access?.index ?? issue.stage
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [photoName, setPhotoName] = useState(record?.review_measured_value ? record.rectification_photo_name ?? '' : '')
  const [photoData, setPhotoData] = useState(record?.review_measured_value ? record.rectification_photo_data ?? '' : '')
  const [measured, setMeasured] = useState(record?.review_measured_value ?? '')
  const [standard, setStandard] = useState(record?.review_standard_value || record?.standard_value || '')
  const [passed, setPassed] = useState(record?.review_result === '合格')
  const [preview, setPreview] = useState<{ name: string; data: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editorRef = useRef<HTMLElement>(null)
  const draftBeforeEdit = useRef<{ note: string; photoName: string; photoData: string; measured: string; standard: string; passed: boolean } | null>(null)
  const canProcess = !readOnly && access?.canProcess
  const canWithdraw = !readOnly && access?.canWithdraw
  const canReview = !readOnly && access?.canReview
  const busy = saving || uploading
  const submit = async (requestedOperation: RectificationUpdate['operation']) => {
    if (busy || !record || readOnly) return
    if (editingId && requestedOperation !== 'save_progress') return
    const operation = requestedOperation === 'save_progress' && index === 0 ? 'advance' : requestedOperation
    const effectiveOperation = editingId && requestedOperation === 'save_progress' ? 'edit' : operation
    if (!note.trim()) { setError(operation === 'withdraw' ? '请填写撤回原因' : '请填写本次处理进展'); return }
    if (effectiveOperation === 'advance' && canReview && (!photoData || !measured.trim() || !standard.trim() || !passed)) {
      setError('请填写复核检测值与标准、上传现场照片，并确认数据达标'); return
    }
    const target = effectiveOperation === 'advance' ? index + 1 : effectiveOperation === 'withdraw' ? index - 1 : effectiveOperation === 'reject' ? 1 : index
    setSaving(true); setError('')
    try {
      const success = await onUpdate(target, {
        status: rectificationStages[target], operation: effectiveOperation, expected_version: record.workflow_version ?? 0, note: note.trim(),
        ...(effectiveOperation === 'edit' ? { edit_event_id: editingId! } : {}),
        ...(effectiveOperation !== 'withdraw' && index < 4 ? { rectification_photo_name: photoName, rectification_photo_data: photoData } : {}),
        ...(canReview && effectiveOperation !== 'withdraw' ? { review_measured_value: measured.trim(), review_standard_value: standard.trim(), review_result: passed && effectiveOperation !== 'reject' ? '合格' : effectiveOperation === 'reject' ? '不合格' : '' } : {}),
      })
      if (success) {
        setEditingId(null)
        draftBeforeEdit.current = null
        if (effectiveOperation !== 'edit' && operation !== 'save_progress' && !(operation === 'advance' && index === 0)) {
          setNote(''); setPhotoName(''); setPhotoData(''); setMeasured(''); setPassed(false)
        }
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : '处理记录保存失败') }
    finally { setSaving(false) }
  }
  const beginEdit = (event: NonNullable<HazardAssessmentRecord['rectification_log']>[number]) => {
    if (busy || readOnly || access?.editableEventId !== event.id) return
    if (!editingId) draftBeforeEdit.current = { note, photoName, photoData, measured, standard, passed }
    setEditingId(event.id); setNote(event.note); setPhotoName(event.photo_name || ''); setPhotoData(event.photo_data || '')
    setMeasured(event.measured_value || ''); setStandard(event.standard_value || record?.standard_value || ''); setPassed(event.review_result === '合格'); setError('')
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const cancelEdit = () => {
    const draft = draftBeforeEdit.current
    if (draft) {
      setNote(draft.note); setPhotoName(draft.photoName); setPhotoData(draft.photoData)
      setMeasured(draft.measured); setStandard(draft.standard); setPassed(draft.passed)
    }
    setEditingId(null); setError(''); draftBeforeEdit.current = null
  }
  const upload = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('照片仅支持 JPG、PNG、WebP'); return }
    setUploading(true); setError('')
    try {
      const data = await compressImage(file)
      if (data.length > 1_500_000 || file.name.length > 180) throw new Error('照片过大或名称过长，请更换照片')
      setPhotoName(file.name); setPhotoData(data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '照片处理失败') }
    finally { setUploading(false) }
  }
  const nextLabel = ['保存并开始整改', '保存并提交原安全员', '保存并开始复核', '复核合格并交回项目经理', '确认完成闭环'][index]
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) onClose() }}>
    <aside className="issue-drawer rectification-drawer" role="dialog" aria-modal="true" aria-label="整改任务详情">
      <div className="drawer-header"><div><span className="eyebrow">整改任务 · {issue.id}</span><button className="icon-btn" aria-label="关闭详情" disabled={busy} onClick={onClose}><X size={19} /></button></div><h2>{issue.title}</h2><div className="drawer-meta"><span>{issue.risk}风险</span><span><MapPin size={13} />{issue.location}</span></div></div>
      <div className="drawer-content">
        <div className="detail-grid"><div><span>复核安全员</span><strong>{record?.reviewer_name || issue.owner}</strong></div><div><span>项目经理</span><strong>{access?.managerName ?? '待接办'}</strong></div><div><span>原检测数据</span><strong>{record ? `${record.measured_value} ${record.unit}` : '-'}</strong></div><div><span>当前状态</span><strong>{status}</strong></div></div>
        <section className="detail-section"><h3>整改建议</h3><p>{record?.action || '暂无整改建议'}</p>{record?.standard_value && <p>原控制标准：{record.standard_value}</p>}</section>
        <section className="detail-section"><h3>整改阶段</h3><ol className="rectification-steps">{rectificationStages.map((stage, step) => <li key={stage} aria-current={step === index ? 'step' : undefined} className={step === index ? 'current' : step < index ? 'done' : ''}><span>{step < index ? <Check size={12} /> : step + 1}</span><b>{stage}</b></li>)}</ol></section>
        {canProcess && <section ref={editorRef} className="detail-section rectification-editor"><h3>{editingId ? '修改处理记录' : canReview ? '现场复核' : '处理进展'}</h3>
          <label><span>进展说明 / 退回原因 *</span><textarea aria-label="进展说明" value={note} disabled={busy} maxLength={4000} onChange={(event) => setNote(event.target.value)} rows={4} /></label>
          {canReview && <><label><span>复核检测值 *</span><input aria-label="复核检测值" value={measured} disabled={busy} maxLength={100} onChange={(event) => { setMeasured(event.target.value); setPassed(false) }} /></label><label><span>复核控制标准 *</span><input aria-label="复核控制标准" value={standard} disabled={busy} readOnly={Boolean(record?.standard_value)} maxLength={160} onChange={(event) => { setStandard(event.target.value); setPassed(false) }} /></label></>}
          {index < 4 && <label className="rectification-upload"><Camera size={16} /><span>{uploading ? '照片处理中...' : photoName || (canReview ? '上传复核现场照片 *' : '上传整改照片')}</span><input aria-label="上传整改照片" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = '' }} /></label>}
          {photoData && <button className="rectification-photo" title="查看现场照片" onClick={() => setPreview({ name: photoName, data: photoData })}><img src={photoData} alt={photoName || '现场照片'} /></button>}
          {canReview && <label className="rectification-check"><input type="checkbox" checked={passed} disabled={busy} onChange={(event) => setPassed(event.target.checked)} /><span>已核对现场检测数据，符合控制标准且隐患已消除</span></label>}
          <div className="rectification-commands"><button className="button secondary" disabled={busy || !note.trim()} onClick={() => void submit('save_progress')}><Save size={15} />{editingId ? '保存修改' : '保存处理记录'}</button>{editingId && <button className="button secondary" disabled={busy} onClick={cancelEdit}><X size={15} />取消修改</button>}{access?.canReject && !editingId && <button className="button secondary" disabled={busy || !note.trim()} onClick={() => void submit('reject')}>退回整改</button>}</div>
        </section>}
        {canWithdraw && !editingId && <section className="detail-section"><h3>撤回阶段</h3>{!canProcess && <label className="rectification-withdraw-note"><span>撤回原因 *</span><textarea aria-label="撤回原因" value={note} disabled={busy} maxLength={4000} onChange={(event) => setNote(event.target.value)} rows={3} /></label>}<button className="button secondary full-button" disabled={busy || !note.trim()} onClick={() => void submit('withdraw')}><RotateCcw size={15} />撤回至{rectificationStages[index - 1]}</button></section>}
        {record?.review_result && <section className="detail-section"><h3>安全管理员复核结论</h3><p>{record.review_result} · {record.review_measured_value} {record.unit} · 标准 {record.review_standard_value}</p>{record.rectification_photo_data && <button className="rectification-photo" title="查看复核照片" onClick={() => setPreview({ name: record.rectification_photo_name || '复核照片', data: record.rectification_photo_data! })}><img src={record.rectification_photo_data} alt="复核现场照片" /></button>}</section>}
        {error && <p className="rectification-error" role="alert">{error}</p>}
        <section className="timeline rectification-timeline"><h3>处理记录（{record?.rectification_log?.length ?? 0}）</h3>
          {record?.rectification_log?.map((event) => <div key={event.id}><i /><span>
            <b>{eventNames[event.operation]} · {event.to_status}</b>
            <small>{event.actor} · {event.created_at}{event.from_status !== event.to_status ? ` · ${event.from_status} → ${event.to_status}` : ''}</small>
            <p>{event.note}</p>
            {event.measured_value && <p>检测值：{event.measured_value} · 标准：{event.standard_value}{event.review_result ? ` · ${event.review_result}` : ''}</p>}
            {event.photo_data && <button className="rectification-photo" title="查看记录照片" onClick={() => setPreview({ name: event.photo_name, data: event.photo_data })}><img src={event.photo_data} alt={event.photo_name || '记录照片'} /></button>}
            {canProcess && event.id === access?.editableEventId && <button className="button secondary record-edit" disabled={busy || Boolean(editingId)} onClick={() => beginEdit(event)}><Pencil size={13} />修改</button>}
          </span></div>)}
          {!record?.rectification_log?.length && <p>暂无处理记录</p>}
        </section>
      </div>
      <div className="drawer-footer"><button className="button secondary" disabled={busy} onClick={onClose}>关闭</button>{canProcess && !editingId && <button className="button primary" disabled={busy || !note.trim()} onClick={() => void submit('advance')}>{saving ? '保存中...' : nextLabel}<ArrowRight size={15} /></button>}</div>
    </aside>
    {preview && <div className="photo-preview-backdrop" onMouseDown={() => setPreview(null)} role="dialog" aria-modal="true" aria-label="整改照片预览"><section className="photo-preview-modal" onMouseDown={(event) => event.stopPropagation()}><div className="photo-preview-header"><strong>{preview.name || '现场照片'}</strong><button className="icon-btn" aria-label="关闭照片预览" onClick={() => setPreview(null)}><X size={19} /></button></div><img src={preview.data} alt={preview.name || '现场照片'} /></section></div>}
  </div>
}
