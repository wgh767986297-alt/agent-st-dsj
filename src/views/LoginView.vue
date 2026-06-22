<template>
  <div class="login-root">
    <!-- ===== 开场遮罩 ===== -->
    <div class="intro" :class="{ out: introOut }" aria-hidden="true">
      <svg width="110" height="110" viewBox="0 0 100 100" fill="none" style="margin-bottom: 0">
        <!-- 外圆 -->
        <circle
          class="sdraw"
          id="ic0"
          cx="50"
          cy="50"
          r="44"
          stroke="#0e8a7d"
          stroke-width=".7"
          opacity=".2"
          style="--len: 277; --dur: 0.8s"
        />
        <!-- 轨道1 -->
        <ellipse
          class="sdraw"
          id="ic1"
          cx="50"
          cy="50"
          rx="40"
          ry="15"
          stroke="#0e8a7d"
          stroke-width="1.3"
          transform="rotate(0 50 50)"
          style="--len: 176; --dur: 0.7s"
        />
        <!-- 轨道2 -->
        <ellipse
          class="sdraw"
          id="ic2"
          cx="50"
          cy="50"
          rx="40"
          ry="15"
          stroke="#0e8a7d"
          stroke-width="1.3"
          transform="rotate(60 50 50)"
          style="--len: 176; --dur: 0.7s"
        />
        <!-- 轨道3 -->
        <ellipse
          class="sdraw"
          id="ic3"
          cx="50"
          cy="50"
          rx="40"
          ry="15"
          stroke="#0e8a7d"
          stroke-width="1.3"
          transform="rotate(-60 50 50)"
          style="--len: 176; --dur: 0.7s"
        />
        <!-- 中心点 -->
        <circle class="cdot" id="ic4" cx="50" cy="50" r="5" fill="#0e8a7d" />
        <!-- 轨道点1 -->
        <circle class="sdot" id="ic5" cx="90" cy="50" r="3" fill="#0e8a7d" />
        <!-- 轨道点2 -->
        <circle class="sdot" id="ic6" cx="30" cy="28" r="3" fill="#0e8a7d" />
        <!-- 轨道点3 -->
        <circle class="sdot" id="ic7" cx="30" cy="72" r="3" fill="#0e8a7d" />
        <!-- 脉冲波 -->
        <circle class="pulse-r" id="ip1" cx="50" cy="50" r="4" />
        <circle class="pulse-r" id="ip2" cx="50" cy="50" r="4" />
        <circle class="pulse-r" id="ip3" cx="50" cy="50" r="4" />
      </svg>
      <div class="i-brand" id="iBrand">苏小智</div>
      <div class="i-line" id="iLine"></div>
      <div class="i-sub" id="iSub">AI 智能体平台</div>
    </div>

    <!-- 柔和光斑（CSS 层） -->
    <div class="bg-orbs" aria-hidden="true">
      <div class="bg-orb orb1"></div>
      <div class="bg-orb orb2"></div>
      <div class="bg-orb orb3"></div>
    </div>

    <!-- 流线画布 -->
    <canvas ref="streamCanvas" class="stream-canvas" aria-hidden="true"></canvas>

    <!-- Toast 通知 -->
    <div class="toast-container" id="toastContainer"></div>

    <!-- 登录页 -->
    <div class="login-page" :class="{ show: showLogin }">
      <main class="auth-container">
        <div class="login-card">
          <div class="card-bar"></div>

          <!-- Logo 区域 -->
          <div class="card-icon stg" data-d="0" id="cardIco">
            <img :src="iconLogo" alt="Logo" class="logo-mark-img" />
          </div>
          <div class="card-brand stg" data-d="60">苏小智</div>
          <div class="card-welcome stg" data-d="130">登录你的智能体工作台</div>

          <!-- 登录表单 -->
          <form class="form-panel" @submit.prevent="handleSubmit" novalidate autocomplete="off">
            <div class="inp-g stg" data-d="210">
              <label for="loginAccount">身份证号</label>
              <div class="inp-w">
                <el-icon class="field-icon"><User /></el-icon>
                <input
                  id="loginAccount"
                  v-model.trim="formData.idCard"
                  type="text"
                  placeholder="请输入身份证号"
                  autocomplete="username"
                  required
                  @input="clearFieldError('idCard')"
                />
              </div>
              <p class="err-t" :class="{ show: errors.idCard }">{{ errors.idCard }}</p>
            </div>

            <div class="inp-g stg" data-d="290">
              <label for="loginPassword">密码</label>
              <div class="inp-w">
                <el-icon class="field-icon"><Lock /></el-icon>
                <input
                  id="loginPassword"
                  v-model="formData.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="请输入密码"
                  autocomplete="current-password"
                  required
                  @input="clearFieldError('password')"
                />
                <button
                  type="button"
                  class="tog-pwd"
                  :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                  @click="showPassword = !showPassword"
                >
                  <component :is="showPassword ? Hide : View" :size="16" />
                </button>
              </div>
              <p class="err-t" :class="{ show: errors.password }">{{ errors.password }}</p>
            </div>

            <div class="opts stg" data-d="370">
              <label class="remember">
                <input v-model="formData.remember" type="checkbox" class="remember-checkbox" />
                <div class="cbox" :class="{ on: formData.remember }">
                  <el-icon v-if="formData.remember" class="cbox-check"
                    ><CircleCheckFilled
                  /></el-icon>
                </div>
                <span>记住账号</span>
              </label>
              <a class="reg-link" @click.prevent="goRegister">注册账号</a>
            </div>

            <div class="stg" data-d="450">
              <button type="submit" class="login-btn" :class="{ loading }" :disabled="loading">
                <span class="bt">登 录</span>
                <span class="bl"><div class="spin"></div></span>
                <span class="bk">
                  <svg class="ckv" viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="25" fill="none" stroke="#fff" stroke-width="2" />
                    <polyline
                      points="14 27 22 35 38 19"
                      fill="none"
                      stroke="#fff"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { View, Hide, User, Lock, CircleCheckFilled } from '@element-plus/icons-vue'
