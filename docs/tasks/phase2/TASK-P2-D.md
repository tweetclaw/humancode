# TASK-P2-D — 全局上下文库与数据持久化

**任务编号**: TASK-P2-D
**任务名称**: 全局上下文库与数据持久化实现
**所属阶段**: Phase 2 — AI 团队协作基础设施
**开发 AI**: 待分配
**验收 AI**: 待分配
**依赖任务**: TASK-P1-001 (AISessionManagerService), TASK-P2-A, TASK-P2-B
**状态**: ⬜ 待开始

---

## 一、任务目标

实现三部分数据持久化功能，确保重启 VS Code 后数据不丢失：
1. **D1 - AI 角色数据持久化**
2. **D2 - 消息数据持久化**
3. **D3 - 全局上下文库**

**核心价值**：用户无需每次重启都重新创建角色和重新输入对话。

**问题背景**：参见 [ISSUE-数据持久化缺失.md](ISSUE-数据持久化缺失.md)

---

## 二、功能需求

### 2.1 AI 角色数据持久化（D1）

**需要保存的数据**：
- 所有 AI 角色的会话信息（sessionId, name, role, systemPrompt）
- 角色的元数据（status, createdAt, lastActiveAt, messageCount）
- 当前激活的会话 ID

**实现要求**：
- 使用 `IStorageService` 保存到 `StorageScope.WORKSPACE`
- 启动时自动加载已保存的角色
- 增量更新：创建、删除、修改角色时自动保存

### 2.2 消息数据持久化（D2）

**需要保存的数据**：
- 所有对话历史（conversationHistory）
- 消息汇总面板的消息记录（IMessageRecord[]）

**实现要求**：
- 使用 `IStorageService` 保存到 `StorageScope.WORKSPACE`
- 启动时自动加载历史消息
- 增量更新：新消息时自动保存

### 2.3 全局上下文库（D3）

**需要保存的数据**：
- 跨会话共享的项目记忆（技术栈、架构决策、已实现功能）
- Token 预算管理配置
- 上下文检索索引

**实现要求**：
- 使用 `IStorageService` 保存到 `StorageScope.WORKSPACE`
- 提供 `addContext()`, `getContext()`, `retrieveContext()` 方法
- 在 `getSessionContext()` 中注入全局上下文

---

## 三、存储结构设计

### 3.1 存储键定义

```typescript
const STORAGE_KEYS = {
  SESSIONS: 'humancode.sessions',           // AI 角色数据
  ACTIVE_SESSION: 'humancode.activeSession', // 当前激活的会话 ID
  MESSAGES: 'humancode.messages',           // 消息数据
  CONTEXT_LIBRARY: 'humancode.context'      // 全局上下文
};
```

### 3.2 存储级别

- **StorageScope.WORKSPACE**：项目特定数据（推荐）
- **StorageTarget.USER**：用户数据

### 3.3 数据格式

```typescript
// AI 角色数据
interface IStoredSession {
  sessionId: string;
  name: string;
  role: string;
  systemPrompt: string;
  metadata: ISessionMetadata;
}

// 消息数据
interface IStoredMessage {
  id: string;
  fromSessionId: string;
  toSessionId: string;
  content: string;
  timestamp: number;
}
```

---

## 四、实现要点

### 4.1 修改 AISessionManagerService

**文件位置**：`src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts`

**修改点**：
1. 构造函数中注入 `IStorageService`
2. 构造函数中调用 `loadSessions()` 加载已保存的角色
3. `createSession()` 后调用 `saveSessions()`
4. `deleteSession()` 后调用 `saveSessions()`
5. `setActiveSession()` 后调用 `saveActiveSession()`

