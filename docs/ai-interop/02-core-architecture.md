# AI Interop 平台能力：核心架构设计

## 1. 设计目标

本架构的目标是为 IDE 内多个 AI 扩展 / Agent / UI / CLI 提供一个可信协作平面，使平台能够：

- 统一管理端点注册与发现；
- 支持流式调用与消息路由；
- 支持会话、参与者、上下文与状态管理；
- 支持权限控制与用户授权；
- 支持审计、调试、性能观测；
- 与 VS Code 既有 MainThread / ExtHost / RPC 架构兼容。

## 2. 架构总览

平台采用五层模型：

1. AI Interop Bus
2. AI Session Broker
3. Capability / Permission Layer
4. Adapter Layer
5. Observability / Audit Layer

其中：
- **Workbench services** 承担内核状态与编排；
- **MainThread / ExtHost API bridge** 承担平台与扩展之间的 RPC 边界；
- **Workbench contrib** 承担权限弹窗、审计面板与调试入口。:contentReference[oaicite:18]{index=18}:contentReference[oaicite:19]{index=19}

## 3. 模块职责

### 3.1 AI Interop Bus
职责：
- endpoint 注册与注销；
- invocation 路由；
- chunk 流式转发；
- cancel / timeout / backpressure；
- 调用级事件分发。

总线不理解“业务编排”，只理解通信与生命周期。

### 3.2 AI Session Broker
职责：
- session 创建、销毁、恢复；
- participant 管理；
- invocation 与 turn 关联；
- session ACL 与共享范围；
- orphaned / failed / canceled 管理；
- 持久化摘要与恢复点。

### 3.3 Capability / Permission Layer
职责：
- 扩展能力声明校验；
- 跨扩展调用授权；
- 会话上下文共享粒度控制；
- 工具/CLI/MCP 高风险审批；
- remoteAuthority / hostKind 策略判断。:contentReference[oaicite:20]{index=20}

### 3.4 Adapter Layer
职责：
- 把 commands、chat participant、tool、MCP、webview、CLI 统一投影成 endpoint / tool endpoint；
- 为非原生生态提供兼容；
- 对不同接入能力提供降级策略。

### 3.5 Observability / Audit Layer
职责：
- 记录结构化事件；
- 记录权限决策与工具审批；
- 暴露调试视图；
- 提供面向用户的审计界面；
- 提供性能指标输出。

## 4. 模块交互图

```mermaid
flowchart LR
  subgraph WB[Workbench]
    BUS[AI Interop Bus]
    SB[AI Session Broker]
    POL[Permission / Policy]
    AUD[Audit / Observability]
    UI[Contrib UI]
  end

  subgraph API[Workbench API Bridge]
    MT[mainThreadAiInterop.ts]
    EH[extHostAiInterop.ts]
    PROTO[extHost.protocol.ts]
  end

  subgraph EXTS[Extension Hosts]
    CTRL[Controller Extension]
    WORKER[Worker Extension]
    TOOL[Tool / MCP / CLI Adapter]
    WV[Webview Host Extension]
  end

  CTRL --> EH
  WORKER --> EH
  TOOL --> EH
  WV --> EH

  EH <--> MT
  PROTO -. defines .- EH
  PROTO -. defines .- MT

  MT --> BUS
  MT --> SB
  MT --> POL
  MT --> AUD

  UI --> POL
  UI --> AUD
  BUS <--> SB
  BUS --> POL
  BUS --> AUD

  5. 源码落点
5.1 services

src/vs/workbench/services/aiInterop/common/aiInteropService.ts

src/vs/workbench/services/aiInterop/browser/aiInteropService.ts

5.2 api bridge

src/vs/workbench/api/browser/mainThreadAiInterop.ts

src/vs/workbench/api/common/extHostAiInterop.ts

src/vs/workbench/api/common/extHost.protocol.ts

src/vs/workbench/api/common/extHost.api.impl.ts

5.3 contrib UI

src/vs/workbench/contrib/aiInterop/browser/aiInterop.contribution.ts

src/vs/workbench/contrib/aiInterop/browser/aiInteropAuditView.ts

src/vs/workbench/contrib/aiInterop/browser/aiInteropPermissionsView.ts

src/vs/workbench/contrib/aiInterop/common/aiInteropContextKeys.ts（可选）

6. 文件级职责说明
文件	为什么放这里	负责什么	依赖谁 / 被谁调用
workbench/services/aiInterop/common/aiInteropService.ts	平台内核服务，无 UI	定义 Bus / Broker 接口与核心 DTO	被 mainThreadAiInterop 与 browser 实现调用
workbench/services/aiInterop/browser/aiInteropService.ts	Workbench 主线程实现	Bus / Broker / Policy / Audit 主实现	依赖 IExtensionService、IStorageService、ILogService
workbench/api/browser/mainThreadAiInterop.ts	主线程 customer 标准落点	接收 ExtHost RPC，上接 Bus / Broker	依赖 extHostContext.getProxy(...)
workbench/api/common/extHostAiInterop.ts	扩展宿主 API 落点	暴露 vscode.proposed.aiInterop	被扩展调用；依赖主线程 proxy
workbench/api/common/extHost.protocol.ts	shape 与 DTO 定义中心	定义 RPC 形状、消息 DTO、错误码	被 mainThread 与 extHost 共同导入
workbench/api/common/extHost.api.impl.ts	VS Code API namespace 装配点	挂载 aiInterop namespace	被 API factory 调用
workbench/contrib/aiInterop/...	UI 入口应放 contrib	权限 UI、审计 UI、调试命令	调用 service 层
7. 架构决策
7.1 为什么总线必须在 Workbench

因为跨 host 路由、权限决策、审计记录、恢复逻辑都不能交给单个扩展自行协商。平台必须持有最终仲裁权。

7.2 为什么 ExtHost 只做薄适配

因为扩展侧只能代表自己，不应掌握全局 session 与权限真相。ExtHost 侧只应做：

注册；

发起；

回传 chunk；

接收 cancel；

本地 handler 调用。

7.3 为什么优先复用 Chat / Tool / MCP

因为这些 API 已经解决了流式输出、工具审批、工具来源分类等问题，适合作为 Adapter 基础，而不是另起炉灶。
