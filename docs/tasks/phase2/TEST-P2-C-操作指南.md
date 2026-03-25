# TEST-P2-C 验收测试操作指南

## 前置准备

### 1. 启动 VS Code 开发环境
```bash
cd /Users/immeta/work/humancode
./scripts/code.sh
```

### 2. 检查 TypeScript 编译状态
```bash
npm run compile-check-ts-native
```
✅ 编译状态：已通过（无错误）

### 3. 准备测试数据

**重要提示**: 当前实现中，AI 角色和消息数据存储在内存中，重启 VS Code 后会丢失。因此每次测试前需要重新创建角色和消息。

- 创建至少 2 个 AI 角色（如果刚重启，需要重新创建）
- 发送一些测试消息

---

## 测试用例执行步骤

### 测试用例 1：转发对话框

**目标**: 验证点击"转发"按钮后，弹出目标角色选择对话框

**操作步骤**：

1. **创建测试角色和消息**（如果刚重启 VS Code）
   - 在 VS Code 左侧活动栏点击 AI Team 图标
   - 在 AI Team Commander 面板中点击"+ Add Member"
   - 创建至少 2 个 AI 角色（例如：前端工程师、后端工程师）
   - 选中一个角色，点击"Send Task"发送测试消息
   - 等待 AI 响应（约 2 秒）

2. **打开 Message Summary 面板**
   - 确保 Message Summary 面板可见
   - 应该能看到刚才发送的消息列表

2. **找到转发按钮**
   - 在消息列表中，每条消息底部应该有"→ Forward"按钮
   - 选择任意一条消息

3. **点击转发按钮**
   - 点击某条消息的"→ Forward"按钮
   - 应该立即弹出一个快速选择对话框

**验收检查点**：

- [ ] 每条消息都有"→ Forward"按钮
- [ ] 点击按钮后立即弹出选择对话框
- [ ] 对话框标题为："Select the target AI team member to forward this message to"
- [ ] 对话框列出所有可用的 AI 角色
- [ ] 每个选项显示两行信息：
  - 第一行：角色名称（粗体）
  - 第二行：角色职能描述（灰色小字）
- [ ] 可以使用键盘上下键选择
- [ ] 可以按 ESC 取消选择

**调试技巧**：

如果对话框没有弹出，打开浏览器开发者工具（Help → Toggle Developer Tools），查看 Console 是否有错误信息。

---

### 测试用例 2：转发成功

**目标**: 验证选择目标角色后，消息成功转发给目标角色

**操作步骤**：

1. **执行转发操作**
   - 在 Message Summary 面板中点击某条消息的"→ Forward"按钮
   - 在弹出的对话框中选择一个目标角色（例如"后端工程师 Bob"）
   - 按 Enter 或点击确认

2. **验证转发结果**
   - 切换到 AI Team Commander 面板
   - 找到刚才选择的目标角色卡片
   - 观察卡片上的消息摘要（最后一条消息预览）

3. **查看完整对话历史**（可选）
   - 如果需要查看完整的转发消息
   - 可以点击目标角色的"Send Task"按钮
   - 在输入框中应该能看到之前的对话历史

**验收检查点**：

- [ ] 选择目标角色后，对话框自动关闭
- [ ] 没有错误提示
- [ ] 目标角色卡片的消息摘要更新
- [ ] 消息摘要显示"[Forwarded message]..."
- [ ] 转发的消息内容正确（与原始消息一致）

**调试技巧**：

在浏览器开发者工具 Console 中执行：
```javascript
// 查看某个角色的对话历史
// 需要先获取 sessionManagerService 实例
// 这个调试代码仅供参考，实际使用需要根据具体情况调整
```

---

### 测试用例 3：自动选中

**目标**: 验证转发完成后，目标角色自动被选中（团队列表中变蓝）

**操作步骤**：

1. **记录当前选中的角色**
   - 在 AI Team Commander 面板中
   - 观察哪个角色卡片的背景是蓝色（当前选中）
   - 记住这个角色的名称

2. **执行转发到不同角色**
   - 切换到 Message Summary 面板
   - 点击某条消息的"→ Forward"按钮
   - 选择一个**不同于当前选中**的目标角色
   - 确认转发

3. **验证自动选中**
   - 立即切换回 AI Team Commander 面板
   - 观察角色卡片的背景颜色

**验收检查点**：

- [ ] 转发完成后，目标角色卡片背景变为蓝色
- [ ] 之前选中的角色卡片背景变回灰色
- [ ] 只有一个角色卡片是蓝色（被选中状态）
- [ ] 选中的角色正是刚才转发的目标角色

**视觉验证**：

选中状态的视觉特征：
- 背景颜色：蓝色（`var(--vscode-list-activeSelectionBackground)`）
- 边框：蓝色高亮（`var(--vscode-focusBorder)`）
- 有轻微的阴影效果

未选中状态的视觉特征：
- 背景颜色：灰色（`var(--vscode-editor-background)`）
- 边框：普通灰色（`var(--vscode-panel-border)`）
- 无阴影

---

## 边界情况测试

### 场景 1：取消转发

**操作步骤**：
1. 点击"→ Forward"按钮
2. 在对话框中按 ESC 键（或点击对话框外部）
3. 观察结果

**预期结果**：
- [ ] 对话框关闭
- [ ] 消息没有被转发
- [ ] 当前选中的角色没有变化
- [ ] 没有错误提示

---

### 场景 2：只有一个角色时转发

