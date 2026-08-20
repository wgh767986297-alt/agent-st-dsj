# 多智能体群聊前端对接指南

本文对应当前 `SXZAgent` 的多智能体群聊 MVP。接口前缀统一为
`/multi-agent`，默认本地地址为 `http://127.0.0.1:19000`。

当前实现是**同步闭环接口**：发送一条群消息后，HTTP 请求会一直等待
管理员决策、任务执行和最终汇总结束。现在没有 WebSocket、SSE、后台任务
提交、运行取消或断点恢复接口。

## 1. 前端首先要记住的约束

1. `POST /groups/{group_id}/messages` 不能按普通短接口设置 30 秒超时。
2. 提交期间应禁用当前群的发送按钮，禁止重复提交。
3. 不要自动重试创建员工、创建群聊、发送消息等 `POST/PATCH` 请求。
4. HTTP 200 只表示接口完成了处理，仍需检查 `data.run.status`。
5. 程序化 `@` 必须传 `mention_employee_ids`，不要依赖解析显示名称。
6. 模型生成的消息属于不可信内容，Markdown/HTML 必须经过安全渲染。
7. 当前 `usr`、`created_by`、`username` 不是鉴权凭证，不能据此做安全隔离。

## 2. 通用响应与错误格式

成功响应统一为：

```json
{
  "status": "success",
  "data": {}
}
```

当前创建、更新和执行成功均返回 HTTP 200，不返回 201 或 202。
前端业务代码应读取 `data`，同时允许服务端未来增加新的顶层字段。

失败响应采用 FastAPI 的 `detail`：

```json
{
  "detail": "group chat not found: ..."
}
```

参数校验失败时，`detail` 也可能是数组：

```json
{
  "detail": [
    {
      "type": "greater_than_equal",
      "loc": ["body", "timeout_seconds"],
      "msg": "Input should be greater than or equal to 10"
    }
  ]
}
```

建议统一封装：

```ts
type ApiSuccess<T> = {
  status: "success";
  data: T;
};

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail
          ? JSON.stringify(detail)
          : `HTTP ${response.status}`;
    throw new Error(message);
  }

  if (!body || typeof body !== "object") {
    throw new Error("API 返回格式错误");
  }
  return (body as ApiSuccess<T>).data;
}
```

时间字段通过 HTTP 返回时是 ISO 8601 字符串；UUID 在前端统一按 `string`
处理。客户端应忽略未知字段，避免后端增加字段时导致解析失败。

## 3. 推荐的 TypeScript 数据类型

以下类型覆盖正式页面需要使用的字段。列表接口和详情接口会附带不同的
关联字段，因此部分字段是可选的。

```ts
type UUID = string;

export interface DigitalEmployee {
  id: UUID;
  name: string;
  role_code: string;
  description: string;
  model_name: string | null;
  manager_eligible: boolean;
  enabled: boolean;
  usr: string | null;
  created_at: string;
  updated_at: string;
  role_name?: string;
  role_description?: string;
  role_enabled?: boolean;
  is_manager?: boolean;
}

export interface GroupSummary {
  id: UUID;
  name: string;
  purpose: string;
  manager_employee_id: UUID;
  manager_name: string;
  max_rounds: number;
  max_tasks_per_round: number;
  created_by: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface GroupDetail extends GroupSummary {
  members: DigitalEmployee[];
}

export type RunStatus =
  | "running"
  | "waiting_user"
  | "completed"
  | "failed";

export interface GroupRun {
  id: UUID;
  group_id: UUID;
  user_message_id: UUID | null;
  result_message_id: UUID | null;
  route_type: "managed" | "direct";
  status: RunStatus;
  current_round: number;
  max_rounds: number;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "queued" | "running" | "completed" | "failed";

export interface GroupTask {
  id: UUID;
  run_id: UUID;
  round_no: number;
  task_key: string;
  employee_id: UUID;
  employee_name: string;
  instruction: string;
  depends_on: string[];
  status: TaskStatus;
  result: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export type MessageType =
  | "chat"
  | "manager_plan"
  | "task_result"
  | "task_error"
  | "clarification"
  | "final";

export interface GroupMessage {
  id: UUID;
  group_id: UUID;
  run_id: UUID | null;
  sender_type: "user" | "employee" | "system";
  sender_employee_id: UUID | null;
  sender_name: string | null;
  content: string;
  message_type: MessageType | string;
  round_no: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RunBundle {
  run: GroupRun;
  tasks: GroupTask[];
  messages: GroupMessage[];
}
```

