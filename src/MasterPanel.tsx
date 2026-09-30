import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Plus, Scale, Settings2, ShieldCheck, X } from 'lucide-react'
import { dynamicItems, staticItems } from './inspection'

type Scope = '静态' | '动态' | '通用'
type MasterRecord = { code: string; name: string; category: string; scope: Scope; version: string; status: string; description: string; requirement: string }

const kindMeta = [
  { title: '评估指标库', desc: '静态 31 项 + 动态 61 项，覆盖站台设施与进场、装卸、搬运作业', icon: ShieldCheck, key: '评估指标库' },
  { title: '法规依据库', desc: '每条检查项对应的法规、标准与规范条款', icon: Scale, key: '法规依据库' },
  { title: '风险规则配置', desc: 'R = L × C 分级阈值与“就高从险”等判定规则', icon: Settings2, key: '风险规则配置' },
  { title: '整改阶段模板', desc: '未整改 → 整改中 → 待复核 → 复核中 → 已闭环', icon: BookOpen, key: '整改阶段模板' },
]

const initialRecords: MasterRecord[] = [
  { code: 'ZB-101', name: '站台结构与平面布局指标', category: '评估指标库', scope: '静态', version: 'V1.0.3', status: '已生效', description: '对应静态自查 S-01 至 S-08', requirement: '站台面平整、分区隔离、消防车道与疏散通道畅通' },
  { code: 'ZB-102', name: '轨道与警示标识指标', category: '评估指标库', scope: '静态', version: 'V1.0.3', status: '已生效', description: '对应静态自查 S-09 至 S-16', requirement: '轨道几何状态达标，危险货物标识与警示标志清晰' },
  { code: 'ZB-103', name: '安全距离与设施设备指标', category: '评估指标库', scope: '静态', version: 'V1.0.3', status: '已生效', description: '对应静态自查 S-17 至 S-24', requirement: '防火间距合规，静电接地、防爆电气与计量仪表在有效期内' },
  { code: 'ZB-104', name: '监控报警与消防应急指标', category: '评估指标库', scope: '静态', version: 'V1.0.3', status: '已生效', description: '对应静态自查 S-25 至 S-31', requirement: '报警系统可用，灭火器材与应急物资配备到位' },
  { code: 'ZB-201', name: '进场环节动态指标', category: '评估指标库', scope: '动态', version: 'V1.0.2', status: '已生效', description: '对应动态检查 D-01 至 D-17', requirement: '资质核验、包装检查、车辆与罐车状态、气体初检全部落实' },
  { code: 'ZB-202', name: '装卸环节动态指标', category: '评估指标库', scope: '动态', version: 'V1.0.2', status: '已生效', description: '对应动态检查 D-18 至 D-41', requirement: '装卸设备、温度压力与浓度监测、静电接地、警戒监护逐项确认' },
  { code: 'ZB-203', name: '搬运与仓储动态指标', category: '评估指标库', scope: '动态', version: 'V1.0.2', status: '已生效', description: '对应动态检查 D-42 至 D-61', requirement: '搬运路线、机械选型、堆码隔离、通风与出入库登记符合要求' },
  { code: 'FG-301', name: '《铁路危险货物运输安全监督管理规定》', category: '法规依据库', scope: '通用', version: 'V1.0.2', status: '已生效', description: '危险货物运输作业与安全管理的部门规章', requirement: '作为静态 12 项、动态 26 项的判定依据' },
  { code: 'FG-302', name: '《铁路安全管理条例》', category: '法规依据库', scope: '通用', version: 'V1.0.2', status: '已生效', description: '铁路运输安全管理的行政法规', requirement: '匿报、谎报危险货物品名等行为的查处依据' },
  { code: 'FG-303', name: '《危险货物运输包装通用技术条件》', category: '法规依据库', scope: '通用', version: 'V1.0.1', status: '已生效', description: '包装类别、标识与堆码要求', requirement: '包装类别须与货物危险等级匹配' },
  { code: 'FG-304', name: '《建筑设计防火规范》与《防止静电事故通用导则》', category: '法规依据库', scope: '通用', version: 'V1.0.1', status: '已生效', description: '防火间距、消防车道、静电接地要求', requirement: '安全距离与接地电阻检测须在有效期内' },
  { code: 'GZ-401', name: '风险矩阵分级阈值', category: '风险规则配置', scope: '通用', version: '待确认', status: '待业务确认', description: 'R = 可能性 L × 严重度 C', requirement: 'R ≥ 16 重大、9–15 较大、4–8 一般、≤ 3 低（计划书口径与现有矩阵对 R = 15 的分级存在差异，待确认）' },
  { code: 'GZ-402', name: '静态不通过不开展动态评估', category: '风险规则配置', scope: '通用', version: 'V1.0.2', status: '已生效', description: '避免无效评估', requirement: '静态自查存在未落实项时，直接取静态最高档并跳过动态评分' },
  { code: 'GZ-403', name: '综合评分权重', category: '风险规则配置', scope: '通用', version: '待确认', status: '待业务确认', description: '综合得分 = 0.4 × 静态 + 0.6 × 动态', requirement: '权重与“就高从险”原则需业务负责人最终确认' },
  { code: 'MB-501', name: '整改进度五阶段模板', category: '整改阶段模板', scope: '通用', version: 'V1.0.1', status: '已生效', description: '未整改 → 整改中 → 待复核 → 复核中 → 已闭环', requirement: '每个阶段需留存责任人与时间记录，闭环需双人复核' },
  { code: 'MB-502', name: '高风险问题整改要求', category: '整改阶段模板', scope: '通用', version: 'V1.0.1', status: '已生效', description: '重大、较大风险问题处置要求', requirement: '需上传整改后证据，安全工程师技术复核 + 项目经理管理确认' },
]

