// src/utils/historyChatList.ts
import { historyServices } from '@/api/historyChatList'
import type { Message } from '@/types/chat'

const formatBackendTime = (timeStr: string | number): string => {
  if (!timeStr) return ''

  const str = String(timeStr)

  if (str.length === 13) {
    const date = new Date(Number(str))
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${month}月${day}日 ${hours}:${minutes}:${seconds}`
  }

  if (str.length === 14) {
    const month = str.substring(4, 6)
    const day = str.substring(6, 8)
    const hours = str.substring(8, 10)
    const minutes = str.substring(10, 12)
    const seconds = str.substring(12, 14)
    return `${month}月${day}日 ${hours}:${minutes}:${seconds}`
  }

  const timestamp = Number(str)
  if (!Number.isNaN(timestamp)) {
    const date = new Date(timestamp)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${month}月${day}日 ${hours}:${minutes}:${seconds}`
  }

  return str
}

const serializeMessages = (messages: Message[]): string => {
  return JSON.stringify(messages)
}

const countQaMessages = (messages: Message[]): number => {
  return messages.filter((message) => message.role === 'user').length
}

const deserializeMessages = (content: string): Message[] => {
  try {
    return JSON.parse(content)
  } catch (error) {
    return []
  }
}

const readString = (value: unknown): string => {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''
}

const isAccountValue = (value: string, item: any, account: string): boolean => {
  const accountValues = [
    account,
    item?.account,
    item?.user_account,
    item?.userAccount,
    item?.username,
    item?.user,
  ]
    .map(readString)
    .filter(Boolean)

  return accountValues.includes(value)
}

const getSessionIdFromRecord = (item: any, account: string, fallbackId = ''): string => {
  const explicitSessionId =
    readString(item?.session_id) ||
    readString(item?.sessionId) ||
    readString(item?.sessionID) ||
    readString(item?.sessionid)

  if (explicitSessionId) {
    return explicitSessionId
  }

  const fallback = readString(fallbackId)
  if (fallback && !isAccountValue(fallback, item, account)) {
    return fallback
  }

  const legacyId = readString(item?.id)
  if (legacyId && !isAccountValue(legacyId, item, account)) {
    return legacyId
  }

  return ''
}

const generateTitle = (messages: Message[]): string => {
  const firstUserMsg = messages.find((msg) => msg.role === 'user')
  if (firstUserMsg) {
    return firstUserMsg.content.length > 20
      ? `${firstUserMsg.content.substring(0, 20)}...`
      : firstUserMsg.content
  }
  return '新对话'
}

export const saveConversation = async (data: {
  id: string
  user: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}) => {
  try {
    const account = historyServices.getAccount()
    const content = serializeMessages(data.messages)
    const title = data.title || generateTitle(data.messages)
    const qaCount = countQaMessages(data.messages)

    if (data.messages.length === 0) {
      await historyServices.insertMsg(account, data.id, title, content, qaCount)
    } else {
      await historyServices.updateMsg(account, data.id, title, content, qaCount)
    }

    return { success: true }
  } catch (error) {
    throw error
  }
}

export const deleteConversation = async (id: string) => {
  try {
    const account = historyServices.getAccount()
    await historyServices.deleteLogicMsg(account, id)
    return { success: true }
  } catch (error) {
    throw error
  }
}

export const updateConversation = async (data: {
  id: string
  title?: string
  messages?: Message[]
}) => {
  try {
    const account = historyServices.getAccount()
    const title = data.title || '未知对话'
    const content = data.messages ? serializeMessages(data.messages) : ''
    const qaCount = data.messages ? countQaMessages(data.messages) : 0

    await historyServices.updateMsg(account, data.id, title, content, qaCount)

    return { success: true }
  } catch (error) {
    throw error
  }
}

export const getConversationList = async (options?: { limit?: number }) => {
  try {
    const account = historyServices.getAccount()
    const limit = options?.limit
    const response: any = await historyServices.selectByIdMsg(account, undefined, limit)

    if (response.code === '200' && response.data) {
      const list = Array.isArray(response.data) ? response.data : []

      return list.flatMap((item: any) => {
        const sessionId = getSessionIdFromRecord(item, account)

        if (!sessionId) {
          return []
        }

        return [
          {
            id: sessionId,
            user: account,
            title: item.title || '未知对话',
            messages: deserializeMessages(item.content || '[]'),
            createdAt: item.create_time
              ? new Date(formatBackendTime(item.create_time)).getTime()
              : Date.now(),
            updatedAt: item.update_time
              ? new Date(formatBackendTime(item.update_time)).getTime()
              : Date.now(),
            displayTime: formatBackendTime(item.update_time || item.updateTime || item.create_time),
          },
        ]
      })
    }

    return []
  } catch (error) {
    throw error
  }
}

export const getConversation = async (id: string) => {
  try {
    const account = historyServices.getAccount()
    const requestId = readString(id)

    if (!requestId || requestId === account) {
      return null
    }

    const response: any = await historyServices.selectByIdMsg(account, requestId)

    if (response.code === '200' && response.data) {
      let data = response.data

      if (Array.isArray(data)) {
        data = data.length > 0 ? data[0] : null
      }

      if (!data) {
        return null
      }

      const sessionId = getSessionIdFromRecord(data, account, requestId)
      const result = {
        id: sessionId || requestId,
        user: account,
        title: data.title || '未知对话',
        messages: deserializeMessages(data.content || '[]'),
        createdAt: data.create_time
          ? new Date(formatBackendTime(data.create_time)).getTime()
          : Date.now(),
        updatedAt: data.update_time
          ? new Date(formatBackendTime(data.update_time)).getTime()
          : Date.now(),
      }

      return result
    }

    return null
  } catch (error) {
    throw error
  }
}