import { authApi, decodeJwtPayload } from '@/api/auth'
import { saveAuth } from '@/utils/auth'
import { getClientIp } from '@/utils/clientIp'
import iconLogo from '@/assets/icons/chat/icon-jh.png'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const showPassword = ref(false)
const showLogin = ref(false)
const introOut = ref(false)

const formData = reactive({
  idCard: localStorage.getItem('login_id_card') || '',
  password: '',
  remember: !!localStorage.getItem('login_id_card'),
})

const errors = reactive({
  idCard: '',
  password: '',
})

const clearFieldError = (field: 'idCard' | 'password') => {
  errors[field] = ''
}

const handleSubmit = async () => {
  // 清除之前的错误
  errors.idCard = ''
  errors.password = ''

  // 验证
  if (!formData.idCard.trim()) {
    errors.idCard = '请输入账号'
    return
  }
  if (!formData.password) {
    errors.password = '请输入密码'
    return
  }

  loading.value = true

  try {
    const ip = await getClientIp()
    const loginResult = await authApi.login({
      idCard: formData.idCard,
      password: formData.password,
      ip,
    })
    const { token } = loginResult
    const tokenProfile = decodeJwtPayload(token)
    saveAuth(token, {
      ...tokenProfile,
      id: loginResult.id || tokenProfile.id,
      name: loginResult.name || loginResult.realName || tokenProfile.name,
      role: loginResult.role || tokenProfile.role,
      ip:
        loginResult.ip ||
        loginResult.clientIp ||
        loginResult.client_ip ||
        loginResult.loginIp ||
        loginResult.login_ip ||
        loginResult.userIp ||
        loginResult.user_ip ||
        ip,
      company: loginResult.company || loginResult.companyName || loginResult.unit,
      department:
        loginResult.department ||
        loginResult.departmentName ||
        loginResult.deptName ||
        loginResult.dept,
      idCard:
        loginResult.idCard ||
        loginResult.id_card ||
        loginResult.identityCard ||
        loginResult.cardNo ||
        tokenProfile.idCard ||
        formData.idCard,
    })

    if (formData.remember) {
      localStorage.setItem('login_id_card', formData.idCard)
    } else {
      localStorage.removeItem('login_id_card')
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败')
  } finally {
    loading.value = false
  }
}

const goRegister = () => {
  router.push('/register')
}

// ========== requestAnimationFrame 兼容垫片（兼容老旧内网浏览器） ==========
const raf: (cb: FrameRequestCallback) => number =
  window.requestAnimationFrame ||
  (window as any).webkitRequestAnimationFrame ||
  (window as any).mozRequestAnimationFrame ||
  (window as any).msRequestAnimationFrame ||
  function (cb: FrameRequestCallback) {
    return window.setTimeout(() => cb(Date.now()), 16)
  }

const caf: (id: number) => void =
  window.cancelAnimationFrame ||
  (window as any).webkitCancelAnimationFrame ||
  (window as any).mozCancelAnimationFrame ||
  (window as any).msCancelAnimationFrame ||
  function (id: number) {
    window.clearTimeout(id)
  }

// ========== 背景流线 + 浮动几何系统 ==========
const streamCanvas = ref<HTMLCanvasElement>()
let streamAnimId = 0
let sCtx: CanvasRenderingContext2D | null = null
let sWidth = 0
let sHeight = 0
let sLastTime = 0
const TARGET_FRAME_MS = 1000 / 60

// 鼠标位置
let mouseX = -500
let mouseY = -500

// 流线配置
interface Stream {
  yBase: number
  a1: number
  f1: number
  s1: number
  p1: number
  a2: number
  f2: number
  s2: number
  p2: number
  color: [number, number, number]
  width: number
  alpha: number
}

// 脉冲点
interface Pulse {
  si: number
  t: number
  speed: number
  size: number
  trail: number
}

// 浮动几何
interface Geo {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rot: number
  rotV: number
  alpha: number
  type: 'ring' | 'diamond' | 'cross' | 'dot'
  color: [number, number, number]
}

let streams: Stream[] = []
let pulses: Pulse[] = []
let geos: Geo[] = []
let streamTime = 0

function initStreams() {
  const sColors: [number, number, number][] = [
    [14, 138, 125],
    [14, 138, 125],
    [14, 138, 125],
    [14, 138, 125],
    [14, 138, 125],
    [91, 168, 154],
    [217, 136, 50],
    [217, 136, 50],
  ]
  streams = []
  for (let i = 0; i < 8; i++) {
    const isWarm = i >= 6
    streams.push({
      yBase: 0.12 + Math.random() * 0.76,
      a1: 25 + Math.random() * 45,
      f1: 0.6 + Math.random() * 0.8,
      s1: 0.25 + Math.random() * 0.35,
      p1: Math.random() * 6.28,
      a2: 12 + Math.random() * 20,
      f2: 1.4 + Math.random() * 1.2,
      s2: 0.4 + Math.random() * 0.4,
      p2: Math.random() * 6.28,
      color: sColors[i],
      width: isWarm ? 1.2 : 1.5 + Math.random() * 1.5,
      alpha: isWarm ? 0.08 : 0.08 + Math.random() * 0.1,
    })
  }

  pulses = []
  streams.forEach((_s, idx) => {
    const count = 1 + Math.floor(Math.random() * 2)
    for (let j = 0; j < count; j++) {
      pulses.push({
        si: idx,
        t: Math.random(),
        speed: 0.0008 + Math.random() * 0.0015,
        size: 3 + Math.random() * 4,
        trail: 6 + Math.floor(Math.random() * 5),
      })
    }
  })

  geos = []
  const types: Geo['type'][] = ['ring', 'diamond', 'cross', 'dot']
  for (let g = 0; g < 14; g++) {
    geos.push({
      x: Math.random() * sWidth,
      y: Math.random() * sHeight,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      size: 4 + Math.random() * 10,
      rot: Math.random() * 6.28,
      rotV: (Math.random() - 0.5) * 0.005,
      alpha: 0.06 + Math.random() * 0.1,
      type: types[Math.floor(Math.random() * types.length)],
      color:
        Math.random() > 0.7
          ? ([217, 136, 50] as [number, number, number])
          : ([14, 138, 125] as [number, number, number]),
    })
  }
}

function streamY(s: Stream, x: number, w: number, time: number): number {
  let y = s.yBase * sHeight
  y += s.a1 * Math.sin(s.f1 * (x / w) * 6.28 + time * s.s1 + s.p1)
  y += s.a2 * Math.sin(s.f2 * (x / w) * 6.28 + time * s.s2 + s.p2)
  return y
}

function drawStreams() {
  if (!sCtx) return
  const w = sWidth
  const h = sHeight
  sCtx.clearRect(0, 0, w, h)

  // 绘制流线
  streams.forEach((s) => {
    // 主线
    sCtx!.beginPath()
    for (let x = 0; x <= w; x += 3) {
      const y = streamY(s, x, w, streamTime)
      if (x === 0) sCtx!.moveTo(x, y)
      else sCtx!.lineTo(x, y)
    }
    sCtx!.strokeStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${s.alpha})`
    sCtx!.lineWidth = s.width
    sCtx!.lineCap = 'round'
    sCtx!.stroke()

    // 发光层
    sCtx!.strokeStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${s.alpha * 0.25})`
    sCtx!.lineWidth = s.width * 5
    sCtx!.stroke()
  })

  // 绘制脉冲拖尾
  pulses.forEach((p) => {
    const s = streams[p.si]
    p.t += p.speed
    if (p.t > 1) p.t -= 1

    // 拖尾
    for (let ti = p.trail; ti >= 0; ti--) {
      let tt = p.t - ti * 0.006
      if (tt < 0) tt += 1
      const tx = tt * w
      const ty = streamY(s, tx, w, streamTime)
      const ta = (1 - ti / p.trail) * 0.5
      const ts = Math.max(0.5, p.size * (1 - ti / p.trail) * 0.7)

      sCtx!.beginPath()
      sCtx!.arc(tx, ty, ts, 0, 6.28)
      sCtx!.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${ta})`
      sCtx!.fill()
    }

    // 脉冲核心
    const px = p.t * w
    const py = streamY(s, px, w, streamTime)
    const gr = sCtx!.createRadialGradient(px, py, 0, px, py, Math.max(1, p.size * 3))
    gr.addColorStop(0, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0.45)`)
    gr.addColorStop(1, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0)`)
    sCtx!.fillStyle = gr
    sCtx!.beginPath()
    sCtx!.arc(px, py, Math.max(1, p.size * 3), 0, 6.28)
    sCtx!.fill()

    sCtx!.beginPath()
    sCtx!.arc(px, py, Math.max(0.5, p.size * 0.45), 0, 6.28)
    sCtx!.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0.85)`
    sCtx!.fill()
  })

  // 浮动几何
  geos.forEach((g) => {
    g.x += g.vx
    g.y += g.vy
    g.rot += g.rotV
    if (g.x < -20) g.x = w + 20
    if (g.x > w + 20) g.x = -20
    if (g.y < -20) g.y = h + 20
    if (g.y > h + 20) g.y = -20

    sCtx!.save()
    sCtx!.translate(g.x, g.y)
    sCtx!.rotate(g.rot)
    sCtx!.globalAlpha = g.alpha
    sCtx!.strokeStyle = `rgba(${g.color[0]},${g.color[1]},${g.color[2]},1)`
    sCtx!.fillStyle = `rgba(${g.color[0]},${g.color[1]},${g.color[2]},1)`
    sCtx!.lineWidth = 0.8

    if (g.type === 'ring') {
      sCtx!.beginPath()
      sCtx!.arc(0, 0, Math.max(1, g.size), 0, 6.28)
      sCtx!.stroke()
    } else if (g.type === 'diamond') {
      const d = g.size
      sCtx!.beginPath()
      sCtx!.moveTo(0, -d)
      sCtx!.lineTo(d, 0)
      sCtx!.lineTo(0, d)
      sCtx!.lineTo(-d, 0)
      sCtx!.closePath()
      sCtx!.stroke()
    } else if (g.type === 'cross') {
      const c = g.size * 0.6
      sCtx!.beginPath()
      sCtx!.moveTo(-c, 0)
      sCtx!.lineTo(c, 0)
      sCtx!.moveTo(0, -c)
      sCtx!.lineTo(0, c)
      sCtx!.stroke()
    } else {
      sCtx!.beginPath()
      sCtx!.arc(0, 0, Math.max(0.5, g.size * 0.3), 0, 6.28)
      sCtx!.fill()
    }
    sCtx!.restore()
  })

  // 鼠标光晕
  if (mouseX > 0) {
    const mg = sCtx!.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 130)
    mg.addColorStop(0, 'rgba(14,138,125,0.04)')
    mg.addColorStop(1, 'rgba(14,138,125,0)')
    sCtx!.fillStyle = mg
    sCtx!.beginPath()
    sCtx!.arc(mouseX, mouseY, 130, 0, 6.28)
    sCtx!.fill()
  }
}

