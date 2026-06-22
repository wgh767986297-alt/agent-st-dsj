import axios from 'axios'
import { getAuthToken, handleAuthExpired, isAuthExpiredResponse } from '@/utils/auth'

export interface SkillApiItem {
  name?: string
  description?: string
  category?: string
  id?: string
  enabled?: boolean
}

export interface SkillCategoryGroup {
  category?: string
  skills?: SkillApiItem[]
  count?: number
}

export interface SkillListParams {
  page?: number
  page_size?: number
  category?: string
  name?: string
  description?: string
}

export interface SkillListResponse {
  page?: number
  page_size?: number
  total?: number
  total_pages?: number
  categories?: SkillCategoryGroup[]
  categorylist?: string[]
  skilllist?: string[]
  skills?: SkillApiItem[]
}

export interface SkillTemplateResponse {
  download_url?: string
  filename?: string
}

export interface UploadSkillResponse {
  status?: string
  message?: string
  skill_name?: string
  path?: string
  detail?: string
}

const SKILLS_CACHE_KEY = 'skills_market:skill_items'
const SKILLS_CACHE_TTL = 30 * 60 * 1000
const SKILLS_CACHE_PAGE_SIZE = 100
let skillsMemoryCache: {
  timestamp: number
  items: SkillApiItem[]
} | null = null
let preloadPromise: Promise<SkillApiItem[]> | null = null

const skillsMarketApi = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

skillsMarketApi.interceptors.request.use(
  (config) => {
    const token = getAuthToken()
    if (token) {
      config.headers.token = token
    }
    return config
  },
  (error) => Promise.reject(error),
)

skillsMarketApi.interceptors.response.use(
  (response) => {
    if (isAuthExpiredResponse(response.data, response.status)) {
      handleAuthExpired()
      return Promise.reject(new Error(response.data?.message || 'token已过期'))
    }
    return response.data
  },
  (error) => {
    if (isAuthExpiredResponse(error.response?.data, error.response?.status)) {
      handleAuthExpired()
    }
    return Promise.reject(error)
  },
)

const apiUrl = () => import.meta.env.VITE_API_URL || ''

export const getSkillsList = async (params: SkillListParams = {}): Promise<SkillListResponse> => {
  const baseUrl = apiUrl()
  const requestParams: SkillListParams = {
    page: params.page ?? 1,
    page_size: params.page_size ?? 20,
  }
  if (params.category) requestParams.category = params.category
  if (params.name) requestParams.name = params.name
  if (params.description) requestParams.description = params.description

  const response = await skillsMarketApi.get<SkillListResponse, SkillListResponse>(
    `${baseUrl}/api/skills/list`,
    { params: requestParams },
  )
  return response
}

const resolveSkillItems = (response: SkillListResponse): SkillApiItem[] => {
  if (response.skills?.length) {
    return response.skills
  }
  if (response.categories?.length) {
    return response.categories.flatMap((group) =>
      (group.skills || []).map((skill) => ({
        ...skill,
        category: skill.category || group.category || '',
      })),
    )
  }
  return (response.skilllist || []).map((name) => ({
    name,
    description: '',
    category: '',
  }))
}

const dedupeSkills = (items: SkillApiItem[]) => {
  const seen = new Set<string>()
  return items.filter((item) => {
    const name = item.name?.trim()
    if (!name || seen.has(name)) return false
    seen.add(name)
    return true
  })
}

