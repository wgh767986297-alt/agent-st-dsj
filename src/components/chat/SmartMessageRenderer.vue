<template>
  <div class="smart-message-renderer" @click="handleActionClick">
    <!-- 文件信息显示（仅用户消息） -->
    <div
      v-if="message.role === 'user' && message.files && message.files.length > 0"
      class="message-files"
    >
      <div v-for="file in message.files" :key="file.file_id" class="file-info-item">
        <img :src="getFileIcon(file.filename)" :alt="file.filename" class="file-icon-img" />
        <div class="file-info-content">
          <span class="file-name">{{ file.filename }}</span>
          <span v-if="file.size" class="file-size">{{ formatFileSize(file.size) }}</span>
        </div>
      </div>
    </div>

    <div v-if="message.role === 'user' && messageSkills.length" class="message-skills">
      <div v-for="skill in messageSkills" :key="skill.name" class="message-skill">
        <span class="message-skill__mark">@</span>
        <span class="message-skill__name">{{ skill.name }}</span>
        <span v-if="skill.category" class="message-skill__category">
          {{ skill.category }}
        </span>
      </div>
    </div>

    <!-- 如果有结构化内容块 -->
    <template v-if="hasStructuredContent">
      <!-- 思考链：统一展示 技术分析 + 工具调用 + 业务思考过程 -->
      <ThinkingChain
        :thinking-blocks="message.thinkingBlocks || []"
        :tool-call-groups="message.toolCallGroups || []"
        :process-text-blocks="message.processTextBlocks || []"
        :is-streaming="isStreaming"
        :sanitize-and-render="sanitizeAndRender"
        :text-content="textContent"
      />
      <!-- 正文文本 -->
      <div
        v-if="textContent"
        class="text-section markdown-body"
        v-html="sanitizeAndRender(textContent)"
      ></div>
    </template>

    <!-- 向后兼容：如果没有结构化内容，使用原来的渲染方式 -->
    <div v-else>
      <!-- 用户消息显示为纯文本 -->
      <div
        v-if="message.role === 'user'"
        class="user-text-content"
        v-html="sanitizePlainTextWithEmoji(message.content)"
      ></div>
      <!-- 助手消息：markdown 渲染 -->
      <div v-else class="markdown-body" v-html="sanitizeAndRender(message.content)"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import ThinkingChain from './ThinkingChain.vue'
import type { Message } from '@/types/chat'
import { convertEmojiToImage } from '@/utils/emojiConverter'
import { useChatStore } from '@/stores/chat'
import { getFileIcon } from '@/utils/fileUtils'
import { normalizeStreamingMarkdown } from '@/utils/markdownStream'
import { normalizeStreamingUrls } from '@/utils/markdownUrl'
import { transformMinioUrlsInText, transformMinioUrl } from '@/utils/urlTransform'
import arrowRightIcon from '@/assets/icons/chat/icon-chat-arrow-right.png'

interface Props {
  message: Message
}

const props = defineProps<Props>()

const messageSkills = computed(() => {
  const skills = props.message.skills?.length
    ? props.message.skills
    : props.message.skill
      ? [props.message.skill]
      : []
  const seen = new Set<string>()
  return skills.filter((skill) => {
    if (!skill?.name || seen.has(skill.name)) {
      return false
    }
    seen.add(skill.name)
    return true
  })
})

// ✅ 获取 chatStore 以监听流式传输状态
const chatStore = useChatStore()

// ✅ 计算当前是否正在流式传输
const isStreaming = computed(() => chatStore.isStreaming)

// ✅ 判断是否有结构化内容
const hasStructuredContent = computed(() => {
  return (
    (props.message.thinkingBlocks && props.message.thinkingBlocks.length > 0) ||
    (props.message.toolCallGroups && props.message.toolCallGroups.length > 0) ||
    (props.message.processTextBlocks && props.message.processTextBlocks.length > 0) ||
    (props.message.contentBlocks && props.message.contentBlocks.some((b) => b.type !== 'text'))
  )
})

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true, // ✅ 新增：支持换行符转换为 <br>
  highlight: (str: string, lang: string) => {
    // ✅ 修复：正确渲染代码块，保留原始格式并添加语言标识
    const escapedCode = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

    return `<pre class="code-block" data-language="${lang || 'text'}"><code class="language-${lang || 'text'}">${escapedCode}</code></pre>`
  },
})

