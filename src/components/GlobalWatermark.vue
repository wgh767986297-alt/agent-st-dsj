<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getStoredUserProfile } from '@/utils/auth'

const route = useRoute()
const watermarkImage = ref('')
const shouldShowWatermark = computed(() => route.meta.requiresAuth !== false)
let themeObserver: MutationObserver | null = null
let renderTimer: ReturnType<typeof setTimeout> | null = null

const getWatermarkText = () => {
  const profile = getStoredUserProfile()
  const ip = profile?.ip || profile?.clientIp || profile?.loginIp
  if (ip) {
    return ip
  }

  const name = profile?.name || import.meta.env.VITE_WATERMARK_NAME || '姓名未配置'
  const idCard = profile?.idCard || import.meta.env.VITE_WATERMARK_ID_CARD || '身份证号未配置'

  return `${name} ${idCard}`
}

const getWatermarkNoticeText = () => '禁止拍照，安全保密'

const getWatermarkIdentityText = () => {
  const profile = getStoredUserProfile()
  const name = profile?.name || import.meta.env.VITE_WATERMARK_NAME || '姓名未配置'
  const idCard = profile?.idCard || import.meta.env.VITE_WATERMARK_ID_CARD || '身份证号未配置'

  return `${name} ${idCard}`
}

const getWatermarkIpNoticeText = () => {
  const profile = getStoredUserProfile()
  const ip = profile?.ip || profile?.clientIp || profile?.loginIp
  const notice = '禁止拍照，安全保密'

  return ip ? `${ip} ${notice}` : notice
}

const getWatermarkFillStyle = () => {
  const isDarkTheme = document.documentElement.dataset.theme === 'dark'
  return isDarkTheme ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.08)'
}

const renderWatermark = () => {
  if (!shouldShowWatermark.value) {
    watermarkImage.value = ''
    return
  }

  const canvas = document.createElement('canvas')
  const ratio = window.devicePixelRatio || 1
  const width = 680
  const height = 340

  canvas.width = width * ratio
  canvas.height = height * ratio
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const context = canvas.getContext('2d')
  if (!context) {
    return
  }

  context.scale(ratio, ratio)
  context.clearRect(0, 0, width, height)
  context.translate(width / 2, height / 2)
  context.rotate((-24 * Math.PI) / 180)

  context.font = '500 15px Arial, "Microsoft YaHei", sans-serif'
  context.fillStyle = getWatermarkFillStyle()
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(getWatermarkIdentityText(), 0, -12)
  context.fillText(getWatermarkIpNoticeText(), 0, 12)

  watermarkImage.value = canvas.toDataURL('image/png')
}

const createWatermarkImage = () => {
  // 清除之前的定时器，防止短时间内重复渲染导致水印重叠
  if (renderTimer) {
    clearTimeout(renderTimer)
  }
  // 先清空再异步渲染，确保浏览器完成上一帧的绘制
  renderTimer = setTimeout(() => {
    renderWatermark()
    renderTimer = null
  }, 50)
}

const handleStorageChange = () => {
  createWatermarkImage()
}

onMounted(() => {
  createWatermarkImage()
  window.addEventListener('storage', handleStorageChange)
  window.addEventListener('focus', handleStorageChange)

  themeObserver = new MutationObserver(createWatermarkImage)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', handleStorageChange)
  window.removeEventListener('focus', handleStorageChange)
  themeObserver?.disconnect()
  themeObserver = null
  if (renderTimer) {
    clearTimeout(renderTimer)
    renderTimer = null
  }
})

watch(
  () => [route.fullPath, shouldShowWatermark.value],
  () => createWatermarkImage(),
)
</script>

<template>
  <div
    v-if="shouldShowWatermark && watermarkImage"
    class="global-watermark"
    :style="{ backgroundImage: `url(${watermarkImage})` }"
    aria-hidden="true"
  />
</template>

<style scoped>
.global-watermark {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  background-repeat: repeat;
  background-position: 0 0;
  user-select: none;
}
</style>
