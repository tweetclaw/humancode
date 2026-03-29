# 任务卡：TASK-POC0-003

## 任务信息
- **任务编号**：TASK-POC0-003
- **任务名称**：跨 Host 路由与隔离验证
- **对应验收**：TEST-POC0-003
- **开发 AI**：AI-Dev-002
- **验收 AI**：AI-QA-002
- **依赖任务**：无
- **优先级**：高
- **状态**：⬜ 待开始

## 任务背景

你是一个 VS Code 源码级别的 TypeScript 工程师。你正在参与 HumanCode 项目,这是一个基于 VS Code 深度改造的多 AI 协作 IDE。

本任务是 PoC-0 技术预研的第三个验证点,目标是验证 AI Interop 平台能否正确识别和路由不同 Extension Host 环境(local/remote/web)的调用,并在错配时拒绝调用以确保安全隔离。

**核心风险**: VS Code 存在 local/remote/web 多种 Extension Host,如果路由逻辑不正确,可能导致:
- 数据泄露(remote A 访问 remote B 的会话)
- 安全漏洞(web host 执行 local CLI 命令)
- 跨 host 协作场景无法实现

## 任务目标

实现并验证跨 Host 路由与隔离机制,确保:
1. 同 host 或兼容 host 的调用能够成功路由
2. remoteAuthority 不匹配的调用被正确拒绝
3. 不兼容的 hostKind 组合(如 web → local)被正确拒绝
4. 拒绝时返回准确的错误码
5. 所有路由决策被记录到审计日志

## 必须先阅读的文件

1. [docs/ai-interop/00-poc-0-technical-validation.md](../../ai-interop/00-poc-0-technical-validation.md) 第 5 节
   - 了解验证点 3 的目标、风险分析和通过标准
2. [docs/ai-interop/02-core-architecture.md](../../ai-interop/02-core-architecture.md)
   - 了解 AI Interop 的整体架构和 endpoint 注册机制
3. [docs/ai-interop/05-permission-and-security.md](../../ai-interop/05-permission-and-security.md)
   - 了解权限模型和安全策略
4. [src/vs/workbench/services/aiInterop/common/aiInterop.ts](../../../src/vs/workbench/services/aiInterop/common/aiInterop.ts)
   - 查看现有的接口定义和 DTO 结构
5. [src/vs/workbench/api/common/extHost.protocol.ts](../../../src/vs/workbench/api/common/extHost.protocol.ts) (搜索 TestAiInterop)
   - 参考 TASK-POC0-001 和 TASK-POC0-002 已实现的 RPC Shape

## 实现位置

### 需要修改的文件

1. **扩展 DTO 定义**
   - 文件: `src/vs/workbench/services/aiInterop/common/aiInterop.ts`
   - 在 `EndpointDescriptorDto` 中添加 `hostKind` 和 `remoteAuthority` 字段

2. **实现路由逻辑**
   - 文件: `src/vs/workbench/services/aiInterop/browser/aiInteropService.ts`
   - 在 `invoke` 方法中添加路由检查逻辑

3. **扩展错误码**
   - 文件: `src/vs/workbench/services/aiInterop/common/aiInterop.ts`
   - 添加 `REMOTE_AUTHORITY_MISMATCH` 和 `HOST_KIND_UNSUPPORTED` 错误码

4. **审计日志增强**
   - 文件: `src/vs/workbench/services/aiInterop/browser/aiInteropAuditService.ts`
   - 记录路由拒绝事件

### 需要创建的测试扩展

1. **test-ai-interop-controller** (已存在,需要扩展)
   - 位置: `extensions/test-ai-interop-controller/`
   - 添加跨 host 路由测试命令

2. **test-ai-interop-worker** (已存在,需要扩展)
   - 位置: `extensions/test-ai-interop-worker/`
   - 添加 hostKind 和 remoteAuthority 信息到 endpoint 注册

## 实现要求

### 1. DTO 扩展

在 `EndpointDescriptorDto` 中添加:
```typescript
export interface EndpointDescriptorDto {
	id: string;
	extensionId: string;
	hostKind: 'local' | 'remote' | 'web';  // 新增
	remoteAuthority?: string;              // 新增(仅 remote 时有值)
}
```

### 2. 路由检查逻辑

在 `AIInteropService.invoke()` 方法中,调用 worker endpoint 前添加路由检查:
```typescript
function canRoute(caller: EndpointDescriptor, target: EndpointDescriptor): { allowed: boolean; reason?: string } {
	// 规则 1: web 不能调用 local
	if (caller.hostKind === 'web' && target.hostKind === 'local') {
		return { allowed: false, reason: 'HOST_KIND_UNSUPPORTED' };
	}

	// 规则 2: remote 只能调用相同 remoteAuthority 的 endpoint
	if (caller.hostKind === 'remote' && target.hostKind === 'remote') {
		if (caller.remoteAuthority !== target.remoteAuthority) {
			return { allowed: false, reason: 'REMOTE_AUTHORITY_MISMATCH' };
		}
	}

	// 规则 3: local ↔ remote 允许(如果策略允许)
	// 规则 4: local ↔ local 允许
	// 规则 5: web ↔ web 允许
	return { allowed: true };
}
```

### 3. 错误码定义

在 `aiInterop.ts` 中添加错误码:
```typescript
export const enum AiInteropErrorCode {
	// ... 现有错误码
	REMOTE_AUTHORITY_MISMATCH = 'REMOTE_AUTHORITY_MISMATCH',
	HOST_KIND_UNSUPPORTED = 'HOST_KIND_UNSUPPORTED',
}
```

### 4. 审计日志

