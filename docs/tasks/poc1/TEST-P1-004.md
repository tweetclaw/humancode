# 验收卡：TEST-P1-004

## 验收信息
- **验收编号**：TEST-P1-004
- **对应任务**：TASK-P1-004
- **验收 AI**：AI-QA-001
- **验收类型**：功能验收
- **状态**：⬜ 待验收

## 验收目标

验证 TASK-P1-004 的实现是否符合要求,确保 AI Session Broker 核心功能正确工作。

## 验收前准备

1. 阅读对应的开发任务卡 [TASK-P1-004.md](TASK-P1-004.md)
2. 确认开发 AI 已标记任务为"待验收"
3. 确认 TASK-P1-002 已完成(Bus Service 已实现)

## 验收步骤

### 1. 代码质量检查

- [ ] TypeScript 编译通过
- [ ] Service 类继承 `Disposable`
- [ ] Service 类实现 `IAISessionBrokerService` 接口
- [ ] 使用依赖注入模式
- [ ] 正确使用 `Emitter<T>` 实现事件

### 2. Session 管理功能验收

#### 2.1 createSession
- [ ] 可以成功创建 session
- [ ] 生成唯一的 sessionId
- [ ] 初始状态为 'active'
- [ ] 触发 `onDidCreateSession` 事件
- [ ] Session 持久化到 StorageService

#### 2.2 getSession / getAllSessions
- [ ] 可以通过 ID 查询 session
- [ ] 不存在的 session 返回 undefined
- [ ] getAllSessions 返回所有 session
- [ ] getAllSessions 按 lastActiveAt 降序排列

#### 2.3 deleteSession
- [ ] 可以成功删除 session
- [ ] 删除后查询返回 undefined
- [ ] 触发 `onDidDeleteSession` 事件
- [ ] 如果删除的是 active session,清除 active 状态
- [ ] 持久化更新

### 3. Participant 管理功能验收

#### 3.1 addParticipant
- [ ] 可以成功添加 participant
- [ ] Participant 包含在 session.participants 中
- [ ] 触发 `onDidAddParticipant` 事件
- [ ] 更新 session.lastActiveAt
- [ ] 重复添加相同 ID 抛出错误

#### 3.2 removeParticipant
- [ ] 可以成功移除 participant
- [ ] Participant 从 session.participants 中移除
- [ ] 触发 `onDidRemoveParticipant` 事件
- [ ] 更新 session.lastActiveAt
- [ ] 移除不存在的 participant 抛出错误

#### 3.3 getParticipants
- [ ] 返回正确的 participants 列表
- [ ] Session 不存在返回空数组

### 4. Invocation 关联功能验收

#### 4.1 associateInvocation
- [ ] 可以成功关联 invocation
- [ ] InvocationId 包含在 session.invocations 中
- [ ] 更新 session.lastActiveAt
- [ ] 重复关联不会重复添加

#### 4.2 getSessionInvocations
- [ ] 返回正确的 invocations 列表
- [ ] Session 不存在返回空数组

### 5. Session 状态管理验收

#### 5.1 updateSessionStatus
- [ ] 可以成功更新状态
- [ ] Session.status 正确更新
- [ ] 触发 `onDidUpdateSessionStatus` 事件
- [ ] 更新 session.lastActiveAt
- [ ] 支持所有状态: 'active', 'idle', 'archived'

#### 5.2 Active Session 管理
- [ ] getActiveSession 返回当前活跃 session
- [ ] 无活跃 session 时返回 undefined
- [ ] setActiveSession 可以设置活跃 session
- [ ] 删除活跃 session 时自动清除活跃状态

### 6. 持久化功能验收

- [ ] Session 数据保存到 StorageService
- [ ] 使用正确的 storage key: 'aiInterop.sessions'
- [ ] 使用 StorageScope.WORKSPACE
- [ ] 启动时自动加载已保存的 session
- [ ] Active session ID 也被持久化

### 7. 事件机制验收

- [ ] 所有事件都正确触发
- [ ] 事件数据完整且正确

### 8. 错误处理验收

- [ ] Session 不存在时抛出清晰的错误
- [ ] Participant 不存在时抛出清晰的错误
- [ ] 重复操作时抛出清晰的错误

## 验收结果

**验收 AI 操作流程**:
1. 按照验收步骤逐项检查
2. 创建验收报告文件: `docs/reports/TEST-P1-004-report.md`
3. 在任务跟踪表中更新状态
4. 通知项目经理验收结果

## 后续操作

### 如果验收通过
- [ ] 在任务跟踪表中将 TASK-P1-004 状态改为 ✅ 已完成
- [ ] 在任务跟踪表中将 TEST-P1-004 状态改为 ✅ 通过
- [ ] 通知项目经理验收通过

### 如果验收失败
- [ ] 在任务跟踪表中将 TASK-P1-004 状态改为 ❌ 验收失败
- [ ] 在任务跟踪表中将 TEST-P1-004 状态改为 ❌ 失败
- [ ] 在验收报告中详细记录发现的问题
- [ ] 通知开发 AI 修复问题
