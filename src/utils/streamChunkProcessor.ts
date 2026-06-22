/**
 * 流式消息块处理工具
 *
 * 将 SSE 流式数据块应用到 Message 对象的结构化字段中。
 * Chat store 共用此逻辑，确保思考链、工具调用等展示一致。
 */
import type { Message, MessageContentBlock } from '@/types/chat'

let currentToolCallId: string | null = null

export function resetToolCallId(): void {
  currentToolCallId = null
}

/**
 * 将流式数据块应用到 Message 对象
 *
 * @param msg        - 要更新的助手消息对象（会被原地修改）
 * @param delta      - 本次数据块文本
 * @param type       - 数据块类型
 * @param metadata   - 附加元数据（工具名、参数等）
 */
export function applyStreamChunk(
  msg: Message,
  delta: string,
  type: 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'process_text',
  metadata?: any,
): void {
  if (!delta) return

  // 向后兼容：追加到 content 字段
  msg.content += delta

  switch (type) {
    case 'text': {
      if (!msg.contentBlocks || msg.contentBlocks.length === 0) {
        msg.contentBlocks = [{ type: 'text', content: delta }]
      } else {
        const lastBlock = msg.contentBlocks[msg.contentBlocks.length - 1]
        if (lastBlock.type === 'text') {
          lastBlock.content += delta
        } else {
          msg.contentBlocks.push({ type: 'text', content: delta })
        }
      }
      break
    }

    case 'thinking': {
      if (!msg.thinkingBlocks) msg.thinkingBlocks = []
      const lastThinking = msg.thinkingBlocks[msg.thinkingBlocks.length - 1]
      if (lastThinking) {
        lastThinking.content += delta
      } else {
        msg.thinkingBlocks.push({ type: 'thinking', content: delta, timestamp: Date.now() })
      }
      // 同时记录到 contentBlocks
      if (!msg.contentBlocks) msg.contentBlocks = []
      const lastCB = msg.contentBlocks[msg.contentBlocks.length - 1]
      if (lastCB?.type === 'thinking') {
        lastCB.content += delta
      } else {
        msg.contentBlocks.push({ type: 'thinking', content: delta, timestamp: Date.now() })
      }
      break
    }

    case 'tool_call': {
      currentToolCallId = metadata?.toolId || Date.now().toString()
      const toolCallBlock: MessageContentBlock = {
        type: 'tool_call',
        content: delta,
        toolName: metadata?.toolName,
        toolArgs: metadata?.toolArgs,
        timestamp: Date.now(),
      }
      if (!msg.toolCallGroups) msg.toolCallGroups = []
      msg.toolCallGroups.push({ toolCall: toolCallBlock, isExpanded: false })
      if (!msg.contentBlocks) msg.contentBlocks = []
      msg.contentBlocks.push({ ...toolCallBlock })
      break
    }

    case 'tool_result': {
      if (msg.toolCallGroups && msg.toolCallGroups.length > 0) {
        const lastGroup = msg.toolCallGroups[msg.toolCallGroups.length - 1]
        if (lastGroup.toolResult) {
          lastGroup.toolResult.content += delta
        } else {
          lastGroup.toolResult = { type: 'tool_result', content: delta, timestamp: Date.now() }
        }
      }
      if (!msg.contentBlocks) msg.contentBlocks = []
      const lastCb = msg.contentBlocks[msg.contentBlocks.length - 1]
      if (lastCb?.type === 'tool_result') {
        lastCb.content += delta
      } else {
        msg.contentBlocks.push({ type: 'tool_result', content: delta, timestamp: Date.now() })
      }
      break
    }

    case 'process_text': {
      if (!msg.processTextBlocks) msg.processTextBlocks = []
      const lastProc = msg.processTextBlocks[msg.processTextBlocks.length - 1]
      if (lastProc) {
        lastProc.content += delta
      } else {
        msg.processTextBlocks.push({ type: 'process_text', content: delta, timestamp: Date.now() })
      }
      if (!msg.contentBlocks) msg.contentBlocks = []
      const lastCbProcess = msg.contentBlocks[msg.contentBlocks.length - 1]
      if (lastCbProcess?.type === 'process_text') {
        lastCbProcess.content += delta
      } else {
        msg.contentBlocks.push({ type: 'process_text', content: delta, timestamp: Date.now() })
      }
      break
    }
  }
}
