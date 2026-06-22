<template>
  <div v-if="hasContent" class="thinking-chain-card">
    <!-- 外层折叠头部 -->
    <div
      class="chain-header"
      @click="toggleChain"
      @keydown.enter="toggleChain"
      @keydown.space.prevent="toggleChain"
      role="button"
      :aria-expanded="chainExpanded"
      :aria-label="chainExpanded ? '折叠思考过程' : '展开思考过程'"
      tabindex="0"
    >
      <div class="chain-header-left">
        <span class="chain-title">思考过程</span>
      </div>
      <div class="chain-header-right">
        <svg
          class="chain-chevron"
          :class="{ 'chain-chevron--shut': !chainExpanded }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>

    <!-- 折叠内容区：时间轴布局 -->
    <div class="chain-fold" :class="{ 'chain-fold--shut': !chainExpanded }">
      <div class="chain-fold-inner">
        <div class="timeline">
          <!-- ========== 技术分析 (cyan，时间轴节点) ========== -->
          <template v-if="techSteps.length > 0">
            <div
              v-for="(step, si) in techSteps"
              :key="'tech-' + si"
              class="timeline-node timeline-node--tech"
            >
              <div class="timeline-dot">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <div class="timeline-card timeline-card--tech">
                <div class="timeline-card-label">技术分析</div>
                <div
                  class="timeline-card-content markdown-body"
                  v-html="sanitizeAndRender(step.content)"
                ></div>
              </div>
            </div>
          </template>

          <!-- ========== 工具调用 (green，时间轴节点) ========== -->
          <template v-if="toolSteps.length > 0">
            <div
              v-for="(step, si) in toolSteps"
              :key="'tool-' + si"
              class="timeline-node timeline-node--tool"
            >
              <div class="timeline-dot">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
                  />
                </svg>
              </div>
              <div class="timeline-card timeline-card--tool">
                <div class="timeline-card-label">工具调用</div>
                <div
                  v-if="step.toolCallContent"
                  class="timeline-card-content markdown-body"
                  v-html="sanitizeAndRender(step.toolCallContent)"
                ></div>
                <!-- 调用参数 -->
                <div v-if="step.toolArgs" class="tool-io">
                  <div
                    class="tool-io-header"
                    @click.stop="toggleToolIO(si, 'args')"
                    @keydown.enter.stop="toggleToolIO(si, 'args')"
                    @keydown.space.stop.prevent="toggleToolIO(si, 'args')"
                    role="button"
                    :aria-expanded="!getToolIOState(si, 'args').shut"
                    tabindex="0"
                  >
                    <span>调用参数</span>
                    <svg
                      class="tool-io-chevron"
                      :class="{ 'tool-io-chevron--shut': getToolIOState(si, 'args').shut }"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                  <div
                    class="tool-io-fold"
                    :class="{ 'tool-io-fold--shut': getToolIOState(si, 'args').shut }"
                  >
                    <div class="tool-io-fold-inner">
                      <pre class="tool-io-code">{{ formatJson(step.toolArgs) }}</pre>
                    </div>
                  </div>
                </div>
                <!-- 返回结果 -->
                <div v-if="step.toolResultContent" class="tool-io">
                  <div
                    class="tool-io-header"
                    @click.stop="toggleToolIO(si, 'output')"
                    @keydown.enter.stop="toggleToolIO(si, 'output')"
                    @keydown.space.stop.prevent="toggleToolIO(si, 'output')"
                    role="button"
                    :aria-expanded="!getToolIOState(si, 'output').shut"
                    tabindex="0"
                  >
                    <span>返回结果</span>
                    <svg
                      class="tool-io-chevron"
                      :class="{ 'tool-io-chevron--shut': getToolIOState(si, 'output').shut }"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                  <div
                    class="tool-io-fold"
                    :class="{ 'tool-io-fold--shut': getToolIOState(si, 'output').shut }"
                  >
                    <div class="tool-io-fold-inner">
                      <div
                        class="tool-io-code markdown-body"
                        v-html="sanitizeAndRender(step.toolResultContent)"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- ========== 业务思考 (无背景，时间轴节点) ========== -->
          <template v-if="bizContent">
            <div class="timeline-node timeline-node--biz">
              <div class="timeline-dot timeline-dot--biz">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div class="timeline-card timeline-card--biz">
                <div class="timeline-card-label">分析结论</div>
                <div
                  class="timeline-card-content markdown-body"
                  v-html="sanitizeAndRender(bizContent)"
                ></div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { ThinkingBlock, ProcessTextBlock, ToolCallGroup } from '@/types/chat'