function resizeStreamCanvas() {
  if (!streamCanvas.value) return
  sWidth = window.innerWidth
  sHeight = window.innerHeight
  streamCanvas.value.width = sWidth
  streamCanvas.value.height = sHeight
}

function animateStreams(timestamp: number) {
  if (!sCtx) return

  if (sLastTime === 0) sLastTime = timestamp
  let dt = timestamp - sLastTime
  sLastTime = timestamp

  // 安全钳
  if (dt < 5) dt = 5
  if (dt > 200) dt = 200

  const timeScale = dt / TARGET_FRAME_MS
  streamTime += 0.003 * (reducedMotion ? 0.3 : 1) * timeScale

  drawStreams()
  streamAnimId = raf(animateStreams)
}

function handleStreamMouseMove(e: MouseEvent) {
  mouseX = e.clientX
  mouseY = e.clientY
}

function handleStreamMouseLeave() {
  mouseX = -500
  mouseY = -500
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

onMounted(async () => {
  await nextTick()

  // ========== 开场动画 ==========
  const go = (id: string, d: number) => {
    setTimeout(() => {
      document.getElementById(id)?.classList.add('go')
    }, d)
  }
  // 外圆
  go('ic0', 300)
  // 轨道1
  go('ic1', 700)
  // 轨道2
  go('ic2', 950)
  // 轨道3
  go('ic3', 1150)
  // 中心点
  go('ic4', 1400)
  // 轨道点1
  go('ic5', 1550)
  // 轨道点2
  go('ic6', 1650)
  // 轨道点3
  go('ic7', 1750)
  // 脉冲1
  go('ip1', 1900)
  // 脉冲2
  go('ip2', 2050)
  // 脉冲3
  go('ip3', 2200)
  // 品牌名
  go('iBrand', 2300)
  // 分隔线
  go('iLine', 2900)
  // 副标题
  go('iSub', 3100)

  // 遮罩退出
  setTimeout(() => {
    introOut.value = true
  }, 3800)

  setTimeout(() => {
    showLogin.value = true
    // 卡片内逐项入场
    const stgs = document.querySelectorAll('.stg')
    stgs.forEach((el) => {
      const d = parseInt(el.getAttribute('data-d') || '0', 10)
      setTimeout(() => {
        el.classList.add('in')
      }, 200 + d)
    })
    setTimeout(() => {
      document.getElementById('cardIco')?.classList.add('in')
    }, 200)
  }, 4600)

  // ========== 背景流线 ==========
  if (!streamCanvas.value) return
  const canvasCtx = streamCanvas.value.getContext('2d')
  if (!canvasCtx) return
  sCtx = canvasCtx

  resizeStreamCanvas()
  initStreams()

  sLastTime = 0
  streamAnimId = raf(animateStreams)

  window.addEventListener('resize', resizeStreamCanvas)
  document.addEventListener('mousemove', handleStreamMouseMove)
  document.addEventListener('mouseleave', handleStreamMouseLeave)
})

onUnmounted(() => {
  caf(streamAnimId)
  window.removeEventListener('resize', resizeStreamCanvas)
  document.removeEventListener('mousemove', handleStreamMouseMove)
  document.removeEventListener('mouseleave', handleStreamMouseLeave)
  streams = []
  pulses = []
  geos = []
})
</script>

<style lang="scss" scoped>
/* ===== 根容器 ===== */
.login-root {
  --lp-bg: #f6f8fb;
  --lp-fg: #1a1f2e;
  --lp-muted: #8892a4;
  --lp-accent: #0e8a7d;
  --lp-accent-h: #0a6b61;
  --lp-accent-l: rgba(14, 138, 125, 0.08);
  --lp-warm: #d98832;
  --lp-warm-l: rgba(217, 136, 50, 0.08);
  --lp-card: rgba(255, 255, 255, 0.52);
  --lp-card-border: rgba(200, 212, 224, 0.32);
  --lp-inp-bg: rgba(255, 255, 255, 0.48);
  --lp-inp-border: #d4dae4;
  --lp-ok: #0e8a7d;
  --lp-err: #bf4040;

  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lp-bg);
  color: var(--lp-fg);
  font-family: 'Noto Sans SC', sans-serif;
  overflow: hidden;
}

