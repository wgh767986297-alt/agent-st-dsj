/**
 * 流式人员档案解析器 v2
 *
 * 从 SSE 流式响应的半结构化文本中，增量提取结构化的人员档案信息。
 * 处理多种 AI 输出格式变体，不依赖固定模板。
 *
 * 支持的格式变体（基于采样数据）：
 * - 样例1：紧凑段落式（基本信息混排在一段，接警编号逐条列出）
 * - 样例2：编号章节 + markdown表格（家庭户表/警情表）
 * - 样例3：编号章节 + 部分嵌套表 + 无轨迹章节
 * - 样例4：编号章节 + 出生年份表 + 日期式轨迹
 */
import type {
  PersonProfile,
  FamilyMember,
  PoliceIncident,
  IntelligenceItem,
  PetitionRecord,
  TrajectoryItem,
  VerificationItem,
} from '@/types/chat'

// ==================== 工厂函数 ====================

function createEmptyProfile(): PersonProfile {
  return {
    detected: false,
    name: '',
    gender: '',
    age: '',
    idCard: '',
    maritalStatus: '',
    address: '',
    phone: '',
    workplace: '',
    insuranceStatus: '',
    personType: '',
    familyMembers: [],
    riskLevel: 'none',
    riskSummary: '',
    riskItems: [],
    policeIncidents: [],
    incidentCount: 0,
    intelligenceCount: 0,
    intelligenceItems: [],
    petitionRecords: [],
    trajectories: [],
    verifications: [],
    controlLevel: '',
    otherChecks: '',
    lastUpdated: 0,
    rawSections: [],
  }
}

// ==================== 工具函数 ====================

function extractFirst(text: string, regex: RegExp): string {
  const match = text.match(regex)
  return match?.[1]?.trim() || ''
}

function extractAll(text: string, regex: RegExp): RegExpExecArray[] {
  const results: RegExpExecArray[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g')
  while ((match = re.exec(text)) !== null) {
    results.push(match)
  }
  return results
}

function cleanText(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

/** 在全文范围内提取两个标记之间的文本 */
function extractSection(
  text: string,
  startPattern: RegExp,
  endPatterns: RegExp[],
): { found: boolean; content: string } {
  const startMatch = text.match(startPattern)
  if (!startMatch || startMatch.index === undefined) return { found: false, content: '' }

  const startIdx = startMatch.index
  let endIdx = text.length

  for (const ep of endPatterns) {
    const m = text.slice(startIdx + startMatch[0].length).match(ep)
    if (m && m.index !== undefined) {
      const candidate = startIdx + startMatch[0].length + m.index
      if (candidate < endIdx) endIdx = candidate
    }
  }

  return {
    found: true,
    content: text.slice(startIdx + startMatch[0].length, endIdx),
  }
}

/** 将 Markdown 表格行解析为单元格数组 */
function parseTableRows(text: string): string[][] {
  const rows: string[][] = []
  // 匹配形如 | cell1 | cell2 | cell3 | 的行
  const rowRegex = /^\|\s*(.+?)\s*\|$/gm
  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(text)) !== null) {
    const cells = match[1]
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c !== '')
    if (cells.length >= 2) {
      rows.push(cells)
    }
  }
  return rows
}

// ==================== 章节边界模式 ====================

/** 所有可能作为章节结束的标记（下一章节标题） */
const SECTION_BOUNDARY_PATTERNS = [
  /(?=二[、.\s]*家庭|三[、.\s]*风险|四[、.\s]*涉警|五[、.\s]*涉访|五[、.\s]*情报|六[、.\s]*轨迹|六[、.\s]*近期|七[、.\s]*信访|七[、.\s]*其他核查|八[、.\s]*其他核查)/,
  /\n(?=风险等级评估|\n*风险画像)/,
  /\n(?=涉警涉情)/,
  /\n(?=轨迹信息|近期轨迹)/,
  /\n(?=情报信息|情报线索)/,
  /\n(?=信访记录)/,
  /\n(?=其他核查情况|核查情况)/,
]

// ==================== 主解析器 ====================

export class PersonProfileParser {
  private buffer = ''
  private profile: PersonProfile = createEmptyProfile()

