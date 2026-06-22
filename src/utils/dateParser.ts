// src/utils/dateParser.ts

/**
 * 日期范围接口
 */
export interface DateRange {
  start: string
  end: string
}

/**
 * 将数字补零为两位数
 * @param value - 需要补零的数字
 * @returns 补零后的字符串，例如：5 -> "05"
 */
function pad2(value: number): string {
  return value.toString().padStart(2, '0')
}

/**
 * 解析中文日期字符串
 * 支持格式：
 * - "2024年1月15日" -> "2024-01-15"
 * - "1月15日" -> "2024-01-15"（使用默认年份）
 * - "2024年1月" -> "2024-01-01"
 * - "2024年" -> "2024-01-01"
 *
 * @param text - 包含中文日期的文本
 * @param defaultYear - 默认年份，默认为当前年份
 * @returns 格式化后的日期字符串（YYYY-MM-DD），解析失败返回 null
 */
export function parseChineseDate(
  text: string,
  defaultYear = new Date().getFullYear(),
): string | null {
  // 匹配完整日期：2024年1月15日
  const fullDateMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
  if (fullDateMatch) {
    const year = Number(fullDateMatch[1])
    const month = Number(fullDateMatch[2])
    const day = Number(fullDateMatch[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`
    }
  }

  // 匹配月日：1月15日
  const monthDayMatch = text.match(/(\d{1,2})月(\d{1,2})日/)
  if (monthDayMatch) {
    const year = defaultYear
    const month = Number(monthDayMatch[1])
    const day = Number(monthDayMatch[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`
    }
  }

  // 匹配年月：2024年1月
  const yearMonthMatch = text.match(/(\d{4})年(\d{1,2})月/)
  if (yearMonthMatch) {
    const year = Number(yearMonthMatch[1])
    const month = Number(yearMonthMatch[2])
    if (month >= 1 && month <= 12) {
      return `${year}-${pad2(month)}-01`
    }
  }

  // 匹配年份：2024年
  const yearOnlyMatch = text.match(/(\d{4})年/)
  if (yearOnlyMatch) {
    return `${yearOnlyMatch[1]}-01-01`
  }

  return null
}

/**
 * 从消息文本中提取日期范围
 * 支持多种时间表达方式：
 *
 * 1. 明确日期范围："2024年1月1日到2024年1月31日"
 * 2. 单个日期："2024年1月15日"
 * 3. 月日："1月15日"
 * 4. 相对时间："最近7天"、"近3周"、"最近2个月"、"近1年"
 * 5. 周期表达："本月"、"上月"、"本周"、"上周"、"本年"、"去年"
 *
 * @param message - 用户输入的消息文本
 * @returns 日期范围对象 { start: string, end: string }，解析失败返回 null
 *
 * @example
 * extractDateRange("上个月的两欠情况")
 * // => { start: "2024-11-01", end: "2024-11-30" }
 *
 * extractDateRange("最近7天的警情")
 * // => { start: "2024-12-08", end: "2024-12-14" }
 */
export function extractDateRange(message: string): DateRange | null {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // 1. 匹配日期范围："2024年1月1日到2024年1月31日"
  const rangeMatch = message.match(
    /((?:\d{4}年)?\d{1,2}月\d{1,2}日?)到((?:\d{4}年)?\d{1,2}月\d{1,2}日?)/,
  )
  if (rangeMatch) {
    const start = parseChineseDate(rangeMatch[1])
    const end = parseChineseDate(rangeMatch[2])
    if (start && end) {
      return { start, end }
    }
  }

  // 2. 匹配单个完整日期："2024年1月15日"
  const singleDateMatch = message.match(/(\d{4}年\d{1,2}月\d{1,2}日)/)
  if (singleDateMatch) {
    const date = parseChineseDate(singleDateMatch[1])
    if (date) {
      return { start: date, end: date }
    }
  }

  // 3. 匹配月日："1月15日"
  const monthDayMatch = message.match(/(\d{1,2})月(\d{1,2})日/)
  if (monthDayMatch) {
    const date = parseChineseDate(monthDayMatch[0])
    if (date) {
      return { start: date, end: date }
    }
  }

  // 4. 匹配相对时间："最近7天"、"近3周"等
  const relativeMatch = message.match(/(?:最近|近)(\d+)(天|周|月|年)/)
  if (relativeMatch) {
    const count = Number(relativeMatch[1])
    const unit = relativeMatch[2]
    const end = today
    const startDate = new Date(now.getTime())

    switch (unit) {
      case '天':
        startDate.setDate(startDate.getDate() - count + 1)
        break
      case '周':
        startDate.setDate(startDate.getDate() - count * 7 + 1)
        break
      case '月':
        startDate.setMonth(startDate.getMonth() - count)
        startDate.setDate(1)
        break
      case '年':
        startDate.setFullYear(startDate.getFullYear() - count)
        startDate.setMonth(0, 1)
        break
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end,
    }
  }

  // 5. 匹配周期表达："本月"、"上月"、"本周"等
  const periodMatch = message.match(/(本月|上月|本周|上周|本年|去年)/)
  if (periodMatch) {
    const period = periodMatch[1]
    const year = now.getFullYear()
    const month = now.getMonth()
    const weekday = now.getDay()
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday

    switch (period) {
      case '本月': {
        const start = new Date(year, month, 1)
        const end = new Date(year, month + 1, 0)
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        }
      }
      case '上月': {
        const start = new Date(year, month - 1, 1)
        const end = new Date(year, month, 0)
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        }
      }
      case '本周': {
        const start = new Date(now)
        start.setDate(now.getDate() + mondayOffset)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        }
      }
      case '上周': {
        const start = new Date(now)
        start.setDate(now.getDate() + mondayOffset - 7)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        }
      }
      case '本年': {
        return {
          start: `${year}-01-01`,
          end: `${year}-12-31`,
        }
      }
      case '去年': {
        return {
          start: `${year - 1}-01-01`,
          end: `${year - 1}-12-31`,
        }
      }
    }
  }

  return null
}
