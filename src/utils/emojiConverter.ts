/**
 * Emoji conversion utilities.
 *
 * Native emoji fonts are incomplete on Windows 7 and on older Windows 10
 * builds. Rendering emoji as local Twemoji PNG files gives a stable result in
 * those environments.
 */

const VARIATION_SELECTOR_16 = 0xfe0f
const VARIATION_SELECTOR_15 = 0xfe0e
const COMBINING_ENCLOSING_KEYCAP = 0x20e3
const ZERO_WIDTH_JOINER = 0x200d
const SKIN_TONE_START = 0x1f3fb
const SKIN_TONE_END = 0x1f3ff
const REGIONAL_INDICATOR_START = 0x1f1e6
const REGIONAL_INDICATOR_END = 0x1f1ff
const TAG_START = 0xe0020
const TAG_END = 0xe007f

const codePointAt = (char: string): number | undefined => char.codePointAt(0)

const escapeHtmlAttr = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const emojiFileCache = new Map<string, string | null>()

const emojiToCodePoints = (emoji: string): string =>
  Array.from(emoji)
    .map((char) => char.codePointAt(0)?.toString(16).toLowerCase())
    .filter((codePoint): codePoint is string => Boolean(codePoint))
    .join('-')

const isVariationSelector = (codePoint?: number): boolean =>
  codePoint === VARIATION_SELECTOR_16 || codePoint === VARIATION_SELECTOR_15

const isSkinTone = (codePoint?: number): boolean =>
  codePoint !== undefined && codePoint >= SKIN_TONE_START && codePoint <= SKIN_TONE_END

const isRegionalIndicator = (codePoint?: number): boolean =>
  codePoint !== undefined &&
  codePoint >= REGIONAL_INDICATOR_START &&
  codePoint <= REGIONAL_INDICATOR_END

const isTagChar = (codePoint?: number): boolean =>
  codePoint !== undefined && codePoint >= TAG_START && codePoint <= TAG_END

const isKeycapBase = (codePoint?: number): boolean =>
  codePoint !== undefined &&
  ((codePoint >= 0x30 && codePoint <= 0x39) || codePoint === 0x23 || codePoint === 0x2a)

const isEmojiBase = (char: string): boolean => {
  if (!char) return false

  const codePoint = codePointAt(char)
  if (codePoint === undefined) return false

  return (
    (codePoint >= 0x1f000 && codePoint <= 0x1faff) ||
    (codePoint >= 0x2600 && codePoint <= 0x27bf) ||
    (codePoint >= 0x2300 && codePoint <= 0x23ff) ||
    (codePoint >= 0x2b00 && codePoint <= 0x2bff) ||
    (codePoint >= 0x2934 && codePoint <= 0x2935) ||
    codePoint === 0x203c ||
    codePoint === 0x2049 ||
    codePoint === 0x2122 ||
    codePoint === 0x2139 ||
    (codePoint >= 0x2194 && codePoint <= 0x21aa) ||
    (codePoint >= 0x25aa && codePoint <= 0x25fe) ||
    codePoint === 0x3030 ||
    codePoint === 0x303d ||
    codePoint === 0x3297 ||
    codePoint === 0x3299 ||
    isRegionalIndicator(codePoint)
  )
}

const isEmojiStart = (char: string, nextChar?: string): boolean => {
  const codePoint = codePointAt(char)
  const nextCodePoint = nextChar ? codePointAt(nextChar) : undefined

  return isEmojiBase(char) || (isKeycapBase(codePoint) && isVariationSelector(nextCodePoint))
}

const buildFallbackFileNames = (baseFileName: string): string[] => {
  const fallbackFiles = [baseFileName]

  if (baseFileName.includes('-fe0f')) {
    fallbackFiles.push(baseFileName.replace(/-fe0f/g, ''))
    fallbackFiles.push(baseFileName.replace(/-fe0f/g, '-fe0e'))
  } else if (baseFileName.includes('-fe0e')) {
    fallbackFiles.push(baseFileName.replace(/-fe0e/g, ''))
    fallbackFiles.push(baseFileName.replace(/-fe0e/g, '-fe0f'))
  } else if (!baseFileName.includes('-')) {
    fallbackFiles.push(`${baseFileName}-fe0f`)
    fallbackFiles.push(`${baseFileName}-fe0e`)
  }

  return [...new Set(fallbackFiles)]
}

const createEmojiPlaceholderTag = (emojiSequence: string): string => {
  const escapedEmoji = escapeHtmlAttr(emojiSequence)

  return `<span class="emoji-placeholder" role="img" aria-label="${escapedEmoji}" title="${escapedEmoji}"></span>`
}

