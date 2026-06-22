<template>
  <form class="login-form" autocomplete="on" @submit.prevent="handleSubmit">
    <div class="form-group">
      <label class="form-label" for="idCard">账号</label>
      <div class="login-input-wrapper">
        <input
          id="idCard"
          v-model.trim="formData.idCard"
          type="text"
          class="form-input"
          placeholder="请输入身份证号"
          autocomplete="username"
          required
        />
        <User class="input-icon" :size="18" />
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="password">密码</label>
      <div class="login-input-wrapper">
        <input
          id="password"
          v-model="formData.password"
          :type="showPassword ? 'text' : 'password'"
          class="form-input"
          placeholder="请输入密码"
          autocomplete="current-password"
          required
        />
        <Lock class="input-icon" :size="18" />
        <button
          type="button"
          class="password-toggle"
          :aria-label="showPassword ? '隐藏密码' : '显示密码'"
          @click="showPassword = !showPassword"
        >
          <component :is="showPassword ? Hide : View" :size="18" />
        </button>
      </div>
    </div>

    <div class="form-options">
      <label class="checkbox-wrapper">
        <input v-model="formData.remember" type="checkbox" />
        <span class="checkbox-custom">
          <Check :size="12" />
        </span>
        <span class="checkbox-label">记住账号</span>
      </label>
    </div>

    <button type="submit" class="submit-btn" :disabled="loading">
      <span>{{ loading ? '身份验证中...' : '登录' }}</span>
      <svg v-if="loading" class="submit-spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-dasharray="42"
          stroke-dashoffset="16"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Check, Hide, Lock, User, View } from '@element-plus/icons-vue'

export interface LoginFormData {
  idCard: string
  password: string
  remember: boolean
}

defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: LoginFormData]
}>()

const showPassword = ref(false)
const formData = reactive<LoginFormData>({
  idCard: localStorage.getItem('login_id_card') || '',
  password: '',
  remember: !!localStorage.getItem('login_id_card'),
})

const handleSubmit = () => {
  emit('submit', { ...formData })
}
</script>

<style lang="scss" scoped>
.login-form {
  width: 100%;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.625rem;
  color: #52667d;
  font-size: 0.8125rem;
  font-weight: 600;
}

.login-input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  width: 18px;
  height: 18px;
  color: #8aa0b8;
  pointer-events: none;
  transform: translateY(-50%);
  transition: color 0.25s ease;
}

.login-input-wrapper:focus-within .input-icon {
  color: #2563eb;
}

.form-input {
  width: 100%;
  height: 48px;
  box-sizing: border-box;
  padding: 0 3rem 0 2.75rem;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 10px;
  outline: none;
  background: rgba(255, 255, 255, 0.88);
  color: #10233f;
  font: inherit;
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease,
    background 0.3s ease;

  &::placeholder {
    color: #94a3b8;
    opacity: 1;
  }

  &:hover {
    border-color: rgba(37, 99, 235, 0.34);
  }

  &:focus {
    border-color: rgba(37, 99, 235, 0.58);
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
}

.password-toggle {
  position: absolute;
  right: 1rem;
  top: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border: 0;
  background: transparent;
  color: #8aa0b8;
  cursor: pointer;
  transform: translateY(-50%);

  &:hover {
    color: #2563eb;
  }

  :deep(svg) {
    width: 18px;
    height: 18px;
  }
}

.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.checkbox-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;

  input {
    display: none;
  }
}

.checkbox-custom {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  // border: 1.5px solid rgba(125, 211, 252, 0.32);
  border: 2.5px solid rgba(37, 99, 235, 0.16);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.8);
  color: #ffffff;

  svg {
    width: 12px;
    height: 12px;
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.2s ease;
  }
}

input:checked + .checkbox-custom {
  border-color: #2563eb;
  background: #2563eb;

  svg {
    opacity: 1;
    transform: scale(1);
  }
}

.checkbox-label,
.text-link {
  color: #52667d;
  font-size: 0.8125rem;
}

.text-link {
  border: 0;
  background: transparent;
  color: #2563eb;
  cursor: pointer;

  &:hover {
    color: #0f766e;
  }
}

.submit-btn {
  position: relative;
  display: flex;
  width: 100%;
  height: 48px;
  align-items: center;
  justify-content: center;
  padding: 0 1rem;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%);
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-size: 1rem;
  font-weight: 750;
  letter-spacing: 0.12em;
  transition:
    box-shadow 0.3s ease,
    transform 0.3s ease,
    filter 0.3s ease;

  &:hover:not(:disabled) {
    box-shadow: 0 10px 28px rgba(37, 99, 235, 0.24);
    transform: translateY(-1px);
    filter: brightness(1.08);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
}

.submit-spinner {
  position: absolute;
  right: 18px;
  width: 20px;
  height: 20px;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
