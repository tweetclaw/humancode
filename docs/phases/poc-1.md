# PoC-1: AI Interop 核心功能实现阶段

**阶段目标**: 实现 AI Interop 平台的核心功能,支持扩展间流式调用、会话管理和基础权限控制

**状态**: ⬜ 待开始

**开始时间**: 待定

**预计工时**: 15-20 天 (约 3-4 周)

---

## 一、阶段概述

PoC-1 是 AI Interop 平台的**核心功能实现阶段**,目标是在 PoC-0 验证的技术基础上,实现完整的平台级 AI 互通基础设施。

### 核心目标

1. **AI Interop Bus** - endpoint 注册、invocation 路由、流式传输
2. **AI Session Broker** - session 管理、participant 管理、上下文关联
3. **Permission & Policy** - 权限控制、授权决策、跨扩展调用审批
4. **Audit & Observability** - 结构化事件记录、审计视图、调试支持

### 成功标准

根据 [01-executive-summary-and-scope.md](../ai-interop/01-executive-summary-and-scope.md) 第 6 节,PoC-1 成功必须同时满足:

#### 功能成功标准
1. ✅ 两个本地扩展可通过平台 API 建立调用关系
2. ✅ 被调扩展可持续流式返回 chunk
3. ✅ 主控扩展可接收完整流并正确结束
4. ✅ cancel 可从主控扩展穿透到被调扩展
5. ✅ 平台可拒绝未授权跨扩展调用
6. ✅ 平台可为一次调用记录结构化审计事件

#### 工程成功标准
1. ✅ 代码落点符合 Workbench / API / Contrib 分层
2. ✅ 不通过 hack 修改现有 chat/webview/DOM 机制
3. ✅ 与现有 MainThread / ExtHost / rpcProtocol 模式一致
4. ✅ 可在 Extension Development Host 中自动化测试

---

## 二、任务跟踪表

| 任务编号 | 任务名称 | 开发 AI | 验收 AI | 依赖任务 | 优先级 | 状态 | 验收编号 | 验收状态 |
|---------|---------|---------|---------|---------|--------|------|---------|---------|
| TASK-P1-001 | Service 层接口定义 | AI-Dev-001 | AI-QA-001 | - | 高 | ✅ 已完成 | TEST-P1-001 | ✅ 通过 |
| TASK-P1-002 | AI Interop Bus 实现 | AI-Dev-001 | AI-QA-001 | TASK-P1-001 | 高 | ✅ 已完成 | TEST-P1-002 | ⏸️ 条件通过 |
| TASK-P1-003 | RPC Bridge 完善 | AI-Dev-002 | AI-QA-002 | TASK-P1-001 | 高 | ✅ 已完成 | TEST-P1-003 | ⏸️ 条件通过 |
| TASK-P1-004 | AI Session Broker 实现 | AI-Dev-001 | AI-QA-001 | TASK-P1-002 | 高 | ⬜ 待开始 | TEST-P1-004 | ⬜ 待验收 |
| TASK-P1-005 | Permission & Policy Service 实现 | AI-Dev-003 | AI-QA-002 | TASK-P1-001 | 中 | ⬜ 待开始 | TEST-P1-005 | ⬜ 待验收 |
| TASK-P1-006 | Audit Service 实现 | AI-Dev-003 | AI-QA-002 | TASK-P1-001 | 中 | ⬜ 待开始 | TEST-P1-006 | ⬜ 待验收 |
| TASK-P1-007 | 端到端集成测试 | AI-Dev-002 | AI-QA-001 | TASK-P1-002, TASK-P1-003, TASK-P1-004 | 高 | ⬜ 待开始 | TEST-P1-007 | ⬜ 待验收 |
| TASK-P1-008 | 权限弹窗 UI 实现 | AI-Dev-004 | AI-QA-003 | TASK-P1-005 | 中 | ⬜ 待开始 | TEST-P1-008 | ⬜ 待验收 |
| TASK-P1-009 | 审计视图 UI 实现 | AI-Dev-004 | AI-QA-003 | TASK-P1-006 | 低 | ⬜ 待开始 | TEST-P1-009 | ⬜ 待验收 |
| TASK-P1-010 | 文档与示例完善 | AI-PM-001 | - | TASK-P1-007 | 低 | ⬜ 待开始 | - | - |