  feed(delta: string): PersonProfile {
    if (!delta) return this.profile

    this.buffer += delta
    const text = cleanText(this.buffer)

    // 检测
    this.profile.detected = this.isProfileDetected(text)
    if (!this.profile.detected) return this.profile

    // 全量重新解析（避免 chunk 边界截断关键字段）
    this.parseAll(text)

    this.profile.lastUpdated = Date.now()
    return { ...this.profile }
  }

  getProfile(): PersonProfile {
    return { ...this.profile }
  }

  reset(): void {
    this.buffer = ''
    this.profile = createEmptyProfile()
  }

  getBuffer(): string {
    return this.buffer
  }

  // ==================== 检测 ====================

  isProfileDetected(text?: string): boolean {
    const source = text || cleanText(this.buffer)

    // 模式1：显式标记
    if (/人员穿透|个人综合档案|人员穿透分析结果/.test(source)) return true

    // 模式2：被查询人 + 身份证号
    if (/被查询人[：:]/.test(source) && /身份证号[：:]/.test(source)) return true

    // 模式3：2个以上章节标记 + 身份证号
    const markers = [/基本信息/, /风险画像|风险等级评估/, /户籍地址/]
    const matches = markers.filter((re) => re.test(source)).length
    if (matches >= 2 && /身份证号|身份证号码/.test(source)) return true

    // 模式4：查询完成 + 人员信息
    if (/查询完成.*该身份证号码.*人员信息/.test(source)) return true

    return false
  }

  // ==================== 全量解析调度 ====================

  private parseAll(text: string): void {
    this.parseBasicInfo(text)
    this.parseFamilyMembers(text)
    this.parseRiskProfile(text)
    this.parsePoliceIncidents(text)
    this.parseIntelligence(text)
    this.parsePetitionRecords(text)
    this.parseTrajectories(text)
    this.parseVerifications(text)
    this.parseOtherChecks(text)
  }

  // ==================== 基本信息 ====================

