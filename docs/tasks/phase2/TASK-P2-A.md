# TASK-P2-A — 团队列表与选中机制

**任务编号**: TASK-P2-A
**任务名称**: 团队列表与选中机制实现
**所属阶段**: Phase 2 — AI 团队协作基础设施
**开发 AI**: 待分配
**验收 AI**: 待分配
**依赖任务**: TASK-P1-001 (AISessionManagerService)
**状态**: ⬜ 待开始

---

## 一、任务目标

实现团队列表的选中机制，让用户可以通过点击角色卡片来切换当前对话的目标对象。

**核心价值**：用户可以自由切换对话对象，无需手动输入目标角色名称。

---

## 二、功能需求

### 2.1 UI 结构

```
┌─────────────────────┐
│  AI 团队            │
├─────────────────────┤
│  [项目经理 PM] 🔵   │  ← 默认选中（蓝色）
│  状态：空闲          │
│                     │
│  [前端工程师 Alex]  │
│  状态：工作中        │
│                     │
│  [测试工程师 Jordan]│
│  状态：空闲          │
└─────────────────────┘
```

### 2.2 核心功能

1. **显示所有 AI 角色**
   - 从 `IAISessionManagerService.getAllSessions()` 获取所有会话
   - 每个角色显示：名称、角色、状态

2. **默认选中项目经理**
   - 打开 IDE 时，默认选中项目经理（如果存在）
   - 选中的卡片背景变蓝

3. **点击切换选中**
   - 点击任意角色卡片 → 该角色被选中
   - 之前选中的角色变回灰色
   - 当前选中的角色 = 聊天输入框的目标对象

4. **状态显示**
   - 空闲：灰色圆点
   - 工作中：绿色圆点 + 呼吸动画
   - 等待：黄色圆点

---

## 三、实现要求

### 3.1 文件位置

**修改文件**：
```
src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts
src/vs/workbench/contrib/aiTeam/browser/media/aiTeam.css
```

### 3.2 核心实现点

#### 1. 选中状态管理

```typescript
private selectedSessionId: string | null = null;

private selectSession(sessionId: string): void {
	this.selectedSessionId = sessionId;
	this.sessionManager.setActiveSession(sessionId);
	this.updateUI();
}
```

#### 2. 默认选中项目经理

```typescript
private setDefaultSelection(): void {
	const sessions = this.sessionManager.getAllSessions();
	// 查找项目经理角色
	const pmSession = sessions.find(s =>
		s.role.toLowerCase().includes('项目经理') ||
		s.role.toLowerCase().includes('pm')
	);

	if (pmSession) {
		this.selectSession(pmSession.sessionId);
	} else if (sessions.length > 0) {
		// 如果没有项目经理，选中第一个
		this.selectSession(sessions[0].sessionId);
	}
}
```

#### 3. 卡片点击事件

```typescript
private renderSessionCard(session: ISessionContext): HTMLElement {
	const card = document.createElement('div');
	card.className = 'session-card';

	// 如果是选中的会话，添加 selected 类
	if (session.sessionId === this.selectedSessionId) {
		card.classList.add('selected');
	}

	// 点击事件
	card.addEventListener('click', () => {
		this.selectSession(session.sessionId);
	});

	// ... 渲染卡片内容

	return card;
}
```

#### 4. CSS 样式

```css
/* 默认卡片样式 */
.session-card {
	background-color: var(--vscode-sideBar-background);
	border: 1px solid var(--vscode-sideBar-border);
	cursor: pointer;
	transition: background-color 0.2s;
}

/* 选中状态 */
.session-card.selected {
	background-color: var(--vscode-list-activeSelectionBackground);
	border-color: var(--vscode-list-activeSelectionForeground);
}

/* 悬停状态 */
.session-card:hover {
	background-color: var(--vscode-list-hoverBackground);
}
```

---

## 四、验收方式

### 测试用例 1：默认选中

**操作步骤**：
1. 打开 IDE
2. 打开 AI Team Panel

**预期结果**：
- ✅ 项目经理角色默认被选中（卡片背景变蓝）
- ✅ 如果没有项目经理，第一个角色被选中

### 测试用例 2：点击切换选中

**操作步骤**：
1. 点击"前端工程师"卡片

**预期结果**：
- ✅ 前端工程师被选中（卡片背景变蓝）
- ✅ 项目经理变回灰色
- ✅ `activeSessionId` 更新为前端工程师的 sessionId

### 测试用例 3：状态显示

**操作步骤**：
1. 观察不同状态的角色卡片

**预期结果**：
- ✅ 空闲状态：灰色圆点
- ✅ 工作中状态：绿色圆点 + 呼吸动画
- ✅ 等待状态：黄色圆点

---

## 五、实现注意事项

### 5.1 遵循 VS Code 编码规范

- 使用 tabs 缩进，不使用 spaces
- 使用 PascalCase 命名类型，camelCase 命名方法
- 使用 JSDoc 注释

### 5.2 性能优化

- 避免频繁的 DOM 操作
- 使用事件委托处理点击事件

### 5.3 用户体验

- 选中状态变化应该有视觉反馈
- 卡片悬停时应该有提示

---

## 六、交付物清单

- [ ] 修改 `aiTeamPanel.ts`，增加选中状态管理
- [ ] 修改 `aiTeam.css`，增加选中状态样式
- [ ] 通过 TypeScript 编译检查（无错误）
- [ ] 3 个测试用例验证通过

---

## 七、参考资料

- **Phase 1 实现**：[aiTeamPanel.ts](../../src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts)
- **Phase 2 规划**：[phase2.md](../phases/phase2.md)
- **AISessionManagerService**：[aiSessionManagerService.ts](../../src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts)

---

## 八、时间估算

**预计工作量**：0.5-1 天

---

**创建时间**：2026-03-25
**最后更新**：2026-03-25
