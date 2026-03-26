# AI Interop 平台能力：执行摘要与目标范围

## 1. 文档目的

本文档用于定义本期 AI Interop 平台能力开发的目标范围、非目标范围、成功标准与边界约束，作为后续架构设计、协议设计、实现与验收的总入口。

## 2. 背景

本项目面向基于 Code - OSS / VS Code 内核构建自研 IDE 的平台作者场景。目标不是让扩展 A 直接调用扩展 B 的公开 API，而是把多个 AI 扩展、AI Agent、CLI Agent、Chat UI、Webview UI 之间的双向消息通信、会话管理、流式响应、工具调用协调提升为平台级能力。

平台级实现的原因在于：

- VS Code 扩展运行在独立 Extension Host 中；
- 平台天然存在 local / web / remote 多宿主；
- 扩展无法直接访问主界面 DOM，也不应通过 UI hack 进行互通；
- 扩展间互通若不经平台仲裁，将无法获得一致的权限、路由、审计与恢复语义。

## 3. 本期目标

本期（MVP 前置阶段）的目标是交付一套“可落地、可验证、可演进”的平台内 AI 互通基础设施，具体包括：

1. 在 Workbench 层建立 AI Interop Bus；
2. 在 Workbench 层建立 AI Session Broker；
3. 建立最小权限模型与授权流程；
4. 提供 ExtHost 与 MainThread 间的正式 RPC 桥接；
5. 暴露最小 Proposed API 供扩展注册端点与发起调用；
6. 支持最小闭环：
   - 一个主控 AI 扩展发起调用；
   - 一个被调 AI 扩展流式返回 chunk；
   - 平台支持取消；
   - 平台记录结构化事件；
   - 平台能够拒绝未授权调用。

## 4. 本期非目标

本期明确不做以下事项：

1. 不做 UI 自动化、焦点模拟、OCR 方案；
2. 不做 DOM 注入式扩展互通；
3. 不做跨 remote/web 的完整正式支持；
4. 不做 stable API 发布；
5. 不做所有现有生态的全量自动兼容；
6. 不做完整企业治理能力；
7. 不做最终版审计中心和运营后台。

## 5. 本期技术边界

### 5.1 运行环境边界

- 首阶段仅支持 local Extension Host（Node.js）端点；
- remote / web 作为 Phase 2 扩展目标；
- 对 remoteAuthority 不一致场景，本期按“显式拒绝”处理。

### 5.2 API 边界

- 首阶段只提供 Proposed API；
- 仅暴露最小原语，不暴露复杂编排 DSL；
- API 以 endpoint / session / invocation 为中心，不直接绑定某个具体 UI。

### 5.3 能力边界

本期只做：

- endpoint 注册
- invocation 发起
- 流式 chunk 回传
- cancel
- 最小 session 管理
- 最小权限弹窗
- 最小审计记录

本期不做：

- 跨窗口会话同步
- 全量恢复重放
- 高级工具编排策略
- 多组织策略中心

## 6. 成功标准

本期成功必须同时满足以下条件：

### 6.1 功能成功标准

1. 两个本地扩展可通过平台 API 建立调用关系；
2. 被调扩展可持续流式返回 chunk；
3. 主控扩展可接收完整流并正确结束；
4. cancel 可从主控扩展穿透到被调扩展；
5. 平台可拒绝未授权跨扩展调用；
6. 平台可为一次调用记录结构化审计事件。

### 6.2 工程成功标准

1. 代码落点符合 Workbench / API / Contrib 分层；
2. 不通过 hack 修改现有 chat/webview/DOM 机制；
3. 与现有 MainThread / ExtHost / rpcProtocol 模式一致；
4. 可在 Extension Development Host 中自动化测试。

### 6.3 质量成功标准

1. 本地调用往返 p95 < 100ms；
2. cancel 生效 < 200ms；
3. 长时间流式过程中主线程额外 CPU 占用 < 5%；
4. 未授权调用必须被阻断；
5. ext host 崩溃后 invocation 能被正确标记为 orphaned / failed。

## 7. 推荐方案与明确拒绝

### 推荐

- 平台级 AI Interop Bus
- 平台级 Session Broker
- 平台级 Capability / Permission
- 平台级 Audit / Observability
- 通过 Adapter 复用 Chat / Tool / MCP / Command / Webview / CLI 生态

### 明确拒绝

- UI 自动化
- 焦点模拟
- OCR
- monkey patch
- 把 commands / URI / webview message 当作总线内核
