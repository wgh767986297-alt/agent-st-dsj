<template>
  <div class="login-root">
    <!-- Toast 通知 -->
    <div class="toast-container" id="toastContainer"></div>

    <!-- 登录页 -->
    <div class="login-page">
      <main class="auth-container">
        <div class="login-card">
          <div class="card-bar"></div>

          <!-- Logo 区域 -->
          <div class="card-icon" id="cardIco">
            <img :src="iconLogo" alt="Logo" class="logo-mark-img" />
          </div>
          <div class="card-brand">苏小智</div>
          <div class="card-welcome">登录你的智能体工作台</div>

          <!-- 登录表单 -->
          <form class="form-panel" @submit.prevent="handleSubmit" novalidate autocomplete="off">
            <div class="inp-g">
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

            <div class="inp-g">
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

            <div class="opts">
              <label class="remember">
                <input v-model="formData.remember" type="checkbox" class="remember-checkbox" />
                <div class="cbox" :class="{ on: formData.remember }">
                  <el-icon v-if="formData.remember" class="cbox-check"
                    ><CircleCheckFilled
                  /></el-icon>
                </div>
                <span>记住账号</span>
              </label>
            </div>

            <div>
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
import { ref, reactive } from 'vue'
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

    // 角色来源：loginResult.role_list[].role_name > JWT role_list > 单 role 字段
    const resolveRoleList = (source: any): string[] => {
      if (Array.isArray(source?.role_list)) {
        return source.role_list
          .map((r: any) => r?.role_name || '')
          .filter(Boolean)
      }
      return []
    }
    const resolvedRoleList =
      resolveRoleList(loginResult).length > 0
        ? resolveRoleList(loginResult)
        : resolveRoleList(tokenProfile).length > 0
          ? resolveRoleList(tokenProfile)
          : resolveRoleList((loginResult as any).data)

    // 兼容旧版单 role 字段
    const legacyRole =
      loginResult.role ||
      tokenProfile.role ||
      (loginResult as any).data?.role ||
      ''

    // dept_id 来源：loginResult 顶层 > 嵌套对象 > JWT token profile > data
    const resolveDeptId = (source: Record<string, unknown> | null | undefined): unknown => {
      if (!source) return undefined
      return source.dept_id || source.deptId || source.departmentId || source.department_id || source.department
    }
    const deptId =
      resolveDeptId(loginResult as any) ||
      resolveDeptId((loginResult as any).user) ||
      resolveDeptId((loginResult as any).profile) ||
      resolveDeptId((loginResult as any).data) ||
      resolveDeptId((loginResult as any).result) ||
      tokenProfile.dept_id

    saveAuth(token, {
      ...tokenProfile,
      id: loginResult.id || tokenProfile.id,
      name: loginResult.name || loginResult.realName || tokenProfile.name,
      role: legacyRole,
      role_list: resolvedRoleList.length > 0 ? resolvedRoleList : (legacyRole ? [legacyRole] : []),
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
        loginResult.departmentName ||
        loginResult.deptName ||
        tokenProfile.department ||
        loginResult.department ||
        loginResult.dept,
      idCard:
        loginResult.idCard ||
        loginResult.id_card ||
        loginResult.identityCard ||
        loginResult.cardNo ||
        tokenProfile.idCard ||
        formData.idCard,
      dept_id: deptId ? Number(deptId) || undefined : tokenProfile.dept_id,
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
  --lp-card: #fff;
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
  background: var(--app-primary);
  color: var(--lp-fg);
  font-family: 'Noto Sans SC', sans-serif;
  overflow: hidden;
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
</style>