**状态说明**:
- ⬜ 待开始: 任务尚未分配或开始
- 🏗️ 进行中: 开发 AI 正在实现
- ⏸️ 待验收: 开发完成,等待验收 AI 验收
- ✅ 已完成: 验收通过,任务完成
- ❌ 验收失败: 验收未通过,需要修复

---

## 三、任务详细说明

### 3.1 TASK-P1-001: Service 层接口定义

**目标**: 定义所有 Service 层的接口、DTO、常量和枚举

**优先级**: 高(阻塞其他所有任务)

**实现内容**:
- `IAIInteropBusService` 接口定义
- `IAISessionBrokerService` 接口定义
- `IAIInteropPolicyService` 接口定义
- `IAIInteropAuditService` 接口定义
- 所有 DTO 定义(EndpointDescriptor, InvocationDescriptor, SessionDescriptor 等)
- 错误码枚举
- 事件类型枚举

**文件位置**:
- `src/vs/workbench/services/aiInterop/common/aiInterop.ts`

**验收标准**:
- TypeScript 编译通过
- 接口定义完整,包含所有必要方法
- DTO 定义清晰,字段类型正确
- 错误码和事件类型枚举完整

**预计工时**: 2-3 天

---

### 3.2 TASK-P1-002: AI Interop Bus 实现

**目标**: 实现 AI Interop Bus 核心功能

**优先级**: 高

**实现内容**:
- Endpoint 注册与注销
- Endpoint 发现与查询
- Invocation 路由
- 流式 chunk 转发
- Invocation 生命周期管理(pending → running → completed/failed/canceled)
- Cancel/timeout 支持
- 与 Session Broker 集成

**文件位置**:
- `src/vs/workbench/services/aiInterop/browser/aiInteropService.ts`

**验收标准**:
- Endpoint 可注册、查询、注销
- Invocation 可发起、接收 chunk、正常结束
- Cancel 可正确传递并终止 invocation
- 所有状态转换正确
- 与 Session Broker 正确集成

**预计工时**: 4-5 天

---

### 3.3 TASK-P1-003: RPC Bridge 完善

**目标**: 完善 MainThread 和 ExtHost 之间的 RPC 桥接

**优先级**: 高

**实现内容**:
- 完善 RPC Shape 定义(基于 PoC-0 的 TestAiInterop Shape)
- 实现 MainThread Customer(mainThreadAiInterop.ts)
- 实现 ExtHost API(extHostAiInterop.ts)
- 在 extHost.api.impl.ts 中暴露 `vscode.aiInterop` API
- 支持所有 Bus 和 Broker 功能的 RPC 调用

**文件位置**:
- `src/vs/workbench/api/common/extHost.protocol.ts`
- `src/vs/workbench/api/browser/mainThreadAiInterop.ts`
- `src/vs/workbench/api/common/extHostAiInterop.ts`
- `src/vs/workbench/api/common/extHost.api.impl.ts`

**验收标准**:
- RPC Shape 定义完整,所有方法都有 `$` 前缀
- MainThread Customer 正确调用 Service 层
- ExtHost API 正确暴露给扩展
- 扩展可通过 `vscode.aiInterop` 调用所有功能

**预计工时**: 3-4 天

---

### 3.4 TASK-P1-004: AI Session Broker 实现

**目标**: 实现 AI Session Broker 核心功能

**优先级**: 高

**实现内容**:
- Session 创建、销毁、查询
- Participant 管理
- Invocation 与 Session 关联
- Session 上下文管理
- Session 状态管理(active/idle/archived)
- Session 持久化(可选,Phase 2 完善)

**文件位置**:
- `src/vs/workbench/services/aiInterop/browser/aiSessionBroker.ts`

**验收标准**:
- Session 可创建、查询、销毁
- Participant 可添加、移除
- Invocation 正确关联到 Session
- Session 状态转换正确
- 与 Bus 正确集成

