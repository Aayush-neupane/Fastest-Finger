// Dependency-free confetti burst. Respects reduced motion. No cleanup
// needed beyond the frame loop — the canvas removes itself when done.
const COLORS = ['#facc15', '#f472b6', '#38bdf8', '#34d399', '#ffffff']

export function confetti(count = 140): void {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  } catch {
    return
  }
  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:200'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(window.innerWidth * dpr)
  canvas.height = Math.floor(window.innerHeight * dpr)

  interface Bit {
    x: number
    y: number
    vx: number
    vy: number
    s: number
    r: number
    vr: number
    c: string
    life: number
  }
  const bits: Bit[] = []
  for (let i = 0; i < count; i++) {
    bits.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
      y: window.innerHeight * 0.32,
      vx: (Math.random() - 0.5) * 11,
      vy: -(4 + Math.random() * 8),
      s: 4 + Math.random() * 6,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: COLORS[i % COLORS.length],
      life: 1,
    })
  }
  let raf = 0
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)
    let alive = false
    for (const b of bits) {
      b.vy += 0.28
      b.vx *= 0.99
      b.x += b.vx
      b.y += b.vy
      b.r += b.vr
      b.life -= 0.008
      if (b.life <= 0 || b.y > window.innerHeight + 20) continue
      alive = true
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(b.r)
      ctx.globalAlpha = Math.max(0, Math.min(1, b.life * 1.6))
      ctx.fillStyle = b.c
      ctx.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * 0.6)
      ctx.restore()
    }
    ctx.restore()
    if (alive) {
      raf = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(raf)
      canvas.remove()
    }
  }
  raf = requestAnimationFrame(tick)
}