```typescript
private loadSessions(): void {
  const data = this.storageService.get(STORAGE_KEYS.SESSIONS, StorageScope.WORKSPACE);
  if (data) {
    const sessions: IStoredSession[] = JSON.parse(data);
    sessions.forEach(s => {
      this._sessions.set(s.sessionId, {
        ...s,
        conversationHistory: [] // 历史消息单独加载
      });
    });
  }

  const activeId = this.storageService.get(STORAGE_KEYS.ACTIVE_SESSION, StorageScope.WORKSPACE);
  if (activeId && this._sessions.has(activeId)) {
    this._activeSessionId = activeId;
  }
}

private saveSessions(): void {
  const sessions = Array.from(this._sessions.values()).map(s => ({
    sessionId: s.sessionId,
    name: s.name,
    role: s.role,
    systemPrompt: s.systemPrompt,
    metadata: s.metadata
  }));
  this.storageService.store(
    STORAGE_KEYS.SESSIONS,
    JSON.stringify(sessions),
    StorageScope.WORKSPACE,
    StorageTarget.USER
  );
}
```

### 4.2 修改 MessageHubService

**文件位置**：`src/vs/workbench/contrib/aiTeam/browser/messageHubService.ts`

**修改点**：
1. 构造函数中注入 `IStorageService`
2. 构造函数中调用 `loadMessages()` 加载历史消息
3. `addMessage()` 后调用 `saveMessages()`

```typescript
private loadMessages(): void {
  const data = this.storageService.get(STORAGE_KEYS.MESSAGES, StorageScope.WORKSPACE);
  if (data) {
    this._messages = JSON.parse(data);
  }
}

private saveMessages(): void {
  this.storageService.store(
    STORAGE_KEYS.MESSAGES,
    JSON.stringify(this._messages),
    StorageScope.WORKSPACE,
    StorageTarget.USER
  );
}
```

### 4.3 实现 ContextLibraryService

**文件位置**：`src/vs/workbench/services/aiContext/browser/contextLibraryService.ts`（待创建）

**实现要求**：
- 实现 `IContextLibraryService` 接口
- 使用 `IStorageService` 持久化上下文
- 提供 Token 预算管理

---

## 五、验收标准

### 测试用例 1：AI 角色持久化

**操作步骤**：
1. 创建 2 个 AI 角色（项目经理、前端工程师）
2. 重启 VS Code
3. 打开 AI Team Panel

**预期结果**：
- ✅ 2 个角色仍然存在
- ✅ 角色的名称、职能、系统提示词保持不变
- ✅ 项目经理默认被选中

### 测试用例 2：消息持久化

**操作步骤**：
1. 向项目经理发送消息："实现登录功能"
2. 项目经理回复
3. 重启 VS Code
4. 打开消息汇总面板

**预期结果**：
- ✅ 对话历史保留
- ✅ 消息汇总面板显示之前的消息

### 测试用例 3：全局上下文共享

**操作步骤**：
1. 前端角色说"用 React"
2. 添加到全局上下文
3. 重启 VS Code
4. QA 角色提问

**预期结果**：
- ✅ QA 角色知道项目使用 React

---

## 六、实现注意事项

### 6.1 性能优化

- 使用防抖（debounce）避免频繁保存
- 只保存必要的数据，不保存冗余信息

### 6.2 数据迁移

- 考虑未来的数据格式变更
- 添加版本号字段

### 6.3 错误处理

- 存储失败时不应阻塞正常功能
- 加载失败时使用空数据初始化

---

## 七、交付物清单

- [ ] 修改 `aiSessionManagerService.ts`，增加持久化逻辑
- [ ] 修改 `messageHubService.ts`，增加持久化逻辑
- [ ] 创建 `contextLibraryService.ts`，实现全局上下文库
- [ ] 通过 TypeScript 编译检查（无错误）
- [ ] 3 个测试用例验证通过

---

## 八、参考资料

- **Phase 1 Task E**：[TASK-P1-TaskE.md](../phase1/TASK-P1-TaskE.md) - 配置持久化实现参考
- **VS Code Storage API**：`src/vs/platform/storage/common/storage.ts`
- **问题报告**：[ISSUE-数据持久化缺失.md](ISSUE-数据持久化缺失.md)

---

**创建时间**：2026-03-25
**最后更新**：2026-03-25
