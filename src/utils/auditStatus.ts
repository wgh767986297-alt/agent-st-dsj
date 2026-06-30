/**
 * 统一审核/上架状态码工具
 *
 * 三个资源（技能、MCP、数字警员）共用同一套状态码：
 *   00 — 静默状态（默认，未提交任何审核申请）
 *   01 — 申请上架审核中
 *   02 — 申请上架成功（已上架）
 *   03 — 申请上架驳回
 *   04 — 申请下架审核中
 *   05 — 申请下架成功（已下架）
 *   06 — 申请下架驳回
 *
 * 审计字段码（super_audit_status / dept_audit_status）：
 *   '00' = 静默/待审核   '01' = 审核中   '02' = 通过
 *   '03' = 驳回         '04' = 下架审核中  '05' = 下架成功  '06' = 下架驳回
 *
 * 判断优先级（从上到下依次匹配，命中即停止）：
 *   1. _source 判断 — 非当前用户创建 → 隐藏所有操作按钮（在各视图层处理）
 *   2. super + dept 均为 '00' 或 任一为 '03' → 00/03 状态
 *   3. super 或 dept 任一为 '01' 或 '04' → 01/04 状态（审核中）
 *   4. super === '02' → 已上架
 *   5. super === '05' → 已下架
 *   6. super 或 dept 任一为 '06' → 下架被驳回
 */

export const AuditStatus = {
  SILENT: '00',              // 静默状态（可申请上架）
  PUBLISH_PENDING: '01',     // 申请上架审核中
  PUBLISHED: '02',           // 申请上架成功（已上架）
  PUBLISH_REJECTED: '03',    // 申请上架驳回
  UNPUBLISH_PENDING: '04',   // 申请下架审核中
  UNPUBLISHED: '05',         // 申请下架成功（已下架）
  UNPUBLISH_REJECTED: '06',  // 申请下架驳回
} as const

export type AuditStatusCode = (typeof AuditStatus)[keyof typeof AuditStatus]

/** 状态码 → 展示文本 */
export const AuditStatusLabel: Record<string, string> = {
  '00': '可申请上架',
  '01': '上架审核中',
  '02': '已上架',
  '03': '上架被驳回',
  '04': '下架审核中',
  '05': '已下架',
  '06': '下架被驳回',
}

/** 状态码 → CSS class */
export const AuditStatusClass: Record<string, string> = {
  '00': 'ds-tag-approved',   // 静默 → 正常
  '01': 'ds-tag-pending',    // 上架审核中
  '02': 'ds-tag-approved',   // 已上架
  '03': 'ds-tag-rejected',   // 上架驳回
  '04': 'ds-tag-pending',    // 下架审核中
  '05': 'ds-tag-approved',   // 已下架（正常终态）
  '06': 'ds-tag-rejected',   // 下架驳回
}

// ========== 类型归一化 ==========

function normalizeCode(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return ''
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return ''
    return String(raw).padStart(2, '0')
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    if (/^\d{2}$/.test(trimmed)) return trimmed
    if (/^\d$/.test(trimmed)) return trimmed.padStart(2, '0')
    return trimmed
  }
  return ''
}

// ========== 按钮可见性 ==========

export interface ButtonVisibility {
  showPublish: boolean
  showUnpublish: boolean
  showEdit: boolean
  showDelete: boolean
}

/**
 * 根据统一状态码返回操作按钮可见性
 *
 * 规则对应关系（与 getStatus 的优先级匹配）：
 *   00 静默/可申请上架 → 申请上架 + 编辑 + 删除
 *   01 上架审核中     → 全部隐藏（等待审核结果）
 *   02 已上架         → 仅申请下架
 *   03 上架被驳回     → 申请上架 + 编辑 + 删除（修改后可重新申请）
 *   04 下架审核中     → 全部隐藏（等待审核结果）
 *   05 已下架         → 申请上架 + 编辑 + 删除（可重新上架或清理）
 *   06 下架被驳回     → 全部隐藏（驳回后不允许操作，需联系管理员）
 */
