<template>
  <div class="auth-page">
    <main class="auth-card">
      <header class="auth-header">
        <h1>{{ isChangePassword ? '修改密码' : '注册账号' }}</h1>
      </header>

      <el-form label-position="top" :model="form" autocomplete="off" @submit.prevent>
        <el-form-item label="姓名" :required="!isChangePassword">
          <el-input
            v-model.trim="form.name"
            v-bind="noAutofillAttrs('register_full_name')"
            placeholder="请输入姓名"
          />
        </el-form-item>
        <el-form-item label="身份证号" required>
          <el-input
            v-model.trim="form.idCard"
            v-bind="noAutofillAttrs(inputName('identity_no'))"
            placeholder="请输入身份证号"
          />
        </el-form-item>
        <el-form-item label="手机号" :required="!isChangePassword">
          <el-input
            v-model.trim="form.phone"
            v-bind="noAutofillAttrs('register_mobile_no')"
            placeholder="请输入手机号"
          />
        </el-form-item>
        <el-form-item label="单位" :required="!isChangePassword">
          <el-input
            v-model.trim="form.company"
            v-bind="noAutofillAttrs('register_org_name')"
            placeholder="请输入单位，如：xx公安局"
          />
        </el-form-item>
        <el-form-item label="部门" :required="!isChangePassword">
          <el-select
            v-model="selectedDeptId"
            class="dept-select"
            placeholder="请选择部门"
            filterable
            :loading="deptLoading"
            :disabled="isChangePassword"
            @change="onDeptChange"
          >
            <el-option
              v-for="d in deptList"
              :key="d.id"
              :label="d.dept_name"
              :value="d.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="isChangePassword ? '新密码' : '密码'" required>
          <el-input
            v-model="form.password"
            type="text"
            v-bind="noAutofillAttrs(inputName('secret_value'))"
            :input-style="passwordInputStyle(passwordVisible)"
            :placeholder="isChangePassword ? '请输入新密码' : '请输入密码'"
          >
            <template #suffix>
              <el-icon
                class="password-toggle"
                @mousedown.prevent
                @click="passwordVisible = !passwordVisible"
              >
                <component :is="passwordVisible ? Hide : View" />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item :label="isChangePassword ? '确认新密码' : '确认密码'" required>
          <el-input
            v-model="confirmPassword"
            type="text"
            v-bind="noAutofillAttrs(inputName('secret_confirm_value'))"
            :input-style="passwordInputStyle(confirmPasswordVisible)"
            :placeholder="isChangePassword ? '请再次输入新密码' : '请再次输入密码'"
          >
            <template #suffix>
              <el-icon
                class="password-toggle"
                @mousedown.prevent
                @click="confirmPasswordVisible = !confirmPasswordVisible"
              >
                <component :is="confirmPasswordVisible ? Hide : View" />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
      </el-form>

      <div class="auth-actions">
        <el-button @click="router.push('/login')">返回登录</el-button>
        <el-button type="primary" :loading="loading" @click="handleSubmit">
          {{ isChangePassword ? '保存新密码' : '注册' }}
        </el-button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Hide, View } from '@element-plus/icons-vue'
import { authApi } from '@/api/auth'
import { departmentApi, type Department } from '@/api/department'
import { validateIdCard, validatePasswordLength } from '@/utils/auth'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const confirmPassword = ref('')
const passwordVisible = ref(false)
const confirmPasswordVisible = ref(false)

const form = reactive({
  name: '',
  idCard: '',
  phone: '',
  company: '',
  department: '',
  dept_id: undefined as number | undefined,
  password: '',
})

// 部门列表（从 API 加载）
const deptList = ref<Department[]>([])
const deptLoading = ref(false)
const selectedDeptId = ref<number | undefined>(undefined)

function onDeptChange(deptId: number | undefined) {
  if (deptId) {
    const dept = deptList.value.find((d) => d.id === deptId)
    form.dept_id = deptId
    form.department = dept?.dept_name || ''
  } else {
    form.dept_id = undefined
    form.department = ''
  }
}

async function loadDeptList() {
  deptLoading.value = true
  try {
    deptList.value = await departmentApi.list()
  } catch {
    deptList.value = []
  } finally {
    deptLoading.value = false
  }
}