interface Props {
  thinkingBlocks: ThinkingBlock[]
  toolCallGroups: ToolCallGroup[]
  processTextBlocks: ProcessTextBlock[]
  isStreaming: boolean
  sanitizeAndRender: (content: string) => string
  textContent?: string
}

const props = withDefaults(defineProps<Props>(), {
  thinkingBlocks: () => [],
  toolCallGroups: () => [],
  processTextBlocks: () => [],
  isStreaming: false,
  textContent: '',
})

// ==================== 折叠状态 ====================
const chainExpanded = ref(true)

const toolIOStates = reactive<Record<string, { shut: boolean }>>({})

// ==================== 工具 IO 状态 ====================
function getToolIOState(stepIdx: number, type: string) {
  const key = `${stepIdx}-${type}`
  if (!toolIOStates[key]) {
    toolIOStates[key] = reactive({ shut: false })
  }
  return toolIOStates[key]
}

function toggleChain() {
  chainExpanded.value = !chainExpanded.value
}
function toggleToolIO(stepIdx: number, type: string) {
  const state = getToolIOState(stepIdx, type)
  state.shut = !state.shut
}

// ==================== 衍生数据 ====================
interface TechStep {
  content: string
}
const techSteps = computed<TechStep[]>(() => {
  return props.thinkingBlocks.map((tb) => ({ content: tb.content }))
})

interface ToolStep {
  toolCallContent: string
  toolArgs: any
  toolResultContent: string
}
const toolSteps = computed<ToolStep[]>(() => {
  return props.toolCallGroups.map((group) => ({
    toolCallContent: group.toolCall.content || '',
    toolArgs: group.toolCall.toolArgs || null,
    toolResultContent: group.toolResult?.content || '',
  }))
})

const bizContent = computed(() => {
  return props.processTextBlocks.map((b) => b.content).join('')
})

const hasContent = computed(() => {
  return techSteps.value.length > 0 || toolSteps.value.length > 0 || bizContent.value.length > 0
})

// 本轮问答结束后自动折叠思考过程
watch(
  () => props.isStreaming,
  (val) => {
    if (!val) {
      chainExpanded.value = false
    }
  },
)

function formatJson(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}
</script>

<style scoped>
/* ==================== 外层卡片：无边框 ==================== */
.thinking-chain-card {
  margin: 12px 0;
  max-width: 100%;
}

/* ==================== 折叠头部 ==================== */
.chain-header {
  display: flex;
  align-items: center;
  /* justify-content: space-between; */
  padding: 0px 4px;
  cursor: pointer;
  user-select: none;
  /* min-height: 44px; */
  transition: opacity 0.15s;
}
.chain-header:hover {
  opacity: 0.75;
}
.chain-header:focus-visible {
  outline: 2px solid var(--app-primary, #4f7cff);
  outline-offset: 2px;
  border-radius: 6px;
}

.chain-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chain-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text, #1f2937);
}

.chain-header-right {
  display: flex;
  align-items: center;
}