`task_key` 只保证在同一运行、同一轮内唯一。React/Vue 列表键建议使用：

```ts
`${task.run_id}:${task.round_no}:${task.task_key}`
```

不要只使用 `task_key`。

## 4. 接口清单

| 方法 | 路径 | 用途 | 前端注意点 |
|---|---|---|---|
| `GET` | `/agent_role/list?enabled=true` | 获取可选角色 | 返回 `data.list`，创建员工前使用 |
| `POST` | `/multi-agent/employees` | 创建数字员工 | `role_code` 必须已存在且启用 |
| `GET` | `/multi-agent/employees` | 员工列表 | 可传 `enabled`、`usr`、`manager_eligible` |
| `PATCH` | `/multi-agent/employees/{id}` | 更新或停用员工 | 停用使用 `{"enabled":false}` |
| `POST` | `/multi-agent/groups/manual` | 手动建群 | 管理员必须同时属于成员 |
| `POST` | `/multi-agent/groups/auto` | 自然语言建群 | 会调用模型，属于长请求 |
| `GET` | `/multi-agent/groups` | 群列表 | 默认只返回 `active` 群 |
| `GET` | `/multi-agent/groups/{id}` | 群详情 | 包含完整 `members` |
| `POST` | `/multi-agent/groups/{id}/messages` | 发送群消息 | 同步等待完整执行 |
| `GET` | `/multi-agent/groups/{id}/messages` | 获取最近群消息 | `limit` 为 1～500，返回顺序从旧到新 |
| `GET` | `/multi-agent/runs/{run_id}` | 获取运行和任务板 | 返回 `run/tasks/messages` |

开发环境还可以查看：

- Swagger UI：`http://127.0.0.1:19000/docs`
- OpenAPI JSON：`http://127.0.0.1:19000/openapi.json`

## 5. 数字员工页面

### 5.1 创建前加载角色

调用：

```http
GET /agent_role/list?enabled=true&page=1&page_size=200
```

角色列表位于 `data.list`。员工表单中的 `role_code` 应使用选择器，不建议让
普通用户手输。

创建员工请求：

```json
{
  "name": "研究员",
  "role_code": "research_readonly",
  "description": "负责资料研究和事实核验",
  "model_name": null,
  "manager_eligible": false,
  "enabled": true,
  "usr": "CURRENT_USER_ID"
}
```

字段注意事项：

- `name`：1～200 字符。
- `role_code`：1～100 字符，且对应角色必须启用。
- `manager_eligible`：表示该员工能否被选为群管理员。
- `enabled=false`：软停用；当前没有删除员工接口。
- `role_enabled=false`：角色本身已停用，即使员工仍为 `enabled=true`，
  也不能加入新群或执行任务。
- 更新接口会忽略值为 `null` 的字段，因此当前不能通过
  `{"model_name":null}` 清空模型配置；`description` 可以传空字符串清空。

员工选择器应同时过滤：

```ts
employee.enabled && employee.role_enabled
```

管理员选择器还要增加：

```ts
employee.manager_eligible
```

## 6. 创建群聊

### 6.1 手动创建

```json
{
  "name": "市场调研组",
  "purpose": "完成行业调研并形成报告",
  "manager_employee_id": "MANAGER_UUID",
  "member_employee_ids": [
    "MANAGER_UUID",
    "RESEARCHER_UUID",
    "WRITER_UUID"
  ],
  "max_rounds": 3,
  "max_tasks_per_round": 8,
  "created_by": "CURRENT_USER_ID"
}
```