/* ===== 柔和光斑 ===== */
.bg-orbs {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.18;
}

.orb1 {
  width: 500px;
  height: 500px;
  background: var(--lp-accent);
  top: -120px;
  right: -80px;
  animation: orbDrift1 20s ease-in-out infinite;
}

.orb2 {
  width: 400px;
  height: 400px;
  background: var(--lp-warm);
  bottom: -100px;
  left: -60px;
  animation: orbDrift2 26s ease-in-out infinite;
}

.orb3 {
  width: 320px;
  height: 320px;
  background: #5ba89a;
  top: 45%;
  left: 35%;
  animation: orbDrift3 18s ease-in-out infinite;
}

@keyframes orbDrift1 {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(-80px, 60px);
  }
}

@keyframes orbDrift2 {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(60px, -80px);
  }
}

@keyframes orbDrift3 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(100px, -60px) scale(1.1);
  }
}

/* ===== 流线画布 ===== */
.stream-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
}

/* ===== Toast ===== */
.toast-container {
  position: fixed;
  top: 28px;
  right: 28px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ===== 主容器 ===== */
.auth-container {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 430px;
  padding: 0 20px;
}

/* ===== 登录卡片 ===== */
.login-card {
  position: relative;
  background: var(--lp-card);
  backdrop-filter: blur(48px) saturate(1.35);
  -webkit-backdrop-filter: blur(48px) saturate(1.35);
  border: 1px solid var(--lp-card-border);
  border-radius: 22px;
  padding: 2.8rem 2.5rem 2.2rem;
  overflow: hidden;
  box-shadow:
    0 28px 72px rgba(26, 31, 46, 0.06),
    0 6px 20px rgba(26, 31, 46, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

/* 卡片顶部装饰条 */
.card-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--lp-accent), var(--lp-warm), var(--lp-accent));
  opacity: 0.6;
}