**预计工时**: 3-4 天

---

### 3.5 TASK-P1-005: Permission & Policy Service 实现

**目标**: 实现权限控制和授权决策功能

**优先级**: 中

**实现内容**:
- 扩展能力声明校验
- 跨扩展调用授权决策
- 授权策略管理(allow once/allow session/deny)
- 授权记录持久化
- hostKind 和 remoteAuthority 策略判断(复用 PoC-0 实现)

**文件位置**:
- `src/vs/workbench/services/aiInterop/browser/aiInteropPolicyService.ts`

**验收标准**:
- 首次跨扩展调用触发授权决策
- 授权决策正确(allow/deny)
- 授权记录可查询
- hostKind 和 remoteAuthority 策略正确

**预计工时**: 3-4 天

---

### 3.6 TASK-P1-006: Audit Service 实现

**目标**: 实现审计日志记录和查询功能

**优先级**: 中

**实现内容**:
- 结构化事件记录
- 事件类型定义(endpoint_registered, invocation_started, invocation_completed, invocation_failed, invocation_canceled, permission_granted, permission_denied 等)
- 审计日志查询 API
- 审计日志持久化(可选,Phase 2 完善)

**文件位置**:
- `src/vs/workbench/services/aiInterop/browser/aiInteropAuditService.ts`

**验收标准**:
- 所有关键事件都被记录
- 审计日志可查询
- 审计日志格式正确,包含必要信息

**预计工时**: 2-3 天

---

### 3.7 TASK-P1-007: 端到端集成测试

**目标**: 验证所有模块集成后的端到端功能

**优先级**: 高

**实现内容**:
- 创建完整的测试场景
- 场景 1: 基础流式调用(A 调 B,B 流式返回)
- 场景 2: Cancel 穿透(A 调 B,A 取消,B 停止)
- 场景 3: 权限控制(A 调 B,首次需授权)
- 场景 4: Session 管理(多个 invocation 关联到同一 session)
- 场景 5: 审计日志(所有事件都被记录)

**文件位置**:
- 复用并扩展 PoC-0 的测试扩展
- `extensions/test-ai-interop-controller/`
- `extensions/test-ai-interop-worker/`

**验收标准**:
- 所有测试场景通过
- 日志输出清晰,便于调试
- 性能符合预期(延迟、吞吐)

**预计工时**: 3-4 天

---

### 3.8 TASK-P1-008: 权限弹窗 UI 实现

**目标**: 实现权限授权弹窗 UI

**优先级**: 中

**实现内容**:
- 权限授权弹窗(显示 caller、target、请求的能力)
- 授权选项(Allow Once/Allow for Session/Deny)
- 授权记录视图(显示已授权的调用)
- 撤销授权功能

**文件位置**:
- `src/vs/workbench/contrib/aiInterop/browser/aiInterop.contribution.ts`
- `src/vs/workbench/contrib/aiInterop/browser/aiInteropPermissionsView.ts`

**验收标准**:
- 首次跨扩展调用弹出授权弹窗
- 用户可选择授权选项
- 授权记录可查看
- 授权可撤销

**预计工时**: 3-4 天

---

### 3.9 TASK-P1-009: 审计视图 UI 实现

**目标**: 实现审计日志查看 UI

**优先级**: 低

**实现内容**:
- 审计日志列表视图
- 事件过滤(按类型、时间、扩展等)
- 事件详情查看
- 导出审计日志功能(可选)

**文件位置**:
- `src/vs/workbench/contrib/aiInterop/browser/aiInterop.contribution.ts`
- `src/vs/workbench/contrib/aiInterop/browser/aiInteropAuditView.ts`

**验收标准**:
- 审计日志可查看
- 事件过滤功能正常
- 事件详情显示完整

**预计工时**: 2-3 天

---

### 3.10 TASK-P1-010: 文档与示例完善

**目标**: 完善开发文档和使用示例

**优先级**: 低

**实现内容**:
- API 使用文档
- 扩展开发示例
- 最佳实践指南
- 故障排查指南

