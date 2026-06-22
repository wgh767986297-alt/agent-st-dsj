// src/composables/useScrollManager.ts

import { ref, nextTick } from 'vue'
import type { ElScrollbar } from 'element-plus'

/**
 * 滚动管理器组合式函数
 *
 * 提供智能滚动功能，包括：
 * - 检测滚动条是否在底部
 * - 平滑滚动到底部
 * - 监听用户手动滚动行为
 * - 仅在用户处于底部时自动滚动（避免干扰用户阅读历史消息）
 *
 * @param scrollThreshold - 判定为底部的阈值（像素），默认 50px
 * @returns 滚动管理相关的状态和方法
 */
export function useScrollManager(scrollThreshold = 50) {
  // 用户是否手动滚动过（离开底部）
  const isUserScrolling = ref(false)

  // 滚动条当前是否在底部
  const isAtBottom = ref(true)

  // ✅ 分离两个 rAF ID：一个给 handleScroll 防抖，一个给 smartScrollToBottom
  let scrollDebounceRAF: number | null = null
  let smartScrollRAF: number | null = null
  // ✅ 节流控制
  let lastScrollTime = 0
  const SCROLL_THROTTLE = 50 // 50ms节流

  /**
   * 检查滚动条是否在底部
   *
   * @param wrapRef - Element Plus Scrollbar 的 wrapRef 元素
   * @returns 是否在底部范围内
   */
  const checkIsAtBottom = (wrapRef: HTMLElement | null | undefined): boolean => {
    if (!wrapRef) return false

    const scrollTop = wrapRef.scrollTop
    const scrollHeight = wrapRef.scrollHeight
    const clientHeight = wrapRef.clientHeight

    // 距离底部小于阈值则认为在底部
    return scrollHeight - scrollTop - clientHeight <= scrollThreshold
  }

  /**
   * 平滑滚动到底部
   *
   * @param wrapRef - Element Plus Scrollbar 的 wrapRef 元素
   */
  const scrollToBottom = (wrapRef: HTMLElement | null | undefined): void => {
    nextTick(() => {
      if (wrapRef) {
        // ✅ 关键修复：使用 requestAnimationFrame 确保 DOM 已更新
        requestAnimationFrame(() => {
          wrapRef.scrollTo({
            top: wrapRef.scrollHeight,
            behavior: 'smooth',
          })
        })
      }
    })
  }

  /**
   * 处理滚动事件（优化版 - 使用requestAnimationFrame替代setTimeout）
   *
   * 使用独立的 scrollDebounceRAF，不与 smartScrollToBottom 共享 rAF ID，
   * 避免滚动事件取消待执行的自动滚动。
   */
  const handleScroll = (wrapRef: HTMLElement | null | undefined): void => {
    if (!wrapRef) return

    const atBottom = checkIsAtBottom(wrapRef)
    isAtBottom.value = atBottom
    isUserScrolling.value = !atBottom

    // ✅ 使用独立的 scrollDebounceRAF 进行防抖，不影响 smartScrollRAF
    if (scrollDebounceRAF) {
      cancelAnimationFrame(scrollDebounceRAF)
    }

    scrollDebounceRAF = requestAnimationFrame(() => {
      const nextAtBottom = checkIsAtBottom(wrapRef)
      isAtBottom.value = nextAtBottom
      isUserScrolling.value = !nextAtBottom
    })
  }

  /**
   * 智能滚动：只在用户在底部时自动滚动
   *
   * 🔧 修复说明：
   * - force 模式（流式输出）：直接执行滚动，不再嵌套 rAF，避免双层 rAF 在快速流式下
   *   被连续取消（starvation）。调用方（ChatView watcher）已通过 rAF 确保 DOM 就绪。
   * - 非 force 模式：保持 rAF + smooth 行为。
   * - 使用独立的 smartScrollRAF，与 handleScroll 的 scrollDebounceRAF 分离。
   */
  const smartScrollToBottom = (
    wrapRef: HTMLElement | null | undefined,
    force: boolean = false,
  ): void => {
    if (!wrapRef) return

    const now = Date.now()

    // ✅ 节流检查：force 模式不做节流，确保流式输出时每次都能滚动
    if (now - lastScrollTime < SCROLL_THROTTLE && !force) {
      return
    }

    // ============================================
    // force 模式（流式输出）：直接执行，不通过 rAF
    // ============================================
    if (force) {
      // 只要用户没有主动向上滚动查看历史，就强制滚动
      if (!isUserScrolling.value) {
        wrapRef.scrollTo({
          top: wrapRef.scrollHeight,
          behavior: 'auto',
        })

        lastScrollTime = Date.now()

        // 异步更新状态
        nextTick(() => {
          isAtBottom.value = checkIsAtBottom(wrapRef)
        })
      }
      return
    }

    // ============================================
    // 非 force 模式：使用 rAF 做平滑滚动
    // ============================================
    if (smartScrollRAF) {
      cancelAnimationFrame(smartScrollRAF)
    }

    smartScrollRAF = requestAnimationFrame(() => {
      // 如果用户正在手动滚动，不执行自动滚动
      if (isUserScrolling.value && !checkIsAtBottom(wrapRef)) {
        return
      }

      // 只有当用户在底部时才滚动
      if (!isUserScrolling.value || isAtBottom.value) {
        wrapRef.scrollTo({
          top: wrapRef.scrollHeight,
          behavior: 'smooth',
        })

        // 滚动后重新检查是否在底部
        nextTick(() => {
          if (wrapRef) {
            isAtBottom.value = checkIsAtBottom(wrapRef)
          }
        })
      }

      lastScrollTime = Date.now()
    })
  }

  const pauseAutoScroll = (): void => {
    isUserScrolling.value = true
    isAtBottom.value = false
  }

  return {
    isUserScrolling,
    isAtBottom,
    checkIsAtBottom,
    scrollToBottom,
    handleScroll,
    smartScrollToBottom,
    pauseAutoScroll,
  }
}
