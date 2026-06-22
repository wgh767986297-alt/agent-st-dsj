import { defineStore } from 'pinia'
import { ref } from 'vue'

const SIDEBAR_COLLAPSED_KEY = 'sidebar:collapsed'

const getStoredCollapsed = () => {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

const setStoredCollapsed = (value: boolean) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value))
  } catch {
    // Ignore storage failures so the sidebar remains usable in restricted browsers.
  }
}

export const useSidebarStore = defineStore('sidebar', () => {
  const collapsed = ref(getStoredCollapsed())
  const activeNav = ref('chat')
  const activeSubMenuId = ref<string | null>(null) // ✅ 新增：当前激活的子菜单项 ID
  const expandedMenus = ref<string[]>(['tools']) // 默认展开情报研判子菜单

  const toggleCollapse = () => {
    collapsed.value = !collapsed.value
    setStoredCollapsed(collapsed.value)
  }

  const setActiveNav = (navId: string) => {
    activeNav.value = navId
  }

  const setActiveSubMenu = (subMenuId: string | null) => {
    activeSubMenuId.value = subMenuId
  }

  const toggleMenu = (menuId: string) => {
    const index = expandedMenus.value.indexOf(menuId)
    if (index > -1) {
      expandedMenus.value.splice(index, 1)
    } else {
      expandedMenus.value.push(menuId)
    }
  }

  return {
    collapsed,
    activeNav,
    activeSubMenuId,
    expandedMenus,
    toggleCollapse,
    setActiveNav,
    setActiveSubMenu,
    toggleMenu,
  }
})
