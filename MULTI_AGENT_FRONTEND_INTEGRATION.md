# 多智能体群聊前端对接指南

最后更新：2026-08-27。

接口前缀统一为 /multi-agent。前端必须请求同源或经明确授权的
可信登录网关，不得直连默认为 http://127.0.0.1:19000 的 API 后端。
当前后端以 0f3ea21 旧运行时为基线，群聊通过薄适配接入。

## 1. 首要约束

1. POST /groups/{group_id}/messages 是同步长请求，不要使用普通短接口的
   30 秒超时。
2. 当前群提交期间应禁用发送按钮，避免生成重复 Run。
3. 数字警员由外部 t_digital_officer 维护，本服务只读。
4. HTTP 200 不等于业务成功，仍需检查 data.run.status。
5. 程序化直达必须传 mention_employee_ids，不要依赖解析显示名称。
6. OfficerId 是不透明字符串，不能转成 JavaScript number 或假定为 UUID。
7. resume_token 是敏感的恢复关联令牌，不是身份凭证。
8. usr、created_by 和 username 不是身份输入；服务端只信任网关签名的
   principal_id。
9. 浏览器不得生成 X-User-* 断言头，也不得持有签名密钥。

旧客户端如果仍传 created_by 或 usr，其值必须与网关断言一致，否则请求
被拒绝。新客户端应省略这些身份提示字段。

数据库部署和回滚边界见
[数据库迁移与发布说明](../../migrations/README.md)。

## 2. 响应约定

成功响应：

~~~json
{
  "status": "success",
  "data": {}
}
~~~

失败响应使用 FastAPI detail；它可能是经过安全收敛的字符串，也可能是参数
校验数组。客户端应把 detail 当作不透明错误，不依赖服务端内部异常文本。

~~~ts
type ApiSuccess<T> = {
  status: "success";
  data: T;
};

async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(API_BASE_URL + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : detail
          ? JSON.stringify(detail)
          : "HTTP " + response.status,
    );
  }
  if (!body || body.status !== "success") {
    throw new Error("API 返回格式错误");
  }
  return (body as ApiSuccess<T>).data;
}
~~~

上述 `API_BASE_URL` 必须指向可信网关。网关从已验证登录态取出稳定
用户 ID，删除客户端携带的 X-User-Id、X-User-Timestamp 和
X-User-Signature，然后覆盖写入自己的断言。浏览器不需要、也不允许
手动设置这三个请求头。

客户端应忽略未知字段，允许后端向响应追加兼容字段。时间字段按 ISO 8601
字符串处理。

## 3. ID 兼容规则

009 数据库切换后，以下既有 JSON 字段名保持不变：

- manager_employee_id
- member_employee_ids
- mention_employee_ids
- sender_employee_id
- employee_id

这些字段中的值已经是 t_digital_officer.id，不再是
t_ai_digital_employee.id。前端应统一声明：

~~~ts
type UUID = string;
type OfficerId = string;
~~~

群、群 Run 和消息 ID 仍为 UUID 字符串；OfficerId 的格式由权威业务系统
决定，UTF-8 表示上限为 900 字节。迁移期间不要在客户端把旧员工 UUID 与新
OfficerId 自动互换；历史映射只能由服务端和运维确认。

## 4. 接口清单

| 方法 | 路径 | 用途 | 注意点 |
|---|---|---|---|
| GET | /multi-agent/employees | 数字警员列表 | 外部目录只读 |
| GET | /multi-agent/employees/{id} | 数字警员详情 | id 是 OfficerId |
| POST | /multi-agent/employees | 废弃写入口 | 固定返回 410 |
| PATCH | /multi-agent/employees/{id} | 废弃写入口 | 固定返回 410 |
| POST | /multi-agent/groups/manual | 手动建群 | 管理员必须同时是成员 |
| POST | /multi-agent/groups/auto | 自然语言建群 | 长请求；管理员必填 |
| GET | /multi-agent/groups | 群列表 | 默认筛选 active |
| GET | /multi-agent/groups/{id} | 群详情 | 包含成员 |
| POST | /multi-agent/groups/{id}/messages | 发送或续接消息 | 同步等待执行结束或澄清 |
| GET | /multi-agent/groups/{id}/messages | 最近消息 | limit 为 1～500 |
| GET | /multi-agent/runs/{run_id} | Run 与任务板 | 返回 run、tasks、messages |

旧 POST/PATCH 员工接口不得作为外部目录不可用时的降级方案。

## 5. 数字警员与建群

GET /multi-agent/employees 返回公开、未删除的 t_digital_officer，并投影其
有效 Skill/MCP 关系。没有资源关系的警员仍会返回，skills 和 mcp_services
为空数组。MCP 凭据、原始关系配置和未授权工具不会返回。

手动建群：

