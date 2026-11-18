import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TrainFront } from 'lucide-react'
import type { HazardAssessmentRecord } from './api/hazardAssessments'
import { RailScenarioWorkspace } from './RailScenarioWorkspace'
import './SimulationSwitch.css'

export function SimulationSwitch({ records, sourceLabel, userKey, onOpenSource }: { records: HazardAssessmentRecord[]; sourceLabel: string; userKey: string; onOpenSource: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [initialId, setInitialId] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => { setOpen(false); trigger.current?.focus() }, [])
  useEffect(() => {
    const receive = (event: Event) => {
      const id = (event as CustomEvent).detail
      if (typeof id !== 'string' || !records.some(r => r.id === id)) return
      setInitialId(id); setOpen(true)
    }
    window.addEventListener('rail-open-scenario', receive)
    return () => window.removeEventListener('rail-open-scenario', receive)
  }, [records])
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    const root = document.getElementById('root')
    const previousInert = root?.inert ?? false
    if (root) root.inert = true
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'Tab') {
        const controls = Array.from(document.querySelectorAll<HTMLElement>('.rail-workspace button:not(:disabled),.rail-workspace input:not(:disabled),.rail-workspace select,.rail-workspace textarea,.rail-workspace iframe')).filter(el => el.getClientRects().length && el.offsetWidth > 1)
        const first = controls[0], last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    window.addEventListener('keydown', keydown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.documentElement.style.overflow = previousRootOverflow
      if (root) root.inert = previousInert
      window.removeEventListener('keydown', keydown)
    }
  }, [open, close])
  return <>
    <button ref={trigger} type="button" className="simulation-switch" onClick={() => { setInitialId(''); setOpen(true) }} title="评估数据带入、问题定位与事故过程演示"><TrainFront size={15} /><span>铁路数字站场</span><small>情景演示</small></button>
    {open && createPortal(<RailScenarioWorkspace records={records} sourceLabel={sourceLabel} userKey={userKey} initialId={initialId} onClose={close} onOpenSource={id => { close(); onOpenSource(id) }} />, document.body)}
  </>
}