  private parseBasicInfo(text: string): void {
    // --- 姓名 ---
    const namePatterns = [
      /被查询人[：:\s]+(\S{2,4})(?:[\s\n]|$|，|。)/,
      /查询完成[。.]该身份证号码对应人员信息如下[：:\s\n]*(\S{2,4})[，,]/,
      /人员穿透分析结果[\s\S]*?\n被查询人[：:\s]+(\S{2,4})/,
    ]
    for (const re of namePatterns) {
      const v = extractFirst(text, re)
      if (v) { this.profile.name = v; break }
    }

    // --- 身份证号 ---
    const idPatterns = [
      /身份证号[：:\s]+([\dXx*]{15,18})/,
      /身份证号码[：:\s]*([\dXx*]{15,18})/,
    ]
    for (const re of idPatterns) {
      const v = extractFirst(text, re)
      if (v) { this.profile.idCard = v; break }
    }

    // --- 姓名+性别+年龄（连写：徐正平，男，65 岁）---
    const nameGenderAge = text.match(/(\S{2,4})[，,]\s*([男女])[，,]\s*(\d+)\s*岁/)
    if (nameGenderAge) {
      if (!this.profile.name && nameGenderAge[1] !== '身份证号') this.profile.name = nameGenderAge[1]
      if (!this.profile.gender) this.profile.gender = nameGenderAge[2]
      if (!this.profile.age) this.profile.age = nameGenderAge[3]
    }

    // --- 性别年龄：男，63 岁 ---
    const gaMatch = text.match(/性别年龄[：:\s]+([男女])[，,\s]*(\d+)\s*岁/)
    if (gaMatch) {
      if (!this.profile.gender) this.profile.gender = gaMatch[1]
      if (!this.profile.age) this.profile.age = gaMatch[2]
    }

    // --- 性别 + 年龄（松散匹配） ---
    if (!this.profile.gender || !this.profile.age) {
      const looseGA = text.match(/([男女])[，,]\s*(\d+)\s*岁/)
      if (looseGA) {
        if (!this.profile.gender) this.profile.gender = looseGA[1]
        if (!this.profile.age) this.profile.age = looseGA[2]
      }
    }

    // --- 婚姻状况 ---
    const maritalPatterns = [
      /婚姻状况[：:\s]+(\S+?)(?:[\s\n]|$|，|。)/,
      /婚姻状况(\S+?)(?:[\s\n]|$|，|。)/,
    ]
    for (const re of maritalPatterns) {
      const v = extractFirst(text, re)
      if (v) { this.profile.maritalStatus = v; break }
    }

    // --- 户籍地址 ---
    // 支持: 户籍地址：XXX / 户籍地址为XXX / 户籍地址是XXX
    const addrPatterns = [
      /户籍地址[：:\s]*(.+?)(?:[。\n]|，无|，参保|，联系|，服务|，婚姻)/,
      /户籍地址为(.+?)(?:[。\n]|，无|，参保|，联系|，服务|，婚姻)/,
      /户籍地址是(.+?)(?:[。\n]|，无|，参保|，联系|，服务|，婚姻)/,
    ]
    for (const re of addrPatterns) {
      const v = extractFirst(text, re)
      if (v && v.length > 3 && v !== '无') { this.profile.address = v; break }
    }

    // --- 联系电话 ---
    const phonePatterns = [
      /联系电话[：:\s]+(\d[\d-]{6,})/,
      /电话[：:\s]+(\d[\d-]{6,})/,
    ]
    for (const re of phonePatterns) {
      const v = extractFirst(text, re)
      if (v) { this.profile.phone = v; break }
    }

    // --- 服务处所 ---
    const wpPatterns = [
      /服务处所[：:\s]+(.+?)(?:[\n]|$|，|。)/,
      /服务处所[：:\s]*(退休)(?:[\n]|$|，|。)/,
    ]
    for (const re of wpPatterns) {
      const v = extractFirst(text, re)
      if (v) { this.profile.workplace = v; break }
    }

    // --- 参保状态 ---
    const insPatterns = [
      /参保状态[：:\s]+(.+?)(?:[\n]|$|，|。)/,
      /参保(?:单位)?[：:\s]+(.+?)(?:[\n]|$|，|。)/,
    ]
    for (const re of insPatterns) {
      const v = extractFirst(text, re)
      if (v) { this.profile.insuranceStatus = v; break }
    }

    // "无参保单位和职业信息" → 紧凑格式
    if (!this.profile.insuranceStatus && /无参保(?:单位|信息)/.test(text)) {
      this.profile.insuranceStatus = '无参保单位'
    }
    if (!this.profile.workplace && /无[。，]*职业信息/.test(text)) {
      this.profile.workplace = '无'
    }

    // 标记章节
    if (/基本信息/.test(text) && !this.profile.rawSections.includes('basicInfo')) {
      this.profile.rawSections.push('basicInfo')
    }
    // 样例1没有"基本信息"标题，但是有姓名即视为基本信息已获取
    if (this.profile.name && !this.profile.rawSections.includes('basicInfo')) {
      this.profile.rawSections.push('basicInfo')
    }
  }

  // ==================== 家庭成员 ====================

  private parseFamilyMembers(text: string): void {
    const members: FamilyMember[] = []

    // 格式A：Markdown 表格
    const tableRows = parseTableRows(text)
    for (const cells of tableRows) {
      const headerCheck = cells[0] || ''
      if (/关系|姓名/.test(headerCheck)) continue // 跳过表头
      if (cells.length < 2) continue
      // 确保第一列看起来像关系（中文）
      if (!/^[一-龥]+$/.test(cells[0])) continue

      members.push({
        relation: cells[0] || '',
        name: cells[1] || '',
        age: cells[2] || '',
        note: cells.slice(3).join(' ') || '',
      })
    }

    // 格式B：文本 "家庭成员包括户主XXX本人及妻子XXX（女，1963年生，联系电话XXX）"
    if (members.length === 0) {
      const familyText =
        extractFirst(text, /家庭成员包括(.+?)(?:[。\n]|$)/) ||
        extractFirst(text, /家庭成员(.+?)(?:[。\n]|$)/)

      if (familyText) {
        // 按"及"和"、"拆分
        const parts = familyText.split(/[及、]/)
        for (const part of parts) {
          const trimmed = part.trim()
          if (!trimmed) continue

          // 提取关系关键词 + 姓名
          const relMatch = trimmed.match(
            /(户主|妻子|丈夫|儿子|女儿|儿媳|女婿|孙子|孙女|父亲|母亲|兄弟|姐妹|独生子|本人)?\s*(\S{2,4})/,
          )
          if (relMatch && relMatch[2]) {
            const member: FamilyMember = {
              relation: relMatch[1] || '家庭成员',
              name: relMatch[2],
              age: '',
              note: '',
            }
            // 年龄：支持"1963年生"(出生年份) 和 "57 岁"两种
            const ageYear = trimmed.match(/(\d{4})\s*年[生出]/)
            const ageNum = trimmed.match(/(\d+)\s*岁/)
            if (ageNum) member.age = ageNum[1] + ' 岁'
            else if (ageYear) member.age = ageYear[1] + ' 年生'

            // 电话
            const tel = trimmed.match(/(?:联系)?电话\s*(\d[\d-]*)/)
            if (tel) member.note = '电话 ' + tel[1]

            members.push(member)
          }
        }
      }
    }

    if (members.length > 0) {
      this.profile.familyMembers = members
      if (!this.profile.rawSections.includes('family')) {
        this.profile.rawSections.push('family')
      }
    }
  }