const createEmojiImgTag = (emojiSequence: string, baseFileName: string): string => {
  const cachedFileName = emojiFileCache.get(baseFileName)

  if (cachedFileName === null) {
    return createEmojiPlaceholderTag(emojiSequence)
  }

  if (cachedFileName) {
    const escapedEmoji = escapeHtmlAttr(emojiSequence)
    return `<img src="/emoji/${cachedFileName}.png" alt="${escapedEmoji}" title="${escapedEmoji}" class="emoji-image" data-emoji-key="${baseFileName}" data-fallback="" />`
  }

  const fallbackFiles = buildFallbackFileNames(baseFileName)
  const fallbackAttr = fallbackFiles.slice(1).join(',')
  const escapedEmoji = escapeHtmlAttr(emojiSequence)

  return `<img src="/emoji/${baseFileName}.png" alt="${escapedEmoji}" title="${escapedEmoji}" class="emoji-image" data-emoji-key="${baseFileName}" data-fallback="${fallbackAttr}" />`
}

const readEmojiToken = (
  chars: string[],
  startIndex: number,
): { token: string; endIndex: number } => {
  let endIndex = startIndex + 1
  const firstCodePoint = codePointAt(chars[startIndex])

  if (isRegionalIndicator(firstCodePoint) && isRegionalIndicator(codePointAt(chars[endIndex]))) {
    return {
      token: chars.slice(startIndex, endIndex + 1).join(''),
      endIndex: endIndex + 1,
    }
  }

  const consumeOptionalParts = () => {
    while (endIndex < chars.length) {
      const codePoint = codePointAt(chars[endIndex])

      if (
        isVariationSelector(codePoint) ||
        isSkinTone(codePoint) ||
        isTagChar(codePoint) ||
        codePoint === COMBINING_ENCLOSING_KEYCAP
      ) {
        endIndex++
        continue
      }

      break
    }
  }

  consumeOptionalParts()

  while (
    endIndex + 1 < chars.length &&
    codePointAt(chars[endIndex]) === ZERO_WIDTH_JOINER &&
    isEmojiBase(chars[endIndex + 1])
  ) {
    endIndex += 2
    consumeOptionalParts()
  }

  return {
    token: chars.slice(startIndex, endIndex).join(''),
    endIndex,
  }
}

export const convertEmojiToImage = (text: string): string => {
  if (!text) return ''

  try {
    const chars = Array.from(text)
    let result = ''
    let i = 0

    while (i < chars.length) {
      const char = chars[i]

      if (isEmojiStart(char, chars[i + 1])) {
        const { token, endIndex } = readEmojiToken(chars, i)
        const fileName = emojiToCodePoints(token)
        result += createEmojiImgTag(token, fileName)
        i = endIndex
        continue
      }

      result += char
      i++
    }

    return result
  } catch (error) {

    return text
  }
}

export const initEmojiFallbackHandler = (): void => {
  document.addEventListener(
    'load',
    (event) => {
      const target = event.target as HTMLImageElement

      if (target.tagName !== 'IMG' || !target.classList.contains('emoji-image')) return

      const emojiKey = target.getAttribute('data-emoji-key')
      if (!emojiKey || emojiFileCache.has(emojiKey)) return

      const fileName = target.src
        .split('/')
        .pop()
        ?.replace(/\.png(?:\?.*)?$/, '')
      if (fileName) {
        emojiFileCache.set(emojiKey, fileName)
      }
    },
    true,
  )

  document.addEventListener(
    'error',
    (event) => {
      const target = event.target as HTMLImageElement

      if (target.tagName !== 'IMG' || !target.classList.contains('emoji-image')) return

      const emojiKey = target.getAttribute('data-emoji-key')
      const fallbackFiles = target.getAttribute('data-fallback')?.split(',').filter(Boolean) ?? []
      const nextFallback = fallbackFiles.shift()

      if (nextFallback) {
        target.src = `/emoji/${nextFallback}.png`
        target.setAttribute('data-fallback', fallbackFiles.join(','))
        return
      }

      if (emojiKey) {
        emojiFileCache.set(emojiKey, null)
      }

      const placeholder = document.createElement('span')
      placeholder.className = 'emoji-placeholder'
      placeholder.setAttribute('role', 'img')

      if (target.alt) {
        placeholder.setAttribute('aria-label', target.alt)
        placeholder.setAttribute('title', target.alt)
      }

      target.parentNode?.replaceChild(placeholder, target)
    },
    true,
  )
}

export const convertEmojiWithDebug = async (
  text: string,
): Promise<{
  html: string
  missing: string[]
}> => {
  if (!text) return { html: '', missing: [] }

  const missing: string[] = []
  const chars = Array.from(text)
  let result = ''
  let i = 0

  while (i < chars.length) {
    const char = chars[i]

    if (!isEmojiStart(char, chars[i + 1])) {
      result += char
      i++
      continue
    }

    const { token, endIndex } = readEmojiToken(chars, i)
    const baseFileName = emojiToCodePoints(token)
    const filesToCheck = buildFallbackFileNames(baseFileName)

    let foundFileName = ''
    for (const fileName of filesToCheck) {
      try {
        const response = await fetch(`/emoji/${fileName}.png`, { method: 'HEAD' })
        if (response.ok) {
          foundFileName = fileName
          break
        }
      } catch {
        continue
      }
    }

    if (foundFileName) {
      result += createEmojiImgTag(token, foundFileName)
    } else {
      missing.push(`${token} (${baseFileName})`)
      result += token
    }

    i = endIndex
  }

  return { html: result, missing }
}
