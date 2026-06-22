<template>
  <div class="table-of-contents">
    <div
      v-for="item in items"
      :key="item.id"
      class="toc-item"
      :class="{ active: activeId === item.id }"
      @click="$emit('scrollTo', item.id)"
    >
      <div class="toc-line"></div>
      <div class="toc-tooltip">{{ item.text }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TocItem {
  id: string
  text: string
  level: number
}

interface Props {
  items: TocItem[]
  activeId: string
}

defineProps<Props>()

defineEmits<{
  (e: 'scrollTo', id: string): void
}>()
</script>

<style scoped>
.table-of-contents {
  position: absolute;
  right: -40px;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.toc-item {
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* ✅ 小短横线样式 */
.toc-line {
  width: 12px;
  height: 2px;
  background-color: #d0d7e2;
  border-radius: 1px;
  transition: all 0.2s ease;
}

/* ✅ 悬停时显示tooltip */
.toc-tooltip {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.toc-tooltip::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
  border: 4px solid transparent;
  border-right-color: rgba(0, 0, 0, 0.8);
}

/* ✅ 悬停效果 */
.toc-item:hover .toc-line {
  background-color: #94a3b8;
  width: 16px;
}

.toc-item:hover .toc-tooltip {
  opacity: 1;
  visibility: visible;
  left: 24px;
}

/* ✅ 激活状态 - 蓝色高亮 */
.toc-item.active .toc-line {
  background-color: #667eea;
  width: 16px;
  height: 3px;
}

.toc-item.active .toc-tooltip {
  opacity: 1;
  visibility: visible;
  left: 24px;
}
</style>