const readLocalSkillsCache = () => {
  try {
    const raw = localStorage.getItem(SKILLS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { timestamp?: number; items?: SkillApiItem[] }
    if (!parsed.timestamp || !Array.isArray(parsed.items)) return null
    return { timestamp: parsed.timestamp, items: parsed.items }
  } catch {
    localStorage.removeItem(SKILLS_CACHE_KEY)
    return null
  }
}

const writeSkillsCache = (items: SkillApiItem[]) => {
  const cache = { timestamp: Date.now(), items: dedupeSkills(items) }
  skillsMemoryCache = cache
  try {
    localStorage.setItem(SKILLS_CACHE_KEY, JSON.stringify(cache))
  } catch { /* cache is an optimization only */ }
  return cache.items
}

const isFreshCache = (timestamp: number) => Date.now() - timestamp < SKILLS_CACHE_TTL

export const getCachedSkillItems = (allowStale = true): SkillApiItem[] => {
  if (skillsMemoryCache && (allowStale || isFreshCache(skillsMemoryCache.timestamp))) {
    return skillsMemoryCache.items
  }
  const localCache = readLocalSkillsCache()
  if (!localCache) return []
  skillsMemoryCache = localCache
  if (allowStale || isFreshCache(localCache.timestamp)) return localCache.items
  return []
}

export const invalidateSkillsCache = () => {
  skillsMemoryCache = null
  preloadPromise = null
  localStorage.removeItem(SKILLS_CACHE_KEY)
}

export const preloadSkillsCache = async (force = false): Promise<SkillApiItem[]> => {
  if (!force) {
    const freshItems = getCachedSkillItems(false)
    if (freshItems.length) return freshItems
  }
  if (preloadPromise) return preloadPromise

  preloadPromise = (async () => {
    const firstResponse = await getSkillsList({ page: 1, page_size: SKILLS_CACHE_PAGE_SIZE })
    const firstItems = resolveSkillItems(firstResponse)
    const totalPages = Number(firstResponse.total_pages || 0)
    const total = Number(firstResponse.total || 0)
    const resolvedTotalPages =
      totalPages > 0 ? totalPages : total > 0 ? Math.ceil(total / SKILLS_CACHE_PAGE_SIZE) : 1

    if (resolvedTotalPages <= 1 || firstResponse.skilllist?.length) {
      return writeSkillsCache(firstItems)
    }

    const remainingResponses = await Promise.all(
      Array.from({ length: resolvedTotalPages - 1 }, (_, index) =>
        getSkillsList({ page: index + 2, page_size: SKILLS_CACHE_PAGE_SIZE }),
      ),
    )
    return writeSkillsCache([
      ...firstItems,
      ...remainingResponses.flatMap((response) => resolveSkillItems(response)),
    ])
  })().finally(() => {
    preloadPromise = null
  })

  return preloadPromise
}

export const searchCachedSkills = async (query = '', limit = 5): Promise<SkillApiItem[]> => {
  let items = getCachedSkillItems()
  if (items.length === 0) {
    try {
      items = await preloadSkillsCache()
    } catch {
      items = getCachedSkillItems()
    }
  }

  const normalizedQuery = query.trim().toLowerCase()
  const scored = items.map((item, index) => {
    const name = item.name?.trim() || ''
    const description = item.description?.trim() || ''
    const category = item.category?.trim() || ''
    const normalizedName = name.toLowerCase()
    const normalizedDesc = description.toLowerCase()
    const normalizedCategory = category.toLowerCase()
    let score = 0

    if (!normalizedQuery) {
      score = 1000 - index
    } else if (normalizedName === normalizedQuery) {
      score = 5000
    } else if (normalizedName.startsWith(normalizedQuery)) {
      score = 4000 - normalizedName.length
    } else if (normalizedName.includes(normalizedQuery)) {
      score = 3000 - normalizedName.indexOf(normalizedQuery)
    } else if (normalizedDesc.includes(normalizedQuery)) {
      score = 2000
    } else if (normalizedCategory.includes(normalizedQuery)) {
      score = 1000
    }
    return { item, score }
  })

  return scored
    .filter(({ item, score }) => !!item.name?.trim() && score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item)
}

export const getSkillTemplate = async (): Promise<SkillTemplateResponse> => {
  const baseUrl = apiUrl()
  const response = await skillsMarketApi.get<SkillTemplateResponse, SkillTemplateResponse>(
    `${baseUrl}/api/skills/template`,
  )
  return response
}

export const uploadSkill = async (file: File): Promise<UploadSkillResponse> => {
  const baseUrl = apiUrl()
  const formData = new FormData()
  formData.append('file', file)
  const response = await skillsMarketApi.post<UploadSkillResponse, UploadSkillResponse>(
    `${baseUrl}/api/skills/upload`,
    formData,
  )
  invalidateSkillsCache()
  return response
}