export function getButtonVisibility(item: {
  is_public?: unknown
  status?: unknown
  super_audit_status?: unknown
  dept_audit_status?: unknown
  super_delete_audit_status?: unknown
  dept_delete_audit_status?: unknown
}): ButtonVisibility {
  const status = getStatus(item)

  switch (status) {
    case AuditStatus.SILENT:            // 00 静默 → 可申请上架 + 编辑 + 删除
      return { showPublish: true, showUnpublish: false, showEdit: true, showDelete: true }
    case AuditStatus.PUBLISH_PENDING:   // 01 上架审核中 → 全部隐藏
      return { showPublish: false, showUnpublish: false, showEdit: false, showDelete: false }
    case AuditStatus.PUBLISHED:         // 02 已上架 → 仅申请下架
      return { showPublish: false, showUnpublish: true, showEdit: false, showDelete: false }
    case AuditStatus.PUBLISH_REJECTED:  // 03 上架被驳回 → 申请上架 + 编辑 + 删除
      return { showPublish: true, showUnpublish: false, showEdit: true, showDelete: true }
    case AuditStatus.UNPUBLISH_PENDING: // 04 下架审核中 → 全部隐藏
      return { showPublish: false, showUnpublish: false, showEdit: false, showDelete: false }
    case AuditStatus.UNPUBLISHED:       // 05 已下架 → 申请上架 + 编辑 + 删除
      return { showPublish: true, showUnpublish: false, showEdit: true, showDelete: true }
    case AuditStatus.UNPUBLISH_REJECTED:// 06 下架被驳回 → 全部隐藏（关键修复：之前错误地显示了申请下架）
      return { showPublish: false, showUnpublish: false, showEdit: false, showDelete: false }
    default:
      // 未知状态默认可申请上架 + 编辑 + 删除
      return { showPublish: true, showUnpublish: false, showEdit: true, showDelete: true }
  }
}

/**
 * 从资源对象中提取统一状态码（00-06）
 *
 * 判断规则（按优先级依次判断，命中即停止）：
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ 规则2: super 和 dept 均为 '00'，或任一为 '03'                     │
 * │   → 均为 '00' 返回 00（可申请上架）                               │
 * │   → 任一 '03' 返回 03（上架被驳回）                               │
 * │   → 按钮: 申请上架 + 编辑 + 删除                                  │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 规则3: super 或 dept 任一为 '01' 或 '04'                          │
 * │   → '01' 返回 01（上架审核中），'04' 返回 04（下架审核中）         │
 * │   → 按钮: 全部隐藏                                               │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 规则4: super === '02'                                            │
 * │   → 返回 02（已上架）                                             │
 * │   → 按钮: 仅申请下架                                              │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 规则5: super === '05'                                            │
 * │   → 返回 05（已下架）                                             │
 * │   → 按钮: 申请上架 + 编辑 + 删除                                  │
 * ├─────────────────────────────────────────────────────────────────┤
 * │ 规则6: super 或 dept 任一为 '06'                                  │
 * │   → 返回 06（下架被驳回）                                         │
 * │   → 按钮: 全部隐藏                                               │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * 重要前提：调用方需要先判断 _source 字段。
 * 如果 _source !== 'created'（即非当前用户创建），应直接隐藏所有按钮，
 * 无需调用此函数。此逻辑在各视图层的 hasXxxActions / getMineButtonVis 中实现。
 */
export function getStatus(item: {
  status?: unknown
  is_public?: unknown
  super_audit_status?: unknown
  dept_audit_status?: unknown
  super_delete_audit_status?: unknown
  dept_delete_audit_status?: unknown
}): string {
  const sup = normalizeCode(item.super_audit_status)
  const dept = normalizeCode(item.dept_audit_status)

  // ── 规则2: 两个状态都是'00'，或者其中有一个状态是'03' ──
  // '00' → 可申请上架（静默状态，用户可自由编辑/删除/申请上架）
  // '03' → 上架被驳回（用户修改后可重新申请上架）
  if ((dept === '00' && sup === '00') || dept === '03' || sup === '03') {
    if (dept === '03' || sup === '03') {
      return AuditStatus.PUBLISH_REJECTED // '03' 上架被驳回
    }
    return AuditStatus.SILENT // '00' 可申请上架
  }

  // ── 规则3: 两个状态有一个是'01'或者是'04' ──
  // '01' → 上架审核中（等待部门或超管审核，不允许任何操作）
  // '04' → 下架审核中（等待部门或超管审核，不允许任何操作）
  if (dept === '01' || sup === '01') {
    return AuditStatus.PUBLISH_PENDING // '01' 上架审核中
  }
  if (dept === '04' || sup === '04') {
    return AuditStatus.UNPUBLISH_PENDING // '04' 下架审核中
  }

  // ── 规则4: super_audit_status 是 '02' ──
  // '02' → 已上架（仅允许申请下架）
  if (sup === '02') {
    return AuditStatus.PUBLISHED // '02' 已上架
  }

  // ── 规则5: super_audit_status 是 '05' ──
  // '05' → 已下架（可重新申请上架、编辑、删除）
  if (sup === '05') {
    return AuditStatus.UNPUBLISHED // '05' 已下架
  }

  // ── 规则6: 两个状态有一个是'06' ──
  // '06' → 下架被驳回（需联系管理员处理，不允许任何操作）
  if (dept === '06' || sup === '06') {
    return AuditStatus.UNPUBLISH_REJECTED // '06' 下架被驳回
  }

  // ── 默认: 静默状态 ──
  // 当 super_audit_status 和 dept_audit_status 均为空或无效值时，
  // 视为新创建的资源，尚未提交任何审核
  return AuditStatus.SILENT // '00'
}