**文件位置**:
- `docs/ai-interop/09-api-usage-guide.md`
- `docs/ai-interop/10-extension-examples.md`
- `docs/ai-interop/11-best-practices.md`
- `docs/ai-interop/12-troubleshooting.md`

**验收标准**:
- 文档完整,覆盖所有 API
- 示例代码可运行
- 最佳实践清晰

**预计工时**: 2-3 天

---

## 四、开发顺序与依赖关系

### 阶段 1: 基础设施(Week 1)
```
TASK-P1-001 (Service 层接口定义)
    ↓
TASK-P1-002 (AI Interop Bus 实现) ← 并行 → TASK-P1-003 (RPC Bridge 完善)
```

### 阶段 2: 核心功能(Week 2)
```
TASK-P1-004 (AI Session Broker 实现)
    ↓
TASK-P1-005 (Permission & Policy Service) ← 并行 → TASK-P1-006 (Audit Service)
```

### 阶段 3: 集成与 UI(Week 3)
```
TASK-P1-007 (端到端集成测试)
    ↓
TASK-P1-008 (权限弹窗 UI) ← 并行 → TASK-P1-009 (审计视图 UI)
```

### 阶段 4: 完善(Week 4)
```
TASK-P1-010 (文档与示例完善)
```

---

## 五、AI 角色分配

| AI 标识 | 角色类型 | 负责任务(开发) | 负责任务(验收) |
|---------|---------|----------------|----------------|
| AI-Dev-001 | 开发 AI | TASK-P1-001, TASK-P1-002, TASK-P1-004 | - |
| AI-Dev-002 | 开发 AI | TASK-P1-003, TASK-P1-007 | - |
| AI-Dev-003 | 开发 AI | TASK-P1-005, TASK-P1-006 | - |
| AI-Dev-004 | 开发 AI | TASK-P1-008, TASK-P1-009 | - |
| AI-QA-001 | 验收 AI | - | TEST-P1-001, TEST-P1-002, TEST-P1-004, TEST-P1-007 |
| AI-QA-002 | 验收 AI | - | TEST-P1-003, TEST-P1-005, TEST-P1-006 |
| AI-QA-003 | 验收 AI | - | TEST-P1-008, TEST-P1-009 |
| AI-PM-001 | 项目经理 AI | TASK-P1-010 (文档完善) | - |

**分配逻辑**:
- AI-Dev-001: 负责核心 Service 层(Bus, Broker)
- AI-Dev-002: 负责 RPC Bridge 和集成测试
- AI-Dev-003: 负责权限和审计服务
- AI-Dev-004: 负责 UI 层
- AI-QA-001: 验收核心功能
- AI-QA-002: 验收 RPC 和服务层
- AI-QA-003: 验收 UI 层

---

## 六、复用 PoC-0 成果

PoC-1 将复用 PoC-0 的以下成果:

### 6.1 RPC Shape 基础
- `MainThreadTestAiInteropShape` → 扩展为 `MainThreadAiInteropShape`
- `ExtHostTestAiInteropShape` → 扩展为 `ExtHostAiInteropShape`
- `EndpointDescriptorDto` (已包含 hostKind 和 remoteAuthority)
- `AiInteropErrorCode` (已包含 REMOTE_AUTHORITY_MISMATCH 和 HOST_KIND_UNSUPPORTED)

### 6.2 路由逻辑
- `_canRoute()` 方法(已实现 hostKind 和 remoteAuthority 检查)
- 路由拒绝时的错误处理

### 6.3 审计日志基础
- 审计事件记录机制
- `invocation_rejected` 和 `invocation_success` 事件类型

### 6.4 测试扩展
- `test-ai-interop-controller` (扩展为完整的测试场景)
- `test-ai-interop-worker` (扩展为支持更多功能)

---

## 七、关键技术决策

### 7.1 Service 注册

所有 Service 需要在 Workbench 启动时注册到 DI 容器:
- 在 `src/vs/workbench/services/services.ts` 中注册
- 使用 `registerSingleton` 注册为单例服务

### 7.2 RPC Shape 命名规范