/* ===== Logo 区域 ===== */
.card-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-mark-img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(14, 138, 125, 0.2));
}

.card-brand {
  font-family: 'Sora', 'Rajdhani', sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.02em;
  color: var(--lp-fg);
  margin-bottom: 0.25rem;
}

.card-welcome {
  text-align: center;
  font-size: 0.8rem;
  color: var(--lp-muted);
  margin: 0.3rem 0 1.8rem;
  font-weight: 300;
  letter-spacing: 0.03em;
}

/* ===== 表单 ===== */
.form-panel {
  display: block;
}

/* ===== 输入组 ===== */
.inp-g {
  margin-bottom: 1.2rem;
}

.inp-g label {
  display: block;
  font-size: 0.7rem;
  color: var(--lp-muted);
  letter-spacing: 0.08em;
  margin-bottom: 0.35rem;
  font-weight: 400;
  transition: color 0.3s;
}

.inp-g:focus-within label {
  color: var(--lp-accent);
}

.inp-w {
  position: relative;
}

.inp-w .field-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--lp-muted);
  font-size: 16px;
  transition: color 0.3s;
  z-index: 2;
  pointer-events: none;
}

.inp-w:focus-within .field-icon {
  color: var(--lp-accent);
}

.inp-w input {
  width: 100%;
  padding: 0.8rem 1rem 0.8rem 2.5rem;
  background: rgba(255, 255, 255, 0.72);
  border: 1.5px solid var(--lp-inp-border);
  border-radius: 10px;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.88rem;
  color: var(--lp-fg);
  letter-spacing: normal;
  outline: none;
  transition:
    border-color 0.3s,
    box-shadow 0.3s,
    background 0.3s;
  box-sizing: border-box;
}

