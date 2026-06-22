<template>
  <div class="collapsible-thinking">
    <div class="collapsible-header" :class="{ expanded: isExpanded }" @click="toggleExpand">
      <div class="header-left">
        <el-icon class="expand-icon" :class="{ rotating: isExpanded }">
          <ArrowRight v-if="!isExpanded" />
          <ArrowDown v-else />
        </el-icon>
        <span class="header-title">{{ title }}</span>
      </div>
      <div class="header-right">
        <el-tag size="small" :type="tagType" effect="plain" class="status-tag">
          {{ statusText }}
        </el-tag>
      </div>
    </div>

    <el-collapse-transition>
      <div v-show="isExpanded" class="collapsible-body">
        <slot></slot>
      </div>
    </el-collapse-transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ArrowRight, ArrowDown } from '@element-plus/icons-vue'

interface Props {
  type: 'thinking' | 'tool_call'
  toolName?: string
  hasResult?: boolean
  defaultExpanded?: boolean // ✅ 新增：默认展开状态
  autoCollapseOnTextStart?: boolean // ✅ 修改：当文本内容出现时自动折叠
  textContent?: string // ✅ 新增：监听文本内容
}

const props = withDefaults(defineProps<Props>(), {
  hasResult: false,
  defaultExpanded: false,
  autoCollapseOnTextStart: false,
  textContent: '',
})

// ✅ 初始化为 defaultExpanded 的值
const isExpanded = ref(props.defaultExpanded)

const title = computed(() => {
  if (props.type === 'thinking') {
    return '💭 思考过程'
  }
  const name = props.toolName
  if (!name || name.trim() === '') {
    return '工具调用'
  } else if (name.includes('skill_list')) {
    return '技能查找'
  } else if (name.includes('skill_run')) {
    return '技能使用'
  } else if (name.includes('code_run')) {
    return '后台指令'
  } else if (name.includes('file_read')) {
    return '文件读取'
  } else {
    return '工具调用'
  }
})

const tagType = computed(() => {
  if (props.type === 'thinking') return 'info'
  return props.hasResult ? 'success' : 'warning'
})

const statusText = computed(() => {
  if (props.type === 'thinking') return ''
  return props.hasResult ? '已完成' : '执行中'
})

const emit = defineEmits<{
  (e: 'expand-change', expanded: boolean): void
}>()

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
  emit('expand-change', isExpanded.value) // ✅ 通知父组件
}

// ✅ 监听文本内容变化，当有文本内容时立即折叠
watch(
  () => props.textContent,
  (newVal, oldVal) => {
    // 当文本内容从无到有（null/undefined/空字符串 → 非空字符串）时，触发折叠
    if (
      props.autoCollapseOnTextStart &&
      newVal &&
      typeof newVal === 'string' &&
      newVal.trim().length > 0 &&
      (!oldVal || (typeof oldVal === 'string' && oldVal.trim().length === 0))
    ) {
      // 立即折叠，不延迟
      isExpanded.value = false
    }
  },
  { immediate: false },
)

defineExpose({
  isExpanded,
  toggleExpand,
})
</script>

<style scoped>
.collapsible-thinking {
  margin: 12px 0;
  border: 1px solid var(--app-border, #e8ecf1);
  border-radius: 12px;
  overflow: hidden;
  background: var(--app-panel, #ffffff);
  transition: all 0.25s ease;
  position: relative;
}

/* 左侧装饰条 */
.collapsible-thinking::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #6366f1, #8b5cf6);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.collapsible-thinking:hover {
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
  border-color: #d0d5dd;
}

.collapsible-thinking:hover::before {
  opacity: 1;
}

.collapsible-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.collapsible-header:hover {
  background: var(--app-panel-muted, #f8fafc);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.expand-icon {
  font-size: 14px;
  color: #94a3b8;
  transition: transform 0.25s ease;
}

.expand-icon.rotating {
  transform: rotate(0deg);
}

.header-title {
  font-size: 13px;
  color: #475569;
  font-weight: 550;
}

.header-right {
  display: flex;
  align-items: center;
}

.status-tag {
  font-size: 11px;
  font-weight: 500;
}

.collapsible-body {
  padding: 0 16px 16px;
  background: var(--app-panel, #ffffff);
  overflow-y: auto;
  animation: slideDown 0.25s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.collapsible-body :deep(pre) {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: #f8fafc;
  border: 1px solid #e8ecf1;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #334155;
}

.collapsible-body :deep(code) {
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  background: #f1f5f9;
  color: #475569;
}

.collapsible-body :deep(pre code) {
  background: transparent;
  padding: 0;
}
</style>