  // ==================== 风险画像 ====================

  private parseRiskProfile(text: string): void {
    // 查找风险章节的起始位置
    const riskStart = text.search(/风险画像|风险等级评估|风险特征/)
    if (riskStart === -1) return

    if (!this.profile.rawSections.includes('risk')) {
      this.profile.rawSections.push('risk')
    }

    // 提取风险章节文本（到下一个大章节或文末）
    const remaining = text.slice(riskStart)
    const endMatch = remaining.match(
      /\n(?=三[、.]|四[、.]|五[、.]|六[、.]|七[、.]|八[、.]|涉警涉情|轨迹信息|近期轨迹|情报|信访|核查情况)/
    )
    const sectionText = endMatch
      ? remaining.slice(0, endMatch.index! + riskStart - riskStart + 1)
      : remaining

    // --- 风险等级 ---
    if (!this.profile.riskLevel || this.profile.riskLevel === 'none') {
      if (/🔴|红色/.test(sectionText)) this.profile.riskLevel = 'high'
      else if (/🟡|黄色/.test(sectionText)) this.profile.riskLevel = 'medium'
      else if (/非涉恐.*非涉邪.*非涉毒/.test(sectionText)) this.profile.riskLevel = 'low'
    }

    // --- 风险摘要 ---
    // "该人员涉 X 起警情，Y 起情报信息..."
    const summaryMatch = sectionText.match(
      /该人员涉\s*\d+\s*起警情[\s\S]*?存在以下风险特征[：:]/,
    )
    if (summaryMatch) {
      this.profile.riskSummary = summaryMatch[0]
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    } else if (!this.profile.riskSummary) {
      // 兜底：用第一句话作为摘要
      const firstLine = sectionText.match(
        /该人员[^。\n]+(?:[。\n]|$)/,
      )
      if (firstLine) {
        this.profile.riskSummary = firstLine[0].trim()
      }
    }

    // --- 重点关注事项 ---
    const items: string[] = []

    // 数字编号列表 (1.xxx 2.xxx)
    const numItems = sectionText.match(/(\d+)[.、]\s*(.+?)(?=\n\d+[.、]|\n\n|\n(?=🟡|🔴)|$)/g)
    if (numItems) {
      for (const item of numItems) {
        const cleaned = item.replace(/^\d+[.、]\s*/, '').trim()
        if (cleaned && cleaned.length > 5 && !cleaned.includes('重点关注')) {
          items.push(cleaned)
        }
      }
    }

    // emoji 标记行 (🟡 xxx 或 🔴 xxx)
    const emojiLines = sectionText.match(/[🔴🟡]\s*(.+?)(?:\n|$)/g)
    if (emojiLines) {
      for (const line of emojiLines) {
        const content = line.replace(/[🔴🟡]\s*/, '').trim()
        if (
          content &&
          content.length > 3 &&
          !content.includes('重点关注') &&
          !items.some((i) => i.includes(content.slice(0, 8)))
        ) {
          items.push(content)
        }
      }
    }

    if (items.length > 0) {
      this.profile.riskItems = items
    }

    // --- 警情/情报数量 ---
    const incCount = sectionText.match(/涉\s*(\d+)\s*起警情/)
    if (incCount) this.profile.incidentCount = parseInt(incCount[1], 10)

    const intCount = sectionText.match(/(\d+)\s*起情报信息/)
    if (intCount) this.profile.intelligenceCount = parseInt(intCount[1], 10)
  }

