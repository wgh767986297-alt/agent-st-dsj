const URL_START_RE = /https?:\/\//gi
const URL_CHAR_RE = /^[A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]$/
const URL_BOUNDARY_RE = /^[<>"'`)\]}]$/
const URL_STRUCTURAL_RE = /^[/:?#\[\]@!$&'()*+,;=%]$/
const URL_HARD_BOUNDARY_RE = /^[<>"'`\)\]}]$/

const isUrlChar = (char: string) => URL_CHAR_RE.test(char)
const isBoundary = (char: string) => URL_BOUNDARY_RE.test(char)
const isStructuralUrlChar = (char: string) => URL_STRUCTURAL_RE.test(char)

const isMarkdownStrongStart = (content: string, index: number): boolean => {
  if (content[index] !== '*' || content[index + 1] !== '*') {
    return false
  }

  const nextChar = content[index + 2] || ''
  return !!nextChar && !/\s|\*/.test(nextChar)
}

const findNextNonWhitespace = (content: string, index: number): number => {
  let current = index
  while (current < content.length && /\s/.test(content[current] || '')) {
    current += 1
  }
  return current
}

const collectUrlContinuation = (content: string, start: number): string => {
  let index = start
  let continuation = ''

  while (index < content.length) {
    const char = content[index] || ''

    if (char === '\r' || char === '\n' || URL_HARD_BOUNDARY_RE.test(char)) {
      break
    }

    if (isUrlChar(char) || /[ \t]/.test(char)) {
      continuation += char
      index += 1
      continue
    }

    break
  }

  return continuation
}

const looksLikeUrlContinuation = (content: string, start: number): boolean => {
  const continuation = collectUrlContinuation(content, start)

  return (
    /[/?#&=;%]/.test(continuation) ||
    /\.[A-Za-z0-9]{1,10}(?=$|[/?#&=;%\s]|\*\*)/.test(continuation)
  )
}

const getUrlWhitespaceAction = (
  content: string,
  whitespaceStart: number,
  previousUrlChar: string,
): 'remove' | 'encode' | 'break' => {
  const nextIndex = findNextNonWhitespace(content, whitespaceStart)
  const nextChar = content[nextIndex]

  if (isMarkdownStrongStart(content, nextIndex)) {
    return 'break'
  }

  if (!nextChar || !isUrlChar(nextChar)) {
    return 'break'
  }

  if (isStructuralUrlChar(previousUrlChar) || isStructuralUrlChar(nextChar)) {
    return 'remove'
  }

  return looksLikeUrlContinuation(content, nextIndex) ? 'encode' : 'break'
}

const normalizeUrlValue = (url: string): string => {
  const trimmedUrl = url.trim()
  let result = ''
  let index = 0

  while (index < trimmedUrl.length) {
    const char = trimmedUrl[index] || ''

    if (/\s/.test(char)) {
      const nextIndex = findNextNonWhitespace(trimmedUrl, index)
      const nextChar = trimmedUrl[nextIndex]
      const previousChar = result[result.length - 1] || ''

      if (!nextChar) {
        break
      }

      result += isStructuralUrlChar(previousChar) || isStructuralUrlChar(nextChar) ? '' : '%20'
      index = nextIndex
      continue
    }

    result += char
    index += 1
  }

  return result
}

const normalizeMarkdownLinks = (content: string): string => {
  return content.replace(/\[([^\]]+)\]\(([^)]*)\)/g, (match, text: string, url: string) => {
    const trimmedUrl = url.trim()
    const angleWrapped = trimmedUrl.startsWith('<') && trimmedUrl.endsWith('>')
    const rawUrl = angleWrapped ? trimmedUrl.slice(1, -1).trim() : trimmedUrl

    if (!/^https?:\/\//i.test(rawUrl)) {
      return match
    }

    const normalizedUrl = normalizeUrlValue(rawUrl)

    return `[${text}](${angleWrapped ? `<${normalizedUrl}>` : normalizedUrl})`
  })
}

const normalizePlainUrls = (content: string): string => {
  let result = ''
  let cursor = 0

  for (const match of content.matchAll(URL_START_RE)) {
    const start = match.index ?? 0

    if (start < cursor) {
      continue
    }

    let index = start
    let normalizedUrl = ''
    let previousUrlChar = ''
    let needsMarkdownBoundary = false

    while (index < content.length) {
      const char = content[index] || ''

      if (isMarkdownStrongStart(content, index)) {
        needsMarkdownBoundary = true
        break
      }

      if (isUrlChar(char)) {
        normalizedUrl += char
        previousUrlChar = char
        index += 1
        continue
      }

      if (/\s/.test(char)) {
        const whitespaceAction = getUrlWhitespaceAction(content, index, previousUrlChar)
        if (whitespaceAction === 'break') {
          break
        }

        if (whitespaceAction === 'encode') {
          normalizedUrl += '%20'
        }

        index = findNextNonWhitespace(content, index)
        continue
      }

      if (isBoundary(char) || /\s/.test(char) || /[\u4e00-\u9fff]/.test(char)) {
        break
      }

      break
    }

    result += content.slice(cursor, start) + normalizedUrl + (needsMarkdownBoundary ? ' ' : '')
    cursor = index
  }

  return result + content.slice(cursor)
}

export const normalizeStreamingUrls = (content: string): string => {
  if (!content) {
    return content
  }

  return normalizePlainUrls(normalizeMarkdownLinks(content))
}
