export interface NavItem {
  id: string
  label: string
  icon: string // Emoji 字符或图片路径
  link?: string | null
  children?: NavChildItem[]
  showHeader?: boolean // ✅ 是否显示头部栏，默认为 true
}

export interface NavChildItem {
  id: string
  label: string
  icon: string // Emoji 字符或图片路径
  link: string
  showHeader?: boolean // ✅ 是否显示头部栏，默认为 true
}

// 消息内容块类型
export interface MessageContentBlock {
  type: 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'process_text'
  content: string
  toolName?: string
  toolArgs?: any
  timestamp?: number
}

// 工具调用组（tool_call + tool_result 配对）
export interface ToolCallGroup {
  toolCall: MessageContentBlock
  toolResult?: MessageContentBlock
  isExpanded: boolean
}

/** 消息中携带的警员信息 */
export interface MessageOfficer {
  id: number
  officer_name: string
  skills?: Array<{ id: number; name: string }>
}

/** 消息中携带的 MCP 服务信息 */
export interface MessageMcp {
  id: number
  service_name: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  skill?: {
    name: string
    description?: string
    category?: string
  }
  skills?: Array<{
    name: string
    description?: string
    category?: string
  }>
  /** 选中的数字警员（含关联技能） */
  officers?: MessageOfficer[]
  /** 选中的 MCP 服务 */
  mcps?: MessageMcp[]
  contentBlocks?: MessageContentBlock[]
  toolCallGroups?: ToolCallGroup[]
  thinkingBlocks?: ThinkingBlock[]
  processTextBlocks?: ProcessTextBlock[]
  files?: Array<{
    file_id: string
    filename: string
    char_count: number
    preview: string
    size?: number
  }>
}

export interface MessageContentBlock {
  type: 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'process_text'
  content: string
  toolName?: string
  toolArgs?: any
  timestamp?: number
}

export interface ThinkingBlock {
  type: 'thinking'
  content: string
  timestamp: number
}

export interface ProcessTextBlock {
  type: 'process_text'
  content: string
  timestamp: number
}

export interface ToolCallGroup {
  toolCall: MessageContentBlock
  toolResult?: MessageContentBlock
  isExpanded: boolean
}

export interface HistoryItem {
  id: string
  title: string
  date: string
  messageCount?: number
}

export interface ChatState {
  messages: Message[]
  isTyping: boolean
  isStreaming: boolean // ✅ 新增：是否正在进行流式传输（控制发送按钮图标）
  currentHistoryId: string | null
}

export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

// ==================== 人员档案类型（从流式响应中解析） ====================

/** 人员档案 - 全息档案面板的动态数据模型 */
export interface PersonProfile {
  /** 是否检测到人员穿透响应 */
  detected: boolean
  /** 被查询人姓名 */
  name: string
  /** 性别 */
  gender: string
  /** 年龄 */
  age: string
  /** 身份证号 */
  idCard: string
  /** 婚姻状况 */
  maritalStatus: string
  /** 户籍地址 */
  address: string
  /** 联系电话 */
  phone: string
  /** 服务处所/工作单位 */
  workplace: string
  /** 参保状态 */
  insuranceStatus: string
  /** 人员分类标签（如：重点人员、前科人员等） */
  personType: string
  /** 家庭成员 */
  familyMembers: FamilyMember[]
  /** 风险等级 */
  riskLevel: PersonRiskLevel
  /** 风险描述 */
  riskSummary: string
  /** 重点关注事项 */
  riskItems: string[]
  /** 涉警涉情列表 */
  policeIncidents: PoliceIncident[]
  /** 警情数量 */
  incidentCount: number
  /** 情报信息数量 */
  intelligenceCount: number
  /** 情报线索列表 */
  intelligenceItems: IntelligenceItem[]
  /** 信访记录 */
  petitionRecords: PetitionRecord[]
  /** 轨迹信息 */
  trajectories: TrajectoryItem[]
  /** 核查项 */
  verifications: VerificationItem[]
  /** 管控等级 */
  controlLevel: string
  /** 其他核查情况原始文本（无法分类的剩余内容） */
  otherChecks: string
  /** 最后更新时间戳（触发响应式更新） */
  lastUpdated: number
  /** 已解析到的章节标题列表 */
  rawSections: string[]
}

export interface FamilyMember {
  relation: string
  name: string
  age: string
  note: string
}

export type PersonRiskLevel = 'high' | 'medium' | 'low' | 'none'

export interface PoliceIncident {
  time: string
  type: string
  description: string
}

export interface IntelligenceItem {
  time: string
  description: string
}

export interface PetitionRecord {
  time: string
  description: string
}

export interface TrajectoryItem {
  type: string
  detail: string
}

export interface VerificationItem {
  label: string
  passed: boolean
}