.chain-chevron {
  width: 16px;
  height: 16px;
  margin-left: 10px;
  color: var(--app-text-subtle, #94a3b8);
  transition: transform 0.25s ease;
  flex-shrink: 0;
}
.chain-chevron--shut {
  transform: rotate(-90deg);
}

/* ==================== 折叠动画 ==================== */
.chain-fold {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.chain-fold--shut {
  grid-template-rows: 0fr;
}
.chain-fold-inner {
  overflow: hidden;
}

/* ==================== 时间轴 ==================== */
.timeline {
  position: relative;
  padding: 4px 0 8px;
}

/* 时间轴竖线 */
.timeline::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: linear-gradient(
    180deg,
    rgba(8, 145, 178, 0.2) 0%,
    rgba(5, 150, 105, 0.2) 40%,
    rgba(100, 116, 139, 0.12) 70%,
    transparent 100%
  );
  border-radius: 1px;
}

/* ==================== 时间轴节点 ==================== */
.timeline-node {
  position: relative;
  display: flex;
  gap: 14px;
  padding: 6px 0 6px 0;
}

.timeline-node + .timeline-node {
  margin-top: 2px;
}

/* ==================== 时间轴圆点 ==================== */
.timeline-dot {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--app-panel, #ffffff);
  position: relative;
  z-index: 1;
}

.timeline-dot svg {
  width: 16px;
  height: 16px;
}

.timeline-node--tech .timeline-dot {
  color: var(--tc-cyan, #0891b2);
  background: rgba(8, 145, 178, 0.08);
}

.timeline-node--tool .timeline-dot {
  color: var(--tc-green, #059669);
  background: rgba(5, 150, 105, 0.08);
}

.timeline-dot--biz {
  color: #6366f1 !important;
  background: rgba(99, 102, 241, 0.08) !important;
}

/* ==================== 时间轴卡片 ==================== */
.timeline-card {
  flex: 1;
  min-width: 0;
  border-radius: 10px;
  padding: 12px 14px;
}

.timeline-card--tech {
  background: rgba(8, 145, 178, 0.05);
  border: 1px solid rgba(8, 145, 178, 0.1);
}

.timeline-card--tool {
  background: rgba(5, 150, 105, 0.04);
  border: 1px solid rgba(5, 150, 105, 0.08);
}

.timeline-card--biz {
  background: rgba(99, 102, 241, 0.03);
  border: 1px solid rgba(99, 102, 241, 0.06);
}

.timeline-card-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.timeline-card--tech .timeline-card-label {
  color: var(--tc-cyan, #0891b2);
}

.timeline-card--tool .timeline-card-label {
  color: var(--tc-green, #059669);
}

.timeline-card--biz .timeline-card-label {
  color: #6366f1;
}

.timeline-card-content {
  font-size: 13px;
  line-height: 1.65;
  color: var(--app-text-muted, #64748b);
}

/* 流式渲染光标 */
.timeline-card-content--streaming::after {
  content: '\258E';
  animation: tc-blink 0.72s steps(1) infinite;
  color: var(--app-text-subtle, #94a3b8);
}
@keyframes tc-blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

/* ==================== 工具 IO ==================== */
.tool-io {
  margin-top: 8px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.tool-io-header {
  padding: 6px 10px;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--app-text-subtle, #94a3b8);
  min-height: 32px;
  transition: color 0.15s;
}
.tool-io-header:hover {
  color: var(--app-text-muted, #64748b);
}

.tool-io-chevron {
  width: 12px;
  height: 12px;
  transition: transform 0.25s ease;
  flex-shrink: 0;
}
.tool-io-chevron--shut {
  transform: rotate(-90deg);
}

.tool-io-fold {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.tool-io-fold--shut {
  grid-template-rows: 0fr;
}
.tool-io-fold-inner {
  overflow: hidden;
}

.tool-io-code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-all;
  padding: 10px 12px;
  color: var(--app-text-muted, #64748b);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  overflow-y: auto;
  margin: 0;
}

/* ==================== Markdown ==================== */
.timeline-card-content :deep(pre),
.tool-io-code :deep(pre) {
  margin: 8px 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: var(--app-code-bg, #1e1e2f);
  color: var(--app-code-text, #e2e8f0);
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
  max-width: 100%;
  overflow-x: auto;
}

.timeline-card-content :deep(code),
.tool-io-code :deep(code) {
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.06);
}

.timeline-card-content :deep(pre code),
.tool-io-code :deep(pre code) {
  padding: 0;
  background: transparent;
}

/* ==================== 无障碍 & 响应式 ==================== */
@media (prefers-reduced-motion: reduce) {
  .chain-fold,
  .tool-io-fold {
    transition: none;
  }
  .chain-chevron,
  .tool-io-chevron {
    transition: none;
  }
}

@media (max-width: 640px) {
  .chain-header {
    padding: 6px 2px;
  }
  .timeline-card {
    padding: 10px 12px;
  }
  .timeline::before {
    left: 13px;
  }
  .timeline-dot {
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
  }
  .timeline-dot svg {
    width: 14px;
    height: 14px;
  }
}
</style>