// ✅ 修复 URL 中的空格问题 - 在渲染前预处理
const normalizeUrlsInText = (content: string): string => {
  if (!content) return content

  // ✅ 策略1: 处理 Markdown 链接格式 [text](url)
  // 匹配 [任意文本](URL) 格式，URL 可能包含空格
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g

  let processedContent = content.replace(markdownLinkRegex, (match, text, url) => {
    // 检查 URL 是否包含空格或其他需要编码的字符
    if (url.includes(' ') || url.includes('<') || url.includes('>')) {
      // 对 URL 进行编码处理
      const encodedUrl = encodeURI(url.trim())
      return `[${text}](${encodedUrl})`
    }
    return match
  })

  // ✅ 策略2: 处理纯文本中的 URL（非 Markdown 格式）
  // 匹配 http:// 或 https:// 开头的 URL，直到遇到明显的结束符
  const plainUrlRegex = /(https?:\/\/[^\s<>"'`\]\)]*[^\s<>"'`\]\).,;!?])/g

  processedContent = processedContent.replace(plainUrlRegex, (url) => {
    // 检查 URL 是否包含空格
    if (url.includes(' ')) {
      // 将空格替换为 %20
      return url.replace(/\s+/g, '%20')
    }
    return url
  })

  return processedContent
}

// ✅ 自定义链接渲染规则，让所有链接在新标签页打开
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx]

  // 查找 href 属性
  const hrefIndex = token.attrIndex('href')
  if (hrefIndex >= 0) {
    const href = token.attrs![hrefIndex][1]

    // 为所有外部链接添加 target="_blank" 和 rel 属性
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')

    // 可选：为外部链接添加标识类名
    if (href.startsWith('http://') || href.startsWith('https://')) {
      token.attrSet('class', 'external-link')
    }
    // 注：零信任令牌追加在 sanitizeAndRender 末尾统一对最终 HTML 做正则后处理，
    // 确保覆盖 markdown 链接 + 原始 HTML <a> 标签，避免漏掉任何一种
  }

  return self.renderToken(tokens, idx, options)
}

// ✅ 预处理 <action> 标签：将 <action cmd="InputChatd">text</action> 转换为可点击的 span
const processActionTags = (content: string): string => {
  if (!content) return content

  // 匹配 <action cmd="...">text</action> 标签
  const actionRegex = /<action\s+cmd="([^"]*)"\s*>([\s\S]*?)<\/action>/g

  return content.replace(actionRegex, (_match, cmd: string, text: string) => {
    const escapedText = escapeHtml(text.trim())
    if (cmd === 'InputChat') {
      // 可点击类型：使用特殊样式 + data 属性存储文本，末尾追加右箭头
      return `<span class="action-tag action-tag--clickable" data-action-text="${escapedText}">${escapedText}</span>`
    }
    // 其他 cmd 类型：仅样式区分，不可点击
    return `<span class="action-tag" data-action-cmd="${escapeHtml(cmd)}">${escapedText}</span>`
  })
}

// ✅ 清理并渲染内容，防止样式污染和 XSS 攻击
const sanitizeAndRender = (content: string) => {
  if (!content) return ''

  // ✅ 先修复 URL 中的空格问题
  const normalizedContent = normalizeStreamingUrls(normalizeStreamingMarkdown(content))

  // ✅ 将 MinIO 原始链接替换为代理地址 + 零信任令牌，确保流式输出展示与点击打开一致
  const transformedContent = transformMinioUrlsInText(normalizedContent)

  // ✅ 预处理 <action> 标签
  const processedContent = processActionTags(transformedContent)

  // 先通过 MarkdownIt 渲染
  const rendered = md.render(processedContent)

  // 转换emoji为图片 - 在 Markdown 渲染后进行
  const withEmojiImages = convertEmojiToImage(rendered)

  // 使用 DOMPurify 清理 HTML，只保留安全的标签和属性
  const clean = DOMPurify.sanitize(withEmojiImages, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'code',
      'pre',
      'blockquote',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'a',
      'img',
      'div',
      'span',
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'title',
      'class',
      'target',
      'rel',
      'style',
      'crossorigin',
      'id',
      'data-fallback',
      'data-emoji-key',
      'data-action-text',
      'data-action-cmd',
      'role',
      'aria-label',
    ],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onload', 'onclick', 'onmouseover'],
  })

  // 注：链接的域名映射和零信任令牌拼接已在渲染时（transformMinioUrlsInText）处理，
  // 此处 handleActionClick 作为兜底，确保点击时再次转换（幂等安全）
  return clean
}

const escapeHtml = (content: string): string =>
  content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const sanitizePlainTextWithEmoji = (content: string) => {
  if (!content) return ''

  const withLineBreaks = escapeHtml(content).replace(/\r?\n/g, '<br>')
  const withEmojiImages = convertEmojiToImage(withLineBreaks)

  return DOMPurify.sanitize(withEmojiImages, {
    ALLOWED_TAGS: ['br', 'img', 'span'],
    ALLOWED_ATTR: [
      'src',
      'alt',
      'title',
      'class',
      'data-fallback',
      'data-emoji-key',
      'role',
      'aria-label',
    ],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onload', 'onclick', 'onmouseover'],
  })
}

// ✅ 根据文件扩展名获取对应的图标路径
// ✅ 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ✅ 提取纯文本内容
const textContent = computed(() => {
  if (!props.message.contentBlocks) return props.message.content

  return props.message.contentBlocks
    .filter((block) => block.type === 'text')
    .map((block) => block.content)
    .join('\n\n')
})

// ✅ 定义emit事件
const emit = defineEmits<{
  (e: 'send-message', text: string): void
}>()

