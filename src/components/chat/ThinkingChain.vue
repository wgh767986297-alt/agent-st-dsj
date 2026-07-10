<template>
  <div v-if="hasContent" class="thinking-chain-card">
    <!-- 折叠头部 -->
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
      <span class="chain-title">思考过程</span>
      <svg
        class="chain-chevron"
        :class="{ 'chain-chevron--shut': !chainExpanded }"
        viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>

    <!-- 折叠内容区 -->
    <div class="chain-fold" :class="{ 'chain-fold--shut': !chainExpanded }">
      <div class="chain-fold-inner">
        <div class="timeline">
          <div class="timeline-line" aria-hidden="true"></div>

          <!-- 技术分析 -->
          <template v-if="techSteps.length > 0">
            <div v-for="(step, si) in techSteps" :key="'tech-' + si" class="timeline-node">
              <div class="timeline-dot timeline-dot--tech">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <div class="timeline-card timeline-card--tech">
                <div class="timeline-card-label">技术分析</div>
                <div class="timeline-card-content markdown-body"
                  v-html="sanitizeAndRender(step.content)"></div>
              </div>
            </div>
          </template>

          <!-- 工具调用 -->
          <template v-if="toolSteps.length > 0">
            <div v-for="(step, si) in toolSteps" :key="'tool-' + si" class="timeline-node">
              <div class="timeline-dot timeline-dot--tool">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>
              <div class="timeline-card timeline-card--tool">
                <!-- 标题栏：工具调用 + 工具名 + 右侧箭头，整体可点击展开结果 -->
                <div
                  class="tool-call-bar"
                  :class="{ 'tool-call-bar--expanded': !isToolResultShut(si) }"
                  @click="toggleToolResult(si)"
                  @keydown.enter="toggleToolResult(si)"
                  @keydown.space.prevent="toggleToolResult(si)"
                  role="button"
                  :aria-expanded="!isToolResultShut(si)"
                  tabindex="0"
                >
                  <span class="tool-call-label">工具调用</span>
                  <span v-if="step.toolName" class="tool-call-name">{{ step.toolName }}</span>
                  <svg
                    class="tool-call-chevron"
                    :class="{ 'tool-call-chevron--shut': isToolResultShut(si) }"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                <!-- 返回结果：展开后内联显示，无折叠框 -->
                <div v-if="step.toolResultContent && !isToolResultShut(si)" class="tool-result">
                  <div class="tool-result-content markdown-body"
                    v-html="sanitizeAndRender(step.toolResultContent)"></div>
                </div>

                <!-- 调用参数：次级折叠 -->
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
                      viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                  <div class="tool-io-fold"
                    :class="{ 'tool-io-fold--shut': getToolIOState(si, 'args').shut }">
                    <div class="tool-io-fold-inner">
                      <pre class="tool-io-code">{{ formatJson(step.toolArgs) }}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 分析结论 -->
          <template v-if="bizContent">
            <div class="timeline-node">
              <div class="timeline-dot timeline-dot--biz">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div class="timeline-card timeline-card--biz">
                <div class="timeline-card-label">分析结论</div>
                <div class="timeline-card-content markdown-body"
                  v-html="sanitizeAndRender(bizContent)"></div>
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
const chainExpanded = ref(false)

// 工具结果展开状态表：默认折叠
const toolResultStates = reactive<Record<number, boolean>>({})
// 工具参数折叠状态表：默认折叠
const toolIOStates = reactive<Record<string, { shut: boolean }>>({})

function isToolResultShut(stepIdx: number): boolean {
  if (!(stepIdx in toolResultStates)) {
    toolResultStates[stepIdx] = true // 默认折叠
  }
  return toolResultStates[stepIdx]
}
function toggleToolResult(stepIdx: number) {
  toolResultStates[stepIdx] = !isToolResultShut(stepIdx)
}

function getToolIOState(stepIdx: number, type: string) {
  const key = `${stepIdx}-${type}`
  if (!toolIOStates[key]) {
    toolIOStates[key] = reactive({ shut: true })
  }
  return toolIOStates[key]
}
function toggleToolIO(stepIdx: number, type: string) {
  const state = getToolIOState(stepIdx, type)
  state.shut = !state.shut
}

function toggleChain() {
  chainExpanded.value = !chainExpanded.value
}

