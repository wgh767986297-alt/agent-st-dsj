// src/utils/fileUtils.ts

/**
 * 根据文件扩展名获取对应的图标路径
 *
 * @param filename - 文件名（包含扩展名）
 * @returns 图标文件的 URL 地址
 *
 * @example
 * getFileIcon('document.pdf') // => '/src/assets/icons/files/icon-file-pdf.png'
 * getFileIcon('data.xlsx')    // => '/src/assets/icons/files/icon-file-excel.png'
 * getFileIcon('unknown.xyz')  // => '/src/assets/icons/files/icon-file-default.png'
 */
export function getFileIcon(filename: string): string {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))

  const iconMap: Record<string, string> = {
    '.pdf': new URL('@/assets/icons/files/icon-file-pdf.png', import.meta.url).href,
    '.doc': new URL('@/assets/icons/files/icon-file-word.png', import.meta.url).href,
    '.docx': new URL('@/assets/icons/files/icon-file-word.png', import.meta.url).href,
    '.xls': new URL('@/assets/icons/files/icon-file-excel.png', import.meta.url).href,
    '.xlsx': new URL('@/assets/icons/files/icon-file-excel.png', import.meta.url).href,
    '.csv': new URL('@/assets/icons/files/icon-file-excel.png', import.meta.url).href,
    '.ppt': new URL('@/assets/icons/files/icon-file-ppt.png', import.meta.url).href,
    '.pptx': new URL('@/assets/icons/files/icon-file-ppt.png', import.meta.url).href,
    '.txt': new URL('@/assets/icons/files/icon-file-txt.png', import.meta.url).href,
    '.md': new URL('@/assets/icons/files/icon-file-txt.png', import.meta.url).href,
    '.markdown': new URL('@/assets/icons/files/icon-file-txt.png', import.meta.url).href,
    '.html': new URL('@/assets/icons/files/icon-file-html.png', import.meta.url).href,
    '.htm': new URL('@/assets/icons/files/icon-file-html.png', import.meta.url).href,
    '.xhtml': new URL('@/assets/icons/files/icon-file-html.png', import.meta.url).href,
    '.json': new URL('@/assets/icons/files/icon-file-config.png', import.meta.url).href,
    '.yaml': new URL('@/assets/icons/files/icon-file-config.png', import.meta.url).href,
    '.yml': new URL('@/assets/icons/files/icon-file-config.png', import.meta.url).href,
    '.toml': new URL('@/assets/icons/files/icon-file-config.png', import.meta.url).href,
    '.ini': new URL('@/assets/icons/files/icon-file-config.png', import.meta.url).href,
    '.env': new URL('@/assets/icons/files/icon-file-config.png', import.meta.url).href,
    '.conf': new URL('@/assets/icons/files/icon-file-config.png', import.meta.url).href,
    '.config': new URL('@/assets/icons/files/icon-file-config.png', import.meta.url).href,
    '.properties': new URL('@/assets/icons/files/icon-file-config.png', import.meta.url).href,
    '.xml': new URL('@/assets/icons/files/icon-file-config.png', import.meta.url).href,
    '.js': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.jsx': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.ts': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.tsx': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.vue': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.css': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.scss': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.less': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.py': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.java': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.c': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.cpp': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.h': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.hpp': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.cs': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.go': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.rs': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.php': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.rb': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.swift': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.kt': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.kts': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.dart': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.sh': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.bat': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    '.ps1': new URL('@/assets/icons/files/icon-file-code.png', import.meta.url).href,
    // ✅ 图片类型 - 扩展支持更多格式
    '.png': new URL('@/assets/icons/files/icon-file-img.png', import.meta.url).href,
    '.jpg': new URL('@/assets/icons/files/icon-file-img.png', import.meta.url).href,
    '.jpeg': new URL('@/assets/icons/files/icon-file-img.png', import.meta.url).href,
    '.gif': new URL('@/assets/icons/files/icon-file-img.png', import.meta.url).href,
    '.webp': new URL('@/assets/icons/files/icon-file-img.png', import.meta.url).href,
    '.svg': new URL('@/assets/icons/files/icon-file-img.png', import.meta.url).href,
    '.bmp': new URL('@/assets/icons/files/icon-file-img.png', import.meta.url).href,
  }

  return (
    iconMap[extension] ||
    new URL('@/assets/icons/files/icon-file-default.png', import.meta.url).href
  )
}
