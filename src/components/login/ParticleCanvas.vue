<template>
  <canvas ref="canvasRef" class="particle-canvas"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 粒子类
class Particle {
  x: number = 0
  y: number = 0
  size: number = 0
  speedX: number = 0
  speedY: number = 0
  opacity: number = 0
  hue: number = 0
  phase: number = 0
  twinkleSpeed: number = 0

  constructor(
    private width: number,
    private height: number,
  ) {
    this.reset()
  }

  reset() {
    this.x = Math.random() * this.width
    this.y = Math.random() * this.height
    this.size = Math.random() * 2 + 1
    this.speedX = (Math.random() - 0.5) * 0.25
    this.speedY = (Math.random() - 0.5) * 0.25
    this.opacity = Math.random() * 0.38 + 0.42
    this.hue = 196 + Math.random() * 32
    this.phase = Math.random() * Math.PI * 2
    this.twinkleSpeed = 0.018 + Math.random() * 0.032
  }

  update(mouseX: number, mouseY: number) {
    this.x += this.speedX
    this.y += this.speedY
    this.phase += this.twinkleSpeed

    // 鼠标交互
    const dx = mouseX - this.x
    const dy = mouseY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 150) {
      const force = (150 - dist) / 150
      this.x -= dx * force * 0.02
      this.y -= dy * force * 0.02
    }

    // 边界检查
    if (this.x < 0 || this.x > this.width || this.y < 0 || this.y > this.height) {
      this.reset()
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const safeSize = Math.max(0.1, this.size)
    const twinkle = 0.62 + Math.sin(this.phase) * 0.26 + Math.sin(this.phase * 2.3) * 0.12
    const safeOpacity = Math.min(1, Math.max(0.16, this.opacity * twinkle))
    const twinkleSize = safeSize * (0.9 + twinkle * 0.18)
    const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, safeSize * 5.5)
    glow.addColorStop(0, `rgba(29, 78, 216, ${safeOpacity * 0.42})`)
    glow.addColorStop(1, `rgba(29, 78, 216, 0)`)
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(this.x, this.y, safeSize * 5.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(this.x, this.y, twinkleSize, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(29, 78, 216, ${safeOpacity})`
    ctx.fill()
  }
}

interface SignalWave {
  radius: number
  alpha: number
  speed: number
}

interface FlowDot {
  from: Particle
  to: Particle
  progress: number
  speed: number
  size: number
  hue: number
}

const canvasRef = ref<HTMLCanvasElement>()
let animationId: number
let particles: Particle[] = []
let waves: SignalWave[] = []
let flowDots: FlowDot[] = []
let width = 0
let height = 0
let mouseX = 0
let mouseY = 0
let ctx: CanvasRenderingContext2D
let frame = 0
let corePulse = 0
let waveTimer = 0

const getSignalCenter = () => ({
  x: width * (width <= 960 ? 0.5 : 0.34),
  y: height * (width <= 960 ? 0.26 : 0.48),
})

const initCanvas = () => {
  if (!canvasRef.value) return

  width = window.innerWidth
  height = window.innerHeight
  canvasRef.value.width = width
  canvasRef.value.height = height
  ctx = canvasRef.value.getContext('2d')!
}

const createParticles = () => {
  const count = Math.min(112, Math.floor((width * height) / 13500))
  particles = []
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(width, height))
  }
  waves = []
  flowDots = []
}

const drawConnections = () => {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 120) {
        const opacity = (1 - dist / 120) * 0.24
        ctx.beginPath()
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        ctx.strokeStyle = `rgba(29, 78, 216, ${opacity})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }
  }
}

const addFlowDots = () => {
  if (particles.length < 2 || frame % 34 !== 0 || flowDots.length > 22) return

  for (let attempt = 0; attempt < 16; attempt++) {
    const from = particles[Math.floor(Math.random() * particles.length)]
    const to = particles[Math.floor(Math.random() * particles.length)]
    if (from === to) continue

    const dx = from.x - to.x
    const dy = from.y - to.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 42 && dist < 140) {
      flowDots.push({
        from,
        to,
        progress: 0,
        speed: 0.008 + Math.random() * 0.012,
        size: 1.8 + Math.random() * 1.4,
        hue: 221,
      })
      if (Math.random() > 0.45) return
    }
  }
}