  // ==================== 涉警涉情 ====================

  private parsePoliceIncidents(text: string): void {
    // 宽泛匹配章节标题（包括"涉警涉情情况（部分突出警情）"这种变体）
    if (!this.profile.rawSections.includes('policeIncidents')) {
      if (/涉警涉情/.test(text)) {
        this.profile.rawSections.push('policeIncidents')
      }
    }

    const incidents: PoliceIncident[] = []

    // 格式A：接警编号式（样例1）
    // "接警编号 20121026，警情类别邻里纠纷，接警时间 2012 年 10 月 26 日，描述..."
    const patternA =
      /接警编号\s*(\S+?)[，,\s]+警情类别\s*(\S+?)[，,\s]+接警时间\s*(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日)[，,](.+?)(?=接警编号|[\n\r]+\d{4}|\n\n|$)/g
    let mA: RegExpExecArray | null
    while ((mA = patternA.exec(text)) !== null) {
      incidents.push({
        time: mA[3]?.trim() || '',
        type: mA[2]?.trim() || '',
        description: mA[4]?.trim() || '',
      })
    }

    // 格式B：Markdown 表格（样例2/3/4）
    if (incidents.length === 0) {
      // 定位涉警涉情章节
      const policeStart = text.search(/涉警涉情/)
      if (policeStart !== -1) {
        const remaining = text.slice(policeStart)
        const endMatch = remaining.match(
          /\n(?=[一二三四五六七八九][、.]|情报|轨迹|信访|核查|$)/
        )
        const sectionText = endMatch ? remaining.slice(0, endMatch.index!) : remaining

        const rows = parseTableRows(sectionText)
        for (const cells of rows) {
          if (cells.length < 3) continue
          if (/时间|警情类型|简要情况/.test(cells[0])) continue
          if (/^\d{4}/.test(cells[0]) || /\d{4}-\d{2}/.test(cells[0])) {
            incidents.push({
              time: cells[0],
              type: cells[1],
              description: cells[2],
            })
          }
        }
      }
    }

    if (incidents.length > 0) {
      this.profile.policeIncidents = incidents
    }
  }

  // ==================== 情报线索 ====================

  private parseIntelligence(text: string): void {
    if (/情报信息|情报线索/.test(text) && !this.profile.rawSections.includes('intelligence')) {
      this.profile.rawSections.push('intelligence')
    }

    const items: IntelligenceItem[] = []

    // 日期：描述 格式
    const re = /(\d{4}-\d{2}-\d{2})[：:]\s*(.+?)(?=\n\d{4}-\d{2}-\d{2}|\n\n|\n[一二三四五六七八九]|$)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      items.push({ time: m[1], description: m[2].trim() })
    }