路由拒绝时,调用 `IAiInteropAuditService.logEvent()` 记录:
```typescript
{
	type: 'invocation_rejected',
	timestamp: Date.now(),
	callerId: caller.extensionId,
	targetId: target.id,
	reason: 'REMOTE_AUTHORITY_MISMATCH' | 'HOST_KIND_UNSUPPORTED',
	details: {
		callerHostKind: caller.hostKind,
		callerRemoteAuthority: caller.remoteAuthority,
		targetHostKind: target.hostKind,
		targetRemoteAuthority: target.remoteAuthority,
	}
}
```

### 5. 测试扩展增强

**Controller 扩展**添加命令 `test-ai-interop.testRouting`:
- 场景 1: 同 host 调用(local → local) - 应成功
- 场景 2: 跨 host 调用(模拟 local → remote) - 根据策略决定
- 场景 3: 错配拒绝(模拟 remote(A) → remote(B)) - 应拒绝,返回 `REMOTE_AUTHORITY_MISMATCH`
- 场景 4: 不兼容组合(模拟 web → local) - 应拒绝,返回 `HOST_KIND_UNSUPPORTED`

**Worker 扩展**在注册 endpoint 时提供 hostKind 和 remoteAuthority:
```typescript
vscode.aiInterop.registerEndpoint({
	id: 'test-worker',
	hostKind: 'local',  // 从环境中获取
	remoteAuthority: undefined,  // local 时为 undefined
});
```

### 6. 获取 hostKind 和 remoteAuthority

从 VS Code 环境中获取:
- `hostKind`: 通过 `vscode.env.uiKind` 判断(Desktop/Web),通过 `vscode.env.remoteName` 判断是否 remote
- `remoteAuthority`: 通过 `vscode.env.remoteName` 获取

## 不需要实现的部分

- 不需要实现完整的权限策略系统(PoC-1 实现)
- 不需要实现 UI 界面(PoC-1 实现)
- 不需要实现持久化配置(PoC-1 实现)
- 不需要实现真实的 remote/web 环境测试(本阶段通过模拟验证即可)

## 自验证清单(开发 AI 完成后自查)

- [ ] TypeScript 编译通过(`npm run compile-check-ts-native`)
- [ ] 代码符合 VS Code 编码规范(见 [CLAUDE.md](../../../.claude/CLAUDE.md))
- [ ] `EndpointDescriptorDto` 包含 `hostKind` 和 `remoteAuthority` 字段
- [ ] `canRoute()` 函数实现了所有路由规则
- [ ] 错误码 `REMOTE_AUTHORITY_MISMATCH` 和 `HOST_KIND_UNSUPPORTED` 已定义
- [ ] 路由拒绝时触发审计日志记录
- [ ] Controller 扩展实现了 4 个测试场景
- [ ] Worker 扩展在注册时提供 hostKind 和 remoteAuthority
- [ ] 场景 1(同 host)调用成功
- [ ] 场景 3(remote 错配)返回 `REMOTE_AUTHORITY_MISMATCH`
- [ ] 场景 4(web → local)返回 `HOST_KIND_UNSUPPORTED`
- [ ] 所有路由决策都记录到审计日志

## 完成后操作

1. 在任务跟踪表([docs/phases/poc-0.md](../../phases/poc-0.md))中将状态改为 ⏸️ 待验收
2. 在本文档"实施记录"区域补充实现要点和遇到的问题
3. 通知验收 AI 开始验收(引用验收任务编号 TEST-POC0-003)

## 实施记录

**开发 AI**：Claude (AI-Dev-002)
**完成时间**：2026-03-29

**实现要点**：
- 在 `extHost.protocol.ts` 中扩展了 `EndpointDescriptorDto` 接口,添加了 `hostKind` 和 `remoteAuthority` 字段
- 在 `extHost.protocol.ts` 中定义了错误码枚举 `AiInteropErrorCode`,包含 `REMOTE_AUTHORITY_MISMATCH` 和 `HOST_KIND_UNSUPPORTED`
- 在 `mainThreadTestAiInterop.ts` 中实现了 `_canRoute()` 方法,包含所有路由规则:
  - 规则 1: web 不能调用 local
  - 规则 2: remote 只能调用相同 remoteAuthority 的 endpoint
  - 规则 3-5: local ↔ remote、local ↔ local、web ↔ web 允许
- 在 `mainThreadTestAiInterop.ts` 中实现了审计日志功能,记录 `invocation_rejected` 和 `invocation_success` 事件
- 在 `mainThreadTestAiInterop.ts` 中实现了 `$invokeWithRouting()` 方法,执行路由检查并记录审计日志
- 在 `extHostTestAiInterop.ts` 中添加了 `registerEndpoint()` 和 `unregisterEndpoint()` 方法
- 在 `extHost.api.impl.ts` 中暴露了新的 API 给测试扩展
- 在 controller 扩展中添加了 `test-ai-interop.testRouting` 命令,实现了 4 个测试场景
- 在 worker 扩展中添加了 endpoint 注册功能,从环境中获取 hostKind 和 remoteAuthority

**遇到的问题**：
- 初始实现时在 `extHost.api.impl.ts` 中有语法错误(多余的闭合大括号),已修复
- `getAuditLog()` 方法的返回类型需要是 `Promise<any[]>` 而不是 `any[]`,已修复
- **第一次验收失败**: RPC 接口方法缺少 `$` 前缀。根据 VS Code RPC 机制,所有跨进程调用的方法必须以 `$` 开头,否则 Proxy 工厂不会正确绑定。已将 `invokeWithRouting` 和 `getAuditLog` 更名为 `$invokeWithRouting` 和 `$getAuditLog`,并同步更新了所有调用处。修复后 TypeScript 编译通过。