// ✅ 容器点击事件委托：处理 action 标签 + 外部链接域名映射及令牌拼接
const handleActionClick = (e: MouseEvent) => {
  // 1. 优先处理 action 标签点击
  const actionEl = (e.target as HTMLElement).closest?.('.action-tag--clickable')
  if (actionEl) {
    const text = actionEl.getAttribute('data-action-text')
    if (text) emit('send-message', text)
    return
  }

  // 2. 拦截 <a> 标签点击，做域名映射 + token 拼接后在新标签页打开
  const linkEl = (e.target as HTMLElement).closest?.('a[href]')
  if (linkEl) {
    const rawHref = linkEl.getAttribute('href')
    if (!rawHref) return

    // 只处理外部链接
    if (!rawHref.startsWith('http://') && !rawHref.startsWith('https://')) return

    e.preventDefault()

    // 域名映射 + token 拼接（幂等，与渲染时的转换一致）
    const finalUrl = transformMinioUrl(rawHref)

    window.open(finalUrl, '_blank', 'noopener,noreferrer')
  }
}
</script>

<style scoped>
.smart-message-renderer {
  width: 100%;
  max-width: 100%;
  overflow-wrap: break-word;
  word-wrap: break-word;
}

/* 文件信息样式 */
.message-files {
  margin-bottom: 12px;
  padding: 8px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid #d0d7e2;
}

.file-info-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid #d0d7e2;
  border-radius: 10px;
  padding: 6px 10px;
  transition: all 0.2s;
}

/* .file-info-item:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.35);
} */

.file-icon-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  flex-shrink: 0;
  display: none;
}

.file-info-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 1.4;
}

.file-size {
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.3;
}

.message-skills {
  max-width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.message-skill {
  width: fit-content;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(37, 99, 235, 0.22);
  border-radius: 999px;
  color: #2563eb;
  background: #25eb8f69;
  font-size: 12px;
  font-weight: 700;
}

.message-skill__mark {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #ffffff;
  background: #2563eb;
  line-height: 1;
}

.message-skill__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-skill__category {
  max-width: 120px;
  overflow: hidden;
  padding-left: 6px;
  border-left: 1px solid rgb(37 100 235 / 51%);
  color: #e3e4e5;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-text-content {
  /* color: #ffffff; */
  color: #ffffff;
  line-height: 1.5;
  word-break: break-word;
  overflow-wrap: break-word;
}

.loading-dots::after {
  content: '...';
  animation: dots 1.5s steps(4, end) infinite;
}

@keyframes dots {
  0%,
  20% {
    content: '';
  }
  40% {
    content: '.';
  }
  60% {
    content: '..';
  }
  80%,
  100% {
    content: '...';
  }
}

.text-section {
  line-height: 1.8;
  font-size: 17px;
  max-width: 100%;
  overflow-wrap: break-word;
  word-wrap: break-word;
}

/* ✅ 深度选择器：确保 markdown-body 内的所有元素都不会溢出 */
:deep(.markdown-body) {
  max-width: 100%;
  overflow-x: hidden;
}

:deep(.markdown-body *) {
  max-width: 100%;
  box-sizing: border-box;
}

:deep(.markdown-body strong) {
  font-weight: 760;
}

:deep(.markdown-body pre),
:deep(.markdown-body code),
:deep(.markdown-body table),
:deep(.markdown-body img) {
  max-width: 100%;
}

:deep(.action-tag--clickable) {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  padding: 6px 14px;
  margin-top: 8px;
  background: #fff;
  border: 1px solid var(--ds-primary-light, #2a5aa0);
  border-radius: 16px;
  font-size: 12px;
  color: var(--ds-primary-light, #2a5aa0);
  transition: all 0.2s;
  white-space: nowrap;
}

:deep(.action-tag--clickable:hover) {
  background: var(--ds-primary-light, #2a5aa0);
  color: #fff;
}

:deep(.action-tag--clickable:hover .action-tag__arrow) {
  filter: brightness(0) saturate(100%) invert(1);
}

:deep(.action-tag__arrow) {
  width: 14px;
  height: 14px;
  margin-left: 7px;
}

:deep(.action-tag--clickable:focus-visible) {
  outline: 2px solid var(--ds-primary-light, #2a5aa0);
  outline-offset: 2px;
  border-radius: 4px;
}

/* 深色模式 */
:root[data-theme='dark'] :deep(.action-tag--clickable) {
  background: var(--ds-card, rgba(18, 34, 72, 0.7));
  border-color: rgba(0, 170, 255, 0.3);
  color: var(--ds-primary-light, #33bbff);
}

:root[data-theme='dark'] :deep(.action-tag--clickable:hover) {
  background: var(--ds-primary, #00aaff);
  color: #fff;
  border-color: var(--ds-primary, #00aaff);
}

:root[data-theme='dark'] :deep(.action-tag__arrow) {
  filter: brightness(0) saturate(100%) invert(1);
  opacity: 0.82;
}

:root[data-theme='dark'] :deep(.action-tag--clickable:hover .action-tag__arrow) {
  filter: brightness(0) saturate(100%) invert(1);
  opacity: 1;
}
</style>