    if (items.length > 0) {
      this.profile.intelligenceItems = items
    }
  }

  // ==================== 信访记录 ====================

  private parsePetitionRecords(text: string): void {
    if (/信访记录/.test(text) && !this.profile.rawSections.includes('petition')) {
      this.profile.rawSections.push('petition')
    }

    const records: PetitionRecord[] = []

    const re = /(\d{4}-\d{2}-\d{2})[：:]\s*(.+?)(?=\n\d{4}-\d{2}-\d{2}|\n\n|\n[一二三四五六七八九]|$)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      records.push({ time: m[1], description: m[2].trim() })
    }

    if (records.length > 0) {
      this.profile.petitionRecords = records
    }
  }

  // ==================== 轨迹信息 ====================

  private parseTrajectories(text: string): void {
    if (/轨迹信息|近期轨迹/.test(text) && !this.profile.rawSections.includes('trajectory')) {
      this.profile.rawSections.push('trajectory')
    }

    const trajectories: TrajectoryItem[] = []

    // 格式A："XX轨迹：描述"（样例2：铁路轨迹：无相关轨迹记录）
    const trajA = /(\S{2,4}轨迹)[：:\s]+(.+?)(?:\n|，|。|$)/g
    let mA: RegExpExecArray | null
    while ((mA = trajA.exec(text)) !== null) {
      trajectories.push({ type: mA[1].trim(), detail: mA[2].trim() })
    }

    // 格式A2："无XX轨迹信息，无YY轨迹信息"（样例1紧凑格式）
    if (trajectories.length === 0) {
      const compactRe = /无(\S{2,4}轨迹)(?:信息|记录)?/g
      let mCompact: RegExpExecArray | null
      while ((mCompact = compactRe.exec(text)) !== null) {
        trajectories.push({ type: mCompact[1], detail: '无相关记录' })
      }
    }

    // 格式B：日期式轨迹（样例4：2026-06-06：乘坐 D2871 次列车从南京南前往镇江）
    const trajB = /(\d{4}-\d{2}-\d{2})[：:]\s*(乘坐\s*\S+\s*次列车[^\n。]+)/g
    let mB: RegExpExecArray | null
    while ((mB = trajB.exec(text)) !== null) {
      trajectories.push({
        type: '铁路出行',
        detail: `${mB[1]} ${mB[2]}`.trim(),
      })
    }

    // 格式C：其他出行记录
    const trajC = /(\d{4}-\d{2}-\d{2})[：:]\s*(.+?)(?=\n\d{4}-\d{2}-\d{2}|\n\n|\n[一二三四五六七八九]|$)/g
    let mC: RegExpExecArray | null
    while ((mC = trajC.exec(text)) !== null) {
      const detail = mC[2].trim()
      if (!trajectories.some((t) => t.detail.includes(mC![1]))) {
        trajectories.push({
          type: '出行记录',
          detail: `${mC[1]} ${detail}`,
        })
      }
    }

    if (trajectories.length > 0) {
      this.profile.trajectories = trajectories
    }
  }

  // ==================== 核查项 ====================

  private parseVerifications(text: string): void {
    if (
      /其他核查情况/.test(text) &&
      !this.profile.rawSections.includes('verification')
    ) {
      this.profile.rawSections.push('verification')
    }
    // 样例1没有"其他核查情况"标题，但风险等级评估里包含核查信息
    if (/风险等级评估/.test(text) && !this.profile.rawSections.includes('verification')) {
      this.profile.rawSections.push('verification')
    }

    const verifications: VerificationItem[] = []

    // ✅ 开头行
    const passedRe = /✅\s*(.+?)(?:\n|$)/g
    let m: RegExpExecArray | null
    while ((m = passedRe.exec(text)) !== null) {
      const label = m[1].trim()
      if (!verifications.some((v) => v.label === label)) {
        verifications.push({ label, passed: true })
      }
    }

    // 文本形式的核查清单
    if (verifications.length === 0) {
      const checkItems = [
        { regex: /非涉恐人员/, label: '非涉恐人员' },
        { regex: /非涉邪人员/, label: '非涉邪人员' },
        { regex: /非涉毒人员/, label: '非涉毒人员' },
        { regex: /无精神疾病信息/, label: '无精神疾病信息' },
        { regex: /无前科劣迹/, label: '无前科劣迹' },
        { regex: /无信访记录/, label: '无信访记录' },
        { regex: /无入所记录/, label: '无入所记录' },
        { regex: /非省厅一级管控涉稳重点人/, label: '非管控涉稳重点人' },
        { regex: /无个人极端及扬言/, label: '无个人极端及扬言' },
        { regex: /无.*?医保就诊/, label: '无医保就诊记录' },
      ]
      for (const item of checkItems) {
        if (item.regex.test(text)) {
          verifications.push({ label: item.label, passed: true })
        }
      }
    }

    if (verifications.length > 0) {
      this.profile.verifications = verifications
    }
  }

  // ==================== 其他核查情况 ====================

  private parseOtherChecks(text: string): void {
    const idx = text.search(/其他核查情况/)
    if (idx === -1) return

    const remaining = text.slice(idx + 6)
    const endMatch = remaining.match(/\n(?=[一二三四五六七八九][、.]|轨迹|信访|$)/)
    const content = endMatch ? remaining.slice(0, endMatch.index!) : remaining

    const cleaned = content.trim()
    if (cleaned && !this.profile.otherChecks) {
      this.profile.otherChecks = cleaned
    }
  }
}

// ==================== 单例 ====================

let globalParser: PersonProfileParser | null = null

export function getPersonProfileParser(): PersonProfileParser {
  if (!globalParser) {
    globalParser = new PersonProfileParser()
  }
  return globalParser
}

export function resetPersonProfileParser(): void {
  globalParser?.reset()
}
