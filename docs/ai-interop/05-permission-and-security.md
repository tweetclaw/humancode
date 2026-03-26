# AI Interop 平台能力：权限与安全模型文档

## 1. 文档目标

本文档定义平台级扩展权限模型、用户授权流程、共享范围策略、工具审批策略与审计要求。

## 2. 风险模型

平台主要防两类风险：

1. 会话内容泄露
2. 高危能力滥用

其中高危能力包括：

- 写文件
- 执行 shell / CLI
- 调用 MCP 侧副作用工具
- 外网访问
- 跨 remoteAuthority 数据流动

## 3. 安全原则

### 3.1 默认拒绝

任何跨扩展调用都默认拒绝，除非：

- 发起扩展具备调用能力；
- 目标扩展具备被调用能力；
- 用户明确授权；
- 当前 session 共享级别允许。

### 3.2 平台签发身份

- endpoint 的真实拥有者由平台签发；
- 扩展不得自报 extensionId / hostKind / remoteAuthority；
- 审计中记录的平台身份是唯一可信身份。

### 3.3 最小披露

共享上下文默认最小化，优先：

- 摘要
- 引用
- redacted 版本

而不是直接暴露 full transcript。

### 3.4 会话内最小权限

加入 session 不等于拥有全部权限。权限应按能力拆分。

## 4. 权限模型

### 4.1 扩展声明能力

建议定义逻辑能力：

- `aiInterop.provideEndpoint`
- `aiInterop.invokeEndpoint`
- `aiInterop.joinSession`
- `aiInterop.observeSession`
- `aiInterop.invokeTools`
- `aiInterop.receiveToolResults`
- `aiInterop.exportAudit`

### 4.2 Session 共享粒度

- `none`
- `lastTurn`
- `full`
- `redacted`

规则：

- 默认 `none`
- 首次跨扩展协作时必须让用户确认共享级别
- 后续仅可在同 session 内缓存，不应全局隐式升级

### 4.3 Host / Remote 策略

- `remoteAuthority` 不一致时默认拒绝；
- `web` host 不允许需要 Node / stdio 的能力；
- `local -> remote` 与 `remote -> local` 必须经过显式策略判断。

## 5. 用户授权流程

### 5.1 首次调用授权

弹窗至少展示：

- 发起扩展
- 目标扩展
- session 标题
- 共享范围
- 是否允许工具调用
- 是否允许永久记住

### 5.2 工具审批

对以下情况必须强制审批：

- 非只读工具
- CLI / shell 执行
- 写工作区
- 外部网络副作用
- MCP 声明非只读工具

### 5.3 撤销

用户必须可在权限管理面板中：

- 查看所有授权记录
- 撤销特定扩展对特定扩展的权限
- 清空某个 session 的共享策略
- 清空全局记忆

## 6. 审计要求

每一次以下事件都必须写审计：

- endpoint 注册 / 注销
- session 创建 / 加入 / 离开 / 关闭
- invocation start / complete / fail / cancel / orphaned
- 权限弹窗决策
- tool approval 决策
- remoteAuthority 拒绝事件
- 高危 CLI / MCP 工具执行

## 7. 安全判定要求

以下场景必须 hard-fail：

1. 目标 endpoint 不存在
2. 未授权调用
3. 未授权 session join
4. remoteAuthority mismatch
5. web host 执行 CLI / stdio MCP
6. 扩展伪造 endpoint 身份
7. chunk 越权写入他人 invocation

## 8. 审计数据最小字段

建议每条审计事件至少包含：

- `eventId`
- `timestamp`
- `sessionId`
- `turnId`
- `invocationId`
- `callerExtensionId`
- `targetExtensionId`
- `hostKind`
- `remoteAuthority`
- `eventType`
- `decision`
- `resultCode`
- `metadata`

## 9. 明确不接受的方案

- UI 自动化
- OCR
- 焦点模拟
- DOM 直连
- 绕过平台权限层的扩展私有 side-channel
