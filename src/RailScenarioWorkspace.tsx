import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Play, RotateCcw, Save, TrainFront, Upload, X } from 'lucide-react'
import type { HazardAssessmentRecord } from './api/hazardAssessments'
import { compressImage } from './assessmentPhotos'
import { buildSceneDocument, buildSceneWorkbook, downloadSceneFile } from './sceneExport'
import { emptyScene, parseSceneFile, sceneBoundary, sceneEvents, sceneFacts, sceneFromSource, sceneObjects, sceneRegions, sceneStages, sourceFromAssessment, stageExplanation, validateScene, type SceneDraft } from './railScenario'
import { sceneEngineConfig, platformSceneRecord, materialTypes as materialNames } from './railHazardModel'
import { RailSceneAdvisor } from './RailSceneAdvisor'
import './RailScenarioWorkspace.css'

type Props = { records: HazardAssessmentRecord[]; sourceLabel: string; userKey: string; initialId: string; onClose: () => void; onOpenSource: (id: string) => void }
export function RailScenarioWorkspace({ records, sourceLabel, userKey, initialId, onClose, onOpenSource }: Props) {
  const latest = [...records].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]
  const initial = records.find(r => r.id === initialId) || latest
  const [draft, setDraft] = useState<SceneDraft>(() => initial ? sceneFromSource(sourceFromAssessment(initial, sourceLabel)) : emptyScene())
  const [applied, setApplied] = useState<SceneDraft | null>(null)
  const [tab, setTab] = useState<'configure' | 'play' | 'report' | 'browse'>('configure')
  const [selectedId, setSelectedId] = useState(initial?.id || '')
  const [imported, setImported] = useState<SceneDraft | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [clean, setClean] = useState(false)
  const [playback, setPlayback] = useState({ time: 0, playing: false, rate: 1 })
  const frame = useRef<HTMLIFrameElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const uploadSequence = useRef(0)
  const storageKey = `rail-scene-draft-v1:${userKey}`
  const patch = (value: Partial<SceneDraft>) => { setDraft(d => ({ ...d, ...value })); setNotice(''); setErrors([]) }
  // The platform list can arrive after this modal opens. Once it does, bind the
  // latest authorized record automatically instead of exposing a manual form.
  // oxlint-disable react/set-state-in-effect
  useEffect(() => {
    if (draft.source || !records.length) return
    const current = records.find(r => r.id === initialId) || [...records].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]
    if (!current) return
    setSelectedId(current.id)
    setDraft(sceneFromSource(sourceFromAssessment(current, sourceLabel)))
    setNotice('原平台评估记录已同步，场景字段已自动带入。')
  }, [draft.source, initialId, records, sourceLabel])
  // oxlint-enable react/set-state-in-effect
  const send = useCallback((data: object) => frame.current?.contentWindow?.postMessage(data, window.location.origin), [])
  const syncPlatform = useCallback(() => send({ type: 'rail-platform-records', records: records.map(r => platformSceneRecord(sourceFromAssessment(r, sourceLabel), emptyScene())), sourceLabel }), [records, sourceLabel, send])
  const initializeFrame = () => { if (applied && tab === 'play') send({ type: 'rail-scene-configure', config: sceneEngineConfig(applied) }); if (tab === 'browse') syncPlatform() }
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return
      if (event.data?.type === 'rail-simulation-close') { if (tab === 'browse') setTab('configure'); else onClose() }
      if (event.data?.type === 'rail-platform-ready' && tab === 'browse') syncPlatform()
      if (event.data?.type === 'rail-select-source') { const record = records.find(r => r.id === event.data.id); if (record) { setDraft(sceneFromSource(sourceFromAssessment(record, sourceLabel))); setSelectedId(record.id); setTab('configure') } }
      if (event.data?.type === 'rail-open-source' && records.some(r => r.id === event.data.id)) onOpenSource(event.data.id)
      if (event.data?.type === 'rail-simulation-ui' && tab === 'browse') setClean(Boolean(event.data.hidden))
      if (event.data?.type === 'rail-scene-ready' && applied && tab === 'play') send({ type: 'rail-scene-configure', config: sceneEngineConfig(applied) })
      if (event.data?.type === 'rail-scene-status' && Number.isFinite(event.data.time)) {
        setReady(true); setPlayback({ time: Math.max(0, Math.min(24, event.data.time)), playing: Boolean(event.data.playing), rate: [1, 2, 4].includes(event.data.rate) ? event.data.rate : 1 })
      }
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [applied, tab, onClose, records, sourceLabel, onOpenSource, syncPlatform, send])
  const changeTab = (next: typeof tab) => { setClean(false); setReady(false); setTab(next) }
  const selectSource = () => {
    uploadSequence.current++
    const r = records.find(r => r.id === selectedId)
    if (!r) { setNotice('原平台暂无可用评估记录，请先在风险评估页保存记录'); return }
    setDraft(sceneFromSource(sourceFromAssessment(r, sourceLabel)))
    setErrors([]); setImported(null); setNotice('已带入配置草稿，请核对来源、照片和模板映射；原记录保持不变。')
  }
  const persist = (value: SceneDraft) => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(value)); return true } catch { return false }
  }
  const apply = () => {
    const invalid = validateScene(draft); setErrors(invalid)
    if (invalid.length) return
    const snapshot = { ...draft, savedAt: new Date().toISOString() }
    setDraft(snapshot); setApplied(structuredClone(snapshot)); setNotice(persist(snapshot) ? '配置快照已保存在本账号浏览器会话' : '配置已应用，但会话存储空间不足；请下载配置文件留存')
    setReady(false); setPlayback({ time: 0, playing: false, rate: 1 }); setTab('play')
  }
  const restore = () => {
    try { const text = sessionStorage.getItem(storageKey); if (!text) { setNotice('当前账号在本浏览器会话中还没有保存的配置'); return }; setImported(parseSceneFile(text)); setNotice('已读取保存的配置，请预览后确认载入；正式应用前仍需绑定当前原平台记录。') } catch { setNotice('保存的配置无法读取，请使用有效的配置文件') }
  }
  const uploadPhoto = async (file: File) => {
    const seq = ++uploadSequence.current
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { setNotice('请选择不超过 10 MB 的 JPG、PNG 或 WebP 图片'); return }
    setBusy(true)
    try { const photo = await compressImage(file); if (seq === uploadSequence.current) { patch({ photo, photoName: file.name, annotation: null }); setNotice('图片已载入草稿；点击图片标出问题位置，保存后可恢复。未进行 AI 识别或自动重建。') } } catch { if (seq === uploadSequence.current) setNotice('图片无法读取，请更换有效图片') } finally { if (seq === uploadSequence.current) setBusy(false) }
  }
  const exportFile = async (kind: 'docx' | 'xlsx' | 'json') => {
    if (!applied) return
    setBusy(true)
    try {
      const name = (applied.title.replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 60) || '铁路情景') + '-资料'
      if (kind === 'json') downloadSceneFile(name + '.json', JSON.stringify(applied, null, 2), 'application/json')
      if (kind === 'xlsx') downloadSceneFile(name + '.xlsx', buildSceneWorkbook(applied), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      if (kind === 'docx') {
        const size = applied.photo ? await new Promise<{ width: number; height: number }>((resolve, reject) => { const img = new Image(); img.onload = () => resolve({ width: img.width, height: img.height }); img.onerror = () => reject(new Error('证据图片无法导出')); img.src = applied.photo }) : undefined
        downloadSceneFile(name + '.docx', buildSceneDocument(applied, size), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      }
      setNotice('已下载当前应用快照的资料；原业务记录未修改。')
    } catch (e) { setNotice(e instanceof Error ? e.message : '导出失败，请重试') } finally { setBusy(false) }
  }
  const stage = Math.min(3, Math.floor(playback.time / 6))
  const hasSource = applied?.source && records.some(r => r.id === applied.source?.id)
  return <section className={`rail-workspace${clean ? ' is-clean' : ''}`} role="dialog" aria-modal="true" aria-label="铁路情景工作区">
    <header className="rail-workspace-header"><div><TrainFront size={24} /><div><span>RAILWAY / SCENARIO STUDIO</span><h1>铁路情景工作区</h1></div></div><button autoFocus type="button" onClick={onClose}><X size={17} />返回平台</button></header>
    <nav className="rail-tabs" aria-label="情景工作步骤"><button aria-current={tab === 'configure' ? 'step' : undefined} onClick={() => changeTab('configure')}>01 数据与场景配置</button><button disabled={!applied} aria-current={tab === 'play' ? 'step' : undefined} onClick={() => changeTab('play')}>02 过程与后果演示</button><button disabled={!applied} aria-current={tab === 'report' ? 'step' : undefined} onClick={() => changeTab('report')}>03 参数与评估资料</button><button className="rail-browse" aria-current={tab === 'browse' ? 'step' : undefined} onClick={() => changeTab('browse')}>浏览六地区站场 ↗</button></nav>
    <div className="rail-notice" role="status" aria-live="polite">{notice || '模板配置与定性演示 · 不代表现场自动建模或实时监测'}</div>
    {tab === 'configure' && <main className="rail-config">
      <div className="rail-config-form">
        <section className="rail-card"><h2>原平台数据直连</h2><p>情景配置只读取当前账号可访问的原平台评估记录，自动带入危险源、检测值、风险等级、整改措施和现场照片。原始数据不会在此处手工重填。</p><div className="rail-source-select"><select aria-label="原平台评估记录" value={selectedId} onChange={e => setSelectedId(e.target.value)} disabled={!records.length}><option value="">请选择原平台评估记录</option>{records.map(r => <option key={r.id} value={r.id}>{r.task_name} · {r.station} · {r.risk}</option>)}</select><button disabled={busy || !records.length} onClick={selectSource}>同步并预览</button></div>{!records.length && <p className="rail-errors" role="alert">当前账号没有可用的原平台评估记录。请先在“风险评估”页保存记录，再打开铁路数字站场。</p>}<div className="rail-inline-actions"><button onClick={restore} disabled={!records.length}>恢复本会话配置</button></div>
        {imported && <div className="rail-import-preview"><h3>配置载入预览</h3><p>{imported.title || '未命名'} · {sceneRegions[imported.region]} · {sceneObjects[imported.zone]}</p><p>{imported.problem}</p><p>来源：{imported.source?.id || '独立演练'}；{sceneEvents[imported.event]}；照片{imported.photo ? '已附带' : '未提供'}</p><button disabled={busy} onClick={() => { uploadSequence.current++; setDraft(imported); setImported(null); setErrors([]); setNotice('已载入草稿，请重新确认映射并应用；未写入业务记录。') }}>确认载入草稿</button><button onClick={() => setImported(null)}>取消</button></div>}
        </section>
        <section className="rail-card"><h2>自动映射的铁路场景</h2><div className="rail-form-grid"><label>平台任务 / 演示名称<input readOnly maxLength={120} value={draft.title} /></label><label>地区示范模板<select value={draft.region} disabled>{Object.entries(sceneRegions).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><label>问题对象（自动推导）<input readOnly value={sceneObjects[draft.zone]} /></label><label>后果情景（自动推导，可切换演示分支）<select value={draft.event} onChange={e => patch({ event: e.target.value as SceneDraft['event'] })}>{Object.entries(sceneEvents).map(([k, v]) => <option key={k} value={k}>{v} · 定性演示</option>)}</select></label></div><p className="rail-source-lock">对象与默认情景根据原平台危险源、环节、维度、货物和隐患描述自动推导；平台原始记录只读，模板地区和演示分支仅控制可视化方式。</p></section>
        <section className="rail-card"><h2>物料与事故演化条件</h2><div className="rail-form-grid"><label>物料性质（需按 SDS 核实）<select value={draft.material} disabled>{Object.entries(materialNames).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label><label>泄漏形态（演练假设）<select value={draft.release} onChange={e => patch({ release: e.target.value as SceneDraft['release'] })}><option value="seep">局部渗漏</option><option value="jet">持续喷漏</option><option value="rupture">较大破口释放</option></select></label></div>{['fire','explosion'].includes(draft.event) && <label className="rail-check"><input type="checkbox" checked={draft.ignitionConfirmed} onChange={e => patch({ ignitionConfirmed: e.target.checked })} />本次演练明确假设存在点火源</label>}{draft.event === 'explosion' && <label className="rail-check"><input type="checkbox" checked={draft.accumulationConfirmed} onChange={e => patch({ accumulationConfirmed: e.target.checked })} />本次演练明确假设存在可燃物积聚与混合条件</label>}<label className="rail-check"><input type="checkbox" checked={draft.mitigated} onChange={e => patch({ mitigated: e.target.checked })} />对比假设施加隔离、停止供料、收集及专业灭火措施（不表示原隐患已整改）</label><p>物料和事故条件决定演化分支；风险等级不直接决定火焰大小或爆炸。</p></section>
        <section className="rail-card"><h2>原记录问题与整改</h2><label>问题描述（原平台只读）<textarea readOnly maxLength={2000} rows={3} value={draft.problem} /></label><label>原因 / 演练假设<textarea readOnly maxLength={2000} rows={2} value={draft.cause} placeholder="原平台未提供，显示待核实" /></label><label>整改措施 / 防控建议（原平台只读）<textarea readOnly rows={3} maxLength={2000} value={draft.measure} /></label><div className="rail-form-grid rail-environment"><label>温度 / °C（平台未提供）<input readOnly value="未知" /></label><label>风速 / m·s⁻¹（平台未提供）<input readOnly value="未知" /></label><label>风向 / °（平台未提供）<input readOnly value="未知" /></label></div><p>原平台没有提供的气象和原因字段保持“未知/待核实”，不会要求操作人员手工补录；场景演示按已知数据生成定性效果。</p></section>
        {errors.length > 0 && <div className="rail-errors" role="alert">{errors.map(e => <p key={e}>{e}</p>)}</div>}
        <div className="rail-config-actions"><button disabled={busy} onClick={() => { const value = { ...draft, savedAt: new Date().toISOString() }; setDraft(value); setNotice(persist(value) ? '已保存本账号会话草稿；下次可点击恢复' : '存储失败，空间不足；可应用后下载配置文件') }}><Save size={16} />保存草稿</button><button className="rail-primary" disabled={busy} onClick={apply}><Play size={16} />确认配置并进入演示</button></div>
      </div>
      <aside className="rail-evidence"><RailSceneAdvisor draft={draft} onApply={patch} /><section className="rail-card"><span className="rail-kicker">SOURCE / 来源快照</span><h2>{draft.source?.title || '独立演练'}</h2>{draft.source ? <dl>{[['编号 / 版本', `${draft.source.id} / ${draft.source.version}`], ['数据来源', draft.source.provenance], ['局站 / 作业区', `${draft.source.bureau} / ${draft.source.station} / ${draft.source.area}`], ['评估时间', draft.source.created], ['原等级 / 状态', `${draft.source.risk} / ${draft.source.status}`], ['检测值 / 标准', `${draft.source.measured} / ${draft.source.standard || '未知'}`], ['判定依据', draft.source.basis || '未提供']].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl> : <p>未绑定正式业务记录。教学案例与手动填写的内容仅用于演练，不创建隐患。</p>}</section>
      <section className="rail-card"><h2>现场照片与问题标注</h2><p>点击照片标出问题位置，或用下方坐标调整。照片仅作证据，不自动重建几何。</p><label className="rail-upload"><Upload size={14} />{busy ? '处理中…' : '上传现场照片'}<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); e.target.value = '' }} /></label>{draft.photo && <><button className="rail-photo" aria-label="在照片上标注问题位置" onClick={e => { const rect = image.current?.getBoundingClientRect(); if (!rect) return; patch({ annotation: { x: e.detail === 0 ? .5 : Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)), y: e.detail === 0 ? .5 : Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)), note: draft.annotation?.note || '' } }) }}><img ref={image} src={draft.photo} alt={draft.photoName || '现场证据照片'} />{draft.annotation && <span style={{ left: `${draft.annotation.x * 100}%`, top: `${draft.annotation.y * 100}%` }}>1</span>}</button><small>{draft.photoName}</small><button onClick={() => patch({ photo: '', photoName: '', annotation: null })}>移除本配置照片</button></>}{draft.annotation && <div className="rail-photo-controls"><label>标注说明 *<input maxLength={1000} value={draft.annotation.note} onChange={e => patch({ annotation: { ...draft.annotation!, note: e.target.value } })} /></label><label>水平位置<input type="range" min={0} max={1} step={.001} value={draft.annotation.x} onChange={e => patch({ annotation: { ...draft.annotation!, x: Number(e.target.value) } })} /></label><label>垂直位置<input type="range" min={0} max={1} step={.001} value={draft.annotation.y} onChange={e => patch({ annotation: { ...draft.annotation!, y: Number(e.target.value) } })} /></label><button onClick={() => patch({ annotation: null })}>清除标注</button></div>}</section><p className="rail-boundary">{sceneBoundary}</p></aside>
    </main>}
    {tab === 'browse' && <main className="rail-browse-view"><iframe ref={frame} title="六地区铁路数字站场" src={`${import.meta.env.BASE_URL}digital-factory-3d.html?instant=1&platform=1`} onLoad={initializeFrame} allow="fullscreen" /></main>}
    {tab === 'play' && applied && <main className="rail-player"><div className="rail-canvas"><iframe key={`${applied.savedAt}-${applied.region}`} ref={frame} title="铁路事故过程定性演示" src={`${import.meta.env.BASE_URL}digital-factory-3d.html?instant=1&scenario=1&region=${applied.region}`} onLoad={initializeFrame} allow="fullscreen" /><span className="rail-scene-badge">{sceneRegions[applied.region]} · 非实测布局 / 演示效果</span></div><aside className="rail-play-panel"><span className="rail-kicker">PROCESS / 过程与后果</span><h2>{applied.title}</h2><p>{sceneObjects[applied.zone]} · {sceneEvents[applied.event]}</p><div className="rail-stage-list">{sceneStages.map((s, i) => <button key={s} disabled={!ready} aria-current={stage === i ? 'step' : undefined} onClick={() => send({ type: 'rail-scene-command', command: 'seek', time: i * 6 })}><b>0{i + 1}</b><span>{s}</span>{stage === i && <small>当前</small>}</button>)}</div><section className="rail-linkage"><h3>平台危险源联动</h3><p>{applied.source ? `${applied.source.hazardCode} · ${applied.source.hazardName} / ${applied.source.stage} / ${applied.source.dimension}` : '未绑定评估 · 独立演练'}</p><p>{materialNames[applied.material]} · {applied.wind === '' ? '风况未知' : `风速 ${applied.wind} m/s`} · {applied.mitigated ? '防控措施对比' : '未施加对比措施'}</p></section><h3>{sceneStages[stage]}</h3><p>{stageExplanation(applied, stage)}</p><p>原因：{applied.cause || '待核实'}<br /><strong>{applied.causeConfirmed ? '填写人已确认' : '待核实 / 演练假设'}</strong></p><div className="rail-play-controls"><button disabled={!ready} onClick={() => send({ type: 'rail-scene-command', command: playback.playing ? 'pause' : 'play' })}>{playback.playing ? '暂停演示' : playback.time >= 24 ? '重新播放' : '播放演示'}</button><button disabled={!ready} onClick={() => send({ type: 'rail-scene-command', command: 'restart' })}><RotateCcw size={14} />重播</button><button disabled={!ready} onClick={() => send({ type: 'rail-scene-command', command: 'rate', rate: playback.rate === 1 ? 2 : playback.rate === 2 ? 4 : 1 })}>{playback.rate}×</button></div><label className="rail-timeline">过程进度 · {playback.time.toFixed(1)} / 24 秒<input aria-label="事故演示时间轴" disabled={!ready} type="range" min={0} max={24} step={.1} value={playback.time} onChange={e => send({ type: 'rail-scene-command', command: 'seek', time: Number(e.target.value) })} /></label>{!ready && <p role="status">场景加载中；若长时间未显示，请检查浏览器 WebGL 支持或返回配置重试。</p>}<p className="rail-boundary">{sceneBoundary}</p><button className="rail-primary" onClick={() => changeTab('report')}>查看参数与评估资料 →</button>{hasSource && <button onClick={() => onOpenSource(applied.source!.id)}>返回来源评估记录</button>}</aside></main>}
    {tab === 'report' && applied && <main className="rail-report"><section className="rail-card"><span className="rail-kicker">REPORT / 已应用配置快照</span><h2>{applied.title}</h2><p>以下内容来自 {applied.savedAt} 的配置快照。修改草稿后需重新应用，才能更新演示和导出资料。</p><div className="rail-inline-actions"><button disabled={busy} onClick={() => void exportFile('docx')}><Download size={15} />下载 Word .docx</button><button disabled={busy} onClick={() => void exportFile('xlsx')}><Download size={15} />下载 Excel .xlsx</button><button disabled={busy} onClick={() => void exportFile('json')}>下载配置 JSON</button>{hasSource && <button onClick={() => onOpenSource(applied.source!.id)}>返回来源记录</button>}</div><dl className="rail-report-facts">{sceneFacts(applied).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><h3>过程与后果说明</h3>{sceneStages.map((s, i) => <section key={s}><h4>0{i + 1} / {s}</h4><p>{stageExplanation(applied, i)}</p></section>)}{applied.photo && <figure><div className="rail-report-photo"><img src={applied.photo} alt="配置快照中的现场照片" />{applied.annotation && <span style={{ left: `${applied.annotation.x * 100}%`, top: `${applied.annotation.y * 100}%` }}>1</span>}</div><figcaption>{applied.photoName} · {applied.annotation?.note || '未标注'}</figcaption></figure>}</section></main>}
  </section>
}