~~~json
{
  "name": "市场调研组",
  "purpose": "完成行业调研并形成报告",
  "manager_employee_id": "MANAGER_OFFICER_ID",
  "member_employee_ids": [
    "MANAGER_OFFICER_ID",
    "RESEARCHER_OFFICER_ID"
  ],
  "max_rounds": 3,
  "max_tasks_per_round": 8
}
~~~

前端应自动把管理员加入 member_employee_ids。后端仍会校验管理员与全部成员
存在、未删除，max_rounds 为 1～10，max_tasks_per_round 为 1～32。

自然语言建群：

~~~json
{
  "description": "组建市场调研小组，完成研究和复核",
  "manager_employee_id": "MANAGER_OFFICER_ID",
  "candidate_employee_ids": [
    "MANAGER_OFFICER_ID",
    "RESEARCHER_OFFICER_ID"
  ],
  "max_rounds": 3,
  "max_tasks_per_round": 8
}
~~~

manager_employee_id 必须由用户显式选择。权威目录没有可供本服务推断管理员
资格的字段。

## 6. 消息路由

### 6.1 管理员编排

~~~json
{
  "content": "核验关键事实并形成结论",
  "mention_employee_ids": [],
  "timeout_seconds": 1800
}
~~~

当 mention_employee_ids 为空且正文没有可解析的 @群成员名时，
route_type 为 managed。管理员可以澄清、生成 DAG、分层执行并最终汇总。

### 6.2 结构化直达

~~~json
{
  "content": "请整理事实和来源",
  "mention_employee_ids": ["RESEARCHER_OFFICER_ID"],
  "timeout_seconds": 1800
}
~~~

mention_employee_ids 非空时具有最高优先级，指定成员直接执行，不经过管理员
拆解。多成员直达会产生多条 task_result 或 task_error；前端必须展示全部
结果，不能只等待管理员 final。

正文 @名字仅是人工输入便利，要求精确匹配且无重名。管理员模式下如果正文
含可解析的 @名字，后端会改走直达；前端应提示用户删除 @ 或明确切换路由。

推荐 UI 明确区分：

| 选择 | mention_employee_ids | 行为 |
|---|---|---|
| 交给管理员 | 空数组 | 澄清、拆解和汇总 |
| 直接发送给成员 | 一个或多个 OfficerId | 成员直接执行 |

## 7. 澄清续跑

当响应中的 run.status 为 waiting_user 时：

1. 在当前群的内存状态中保存 `run.id` 和 `resume.token`。
2. 突出显示 clarification 消息并重新开放输入。
3. 下一条回复固定使用空 mention_employee_ids 和该 resume_token。
4. 再次澄清时覆盖旧 token；进入 completed 或 failed 后清除。

~~~json
{
  "content": "使用欧盟地区，输出 Markdown",
  "mention_employee_ids": [],
  "resume_token": "OPAQUE_RESUME_TOKEN",
  "timeout_seconds": 1800
}
~~~

token 与非空 mentions 同时提交会返回 422。正确 token 续接原 Run 并复用已
完成结果；同 token、同规范化正文的重试为幂等读取。错误、过期、跨群或不同
正文复用会返回 409。

不要把 token 放进消息正文、URL、分析日志或普通浏览器持久化。页面刷新后，
可从最新 clarification 消息取得 run_id，再查询
GET /multi-agent/runs/{run_id}；只有所属用户的权威 Run 仍为
`waiting_user` 时，响应才会重新附带显式 `resume` 结构。原始
`run.resume_token` 始终不会公开。

## 8. 长请求和状态

timeout_seconds 范围为 10～3600 秒，表示每次智能体调用的等待上限，不是整条
HTTP 请求总上限。多轮和串行任务可能持续更久。

前端应：

- 同时提高浏览器、Nginx、网关和负载均衡器的读取超时；
- 提交期间只锁定当前群；
- 请求完成后使用 RunBundle 更新任务板，再拉取群消息；
- 断线后先刷新消息和 Run，不自动重试普通 POST；
- 明确提示 AbortController 只停止浏览器等待，不取消后端运行。

Run 状态：

| 状态 | 前端处理 |
|---|---|
| running | 显示处理中并禁止重复提交 |
| waiting_user | 显示澄清问题并允许携 token 回复 |
| completed | 展示最终结果和各任务状态 |
| failed | 展示错误，同时保留成功的局部结果 |

同一群只允许一个 running 或 waiting_user Run。遇到 409 应刷新权威状态，
不能静默新建 Run。

## 9. 消息展示与安全

| message_type | 默认展示 |
|---|---|
| chat | 用户消息 |
| task_result | 员工结果 |
| task_error | 员工失败，不得吞掉 |
| clarification | 管理员澄清 |
| clarification_reply | 用户澄清回复 |
| final | 管理员最终结论 |
| manager_plan | 内部计划，后端不返回 |

公开消息接口会过滤 manager_plan 及其内部元数据。模型输出是不可信内容；
Markdown 必须安全渲染，禁止直接使用 dangerouslySetInnerHTML。