export function MasterPanel({ onNotify }: { onNotify: (message: string) => void }) {
  const [records, setRecords] = useState(initialRecords)
  const [selectedKind, setSelectedKind] = useState<string | null>(null)
  const [detail, setDetail] = useState<MasterRecord | null>(null)
  const [keyword, setKeyword] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [draft, setDraft] = useState<MasterRecord>({ code: '', name: '', category: '评估指标库', scope: '静态', version: 'V1.0.0', status: '待审核', description: '', requirement: '' })

  const list = useMemo(() => {
    const scoped = selectedKind ? records.filter((record) => record.category === selectedKind) : records
    if (!keyword.trim()) return scoped
    return scoped.filter((record) => `${record.code}${record.name}${record.description}${record.requirement}`.includes(keyword.trim()))
  }, [records, selectedKind, keyword])

  const indicatorGroups = useMemo(() => {
    const staticGroups = new Map<string, typeof staticItems>()
    for (const item of staticItems) staticGroups.set(item.category, [...(staticGroups.get(item.category) ?? []), item])
    const dynamicGroups = new Map<string, typeof dynamicItems>()
    for (const item of dynamicItems) {
      const key = `${item.stage}环节`
      dynamicGroups.set(key, [...(dynamicGroups.get(key) ?? []), item])
    }
    return { staticGroups: [...staticGroups.entries()], dynamicGroups: [...dynamicGroups.entries()] }
  }, [])

  const create = () => {
    if (!draft.code.trim() || !draft.name.trim()) { onNotify('请填写编码与名称'); return }
    setRecords((current) => [...current, draft])
    setDraft({ code: '', name: '', category: '评估指标库', scope: '静态', version: 'V1.0.0', status: '待审核', description: '', requirement: '' })
    setShowEditor(false)
    onNotify('配置已新增到当前列表（演示环境不落库）')
  }

  return <div className="content">
    <div className="page-heading">
      <div>
        <div className="eyebrow">指标 · 规则 · 模板</div>
        <h1>基础资料</h1>
        <p>统一维护评估指标、法规依据、风险规则与整改模板；指标库同时包含静态 31 项与动态 61 项，点击“查看”可查看明细</p>
      </div>
      <div className="heading-actions"><button className="button primary" onClick={() => { setShowEditor(true); onNotify('填写后新增到当前配置列表') }}><Plus size={17} />新增配置</button></div>
    </div>

    {!selectedKind && <div className="master-grid">
      {kindMeta.map(({ title, desc, icon: Icon, key }) => {
        const count = records.filter((record) => record.category === key).length
        return <article className="master-card" key={title}>
          <div className="master-card-icon"><Icon size={22} /></div>
          <h3>{title}</h3>
          <p>{desc}</p>
          <div className="master-card-foot">
            <span>{count} 项配置</span>
            <button className="row-action" onClick={() => { setSelectedKind(key); setKeyword(''); onNotify(`已进入${title}`) }}>查看配置 <ArrowRight size={13} /></button>
          </div>
        </article>
      })}
    </div>}

    {selectedKind && <div className="panel master-list">
      <div className="list-toolbar">
        <div className="filter-group">
          <button className="row-action" onClick={() => { setSelectedKind(null); setKeyword('') }}>返回资料分类</button>
          <span className="vertical-rule" />
          <strong className="master-list-title">{selectedKind}</strong>
          <input className="master-search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索编码、名称或要求" />
        </div>
        <div className="toolbar-info">共 <b>{list.length}</b> 项</div>
      </div>
      <div className="table-scroll"><table className="check-table"><thead><tr><th>编码</th><th>名称</th><th>适用</th><th>版本</th><th>状态</th><th>说明</th><th>操作</th></tr></thead><tbody>
        {list.map((record) => <tr key={record.code}>
          <td>{record.code}</td>
          <td><strong>{record.name}</strong></td>
          <td><span className={`scope-tag scope-${record.scope === '静态' ? 'static' : record.scope === '动态' ? 'dynamic' : 'common'}`}>{record.scope}</span></td>
          <td>{record.version}</td>
          <td>{record.status}</td>
          <td>{record.description}</td>
          <td><button className="row-action" onClick={() => setDetail(record)}>查看</button></td>
        </tr>)}
      </tbody></table></div>
    </div>}

    {detail && <div className="modal-backdrop" role="presentation">
      <section className="modal master-detail" role="dialog" aria-modal="true" aria-label="基础资料详情">
        <div className="modal-header">
          <div><span className="eyebrow">{detail.category}</span><h2>{detail.name}</h2></div>
          <button className="icon-btn" aria-label="关闭" onClick={() => setDetail(null)}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <table className="facts-table"><tbody>
            <tr><th>编码</th><td>{detail.code}</td></tr>
            <tr><th>类别</th><td>{detail.category}</td></tr>
            <tr><th>适用范围</th><td>{detail.scope}指标</td></tr>
            <tr><th>版本 / 状态</th><td>{detail.version} · {detail.status}</td></tr>
            <tr><th>说明</th><td>{detail.description}</td></tr>
            <tr><th>判定要求</th><td>{detail.requirement}</td></tr>
          </tbody></table>

          {detail.category === '评估指标库' && <div className="indicator-blocks">
            <div className="indicator-block">
              <h3>静态自查项（{staticItems.length} 项）</h3>
              {indicatorGroups.staticGroups.map(([group, items]) => <div className="indicator-group" key={group}>
                <strong>{group}（{items.length} 项）</strong>
                <ul>{items.map((item) => <li key={item.code}><b>{item.code}</b>{item.name}<small>依据：{item.basis}</small></li>)}</ul>
              </div>)}
            </div>
            <div className="indicator-block">
              <h3>动态作业检查项（{dynamicItems.length} 项）</h3>
              {indicatorGroups.dynamicGroups.map(([group, items]) => <div className="indicator-group" key={group}>
                <strong>{group}（{items.length} 项）</strong>
                <ul>{items.map((item) => <li key={item.code}><b>{item.code}</b>{item.name}<small>{item.dimension}维度 · 依据：{item.basis}</small></li>)}</ul>
              </div>)}
            </div>
          </div>}
        </div>
        <div className="modal-actions">
          <span className="modal-hint">基础资料变更需经业务负责人确认后生效（演示环境仅在当前页面生效）</span>
          <button className="button secondary" onClick={() => setDetail(null)}>关闭</button>
        </div>
      </section>
    </div>}

    {showEditor && <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-label="新增配置">
        <div className="modal-header">
          <div><span className="eyebrow">NEW CONFIG</span><h2>新增配置</h2></div>
          <button className="icon-btn" aria-label="关闭" onClick={() => setShowEditor(false)}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <label><span>编码</span><input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} placeholder="如 ZB-105" /></label>
            <label><span>名称</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label><span>类别</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{kindMeta.map((kind) => <option key={kind.key}>{kind.key}</option>)}</select></label>
            <label><span>适用范围</span><select value={draft.scope} onChange={(event) => setDraft({ ...draft, scope: event.target.value as Scope })}>{['静态', '动态', '通用'].map((scope) => <option key={scope}>{scope}</option>)}</select></label>
            <label><span>版本</span><input value={draft.version} onChange={(event) => setDraft({ ...draft, version: event.target.value })} /></label>
            <label><span>状态</span><input value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} /></label>
            <label><span>说明</span><input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            <label><span>判定要求</span><input value={draft.requirement} onChange={(event) => setDraft({ ...draft, requirement: event.target.value })} /></label>
          </div>
        </div>
        <div className="modal-actions">
          <span className="modal-hint">新增内容会立即出现在列表中</span>
          <div><button className="button secondary" onClick={() => setShowEditor(false)}>取消</button><button className="button primary" onClick={create}><Plus size={16} />保存</button></div>
        </div>
      </section>
    </div>}
  </div>
}
