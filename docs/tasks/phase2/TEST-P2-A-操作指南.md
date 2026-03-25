# TEST-P2-A 验收测试操作指南

## 前置准备

### 1. 启动 VS Code 开发环境
```bash
cd /Users/immeta/work/humancode
./scripts/code.sh
```

### 2. 检查 TypeScript 编译状态
确认没有编译错误：
```bash
npm run compile-check-ts-native
```
✅ 编译状态：已通过（无错误）

### 3. 创建测试用的 AI 角色
在开始测试前，需要至少创建 2 个 AI 角色，包括项目经理。

---

## 测试用例执行步骤

### 测试用例 1：默认选中项目经理

**操作步骤：**
1. 打开 VS Code
2. 在侧边栏找到并打开 "AI Team Panel"（AI 开发团队面板）
   - 可能在左侧或右侧的活动栏中

**验收检查点：**
- [ ] 项目经理角色的卡片背景是否为蓝色（选中状态）
- [ ] 其他角色卡片背景是否为灰色（未选中状态）
- [ ] 打开浏览器开发者工具（Help → Toggle Developer Tools），在 Console 中执行：
  ```javascript
  // 检查 activeSessionId 是否为项目经理的 sessionId
  document.querySelector('.ai-role-card.active')?.dataset.sessionId
  ```
  应该返回项目经理的 sessionId

**预期结果：**
- ✅ 项目经理角色默认被选中（卡片有 `active` 类，背景变蓝）
- ✅ `activeSessionId` 为项目经理的 sessionId

**代码参考：**
- 选中逻辑：[aiTeamPanel.ts:370-395](src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts#L370-L395)
- 样式定义：[aiTeam.css:54-58](src/vs/workbench/contrib/aiTeam/browser/media/aiTeam.css#L54-L58)

---

### 测试用例 2：点击切换选中

**操作步骤：**
1. 在 AI Team Panel 中，点击"前端工程师"（或其他非项目经理的角色）卡片
2. 观察卡片状态变化

**验收检查点：**
- [ ] 被点击的角色卡片背景是否变为蓝色
- [ ] 项目经理卡片背景是否变回灰色
- [ ] 在浏览器开发者工具 Console 中执行：
  ```javascript
  document.querySelector('.ai-role-card.active')?.dataset.sessionId
  ```
  应该返回前端工程师的 sessionId

**预期结果：**
- ✅ 前端工程师被选中（卡片背景变蓝）
- ✅ 项目经理变回灰色（失去 `active` 类）
- ✅ `activeSessionId` 更新为前端工程师的 sessionId

**代码参考：**
- 点击处理：[aiTeamPanel.ts:115-126](src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts#L115-L126)
- 激活逻辑：[aiTeamPanel.ts:289-311](src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts#L289-L311)

---

### 测试用例 3：状态显示

**操作步骤：**
1. 观察不同状态的角色卡片左上角的状态指示器（圆点）

**验收检查点：**
- [ ] 空闲状态（idle）：灰色圆点（#9E9E9E）
- [ ] 工作中状态（working）：绿色圆点（#4CAF50）+ 呼吸动画（脉冲效果）
- [ ] 等待状态（waiting）：黄色圆点（#FF9800）
- [ ] 错误状态（error）：红色圆点（#F44336）

**如何测试不同状态：**
可以通过浏览器开发者工具手动修改状态来测试：
```javascript
// 在 Console 中执行，将第一个角色设置为 working 状态
const card = document.querySelector('.ai-role-card');
const indicator = card.querySelector('.status-indicator');
indicator.className = 'status-indicator status-working';
```

**预期结果：**
- ✅ 空闲状态：灰色圆点
- ✅ 工作中状态：绿色圆点 + 呼吸动画
- ✅ 等待状态：黄色圆点

**代码参考：**
- 状态样式：[aiTeam.css:60-93](src/vs/workbench/contrib/aiTeam/browser/media/aiTeam.css#L60-L93)
- 状态更新：[aiTeamPanel.ts:172-192](src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts#L172-L192)

---

## 调试技巧

### 查看所有角色卡片
```javascript
// 在浏览器开发者工具 Console 中执行
document.querySelectorAll('.ai-role-card').forEach((card, index) => {
  console.log(`Card ${index}:`, {
    sessionId: card.dataset.sessionId,
    isActive: card.classList.contains('active'),
    roleName: card.querySelector('.role-name')?.textContent,
    status: card.querySelector('.status-indicator')?.className
  });
});
```

### 查看当前激活的会话
```javascript
// 查看当前激活的角色
const activeCard = document.querySelector('.ai-role-card.active');
if (activeCard) {
  console.log('Active session:', {
    sessionId: activeCard.dataset.sessionId,
    name: activeCard.querySelector('.role-name')?.textContent
  });
} else {
  console.log('No active session');
}
```

---

## 验收标准

所有测试用例的预期结果均需满足，才能判定为 ✅ 通过。

如果有任何测试用例未通过，请记录：
1. 具体哪个测试用例失败
2. 实际观察到的现象
3. 截图或错误信息

---

## 相关文件

- 主要实现：[aiTeamPanel.ts](src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts)
- 样式文件：[aiTeam.css](src/vs/workbench/contrib/aiTeam/browser/media/aiTeam.css)
- 服务接口：[aiSessionManager.ts](src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts)
- 验收文档：[TEST-P2-A.md](TEST-P2-A.md)