前端应自动把管理员加入 `member_employee_ids`，避免让用户手动保持两个字段
一致。后端仍会再次校验：

- 管理员必须在成员中；
- 所有成员和角色都必须处于启用状态；
- 管理员必须为 `manager_eligible=true`；
- `max_rounds` 范围为 1～10；
- `max_tasks_per_round` 范围为 1～32。

### 6.2 自然语言创建

```json
{
  "description": "组建一个市场调研小组，完成研究、撰写和复核",
  "manager_employee_id": "MANAGER_UUID",
  "candidate_employee_ids": [
    "MANAGER_UUID",
    "RESEARCHER_UUID",
    "WRITER_UUID"
  ],
  "max_rounds": 3,
  "max_tasks_per_round": 8,
  "created_by": "CURRENT_USER_ID",
  "username": "当前用户显示名"
}
```

- `manager_employee_id` 可省略，此时从候选员工中自动选择可任管理员者。
- `candidate_employee_ids` 可省略；正式产品建议显式传入当前用户可见的候选
  员工，避免让模型面对过大的员工池。
- 该接口需要管理员模型完成一次选人，因此发送后显示“正在组建团队”，并
  禁用重复提交。

## 7. 发送消息和路由规则

### 7.1 交给管理员编排

```json
{
  "content": "调研目标行业，核验关键事实并形成结论",
  "mention_employee_ids": [],
  "usr": "CURRENT_USER_ID",
  "username": "当前用户显示名",
  "timeout_seconds": 1800
}
```

当 `mention_employee_ids` 为空，并且正文没有可解析的 `@群成员名` 时，
`route_type` 为 `managed`：

1. 管理员理解意图；
2. 管理员可以澄清、完成，或者创建 DAG 任务；
3. 不同员工可以并行，同一员工的任务串行；
4. 管理员可在 `max_rounds` 内继续判断；
5. 最后由管理员形成 `final` 消息。

### 7.2 直接 @ 员工

```json
{
  "content": "请先整理事实和来源",
  "mention_employee_ids": ["RESEARCHER_UUID"],
  "timeout_seconds": 1800
}
```

只要 `mention_employee_ids` 非空，结构化 ID 就具有最高优先级，消息直接
交给这些员工，不经过管理员拆解。API 支持一次选择多个员工，也允许直接
选择管理员；直接选择管理员时同样不会触发其编排职责。

直达模式没有统一的管理员 `final` 消息，每位员工分别产生
`task_result` 或 `task_error`。前端必须展示全部结果，不能只读取
`run.result_message_id`。

正文中的 `@员工名` 仅用于人工输入的便捷解析：

- 必须精确匹配当前群成员显示名；
- 重名、未知名字、已停用成员都会返回 422；
- 一旦传了 `mention_employee_ids`，应以 ID 为准，不再自行解析正文。

这意味着前端即使选择了“交给管理员”，只要正文中仍存在可解析的
`@员工名`，后端也会改走直达模式。当前协议没有显式的
`route_type: "managed"` 用来覆盖文本解析，因此正式页面应在管理员模式下
检测 `@` 并提示用户删除，或切换为直接发送。

API 虽允许直接选择管理员，但容易和“由管理员编排”混淆。推荐普通直达
选择器暂时排除管理员；“交给管理员”始终使用空 ID 列表和不含有效 `@` 的
正文。

推荐在输入框上方提供明确的路由选择：

| 选择项 | 请求字段 | 行为 |
|---|---|---|
| 交给管理员 | `mention_employee_ids: []` | 管理员澄清、拆解和汇总 |
| `@研究员` | `["研究员UUID"]` | 直接执行，不经过管理员 |
| `@研究员、@写作员` | 两个 UUID | 两位员工并行直达 |

## 8. 同步长请求的处理

`timeout_seconds` 是**每次智能体调用的执行等待上限**，不是整条 HTTP 请求
的总上限。多轮管理、多个串行任务的总耗时可能明显超过该值。

当前前端应采用以下策略：

1. 浏览器请求不要设置短超时；同时提高 Nginx、网关或负载均衡器的读取
   超时。
