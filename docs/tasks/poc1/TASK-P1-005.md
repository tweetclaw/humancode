# 任务卡：TASK-P1-005

## 任务信息
- **任务编号**：TASK-P1-005
- **任务名称**：Permission & Policy Service 实现
- **对应验收**：TEST-P1-005
- **开发 AI**：AI-Dev-003
- **验收 AI**：AI-QA-002
- **依赖任务**：TASK-P1-001 (Service 层接口定义)
- **优先级**：中
- **状态**：⏸️ 待验收

## 任务背景

本任务实现权限控制和授权决策功能,确保跨扩展调用的安全性。

## 任务目标

实现 `AIInteropPolicyService`,提供:
1. 授权决策(checkPermission, requestPermission)
2. 授权记录管理(grantPermission, revokePermission)
3. 路由策略检查(canRoute - 复用 PoC-0)

## 必须先阅读的文件

1. [src/vs/workbench/services/aiInterop/common/aiInterop.ts](../../../src/vs/workbench/services/aiInterop/common/aiInterop.ts)
2. [docs/ai-interop/05-permission-and-security.md](../../ai-interop/05-permission-and-security.md)
3. [src/vs/workbench/api/browser/mainThreadTestAiInterop.ts](../../../src/vs/workbench/api/browser/mainThreadTestAiInterop.ts) - PoC-0 的 canRoute 实现

## 实现位置

**文件**: `src/vs/workbench/services/aiInterop/browser/aiInteropPolicyService.ts`

## 实现要求

### 核心功能

1. **checkPermission**: 检查是否已授权,如果未授权返回 denied
2. **requestPermission**: 触发授权流程(Phase 1 自动授权 session 级别)
3. **grantPermission**: 记录授权
4. **revokePermission**: 撤销授权
5. **canRoute**: 复用 PoC-0 的路由检查逻辑(hostKind, remoteAuthority)

### Phase 1 简化实现

- 自动授权所有请求为 'session' 级别
- 不弹出 UI(UI 由 TASK-P1-008 实现)
- 授权记录持久化到 StorageService

## 完成后操作

1. 在任务跟踪表中将状态改为 ⏸️ 待验收
2. 填写"实施记录"
3. 通知验收 AI

## 实施记录

**开发 AI**：AI-Dev-003
**完成时间**：2026-03-30

**实现要点**：
- 完整实现了 IAIInteropPolicyService 接口的所有方法
- 添加了 ILogService 和 IStorageService 依赖注入
- 实现了 checkPermission 和 requestPermission 授权决策逻辑
- Phase 1 简化实现：自动授权所有请求为 'session' 级别
- 实现了 grantPermission、revokePermission 和 getPermissions 权限记录管理
- 复用 PoC-0 的 canRoute 路由策略检查逻辑（web->local 拒绝、remote authority 匹配检查）
- 实现了持久化功能，使用 IStorageService 将权限记录保存到 WORKSPACE 作用域
- 启动时自动加载已保存的权限记录，并过滤掉已过期的权限
- 'once' 作用域的权限设置 1 分钟过期时间
- 所有操作都通过 ILogService 记录详细日志
- 使用 Emitter<T> 实现权限授予和撤销事件
- Service 类正确继承 Disposable 并注册所有 emitters

**遇到的问题**：
- 无重大问题。实现过程顺利，TypeScript 编译通过