群聊路由已强制可信网关身份断言。断言使用至少 32 个 UTF-8 字节
的环境密钥，以 `timestamp + "\n" + user_id` 为消息计算 HMAC-SHA256，
并以小写十六进制写入 X-User-Signature。时间戳使用 UTC epoch 秒，后端
只接受前后 300 秒。密钥只存在网关和 API 后端的密钥管理环境。

生产接入仍需要：

- 保证网关先删除再覆盖客户端伪造的同名身份头；
- 网关到后端使用 TLS 或等价受信通道，并限制后端只接受网关流量；
- 在网关层收紧 CORS，不将群聊后端直接暴露给浏览器；
- 按业务需要叠加租户、组织和角色授权；
- 隐藏 manager_plan、系统提示、密钥、工具参数和 resume_token；
- 对高风险角色增加服务端审批。

## 10. 错误处理

| HTTP | 处理 |
|---|---|
| 401 | 网关身份断言缺失、过期或签名错误；重新登录，不在浏览器重签 |
| 404 | 资源不存在；刷新列表或返回上级页面 |
| 410 | 数字警员写入口已废弃；跳转权威业务系统 |
| 409 | 开放 Run 冲突、群归档或 token 冲突；刷新 Run，不自动重试 |
| 422 | 请求字段、成员、路由或 token 组合无效；显示表单错误 |
| 503 | 数据库未迁移或运行时不可用；进入只读/维护状态 |
| 504 | 智能体等待超时；刷新消息和 Run |
| 500 | 未分类错误；记录请求上下文并停止自动重试 |

即使 HTTP 200，也要检查：

~~~ts
const bundle = await apiRequest<RunBundle>(...);
if (bundle.run.status === "failed") {
  showRunError(bundle.run.error ?? "本轮执行失败");
}
~~~

## 11. 发布兼容和应用回滚

前端发布不需要因 009 修改 JSON 字段名，但必须确保所有选择器保存的是外部
OfficerId。维护窗口内应把群聊页面切为只读，并阻止新建群和发送消息。

009 成功后：

- 不得回退到发送旧员工 UUID 的客户端；
- 若后端关闭 /multi-agent，前端应隐藏编辑入口并展示维护状态；
- 不得降级调用旧员工写接口；
- 恢复服务后重新加载警员目录、群详情、消息和 Run，不复用旧缓存 ID。

010 后必须人工核验每个历史群的网关 principal_id，并在停止群聊
写入的维护窗口执行 011。新群聊后端只能在 011 成功后启动；
启动后不得从请求体的 created_by/usr 恢复或改写群 owner。

数据库只向前迁移，不做生产 down migration。后端事故时，普通 0f3ea21 服务
可以恢复，但群聊在兼容修复上线前保持关闭。

## 12. 当前限制

- 没有 SSE、WebSocket、后台提交、运行取消或完整消息分页。
- 进程崩溃不会自动恢复 `running` Run；下次发送时会回收超过两小时且
  没有任务心跳的遗留 Run。澄清 token 只恢复 `waiting_user`。
- AbortController 不会取消服务端任务。
- 消息列表最多返回最近 500 条。
- 没有 /groups/{id}/active-run，页面无法主动发现所有后台开放 Run。
- 当前身份边界不代替租户或细粒度角色授权。

## 13. 2026-08-27 修改说明

- 后端回退到 0f3ea21，仅保留群聊与旧运行时薄适配。
- 数字警员统一由外部 t_digital_officer 只读提供。
- OfficerId 的客户端类型明确为不透明字符串。
- 保留 004～011 向前迁移，前端增加 009/011 维护窗口、
  禁用旧 UUID 写入和群 owner 切换说明。
- 删除与全项目 Harness 重构相关的假设，保留实际可用的同步 HTTP 契约。
- 群聊接口改为网关 HMAC-SHA256 身份断言；请求体身份字段不再
  被信任。

## 14. 联调清单

- [ ] 警员列表只返回公开、未删除记录，不泄露 MCP 凭据。
- [ ] POST/PATCH 员工接口返回 410 且无数据库写入。
- [ ] 手动和自然语言建群都要求显式管理员。
- [ ] 管理员路由生成 managed Run 和最终消息。
- [ ] 结构化直达生成 direct Run，并展示全部成员结果。
- [ ] waiting_user 能携 token 续接同一 Run。
- [ ] 409、422、503、504 均有明确且不可重复提交的 UI。
- [ ] HTTP 200 + failed 会显示业务失败。
- [ ] task_error 不会被过滤，manager_plan 默认隐藏。
- [ ] 模型输出不能注入任意 HTML 或脚本。
- [ ] 维护窗口内群聊编辑入口完全禁用。
- [ ] 伪造的 X-User-* 头会被网关删除并覆盖，无签名直连
  groups/runs 返回 401。
- [ ] 后端缺少或使用过短的身份密钥时，groups/runs 路由返回 503。