2. 当前群进入 `submitting` 状态，禁用发送按钮和快捷键。
3. 可以显示本地“处理中”占位消息，但不要在服务端消息列表中永久乐观插入。
4. 请求完成后，以响应中的 `RunBundle` 更新任务板，再重新拉取群消息。
5. 请求失败或浏览器断线后，刷新群消息；后端可能仍在继续执行。
6. `AbortController.abort()` 只能停止浏览器等待，不会取消后端任务。
7. 不要自动重试消息 `POST`。当前接口没有幂等键，重试可能生成重复运行。

后端同一群同一时间只允许一个 `running` 运行。其他客户端同时提交会收到
409。前端本地禁用只能改善当前页面体验，不能代替服务端冲突处理。

## 9. 状态和消息展示

### 9.1 运行状态

| 状态 | 含义 | 推荐 UI |
|---|---|---|
| `running` | 正在执行 | Spinner/处理中；禁止再次提交 |
| `waiting_user` | 管理员要求补充信息 | 高亮澄清消息，重新开放输入框 |
| `completed` | 编排流程已结束 | 展示最终消息和任务摘要 |
| `failed` | 运行失败或直达任务至少一个失败 | 错误状态，同时保留已成功结果 |

注意：

- HTTP 200 的 `data.run.status` 仍可能是 `failed`。
- 管理模式的 `completed` 也可能包含个别失败任务，因为管理员可能基于其余
  结果完成判断。任务面板仍需逐项查看 `task.status`。
- `waiting_user` 当前不能续接原运行。用户回答澄清问题时会创建一个新 Run，
  旧 Run 保持 `waiting_user`；后端只通过最近群消息把上下文带入新 Run。

### 9.2 任务状态

| 状态 | 含义 |
|---|---|
| `queued` | 已创建，等待依赖或员工执行 |
| `running` | 员工正在执行 |
| `completed` | 已产生 `result` |
| `failed` | 已产生 `error` |

任务应按 `round_no` 分组；`depends_on` 中存放同一轮任务的 `task_key`。
如果展示 DAG，应使用任务复合键解析依赖，不能跨轮按名字直接连接。

### 9.3 消息类型

| `message_type` | 默认展示方式 |
|---|---|
| `chat` | 用户普通消息 |
| `task_result` | 员工阶段结果，可折叠显示任务标签 |
| `task_error` | 员工任务失败，使用错误样式但不要吞掉 |
| `clarification` | 管理员澄清问题，强调需要用户回复 |
| `final` | 管理员最终答案，作为本轮主要结论 |
| `manager_plan` | 管理员内部 JSON 计划，默认隐藏 |

通用隐藏规则：

```ts
if (message.metadata?.visible === false) {
  return null;
}
```

`manager_plan` 可能包含内部提示和任务结构，只建议在管理员调试模式下展示。
消息接口已经按时间从旧到新返回最近 `limit` 条；前端无需再次反转。

## 10. HTTP 错误处理

| HTTP 状态 | 常见原因 | 前端处理 |
|---|---|---|
| `404` | 员工、群聊或运行不存在 | 返回列表页或刷新数据 |
| `409` | 群内已有运行；群已归档 | 禁止重复提交并提示用户 |
| `422` | UUID、成员、管理员、轮次或 `@名字` 校验失败 | 展示可操作的表单错误 |
| `503` | 数据库迁移未执行、模型或运行时不可用 | 提示服务暂不可用，不自动重试 POST |
| `504` | 智能体执行等待超时 | 提示超时，并刷新群消息确认实际状态 |
| `500` | 未分类服务端错误 | 记录请求上下文并提示稍后重试 |

不要只处理异常 HTTP 状态。发送消息成功返回后仍应执行：

```ts
const bundle = await apiRequest<RunBundle>(...);

if (bundle.run.status === "failed") {
  showRunError(bundle.run.error ?? "本轮执行失败");
}
```

直达多个员工时，即使一个任务失败，其他成功的 `task_result` 仍然有效，应
继续展示。

## 11. 推荐页面数据流

