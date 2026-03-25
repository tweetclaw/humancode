# 任务卡：TASK-P1-005

## 任务信息
- **任务编号**：TASK-P1-005
- **任务名称**：AI 会话配置持久化
- **对应验收**：TEST-P1-005
- **开发 AI**：AI-Dev-001
- **验收 AI**：AI-QA-002
- **依赖任务**：TASK-P1-001 (AISessionManagerService 实现)
- **优先级**：中
- **状态**：✅ 已完成

## 任务背景
当前 AISessionManagerService 的会话配置只存在于内存中，IDE 重启后所有创建的 AI 角色会话都会丢失。用户需要重新配置所有角色，体验很差。本任务需要实现会话配置的持久化存储，确保 IDE 重启后会话仍然存在。

## 任务目标
将会话配置保存到 VS Code 的存储系统中，IDE 重启后自动恢复已保存的会话。

## 必须先阅读的文件
1. `src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts` - 理解 ISessionContext 接口定义
2. `src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts` - 当前 Service 实现，需要在此基础上添加持久化逻辑
3. `src/vs/platform/storage/common/storage.ts` - 了解 IStorageService 的使用方法

## 实现位置
修改文件：`src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts`

## 实现要求

### 1. 存储位置
- 使用 VS Code 的 `IStorageService` 进行持久化存储
- 存储 key: `aiSessionManager.sessions`
- 存储范围: `StorageScope.WORKSPACE`（工作区级别）
- 存储目标: `StorageTarget.USER`（用户配置）

### 2. 存储内容
存储 `ISessionContext[]` 的 JSON 序列化，但需要注意：
- **保存**：`id`, `name`, `role`, `systemPrompt`, `metadata`, `status`
- **不保存**：`conversationHistory`（历史消息太大，Phase 2 再实现）

建议定义一个精简的接口用于序列化：
```typescript
interface ISerializableSessionContext {
	id: string;
	name: string;
	role: string;
	systemPrompt: string;
	metadata?: Record<string, any>;
	status: 'idle' | 'working' | 'error';
}
```

### 3. 保存时机
- `createSession` 后自动保存
- `deleteSession` 后自动保存
- `appendMessage` 后**不保存**（历史消息暂不持久化）
- 可选：添加防抖机制（debounce 1 秒），避免频繁写入

### 4. 加载时机
- 在构造函数中从 `IStorageService` 加载已保存的会话
- 加载后恢复到 `_sessions` Map 中
- 加载时需要处理：
  - JSON 解析错误（使用 try-catch）
  - 数据格式不匹配（版本兼容性）
  - 空数据或损坏数据

### 5. 错误处理
- 如果加载失败，记录错误日志但不阻塞服务启动
- 如果保存失败，记录错误日志但不影响内存中的会话状态

## 实现示例（参考）

```typescript
private _loadSessions(): void {
	try {
		const stored = this._storageService.get('aiSessionManager.sessions', StorageScope.WORKSPACE);
		if (stored) {
			const sessions: ISerializableSessionContext[] = JSON.parse(stored);
			sessions.forEach(session => {
				this._sessions.set(session.id, {
					...session,
					conversationHistory: [] // 历史消息为空
				});
			});
		}
	} catch (error) {
		console.error('[AISessionManagerService] Failed to load sessions:', error);
	}
}

private _saveSessions(): void {
	try {
		const sessions = Array.from(this._sessions.values()).map(session => ({
			id: session.id,
			name: session.name,
			role: session.role,
			systemPrompt: session.systemPrompt,
			metadata: session.metadata,
			status: session.status
		}));
		this._storageService.store(
			'aiSessionManager.sessions',
			JSON.stringify(sessions),
			StorageScope.WORKSPACE,
			StorageTarget.USER
		);
	} catch (error) {
		console.error('[AISessionManagerService] Failed to save sessions:', error);
	}
}
```

## 不需要实现的部分
- ❌ 不需要持久化 `conversationHistory`（历史消息）
- ❌ 不需要实现版本迁移逻辑（Phase 2 再考虑）
- ❌ 不需要实现导入/导出功能
- ❌ 不需要实现跨工作区共享会话

## 自验证清单（开发 AI 完成后自查）
- [ ] TypeScript 编译通过（运行 `npm run compile-check-ts-native`）
- [ ] 代码符合 VS Code 编码规范（见 CLAUDE.md）
- [ ] 创建会话后能在存储中看到数据
- [ ] 重启 IDE 后会话仍然存在
- [ ] 删除会话后存储中的数据也被删除
- [ ] 历史消息不会被持久化（验证存储大小合理）
- [ ] 错误处理完善（JSON 解析错误、空数据等）

## 完成后操作
1. 在任务跟踪表中将状态改为 ⏸️ 待验收
2. 在"实施记录"区域补充实现要点和遇到的问题
3. 通知验收 AI 开始验收（引用验收任务编号 TEST-P1-005）

## 实施记录
**开发 AI**：AI-Dev-001
**完成时间**：2026-03-24

**实现要点**：
- 添加了 `ISerializableSessionContext` 接口用于持久化存储，只包含必要字段，不包含 `conversationHistory`
- 在构造函数中注入 `IStorageService`，使用 `@IStorageService` 装饰器
- 实现了 `_loadSessions()` 方法，在构造函数中调用，从存储中恢复会话
- 实现了 `_saveSessions()` 方法，将会话序列化为 JSON 并保存到存储
- 在 `createSession()` 和 `deleteSession()` 方法中调用 `_saveSessions()` 进行持久化
- 使用 `StorageScope.WORKSPACE` 和 `StorageTarget.USER` 作为存储范围和目标
- 添加了完善的错误处理，加载和保存失败时记录错误但不影响服务运行

**遇到的问题**：
- 无重大问题，实现过程顺利

**验收失败后的修复**：
- 修复了 UI 缺少系统提示词输入的问题：在 [aiTeamPanel.ts:208-236](../src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts) 的 `handleAddMember()` 方法中添加了第三个输入框，允许用户自定义系统提示词，如果用户直接按回车则使用默认值
- 删除了遗留文件 `mockAISessionManagerService.ts`
- 更新了 [aiTeam.contribution.ts](../src/vs/workbench/contrib/aiTeam/browser/aiTeam.contribution.ts) 中的注释，移除了对已删除 Mock Service 的引用