// ==================== 流式监听 ====================
watch(
  () => props.isStreaming,
  (val) => {
    if (val) {
      chainExpanded.value = true
      // 流式过程中，最新工具调用的结果自动展开
      const lastIdx = toolSteps.value.length - 1
      if (lastIdx >= 0) {
        toolResultStates[lastIdx] = false
      }
    } else {
      chainExpanded.value = false
    }
  },
)

// ==================== 衍生数据 ====================
interface TechStep { content: string }
const techSteps = computed<TechStep[]>(() =>
  props.thinkingBlocks.map((tb) => ({ content: tb.content })),
)

interface ToolStep {
  toolName: string
  toolArgs: any
  toolResultContent: string
}
const toolSteps = computed<ToolStep[]>(() =>
  props.toolCallGroups.map((group) => ({
    toolName: group.toolCall.toolName || '',
    toolArgs: group.toolCall.toolArgs || null,
    toolResultContent: group.toolResult?.content || '',
  })),
)

const bizContent = computed(() =>
  props.processTextBlocks.map((b) => b.content).join(''),
)

const hasContent = computed(
  () => techSteps.value.length > 0 || toolSteps.value.length > 0 || bizContent.value.length > 0,
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
/* ==================== 外层 ==================== */
.thinking-chain-card {
  margin: 10px 0;
  max-width: 100%;
}

/* ==================== 折叠头部 ==================== */
.chain-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  cursor: pointer;
  user-select: none;
  min-height: 44px;
  transition: opacity 0.15s;
}
.chain-header:hover { opacity: 0.7; }
.chain-header:focus-visible {
  outline: 2px solid var(--ds-primary-light, #2a5aa0);
  outline-offset: 2px;
  border-radius: 6px;
}
.chain-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ds-text-secondary, #666);
}
.chain-chevron {
  width: 14px;
  height: 14px;
  color: var(--ds-text-subtle, #999);
  transition: transform 0.25s ease;
  flex-shrink: 0;
}
.chain-chevron--shut { transform: rotate(-90deg); }

/* ==================== 折叠动画 ==================== */
.chain-fold {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.chain-fold--shut { grid-template-rows: 0fr; }
.chain-fold-inner { overflow: hidden; }

/* ==================== 时间轴 ==================== */
.timeline {
  position: relative;
  padding: 2px 0 4px;
}
.timeline-line {
  position: absolute;
  left: 9px;
  top: 6px;
  bottom: 6px;
  width: 1px;
  background: var(--ds-border, #d9dde4);
}

/* ==================== 时间轴节点 ==================== */
.timeline-node {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 3px 0;
}

/* ==================== 圆点 ==================== */
.timeline-dot {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  position: relative;
  z-index: 1;
  margin-top: 2px;
}
.timeline-dot svg { width: 12px; height: 12px; }
.timeline-dot--tech {
  color: var(--ds-primary-light, #2a5aa0);
  background: var(--ds-primary-soft, rgba(26, 58, 107, 0.08));
}
.timeline-dot--tool {
  color: var(--ds-accent, #c9a84c);
  background: var(--ds-accent-soft, rgba(201, 168, 76, 0.08));
}
.timeline-dot--biz {
  color: var(--ds-success, #2e7d32);
  background: var(--ds-success-soft, #e8f5e9);
}

/* ==================== 卡片 ==================== */
.timeline-card {
  flex: 1;
  min-width: 0;
  border-radius: 8px;
  padding: 7px 10px;
}
.timeline-card--tech,
.timeline-card--tool {
  background: var(--ds-primary-softer, rgba(26, 58, 107, 0.04));
  border: 1px solid var(--ds-border, #d9dde4);
}
.timeline-card--biz {
  background: var(--ds-success-soft, #e8f5e9);
  border: 1px solid var(--ds-border, #d9dde4);
}

.timeline-card-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 3px;
  color: var(--ds-primary-light, #2a5aa0);
}
.timeline-card--biz .timeline-card-label {
  color: var(--ds-success, #2e7d32);
}
.timeline-card-content {
  font-size: 12px;
  line-height: 1.55;
  color: var(--ds-text-secondary, #666);
}

/* ==================== 工具调用标题栏 ==================== */
.tool-call-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  min-height: 30px;
  transition: opacity 0.15s;
}
.tool-call-bar:hover { opacity: 0.7; }
.tool-call-bar:focus-visible {
  outline: 2px solid var(--ds-primary-light, #2a5aa0);
  outline-offset: 1px;
  border-radius: 4px;
}

.tool-call-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--ds-accent, #c9a84c);
  flex-shrink: 0;
}
.tool-call-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--ds-text, #1a1a1a);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tool-call-chevron {
  width: 12px;
  height: 12px;
  color: var(--ds-text-subtle, #999);
  transition: transform 0.25s ease;
  flex-shrink: 0;
}
.tool-call-chevron--shut { transform: rotate(-90deg); }

/* ==================== 工具返回结果（内联，无折叠框） ==================== */
.tool-result {
  margin-top: 8px;
}
.tool-result-content {
  font-size: 12px;
  line-height: 1.6;
  color: var(--ds-text-secondary, #666);
  padding: 8px 0 2px;
  border-top: 1px solid var(--ds-border, #d9dde4);
}

/* ==================== 调用参数 ==================== */
.tool-io {
  margin-top: 6px;
  background: var(--ds-panel-muted, #f7f8fa);
  border-radius: 5px;
  border: 1px solid var(--ds-border, #d9dde4);
  overflow: hidden;
}
.tool-io-header {
  padding: 4px 8px;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: var(--ds-text-subtle, #999);
  min-height: 30px;
  transition: color 0.15s;
}
.tool-io-header:hover { color: var(--ds-text-secondary, #666); }
.tool-io-chevron {
  width: 10px;
  height: 10px;
  transition: transform 0.25s ease;
  flex-shrink: 0;
}
.tool-io-chevron--shut { transform: rotate(-90deg); }
.tool-io-fold {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.tool-io-fold--shut { grid-template-rows: 0fr; }
.tool-io-fold-inner { overflow: hidden; }
.tool-io-code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-all;
  padding: 7px 10px;
  color: var(--ds-text-secondary, #666);
  border-top: 1px solid var(--ds-border, #d9dde4);
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

/* ==================== Markdown 精简风格 ==================== */

/* ---- 工具返回结果：去掉所有代码块背景（覆盖 ChatView.css 全局 code-block） ---- */
.tool-result-content :deep(pre) {
  margin: 6px 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: transparent;
  color: var(--ds-text-secondary, #666);
  padding: 0;
  border-radius: 0;
  font-size: 12px;
  line-height: 1.6;
  max-width: 100%;
  overflow-x: auto;
  max-height: none;
  overflow-y: visible;
}
.tool-result-content :deep(pre.code-block) {
  background: transparent;
  color: var(--ds-text-secondary, #666);
  padding: 0;
  border-radius: 0;
}
.tool-result-content :deep(code) {
  padding: 0;
  border-radius: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  background: transparent;
  color: var(--ds-text-secondary, #666);
}
.tool-result-content :deep(pre code),
.tool-result-content :deep(pre.code-block code) {
  padding: 0;
  background: transparent;
  color: var(--ds-text-secondary, #666);
}

/* ---- 技术分析 / 分析结论：保留浅色背景，但覆盖全局 code-block 深色 ---- */
.timeline-card-content :deep(pre) {
  margin: 6px 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: var(--ds-bg, #f0f2f5);
  color: var(--ds-text, #1a1a1a);
  padding: 8px 10px;
  border-radius: 5px;
  font-size: 11px;
  line-height: 1.5;
  max-width: 100%;
  overflow-x: auto;
  max-height: 160px;
  overflow-y: auto;
}
.timeline-card-content :deep(pre.code-block) {
  background: var(--ds-bg, #f0f2f5);
  color: var(--ds-text, #1a1a1a);
}
.timeline-card-content :deep(code) {
  padding: 1px 5px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 11px;
  background: var(--ds-primary-softer, rgba(26, 58, 107, 0.04));
  color: var(--ds-text-secondary, #666);
}
.timeline-card-content :deep(pre code),
.timeline-card-content :deep(pre.code-block code) {
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
  .tool-call-chevron,
  .tool-io-chevron {
    transition: none;
  }
}

@media (max-width: 640px) {
  .timeline-card { padding: 6px 8px; }
  .timeline-line { left: 7px; }
  .timeline-dot {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
  }
  .timeline-dot svg { width: 10px; height: 10px; }
}
</style>
