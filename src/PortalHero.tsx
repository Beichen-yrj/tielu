import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const slides = [
  { name: 'hero-locomotive', label: '铁路货运列车驶出隧道' },
  { name: 'hero-heavy-transport', label: '铁路大型装备运输作业' },
  { name: 'hero-container-yard', label: '铁路集装箱场站装卸作业' },
]

export function PortalHero({ isHome, children }: { isHome: boolean; children: ReactNode }) {
  const header = useRef<HTMLElement>(null)
  const [requested, setRequested] = useState(0)
  const [current, setCurrent] = useState(0)
  const [loaded, setLoaded] = useState([0])
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)
  const [foreground, setForeground] = useState(!document.hidden)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    if (header.current) observer.observe(header.current)
    const onVisibility = () => setForeground(!document.hidden)
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = () => setReducedMotion(media.matches)
    document.addEventListener('visibilitychange', onVisibility)
    media.addEventListener('change', onMotion)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      media.removeEventListener('change', onMotion)
    }
  }, [])

  useEffect(() => {
    if (!isHome || hovered || !visible || !foreground || reducedMotion) return
    const timer = window.setInterval(() => setRequested((index) => (index + 1) % slides.length), 6200)
    return () => window.clearInterval(timer)
  }, [isHome, hovered, visible, foreground, reducedMotion])

  useEffect(() => {
    let cancelled = false
    const image = new Image()
    const width = window.matchMedia('(max-width: 760px)').matches ? 960 : 1600
    image.src = `/portal/${slides[isHome ? requested : 0].name}-${width}.webp`
    // Keep the old slide visible until the next image is downloaded and decoded.
    void image.decode().then(() => {
      if (cancelled) return
      const next = isHome ? requested : 0
      setLoaded((indices) => indices.includes(next) ? indices : [...indices, next])
      setCurrent(next)
    }).catch(() => { /* Keep the last working slide; the next selection can retry. */ })
    return () => { cancelled = true }
  }, [isHome, requested])

  const displayed = isHome ? current : 0
  return <header
    ref={header}
    className={`portal-hero ${isHome ? '' : 'portal-sub-hero'}`}
    onMouseEnter={() => { if (window.matchMedia('(hover: hover)').matches) setHovered(true) }}
    onMouseLeave={() => setHovered(false)}
  >
    <div className="portal-hero-media" aria-hidden="true">
      {loaded.map((index) => <picture key={slides[index].name} className={index === displayed ? 'active' : ''}>
        <source media="(max-width: 760px)" srcSet={`/portal/${slides[index].name}-960.webp`} />
        <img src={`/portal/${slides[index].name}-1600.webp`} alt="" decoding="async" fetchPriority={index === 0 ? 'high' : 'auto'} />
      </picture>)}
    </div>
    {children}
    {isHome && <div className="portal-hero-controls" aria-label="首屏图片轮播控制">
      <button type="button" className="portal-hero-arrow" aria-label="上一张图片" onClick={() => setRequested((index) => (index - 1 + slides.length) % slides.length)}><ArrowLeft size={17} /></button>
      <div className="portal-hero-dots">{slides.map((slide, index) => <button type="button" key={slide.name} className={`portal-hero-dot ${index === current ? 'active' : ''}`} aria-label={`切换到第 ${index + 1} 张：${slide.label}`} aria-current={index === current ? 'true' : undefined} onClick={() => setRequested(index)} />)}</div>
      <button type="button" className="portal-hero-arrow" aria-label="下一张图片" onClick={() => setRequested((index) => (index + 1) % slides.length)}><ArrowRight size={17} /></button>
      <span className="portal-hero-caption">{slides[current].label}</span>
    </div>}
  </header>
}
