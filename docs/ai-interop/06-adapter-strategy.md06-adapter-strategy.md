# AI Interop 平台能力：Adapter 方案文档

## 1. 文档目标

本文档定义 Command / Chat / Tool / MCP / Webview / CLI 六类适配方案，统一说明输入输出模型、流式能力、取消能力、授权模型与降级策略。

## 2. 统一原则

1. Adapter 不能改变总线内核语义；
2. 所有 Adapter 最终都映射为 Endpoint 或 ToolEndpoint；
3. 所有 Adapter 都必须经过权限层；
4. 不支持的能力必须显式降级，而不是隐式失败。

## 3. Command Adapter

### 输入输出模型
- 输入：commandId + args
- 输出：一次性 result

### 流式支持
- 不支持原生流式
- 仅可通过 wrapper 模拟阶段状态

### Cancel
- 通常不支持
- 若 command 自身可取消，需 wrapper 显式桥接

### 授权
- 跨扩展调用仍需授权
- 若 command 触发副作用，需要额外工具审批

### 降级策略
- 仅作为 legacy compatibility
- 不承诺 session-aware 行为。

## 4. Chat Participant Adapter

### 输入输出模型
- 输入：prompt + session context
- 输出：流式 markdown / text / toolCall

### 流式支持
- 支持，优先复用 chat session chunk 模式

### Cancel
- 支持，依赖 invocation cancel 穿透

### 授权
- 默认不自动暴露所有 participant
- 必须 opt-in 为 callable endpoint

### 降级策略
- 若 participant 未 opt-in，则只能被用户在 UI 中直接调用，不能被其他扩展调用。

## 5. Tool Adapter

### 输入输出模型
- 输入：toolId + structured input
- 输出：toolResult

### 流式支持
- 视工具实现而定
- 平台统一允许 progress chunk

### Cancel
- 应支持
- 工具若不支持，平台需在 UI 中标记“不支持中断”

### 授权
- 复用工具审批心智
- 非只读工具必须审批

### 降级策略
- 不支持 progress 的工具只回最终结果。

## 6. MCP Adapter

### 输入输出模型
- 输入：tool / prompt / resource 请求
- 输出：toolResult / resource payload / elicitation

### 流式支持
- 取决于 MCP bridge 实现
- 平台应至少支持阶段状态与最终结果

### Cancel
- 优先支持
- 若 transport 不支持取消，则平台仅终止上层等待

### 授权
- 复用 MCP 工具审批
- 尊重只读提示与 host 约束

### 降级策略
- web host 禁 stdio
- remoteAuthority 不匹配拒绝
- Node host 优先。

## 7. Webview Adapter

### 输入输出模型
- 输入：UI event / user action / selection / approval decision
- 输出：render update / prompt update / status event

### 流式支持
- UI 渲染可以流式接收
- 但 webview 本身不是总线核心

### Cancel
- UI 层可发起 cancel
- 实际 cancel 由总线传播

### 授权
- Webview 共享 session 内容时必须经用户同意

### 降级策略
- 仅通过宿主扩展桥接
- 不允许 webview 直接跨扩展通信。:contentReference[oaicite:42]{index=42}

## 8. CLI / Terminal Adapter

### 输入输出模型
- 输入：command / args / stdin / env / cwd
- 输出：stdout / stderr / exit status / artifacts

### 流式支持
- 强支持
- stdout/stderr 应作为 chunk 回传

### Cancel
- 强支持
- 本地用 SIGINT / kill，远端走对应 host 管道

### 授权
- 必须作为高危能力审批
- 默认拒绝

### 降级策略
- web host 拒绝
- 无 Node runtime 时拒绝
- 用户拒绝授权时返回显式 denied。:contentReference[oaicite:43]{index=43}

## 9. 对比表

| Adapter | 原生流式 | Cancel | 需要授权 | 建议定位 |
|---|---:|---:|---:|---|
| Command | 否 | 弱 | 是 | legacy 兼容 |
| Chat Participant | 是 | 是 | 是 | 高价值接入 |
| Tool | 中 | 中/强 | 是 | 核心接入 |
| MCP | 中 | 中 | 是 | 核心接入 |
| Webview | UI级 | 是 | 是 | 前端桥接 |
| CLI / Terminal | 是 | 是 | 强制 | 高危能力接入 |
