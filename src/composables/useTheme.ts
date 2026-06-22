import { computed, ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'app_theme_mode'

const themeMode = ref<ThemeMode>('system')
const resolvedThemeMode = ref<ResolvedThemeMode>('light')
const systemPrefersDark = ref(false)
const themePageOverride = ref<'auth' | null>(null)

let initialized = false
let mediaQuery: MediaQueryList | null = null

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system'

const readStoredThemeMode = () => {
  if (typeof window === 'undefined') return 'system'

  const storedTheme = window.localStorage.getItem(STORAGE_KEY)
  return isThemeMode(storedTheme) ? storedTheme : 'system'
}

const getResolvedTheme = (): ResolvedThemeMode => {
  if (themeMode.value === 'system') {
    return systemPrefersDark.value ? 'dark' : 'light'
  }

  return themeMode.value
}

const syncTarget = (target: HTMLElement | null, resolvedTheme: ResolvedThemeMode) => {
  if (!target) return

  target.dataset.theme = resolvedTheme
  target.dataset.themeMode = themeMode.value
  target.classList.remove('app-theme-dark', 'app-theme-light')
  target.classList.add(`app-theme-${resolvedTheme}`)
}

const applyTheme = () => {
  if (typeof document === 'undefined') return

  const userResolvedTheme = getResolvedTheme()
  const resolvedTheme = themePageOverride.value === 'auth' ? 'light' : userResolvedTheme
  const isDark = resolvedTheme === 'dark'
  const root = document.documentElement
  const app = document.getElementById('app')

  resolvedThemeMode.value = resolvedTheme

  syncTarget(root, resolvedTheme)
  syncTarget(document.body, resolvedTheme)
  syncTarget(app, resolvedTheme)

  root.classList.toggle('dark', isDark)
  root.style.colorScheme = resolvedTheme
}

export const setThemePageOverride = (override: 'auth' | null) => {
  themePageOverride.value = override
  applyTheme()
}

const handleSystemThemeChange = (event?: MediaQueryListEvent) => {
  systemPrefersDark.value = event?.matches ?? Boolean(mediaQuery?.matches)
  applyTheme()
}

const handleStorageThemeChange = (event: StorageEvent) => {
  if (event.key !== STORAGE_KEY) return

  themeMode.value = isThemeMode(event.newValue) ? event.newValue : 'system'
  applyTheme()
}

export const initTheme = () => {
  if (initialized || typeof window === 'undefined') return

  initialized = true

  themeMode.value = readStoredThemeMode()

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  handleSystemThemeChange()
  mediaQuery.addEventListener?.('change', handleSystemThemeChange)
  window.addEventListener('storage', handleStorageThemeChange)
}

export const refreshTheme = () => {
  applyTheme()
}

export const useTheme = () => {
  const setThemeMode = (mode: ThemeMode) => {
    themeMode.value = mode

    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch (error) {

    }

    applyTheme()
  }

  return {
    themeMode,
    resolvedThemeMode,
    isDark: computed(() => resolvedThemeMode.value === 'dark'),
    setThemeMode,
  }
}