const drawFlowDots = () => {
  addFlowDots()

  flowDots = flowDots.filter((dot) => {
    dot.progress += dot.speed
    if (dot.progress >= 1) return false

    const x = dot.from.x + (dot.to.x - dot.from.x) * dot.progress
    const y = dot.from.y + (dot.to.y - dot.from.y) * dot.progress
    const alpha = Math.sin(dot.progress * Math.PI)
    const glow = ctx.createRadialGradient(x, y, 0, x, y, dot.size * 6)

    glow.addColorStop(0, `rgba(29, 78, 216, ${alpha * 0.7})`)
    glow.addColorStop(1, `rgba(29, 78, 216, 0)`)
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y, dot.size * 6, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.92})`
    ctx.beginPath()
    ctx.arc(x, y, dot.size, 0, Math.PI * 2)
    ctx.fill()

    return true
  })
}

const drawSignalCore = (cx: number, cy: number) => {
  const pulse = Math.sin(corePulse) * 0.5 + 0.5
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 104 + pulse * 28)
  halo.addColorStop(0, `rgba(37, 99, 235, ${0.22 + pulse * 0.07})`)
  halo.addColorStop(0.45, 'rgba(6, 182, 212, 0.14)')
  halo.addColorStop(1, 'rgba(6, 182, 212, 0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(cx, cy, 104 + pulse * 28, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(frame * 0.007)
  ctx.beginPath()
  ctx.arc(0, 0, 42 + pulse * 5, 0, Math.PI * 1.28)
  ctx.strokeStyle = `rgba(37, 99, 235, ${0.5 + pulse * 0.18})`
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-frame * 0.01)
  ctx.beginPath()
  ctx.arc(0, 0, 62 + pulse * 7, 0.45, Math.PI * 0.95 + 0.45)
  ctx.strokeStyle = `rgba(6, 182, 212, ${0.38 + pulse * 0.16})`
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(frame * 0.004)
  ctx.setLineDash([5, 8])
  ctx.beginPath()
  ctx.arc(0, 0, 78 + pulse * 9, Math.PI, Math.PI * 1.62)
  ctx.strokeStyle = `rgba(37, 99, 235, ${0.2 + pulse * 0.12})`
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  const core = ctx.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, 23 + pulse * 6)
  core.addColorStop(0, '#e0f2fe')
  core.addColorStop(0.18, '#bae6fd')
  core.addColorStop(0.42, '#7dd3fc')
  core.addColorStop(0.74, '#38bdf8')
  core.addColorStop(1, 'rgba(56, 189, 248, 0)')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(cx, cy, 23 + pulse * 6, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = `rgba(224, 242, 254, ${0.94 + pulse * 0.06})`
  ctx.beginPath()
  ctx.arc(cx - 3, cy - 3, 5.2, 0, Math.PI * 2)
  ctx.fill()
}

const drawSignalWaves = (cx: number, cy: number) => {
  waves = waves.filter((wave) => {
    wave.radius += wave.speed
    wave.alpha -= 0.0045

    if (wave.alpha <= 0) return false

    ctx.beginPath()
    ctx.arc(cx, cy, wave.radius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(37, 99, 235, ${wave.alpha * 0.2})`
    ctx.lineWidth = 1.2
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, wave.radius * 0.72, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(6, 182, 212, ${wave.alpha * 0.12})`
    ctx.lineWidth = 0.8
    ctx.stroke()

    return true
  })
}

const animate = () => {
  ctx.clearRect(0, 0, width, height)

  const { x: cx, y: cy } = getSignalCenter()
  corePulse += 0.018
  waveTimer++

  if (waveTimer % 105 === 0) {
    waves.push({ radius: 22, alpha: 1, speed: 1.35 + Math.random() * 0.45 })
  }

  drawSignalWaves(cx, cy)
  drawSignalCore(cx, cy)

  particles.forEach((p) => {
    p.update(mouseX, mouseY)
    p.draw(ctx)
  })

  drawConnections()
  drawFlowDots()
  frame++
  animationId = requestAnimationFrame(animate)
}

const handleResize = () => {
  initCanvas()
  createParticles()
}

const handleMouseMove = (e: MouseEvent) => {
  mouseX = e.clientX
  mouseY = e.clientY
}

const checkReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

onMounted(() => {
  initCanvas()
  createParticles()

  if (!checkReducedMotion()) {
    animate()
  }

  window.addEventListener('resize', handleResize)
  window.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('mousemove', handleMouseMove)
})
</script>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}
</style>
