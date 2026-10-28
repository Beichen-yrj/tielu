import { createRoot } from 'react-dom/client'
import './index.css'
import { useState } from 'react'
import { PortalSite } from './PortalSite.tsx'

const root = createRoot(document.getElementById('root')!)

export function PortalEntry() {
  const [openingPlatform, setOpeningPlatform] = useState(false)

  const enterPlatform = async () => {
    if (openingPlatform) return
    setOpeningPlatform(true)
    try {
      const { default: App } = await import('./App.tsx')
      root.render(<App startAtEntry />)
    } catch (error) {
      setOpeningPlatform(false)
      throw error
    }
  }

  return <PortalSite onEnter={enterPlatform} />
}

root.render(<PortalEntry />)
