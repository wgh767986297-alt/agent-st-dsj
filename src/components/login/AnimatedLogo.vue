<template>
  <div class="logo-section">
    <div class="logo-icon">
      <div class="logo-core"></div>
      <div class="logo-ring"></div>
      <div class="logo-ring ring-outer"></div>
      <div class="logo-orbit"></div>
      <div class="logo-orbit orbit-2"></div>
    </div>
    <h1 class="logo-title">情指助手</h1>
    <p class="logo-subtitle">智能体协作平台</p>
  </div>
</template>

<script setup lang="ts">
// 纯展示组件，无需逻辑
</script>

<style lang="scss" scoped>
.logo-section {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1.25rem;
  position: relative;
}

.logo-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, var(--accent-light, #7EC8E3), var(--accent, #4A90E2));
  border-radius: 50%;
  box-shadow: 0 0 30px rgba(74, 144, 226, 0.4);
  animation: corePulse 3s ease-in-out infinite;
}

@keyframes corePulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(74, 144, 226, 0.4), 0 0 40px rgba(74, 144, 226, 0.2);
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    box-shadow: 0 0 30px rgba(74, 144, 226, 0.4), 0 0 60px rgba(74, 144, 226, 0.3);
    transform: translate(-50%, -50%) scale(1.1);
  }
}

.logo-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid transparent;
  border-top-color: var(--accent-light, #7EC8E3);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  animation: ringRotate 4s linear infinite;

  &.ring-outer {
    width: 58px;
    height: 58px;
    animation-duration: 6s;
    animation-direction: reverse;
    border-top-color: var(--accent, #4A90E2);
  }
}

@keyframes ringRotate {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

.logo-orbit {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--accent-light, #7EC8E3);
  border-radius: 50%;
  animation: orbitMove 3s ease-in-out infinite;

  &.orbit-2 {
    animation-delay: -2s;
    background: var(--accent, #4A90E2);
  }
}

@keyframes orbitMove {
  0%, 100% {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0.6;
  }
  25% {
    top: 50%;
    left: 100%;
    transform: translate(-100%, -50%);
    opacity: 1;
  }
  50% {
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0.6;
  }
  75% {
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    opacity: 1;
  }
}

.logo-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--text-primary, #f1f5f9) 0%, var(--accent-light, #7EC8E3) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-subtitle {
  color: var(--text-muted, #64748b);
  font-size: 0.875rem;
  margin-top: 0.5rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
</style>