.inp-w input:focus {
  border-color: var(--lp-accent);
  box-shadow: 0 0 0 3px var(--lp-accent-l);
  background: rgba(255, 255, 255, 0.78);
  letter-spacing: normal;
}

/* 覆盖浏览器自动填充的背景色 */
.inp-w input:-webkit-autofill,
.inp-w input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 30px rgba(255, 255, 255, 0.72) inset;
  -webkit-text-fill-color: var(--lp-fg);
  transition: background-color 5000s ease-in-out 0s;
}

.inp-w input::placeholder {
  color: #bfc7d2;
}

/* 错误信息 */
.err-t {
  font-size: 0.67rem;
  color: var(--lp-err);
  margin-top: 0.28rem;
  display: none;
  align-items: center;
  gap: 5px;
}

.err-t.show {
  display: flex;
  animation: shake 0.35s;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  30% {
    transform: translateX(-3px);
  }
  70% {
    transform: translateX(3px);
  }
}

/* 密码切换 */
.tog-pwd {
  position: absolute;
  right: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--lp-muted);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.25rem;
  transition: color 0.3s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
}

.tog-pwd:hover {
  color: var(--lp-accent);
}

.tog-pwd :deep(svg) {
  width: 16px;
  height: 16px;
}

/* ===== 选项栏 ===== */
.opts {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.4rem;
  font-size: 0.76rem;
}

