<script setup lang="ts">
import { ref } from 'vue'

const frameRef = ref<HTMLIFrameElement>()
const loadError = ref(false)

function resolveKnowledgeGraphUrl() {
  const routePath = '/knowledge-graph'
  const routeIndex = window.location.pathname.lastIndexOf(routePath)
  const appBasePath = routeIndex >= 0
    ? window.location.pathname.slice(0, routeIndex)
    : import.meta.env.BASE_URL.replace(/\/$/, '')

  return `${appBasePath}/knowledge-graph/index.html`
}

const knowledgeGraphUrl = resolveKnowledgeGraphUrl()

function removeEmbeddedHeader() {
  const frame = frameRef.value
  if (!frame) return

  try {
    const document = frame.contentDocument
    if (!document) return

    // 静态文件缺失时，Nginx 可能返回主应用 index.html，继续渲染会造成导航栏递归嵌套。
    if (!document.getElementById('root')) {
      loadError.value = true
      frame.src = 'about:blank'
      return
    }

    if (document.getElementById('knowledge-graph-host-overrides')) return

    const style = document.createElement('style')
    style.id = 'knowledge-graph-host-overrides'
    style.textContent = `
      .app-header,
      .sider-account {
        display: none !important;
      }
      .app-shell {
        padding-top: 0 !important;
      }
      .app-sider {
        top: 0 !important;
        height: 100vh !important;
      }
      .app-content {
        min-height: 100vh !important;
      }
    `
    document.head.appendChild(style)
  } catch {
    loadError.value = true
  }
}
</script>

<template>
  <section class="knowledge-graph-view" aria-label="知识图谱">
    <div v-if="loadError" class="knowledge-graph-view__error" role="alert">
      <strong>知识图谱静态资源未正确部署</strong>
      <span>请确认部署目录中存在 knowledge-graph/index.html 及其 assets 目录。</span>
    </div>
    <iframe
      v-else
      ref="frameRef"
      class="knowledge-graph-view__frame"
      :src="knowledgeGraphUrl"
      title="知识图谱"
      frameborder="0"
      @load="removeEmbeddedHeader"
    />
  </section>
</template>

<style scoped>
.knowledge-graph-view {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f5f6f3;
}

.knowledge-graph-view__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.knowledge-graph-view__error {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #475569;
  background: #f8fafc;
}

.knowledge-graph-view__error strong {
  color: #0f172a;
  font-size: 18px;
}
</style>
