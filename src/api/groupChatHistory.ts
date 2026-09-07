import historyApi from '@/api/historyChatList'

export interface GroupHistoryMember {
  member_id?: number
  member_uid: number
  member_name: string
  member_nickname?: string
  member_remark?: string
  create_time?: string
}

export interface GroupHistoryItem {
  id: number
  group_name: string
  remark?: string
  announcement?: string
  is_pinned?: boolean
  creator_id?: number
  creator_name?: string
  member_count?: number
  create_time?: string
  update_time?: string
}

export interface GroupHistoryDetail extends GroupHistoryItem {
  members: GroupHistoryMember[]
}

export interface GroupHistoryLog {
  id: number
  group_id: number
  member_uid: number
  member_name: string
  content: string
  chat_time: string
  create_time?: string
}

interface ApiResponse<T> {
  status: 'succeed' | 'error'
  message?: string
  data: T
}

const unwrap = <T>(response: unknown): T => {
  const result = response as ApiResponse<T>
  if (!result || result.status !== 'succeed') {
    throw new Error(result?.message || '群聊记录接口请求失败')
  }
  return result.data
}

export const groupChatHistoryApi = {
  async create(payload: {
    group_name: string
    remark?: string
    announcement?: string
    is_pinned?: boolean
    members: Array<{ member_uid: number; member_remark?: string }>
  }): Promise<{ id: number }> {
    return unwrap(await historyApi.post('/dsjpt/jk/group/create.xhtml', payload))
  },

  async list(payload: { creator_id?: number; keyword?: string; limit?: number; offset?: number } = {}) {
    return unwrap<GroupHistoryItem[]>(
      await historyApi.post('/dsjpt/jk/group/list.xhtml', { limit: 20, offset: 0, ...payload }),
    )
  },

  async detail(groupId: number) {
    return unwrap<GroupHistoryDetail>(
      await historyApi.post('/dsjpt/jk/group/detail.xhtml', { group_id: groupId }),
    )
  },

  async chatLog(groupId: number, limit = 500) {
    return unwrap<GroupHistoryLog[]>(
      await historyApi.post('/dsjpt/jk/group/chatLog.xhtml', {
        group_id: groupId,
        limit,
        offset: 0,
      }),
    )
  },

  async addChatLog(payload: {
    group_id: number
    member_uid: number
    member_name?: string
    content: string
    chat_time?: string
  }) {
    return unwrap<{ id: number }>(
      await historyApi.post('/dsjpt/jk/group/addChatLog.xhtml', payload),
    )
  },

  async delete(groupId: number) {
    return unwrap(await historyApi.post('/dsjpt/jk/group/delete.xhtml', { group_id: groupId }))
  },
}
