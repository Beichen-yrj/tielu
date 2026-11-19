import { useEffect, useRef, useState } from 'react'
import { adviseScenario, materialTypes as materialNames } from './railHazardModel'
import { askScenarioAi, type SceneSuggestion } from './api/scenarioAi'
import { sceneEvents, sceneObjects, type SceneDraft } from './railScenario'

export function RailSceneAdvisor({ draft, onApply }: { draft: SceneDraft; onApply: (patch: Partial<SceneDraft>) => void }) {
  const [result, setResult] = useState<{ key: string; data: SceneSuggestion } | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const latest = useRef(draft)
  useEffect(() => { latest.current = draft }, [draft])
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const key = JSON.stringify(draft)
  const suggestion = result?.key === key ? result.data : null
  const analyze = async () => {
    controller.current?.abort(); const request = new AbortController(); controller.current = request
    setPending(true); setError(''); setResult(null)
    const timer = setTimeout(() => request.abort(), 45000)
    try {
      const data = await askScenarioAi(draft, request.signal)
      if (JSON.stringify(latest.current) !== key) { setError('分析期间配置已变化，请重新分析当前草稿。'); return }
      setResult({ key, data })
    } catch (e) { if (controller.current === request) setError(request.signal.aborted ? '分析已取消或超时；未应用任何建议。' : e instanceof Error ? e.message : '在线 AI 不可用') }
    finally { clearTimeout(timer); if (controller.current === request) setPending(false) }
  }
  return <section className="rail-card rail-advisor"><span className="rail-kicker">AI / 危险源驱动情景</span><h2>AI 情景助手</h2><p>结合参考隐患目录、危险源、货物、检测标准和整改状态分析问题属性及后果。先审核，再应用到场景。</p>
    <div className="rail-inline-actions"><button disabled={pending || !draft.problem.trim()} onClick={() => { setError(''); setResult({ key, data: adviseScenario(draft) }) }}>本地规则分析</button><button className="rail-primary" disabled={pending || !draft.problem.trim()} onClick={() => void analyze()}>{pending ? 'AI 正在分析…' : '在线 AI 分析'}</button>{pending && <button onClick={() => controller.current?.abort()}>取消分析</button>}</div>
    <small>本地规则可离线运行；在线 AI 使用平台已有 DeepSeek 后端。此处不发送照片。</small>
    {error && <p className="rail-ai-error" role="alert">{error}</p>}
    {suggestion && <div className="rail-advice-result"><h3>{suggestion.origin === 'deepseek' ? `在线 AI · ${suggestion.model}` : '本地规则结果 · 非在线 AI'}</h3><p>{suggestion.summary}</p><p>{suggestion.problemType}类问题 · {suggestion.issue}</p><p>{sceneObjects[suggestion.zone]} / {sceneEvents[suggestion.event]} / {materialNames[suggestion.material]}</p><h3>后果情形</h3><p>{suggestion.consequence}</p><p className="rail-alert-copy">弹幕：{suggestion.caption}</p><h3>建模提示词</h3><p className="rail-model-prompt">{suggestion.modelPrompt}</p><h3>关联依据</h3><ul>{suggestion.reasons.map((v, i) => <li key={i}>{v}</li>)}</ul><h3>待补条件</h3><ul>{suggestion.missing.map((v, i) => <li key={i}>{v}</li>)}</ul><h3>防控与复核建议</h3><ul>{suggestion.actions.map((v, i) => <li key={i}>{v}</li>)}</ul><button onClick={() => { onApply({ zone: suggestion.zone, event: suggestion.event, material: suggestion.material, problemType: suggestion.problemType, issue: suggestion.issue, consequence: suggestion.consequence, caption: suggestion.caption, modelPrompt: suggestion.modelPrompt, mappingConfirmed: false, ignitionConfirmed: false, accumulationConfirmed: false }); setResult(null) }}>采用情景建议，重新核对条件</button></div>}
  </section>
}