### 员工管理页

1. 加载 `/agent_role/list?enabled=true`。
2. 加载 `/multi-agent/employees`。
3. 创建或更新员工后，使员工列表缓存失效并重新获取。

### 新建群聊页

1. 从已启用员工中过滤候选成员。
2. 从候选成员中过滤 `manager_eligible=true` 的管理员。
3. 手动模式自动把管理员加入成员数组。
4. 自然语言模式提交期间锁定表单。
5. 创建成功后跳转到返回的群 ID。

### 群聊页

1. 加载群详情和最近消息。
2. 使用群详情中的成员 ID 构建路由选择器。
3. 提交期间仅锁定当前群。
4. 使用返回的 `RunBundle` 更新运行/任务面板。
5. 重新加载消息并滚动到最新可见消息。
6. `waiting_user` 时把澄清问题置顶，并恢复输入；明确标识下一条回复会开启
   新运行。

推荐缓存键：

```ts
["multi-agent", "employees"]
["multi-agent", "groups"]
["multi-agent", "group", groupId]
["multi-agent", "messages", groupId]
["multi-agent", "run", runId]
```

当前没有 `/groups/{id}/active-run`，因此页面刷新后无法主动确认群是否正在
执行，只能在再次发送时通过 409 发现冲突。消息接口也没有 cursor 或
`after_id`：

- 临时需要多端刷新时，可每 2～3 秒获取最近 100 条并按消息 UUID 去重；
- 标签页转入后台后暂停轮询或降低到 10～15 秒；
- 切换群聊时取消旧群的 GET 请求；
- 当前最多返回最近 500 条，不能把它当成完整历史分页。

## 12. 安全和上线限制

当前 API 配置了开放 CORS，且没有多智能体接口级身份认证。`usr`、
`created_by` 和 `username` 都来自请求体或查询参数，只能作为上下文和筛选
字段，不能证明用户身份。

正式上线前至少需要：

- 由后端从登录态或 Token 中获取用户 ID，而不是信任前端传值；
- 在员工、群聊、运行和消息查询中执行服务端租户/用户权限校验；
- 收紧 CORS 域名；
- 对模型 Markdown 做安全清洗，禁止直接使用 `dangerouslySetInnerHTML`；
- 不向普通用户展示 `manager_plan`、系统提示、密钥或工具参数；
- 高风险角色增加服务端审批，而不是只靠前端按钮确认。

## 13. 当前不要提前实现的能力

当前接口拿不到“刚提交就返回的 run ID”，所以无法实现可靠的实时任务进度。
正式需要进度条、断线恢复或取消时，应先升级后端契约：

1. `POST /messages` 改为返回 `202 + run_id`；
2. 增加群活动 Run 查询；
3. 使用 `GET /runs/{run_id}` 轮询，或增加 SSE 事件流；
4. 为消息列表增加 cursor；
5. 增加客户端幂等键；
6. 增加取消和澄清续跑接口；
7. 进程重启后恢复未完成任务。

在后端升级前，前端保持“提交—等待—一次性展示结果”的简单模式即可。

## 14. 联调验收清单

- [ ] 创建员工时只能选择已启用角色。
- [ ] 停用员工或角色后，不再出现在新群候选列表。
- [ ] 手动建群时管理员自动属于成员。
- [ ] 自然语言建群期间不能重复提交。
- [ ] 无 `@` 消息产生 `managed` 运行和管理员最终消息。
- [ ] 结构化 `@` 产生 `direct` 运行且不经过管理员。
- [ ] 多员工直达时可以同时展示多条结果。
- [ ] `waiting_user` 会重新开放输入框。
- [ ] HTTP 200 但 `run.status=failed` 时仍显示失败。
- [ ] `task_error` 不会被普通消息过滤掉。
- [ ] `metadata.visible=false` 的计划消息默认隐藏。
- [ ] 409、422、503、504 均有明确提示。
- [ ] 发送期间刷新或断网后，重新加载消息可以恢复可见结果。
- [ ] 模型输出无法注入任意 HTML 或脚本。
