<template>
  <div class="search-group">
    <input
      class="ds-form-input search-group__input"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keyup.enter="$emit('search')"
    />
    <button class="ds-btn-primary search-group__btn" type="button" @click="$emit('search')">
      <el-icon :size="14"><Search /></el-icon>
      <span>搜索</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'

defineProps<{
  modelValue: string
  placeholder?: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
  search: []
}>()
</script>

<style scoped>
.search-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-group__input {
  width: 200px;
}
</style>