const isChangePassword = computed(() => route.name === 'ChangePassword')
const inputName = (name: string) => `${isChangePassword.value ? 'change' : 'register'}_${name}`

const noAutofillAttrs = (name: string) => ({
  name,
  autocomplete: 'new-password',
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-form-type': 'other',
})

const passwordInputStyle = (visible: boolean) =>
  visible ? {} : { '-webkit-text-security': 'disc' }

onMounted(() => {
  if (!isChangePassword.value) {
    loadDeptList()
  }
})

const validate = () => {
  const requiredValues = isChangePassword.value
    ? [form.idCard, form.password, confirmPassword.value]
    : [...Object.values(form), confirmPassword.value]

  if (requiredValues.some((value) => !value)) {
    ElMessage.warning(isChangePassword.value ? '请完整填写修改密码信息' : '请完整填写注册信息')
    return false
  }

  // 校验身份证号码
  if (!validateIdCard(form.idCard)) {
    ElMessage.warning('请输入有效的身份证号码')
    return false
  }

  // 校验密码长度不少于6位
  if (!validatePasswordLength(form.password)) {
    ElMessage.warning('密码长度不能少于6位')
    return false
  }

  if (form.password !== confirmPassword.value) {
    ElMessage.warning('两次输入的密码不一致')
    return false
  }

  return true
}

const handleSubmit = async () => {
  if (!validate()) {
    return
  }

  loading.value = true
  try {
    if (isChangePassword.value) {
      await authApi.changePassword({ password: form.password })
      ElMessage.success('密码修改成功，请重新登录')
    } else {
      await authApi.register({ ...form })
      ElMessage.success('注册成功，请登录')
    }

    await router.replace('/login')
  } catch (error) {
    ElMessage.error(
      error instanceof Error ? error.message : isChangePassword.value ? '修改密码失败' : '注册失败',
    )
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ===== 页面容器 ===== */
.auth-page {
  --rp-bg: #f6f8fb;
  --rp-fg: #1a1f2e;
  --rp-muted: #8892a4;
  --rp-accent: #0e8a7d;
  --rp-accent-h: #0a6b61;
  --rp-accent-l: rgba(14, 138, 125, 0.08);
  --rp-warm: #d98832;
  --rp-card: rgba(255, 255, 255, 0.52);
  --rp-card-border: rgba(200, 212, 224, 0.32);
  --rp-inp-bg: #ffffff;
  --rp-inp-border: #d4dae4;
  --rp-err: #bf4040;

  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: var(--rp-bg);
  position: relative;
  overflow: hidden;
}

/* 柔和光斑背景 */
.auth-page::before {
  content: '';
  position: fixed;
  top: -120px;
  right: -80px;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: var(--rp-accent);
  filter: blur(90px);
  opacity: 0.14;
  pointer-events: none;
}

.auth-page::after {
  content: '';
  position: fixed;
  bottom: -100px;
  left: -60px;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: var(--rp-warm);
  filter: blur(90px);
  opacity: 0.12;
  pointer-events: none;
}

/* ===== 卡片 ===== */
.auth-card {
  position: relative;
  width: min(520px, 100%);
  padding: 2.6rem 2.5rem 2.2rem;
  border: 1px solid var(--rp-card-border);
  border-radius: 22px;
  background: var(--rp-card);
  backdrop-filter: blur(48px) saturate(1.35);
  -webkit-backdrop-filter: blur(48px) saturate(1.35);
  box-shadow:
    0 28px 72px rgba(26, 31, 46, 0.06),
    0 6px 20px rgba(26, 31, 46, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  overflow: hidden;
  z-index: 1;
}

/* 卡片顶部装饰条 */
.auth-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--rp-accent), var(--rp-warm), var(--rp-accent));
  opacity: 0.6;
}

/* ===== 头部 ===== */
.auth-header {
  margin-bottom: 28px;
  text-align: center;
}

