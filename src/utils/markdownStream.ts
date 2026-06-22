const MARKDOWN_BOUNDARY_PUNCTUATION = String.raw`.,;:!?\u3001\u3002\uff0c\uff1b\uff1a\uff01\uff1f`
const MARKDOWN_CLOSING_BRACKETS = String.raw`\)\]\}\uff09\u3011\u300b\u300d\u300f\u3009\uff3d\uff5d`
const MARKDOWN_CLOSING_QUOTES = String.raw`"'\u201d\u2019`
const MARKDOWN_CLOSING_BOUNDARY = `[${MARKDOWN_BOUNDARY_PUNCTUATION}${MARKDOWN_CLOSING_BRACKETS}${MARKDOWN_CLOSING_QUOTES}]`
const MARKDOWN_TEXT_AFTER_STRONG = String.raw`[A-Za-z0-9_\u4e00-\u9fff]`

const closingBoundaryBeforeStrong = new RegExp(
  `(${MARKDOWN_CLOSING_BOUNDARY})[ \\t]+\\*\\*(?=${MARKDOWN_TEXT_AFTER_STRONG})`,
  'g',
)

const spacedClosingBoundaryBeforeStrong = new RegExp(
  `(${MARKDOWN_CLOSING_BOUNDARY})[ \\t]+\\*[ \\t]+\\*(?=${MARKDOWN_TEXT_AFTER_STRONG})`,
  'g',
)

const punctuationBeforeAdjacentStrong = new RegExp(
  `(${MARKDOWN_CLOSING_BOUNDARY})\\*\\*(?=${MARKDOWN_TEXT_AFTER_STRONG})`,
  'g',
)

export const normalizeStreamingMarkdown = (content: string): string =>
  content
    .replace(/(^|[^\S\r\n])\*\*[ \t]+(?=\S)/g, '$1**')
    .replace(/(^|[^\S\r\n])\*[ \t]+\*(?=\S)/g, '$1**')
    .replace(/([^\s*])[ \t]+\*\*(?=$|[^\S\r\n]|[.,;:!?，。；：！？）)\]])/g, '$1**')
    .replace(/([^\s*])[ \t]+\*[ \t]+\*(?=$|[^\S\r\n]|[.,;:!?，。；：！？）)\]])/g, '$1**')
    .replace(/(\S)\*[ \t]+\*(?=$|[^\S\r\n]|[.,;:!?，。；：！？）)\]])/g, '$1**')
    .replace(closingBoundaryBeforeStrong, '$1**')
    .replace(spacedClosingBoundaryBeforeStrong, '$1**')
    .replace(punctuationBeforeAdjacentStrong, '$1**<!-- -->')