所有 RPC 方法必须以 `$` 开头(PoC-0 经验教训):
- MainThread 方法: `$registerEndpoint`, `$invoke`, `$acceptChunk` 等
- ExtHost 方法: `$onInvoke`, `$onChunk`, `$onComplete` 等

### 7.3 错误处理

统一使用错误码而非异常:
- 定义 `AiInteropErrorCode` 枚举
- 返回 `{ success: boolean; error?: { code: string; message: string } }` 格式

### 7.4 事件机制

使用 VS Code 标准 `Emitter<T>` 模式:
- Bus: `onDidRegisterEndpoint`, `onDidInvokeEndpoint`, `onDidReceiveChunk` 等
- Broker: `onDidCreateSession`, `onDidAddParticipant` 等

---

## 八、风险与应对

### 8.1 性能风险

**风险**: 高频流式传输可能导致性能问题

**应对**:
- 复用 PoC-0 验证的 RPC 机制
- 增加背压控制(Phase 2)
- 增加性能监控

### 8.2 并发风险

**风险**: 多个 invocation 并发可能导致状态混乱

**应对**:
- 使用 invocationId 隔离不同调用
- 使用 Map 存储 invocation 状态
- 增加并发测试场景

### 8.3 权限风险

**风险**: 权限控制不当可能导致安全问题

**应对**:
- 默认拒绝所有跨扩展调用
- 首次调用必须用户授权
- 记录所有授权决策到审计日志

---

## 九、验收环境与工具

### 9.1 开发环境
- VS Code Insiders (最新版)
- Node.js 18+
- TypeScript 5.3+

### 9.2 测试工具
- Extension Development Host
- Chrome DevTools (性能分析)
- 启动脚本: `/Users/immeta/work/humancode/startcode.sh`
- 日志文件: `/Users/immeta/work/humancode/1.log`

### 9.3 验收方法
- **日志驱动验证**: 大部分验收通过分析日志完成
- **人工测试辅助**: 人工测试用于触发功能并生成日志
- **自动化测试**: 编写自动化测试脚本(Phase 2 完善)

---

## 十、成功标准

PoC-1 成功必须同时满足:

### 10.1 功能标准
1. ✅ 两个本地扩展可通过平台 API 建立调用关系
2. ✅ 被调扩展可持续流式返回 chunk
3. ✅ 主控扩展可接收完整流并正确结束
4. ✅ cancel 可从主控扩展穿透到被调扩展
5. ✅ 平台可拒绝未授权跨扩展调用
6. ✅ 平台可为一次调用记录结构化审计事件

### 10.2 工程标准
1. ✅ 代码落点符合 Workbench / API / Contrib 分层
2. ✅ 不通过 hack 修改现有 chat/webview/DOM 机制
3. ✅ 与现有 MainThread / ExtHost / rpcProtocol 模式一致
4. ✅ 可在 Extension Development Host 中自动化测试

### 10.3 质量标准
1. ✅ TypeScript 编译通过,无错误
2. ✅ 代码符合 VS Code 编码规范
3. ✅ 所有任务通过验收
4. ✅ 端到端测试通过

---

## 十一、关键文档

- **执行摘要**: [01-executive-summary-and-scope.md](../ai-interop/01-executive-summary-and-scope.md)
- **核心架构**: [02-core-architecture.md](../ai-interop/02-core-architecture.md)
- **RPC 协议规范**: [03-rpc-and-dto-spec.md](../ai-interop/03-rpc-and-dto-spec.md)
- **Session 状态机**: [04-session-state-machine.md](../ai-interop/04-session-state-machine.md)
- **权限与安全**: [05-permission-and-security.md](../ai-interop/05-permission-and-security.md)
- **开发手册**: [08-development-playbook.md](../ai-interop/08-development-playbook.md)
- **PoC-0 总结报告**: [POC0-Final-Summary.md](../reports/POC0-Final-Summary.md)

---

## 十二、更新日志

| 日期 | 更新内容 | 更新人 |
|------|---------|--------|
| 2026-03-29 | 创建 PoC-1 阶段文档,定义 10 个核心任务 | AI-PM-001 |
