/**
 * URL 转换工具：MinIO 地址 → 代理地址 + 零信任令牌拼接
 *
 * 用于流式输出中展示的链接与点击打开时保持一致：
 *   http://<ip>:9000/path → https://sxzai.js/path?userToken=...&appToken=...
 */

const MINIO_ORIGIN_RE = /^http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:9000/

/**
 * 转换单个 MinIO 下载链接：域名映射 + 零信任令牌拼接
 *
 * 每次调用都会从 sessionStorage 读取最新令牌，先清除旧 token 参数再拼接新值，
 * 确保令牌时效性 —— 无论渲染时还是点击时调用，都使用当前最新的令牌。
 */
export const transformMinioUrl = (url: string): string => {
  let transformed = url.replace(MINIO_ORIGIN_RE, 'https://sxzai.js')

  // 先清除已有的 userToken / appToken 参数，确保每次使用最新令牌
  transformed = transformed
    .replace(/[?&]userToken=[^&]*/g, '')
    .replace(/[?&]appToken=[^&]*/g, '')
    // 清理可能残留的孤悬 ? 或 &
    .replace(/[?&]$/, '')

  const userToken = sessionStorage.getItem('rzzx_user_token')
  const appToken = sessionStorage.getItem('rzzx_app_token')
  if (userToken && appToken) {
    const sep = transformed.includes('?') ? '&' : '?'
    transformed += `${sep}userToken=${encodeURIComponent(userToken)}&appToken=${encodeURIComponent(appToken)}`
  }

  return transformed
}

/**
 * 将文本内容中所有 MinIO 原始链接替换为代理链接 + token
 * 在 markdown 渲染前调用，确保流式输出中展示的地址与点击打开一致
 */
export const transformMinioUrlsInText = (content: string): string => {
  if (!content) return content

  // 匹配 http://<ip>:9000/ 开头的完整 URL 路径
  const minioUrlRegex = /http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:9000\/[^\s<>"'`\]\)]*/g

  return content.replace(minioUrlRegex, (url) => transformMinioUrl(url))
}