.auth-header h1 {
  margin: 0 0 8px;
  color: var(--rp-fg);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.auth-header p {
  margin: 0;
  color: var(--rp-muted);
  font-size: 0.8rem;
  font-weight: 300;
  letter-spacing: 0.03em;
}

/* ===== Element Plus 表单项覆盖 ===== */
:deep(.el-form-item) {
  margin-bottom: 1.1rem;
}

:deep(.el-form-item__label) {
  color: var(--rp-muted);
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  margin-bottom: 0.35rem;
  line-height: 1.4;
}

:deep(.el-form-item.is-required .el-form-item__label::before) {
  color: var(--rp-accent);
}

/* ===== Element Plus 输入框覆盖 ===== */
:deep(.el-input__wrapper) {
  background-color: #ffffff !important;
  border: 1.5px solid var(--rp-inp-border);
  border-radius: 10px;
  box-shadow: none !important;
  transition:
    border-color 0.3s,
    box-shadow 0.3s,
    background-color 0.3s;
  padding: 0.8rem 1rem;
}

:deep(.el-input__wrapper:hover) {
  border-color: var(--rp-accent);
  box-shadow: none !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: var(--rp-accent);
  box-shadow: 0 0 0 3px var(--rp-accent-l) !important;
}

:deep(.el-input__inner) {
  color: var(--rp-fg);
  font-size: 0.88rem;
  font-family: 'Noto Sans SC', sans-serif;
}

:deep(.el-input__inner::placeholder) {
  color: #bfc7d2;
}

/* ===== 部门下拉选择器统一样式 ===== */
:deep(.dept-select .el-input__wrapper) {
  background-color: #ffffff !important;
  border: 1.5px solid var(--rp-inp-border);
  border-radius: 10px;
  box-shadow: none !important;
  transition: border-color 0.3s, box-shadow 0.3s;
  padding: 0.8rem 1rem;
}

:deep(.dept-select .el-input__wrapper:hover) {
  border-color: var(--rp-accent);
  box-shadow: none !important;
}

:deep(.dept-select .el-select__wrapper.is-focus .el-input__wrapper),
:deep(.dept-select .el-input__wrapper.is-focus) {
  border-color: var(--rp-accent);
  box-shadow: 0 0 0 3px var(--rp-accent-l) !important;
}

/* ===== 密码切换图标 ===== */
.password-toggle {
  cursor: pointer;
  color: var(--rp-muted);
  font-size: 16px;
  transition: color 0.3s;
}

.password-toggle:hover {
  color: var(--rp-accent);
}

/* ===== 按钮区域 ===== */
.auth-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 1.4rem;
}

/* ===== Element Plus 按钮覆盖 - 返回登录 ===== */
:deep(.el-button:not(.el-button--primary)) {
  --el-button-bg-color: transparent;
  --el-button-border-color: var(--rp-inp-border);
  --el-button-hover-border-color: var(--rp-accent);
  --el-button-text-color: var(--rp-muted);
  --el-button-hover-text-color: var(--rp-accent);
  border-radius: 10px;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.85rem;
  font-weight: 400;
  padding: 0.7rem 1.4rem;
  transition: all 0.3s;
}

:deep(.el-button:not(.el-button--primary):hover) {
  background: var(--rp-accent-l);
  border-color: var(--rp-accent);
  color: var(--rp-accent);
}

/* ===== Element Plus 按钮覆盖 - 注册/保存 ===== */
:deep(.el-button--primary) {
  --el-button-bg-color: var(--rp-accent);
  --el-button-border-color: var(--rp-accent);
  --el-button-hover-bg-color: #12a08d;
  --el-button-hover-border-color: #12a08d;
  --el-button-active-bg-color: var(--rp-accent-h);
  --el-button-active-border-color: var(--rp-accent-h);
  background: linear-gradient(135deg, var(--rp-accent), #12a08d);
  border: none;
  border-radius: 10px;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  padding: 0.7rem 1.6rem;
  transition:
    transform 0.3s,
    box-shadow 0.3s;
  position: relative;
  overflow: hidden;
}

:deep(.el-button--primary:hover) {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(14, 138, 125, 0.22);
}

:deep(.el-button--primary:active) {
  transform: translateY(0);
}

:deep(.el-button--primary.is-loading) {
  pointer-events: none;
  opacity: 0.85;
}

/* ===== 响应式 ===== */
@media (max-width: 480px) {
  .auth-page {
    padding: 20px 16px;
  }

  .auth-card {
    padding: 2rem 1.4rem 1.6rem;
    border-radius: 18px;
  }
}

/* 尊重用户"减少动画"偏好 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