**操作步骤**：
1. 删除所有角色，只保留 1 个
2. 发送一条消息
3. 尝试转发这条消息

**预期结果**：
- [ ] 对话框显示唯一的角色
- [ ] 可以选择该角色（虽然是转发给自己）
- [ ] 转发成功，消息出现在该角色的对话历史中

---

### 场景 3：转发多次

**操作步骤**：
1. 选择一条消息
2. 转发给角色 A
3. 再次转发同一条消息给角色 B
4. 验证两个角色都收到了消息

**预期结果**：
- [ ] 可以多次转发同一条消息
- [ ] 每次转发都成功
- [ ] 每个目标角色都收到独立的转发消息副本

---

## 集成测试

### 测试场景：完整的转发工作流

**操作步骤**：

1. **创建测试场景**
   - 创建 3 个 AI 角色：
     - 前端工程师 Alex
     - 后端工程师 Bob
     - 测试工程师 Carol

2. **发送初始消息**
   - 选中 Alex（前端工程师）
   - 发送消息："请实现用户登录界面"
   - 等待 AI 响应

3. **转发给后端工程师**
   - 在 Message Summary 面板找到 Alex 的响应消息
   - 点击"→ Forward"
   - 选择 Bob（后端工程师）
   - 验证：
     - Bob 自动被选中（卡片变蓝）
     - Bob 的消息摘要显示转发的消息

4. **再次转发给测试工程师**
   - 在 Message Summary 面板找到同一条消息
   - 点击"→ Forward"
   - 选择 Carol（测试工程师）
   - 验证：
     - Carol 自动被选中（卡片变蓝）
     - Carol 的消息摘要显示转发的消息

5. **验证最终状态**
   - Alex 的对话历史：包含原始消息和响应
   - Bob 的对话历史：包含转发的消息
   - Carol 的对话历史：包含转发的消息
   - 当前选中：Carol（最后一次转发的目标）

**验收检查点**：

- [ ] 整个流程顺畅，无卡顿
- [ ] 每次转发都成功
- [ ] 自动选中功能每次都正确工作
- [ ] 消息内容在转发过程中保持完整
- [ ] 转发标记 `[Forwarded message]` 正确添加

---

## 性能测试

### 测试场景：大量消息时的转发性能

**操作步骤**：

1. 创建 5 个 AI 角色
2. 发送 20 条测试消息（在不同角色之间）
3. 在 Message Summary 面板中转发一条消息
4. 观察响应时间

**预期结果**：

- [ ] 对话框弹出速度快（< 500ms）
- [ ] 角色列表加载完整
- [ ] 转发操作响应快（< 1s）
- [ ] UI 没有明显卡顿

---

## 常见问题排查

### 问题 1：转发按钮不显示

**可能原因**：
- 消息的 `canForward` 属性为 `false`
- CSS 样式问题

**排查步骤**：
1. 打开浏览器开发者工具
2. 检查消息卡片的 HTML 结构
3. 查看是否有 `.message-actions` 元素
4. 检查 Console 是否有错误

### 问题 2：对话框不弹出

**可能原因**：
- `quickInputService` 未正确注入
- 没有可用的角色

**排查步骤**：
1. 检查是否至少有 1 个 AI 角色
2. 查看 Console 是否有错误信息
3. 验证 `handleForward` 方法是否被调用

### 问题 3：转发后目标角色没有自动选中

**可能原因**：
- `setActiveSession` 未被调用
- AI Team Panel 未监听状态变化

**排查步骤**：
1. 在 Console 中查找 `setActiveSession` 相关日志
2. 检查 `activeSessionId` 是否更新
3. 验证 AI Team Panel 的事件监听是否正常

### 问题 4：转发的消息内容不正确

**可能原因**：
- 消息 ID 不匹配
- 消息内容被修改

**排查步骤**：
1. 在 Console 中打印转发的消息对象
2. 验证 `messageId` 是否正确
3. 检查 `forwardMessage` 方法的实现

---

## 调试技巧

### 查看转发事件

在浏览器开发者工具 Console 中执行：
```javascript
// 监听转发事件（需要访问 messageHubService 实例）
// 这个代码仅供参考，实际使用需要根据具体情况调整
```

### 查看当前选中的角色

```javascript
// 查看当前选中的角色
const activeCard = document.querySelector('.ai-role-card.active');
if (activeCard) {
  console.log('Active role:', {
    sessionId: activeCard.dataset.sessionId,
    name: activeCard.querySelector('.role-name')?.textContent
  });
}
```

### 查看所有消息的转发按钮

```javascript
// 统计转发按钮数量
const forwardButtons = document.querySelectorAll('.message-action-button');
console.log(`Total forward buttons: ${forwardButtons.length}`);
```

---

## 相关文件

- 验收文档: [TEST-P2-C.md](TEST-P2-C.md)
- 验收报告: [TEST-P2-C-验收报告.md](TEST-P2-C-验收报告.md)
- UI 实现: [messageSummaryPanel.ts](../../../src/vs/workbench/contrib/aiTeam/browser/messageSummaryPanel.ts)
- 服务实现: [messageHubService.ts](../../../src/vs/workbench/contrib/aiTeam/browser/messageHubService.ts)
- 接口定义: [messageHub.ts](../../../src/vs/workbench/contrib/aiTeam/common/messageHub.ts)
- AI Team Panel: [aiTeamPanel.ts](../../../src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts)

---

**创建时间**: 2026-03-25
