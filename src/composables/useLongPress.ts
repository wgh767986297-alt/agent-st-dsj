// src/composables/useLongPress.ts

import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'

/**
 * 长按项的数据接口
 */
interface LongPressItem {
  id: string
  title?: string
}

/**
 * 长按删除配置选项
 */
interface UseLongPressOptions {
  /** 长按触发延迟时间（毫秒），默认 800ms */
  delay?: number

  /** 删除回调函数，接收被删除项的 ID */
  onDelete?: (id: string) => Promise<void>
}

/**
 * 长按删除交互组合式函数
 *
 * 提供移动端友好的长按删除功能，包括：
 * - 长按触发计时器管理
 * - 震动反馈（如果设备支持）
 * - 删除确认对话框
 * - 防止与点击事件冲突
 *
 * @param options - 配置选项
 * @returns 长按交互相关的状态和方法
 *
 * @example
 * const { isLongPressing, longPressId, handleLongPressStart, handleLongPressEnd } = useLongPress({
 *   delay: 800,
 *   onDelete: async (id) => await deleteItem(id)
 * })
 */
export function useLongPress(options: UseLongPressOptions = {}) {
  const { delay = 800, onDelete } = options

  // 长按定时器
  const longPressTimer = ref<number | null>(null)

  // 是否正在长按
  const isLongPressing = ref(false)

  // 当前长按的项目 ID
  const longPressId = ref<string | null>(null)

  // 当前长按项目的标题（用于确认提示）
  const longPressTitle = ref<string>('')

  /**
   * 处理长按开始事件
   *
   * 应该在 mousedown/touchstart 事件中调用
   *
   * @param item - 被长按项目的数据（包含 id 和可选的 title）
   */
  const handleLongPressStart = (item: string | LongPressItem): void => {


    // 清除之前的定时器
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value)
      longPressTimer.value = null
    }

    isLongPressing.value = false
    longPressId.value = null
    longPressTitle.value = ''

    // 处理传入的参数（兼容字符串和对象两种形式）
    const id = typeof item === 'string' ? item : item.id
    const title = typeof item === 'string' ? '' : item.title || ''

    // 设置新的定时器
    longPressTimer.value = window.setTimeout(() => {

      isLongPressing.value = true
      longPressId.value = id
      longPressTitle.value = title

      // 震动反馈（如果设备支持）
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }

      // 自动显示删除确认对话框
      showDeleteConfirm(id, title)
    }, delay)
  }

  /**
   * 处理长按结束事件
   *
   * 应该在 mouseup/mouseleave/touchend/touchcancel 事件中调用
   */
  const handleLongPressEnd = (): void => {


    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value)
      longPressTimer.value = null

    }

    // 延迟重置状态，避免与点击冲突
    setTimeout(() => {
      isLongPressing.value = false
    }, 100)
  }

  /**
   * 显示删除确认对话框并执行删除
   *
   * @param id - 要删除项目的 ID
   * @param title - 项目名称（用于确认提示）
   */
  const showDeleteConfirm = async (id: string, title: string = ''): Promise<void> => {
    try {
      const displayTitle = title || '该对话'
      await ElMessageBox.confirm(`确定要删除"${displayTitle}"吗？`, '删除确认', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      })

      // 用户确认删除，执行回调
      if (onDelete) {
        await onDelete(id)
      }
    } catch (err) {
      // 用户取消删除
      if (err !== 'cancel') {

      }
    } finally {
      // 清理状态
      isLongPressing.value = false
      longPressId.value = null
      longPressTitle.value = ''
    }
  }

  return {
    longPressTimer,
    isLongPressing,
    longPressId,
    longPressTitle,
    handleLongPressStart,
    handleLongPressEnd,
    showDeleteConfirm,
  }
}