.remember {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  color: var(--lp-muted);
  transition: color 0.3s;
  user-select: none;
}

.remember:hover {
  color: var(--lp-fg);
}

.remember-checkbox {
  display: none;
}

.cbox {
  width: 15px;
  height: 15px;
  border: 1.5px solid var(--lp-inp-border);
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s;
  flex-shrink: 0;
}

.cbox.on {
  background: var(--lp-accent);
  border-color: var(--lp-accent);
}

.cbox-check {
  font-size: 10px;
  color: #fff;
}

.reg-link {
  color: var(--lp-warm);
  text-decoration: none;
  font-weight: 400;
  transition: color 0.3s;
  cursor: pointer;
}

.reg-link:hover {
  color: var(--lp-accent);
}

/* ===== 登录按钮 ===== */
.login-btn {
  width: 100%;
  height: 48px;
  padding: 0 0.88rem;
  background: linear-gradient(135deg, var(--lp-accent), #12a08d);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition:
    transform 0.3s,
    box-shadow 0.3s;
  letter-spacing: 0.08em;
}

/* 扫光 */
.login-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    transparent 30%,
    rgba(255, 255, 255, 0.18) 50%,
    transparent 70%
  );
  transform: translateX(-100%);
  transition: transform 0.6s;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(14, 138, 125, 0.22);
}

.login-btn:hover:not(:disabled)::before {
  transform: translateX(100%);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:focus-visible {
  outline: 2px solid var(--lp-accent);
  outline-offset: 3px;
}

.login-btn:disabled {
  cursor: not-allowed;
}

/* 按钮状态文字层 */
.bt,
.bl,
.bk {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.3s;
}

.bt {
  opacity: 1;
}

.login-btn.loading .bt {
  opacity: 0;
}
.login-btn.loading .bl {
  opacity: 1;
}
.login-btn.loading {
  pointer-events: none;
  opacity: 0.85;
}

.login-btn.done .bt {
  opacity: 0;
}
.login-btn.done .bl {
  opacity: 0;
}
.login-btn.done .bk {
  opacity: 1;
}
.login-btn.done {
  background: var(--lp-ok);
  pointer-events: none;
}

/* 旋转器 */
.spin {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spinner 0.55s linear infinite;
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}

/* 对勾动画 */
.ckv {
  width: 20px;
  height: 20px;
}

.ckv circle {
  stroke-dasharray: 157;
  stroke-dashoffset: 157;
  animation: ckCircle 0.4s ease-out forwards;
}

.ckv polyline {
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: ckCheck 0.3s ease-out 0.3s forwards;
}

@keyframes ckCircle {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes ckCheck {
  to {
    stroke-dashoffset: 0;
  }
}

/* ===== 响应式 ===== */
@media (max-width: 480px) {
  .login-card {
    padding: 2.2rem 1.5rem 1.8rem;
    border-radius: 18px;
  }
}

/* 尊重用户"减少动画"偏好 */
@media (prefers-reduced-motion: reduce) {
  .bg-orb,
  .login-btn::before,
  .spin {
    animation-play-state: paused !important;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>

<style>
/* ===== 开场动画（非 scoped，确保 SVG keyframes 生效） ===== */
.intro {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #f6f8fb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition:
    opacity 1s ease,
    transform 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.intro.out {
  opacity: 0;
  transform: scale(1.03);
  pointer-events: none;
}

/* SVG 路径绘制 */
.sdraw {
  stroke-dasharray: var(--len);
  stroke-dashoffset: var(--len);
}

.sdraw.go {
  animation: drawPath var(--dur, 0.8s) ease-out forwards;
}

@keyframes drawPath {
  to {
    stroke-dashoffset: 0;
  }
}

/* 中心点 */
.cdot {
  opacity: 0;
  transform: scale(0);
}

.cdot.go {
  animation: dotIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

/* 轨道上的小点 */
.sdot {
  opacity: 0;
  transform: scale(0);
}

.sdot.go {
  animation: dotIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes dotIn {
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 脉冲波 */
.pulse-r {
  fill: none;
  stroke: #0e8a7d;
  opacity: 0;
}

.pulse-r.go {
  animation: pulseRing 1.6s ease-out forwards;
}

@keyframes pulseRing {
  0% {
    r: 4;
    opacity: 0.5;
    stroke-width: 1.5;
  }
  100% {
    r: 60;
    opacity: 0;
    stroke-width: 0.2;
  }
}

/* 品牌名 */
.i-brand {
  font-family: 'Sora', 'Rajdhani', sans-serif;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #1a1f2e;
  opacity: 0;
  transform: translateY(16px);
  margin-top: 2rem;
}

.i-brand.go {
  animation: brandUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes brandUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.i-line {
  width: 0;
  height: 1.5px;
  background: #0e8a7d;
  margin: 1rem 0;
  opacity: 0.35;
  border-radius: 1px;
}

.i-line.go {
  animation: lineX 0.7s ease-out forwards;
}

@keyframes lineX {
  to {
    width: 72px;
  }
}

.i-sub {
  font-size: 0.78rem;
  color: #8892a4;
  letter-spacing: 0.18em;
  font-weight: 300;
  opacity: 0;
  transform: translateY(8px);
}

.i-sub.go {
  animation: brandUp 0.6s ease-out forwards;
}

/* 登录页初始隐藏 */
.login-page {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.8s ease 0.2s;
}

.login-page.show {
  opacity: 1;
  pointer-events: all;
}

/* 卡片滑入 */
.login-card {
  transform: translateY(28px) scale(0.97);
  transition: transform 1s cubic-bezier(0.16, 1, 0.3, 1) 0.25s;
}

.login-page.show .login-card {
  transform: translateY(0) scale(1);
}

/* 卡片内元素逐项入场 */
.stg {
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity 0.55s ease,
    transform 0.55s ease;
}

.stg.in {
  opacity: 1;
  transform: translateY(0);
}

#cardIco.stg {
  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity 0.5s,
    transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

#cardIco.stg.in {
  opacity: 1;
  transform: scale(1);
}
</style>
