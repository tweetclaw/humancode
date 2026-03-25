# TEST-P2-B 验收测试操作指南

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

---

## 测试用例执行步骤

### 测试用例 1：消息显示

**目标**: 验证消息汇总面板能正确显示所有消息，包含发送者、接收者、时间、内容

**操作步骤**：

1. **打开 AI Team 侧边栏**
   - 在 VS Code 左侧活动栏中找到 AI Team 图标（组织图标）
   - 点击打开 AI Team 侧边栏

2. **打开 Message Summary 面板**
   - 在 AI Team 侧边栏中，应该看到两个面板：
     - "AI Team Commander"（团队列表）
     - "Message Summary"（消息汇总）
   - 确保 Message Summary 面板可见

3. **创建测试角色并发送消息**
   - 在 AI Team Commander 面板中，点击"+ Add Member"创建 2 个 AI 角色
   - 例如：
     - 角色 1: "前端工程师 Alex"，职能 "Frontend Development"
     - 角色 2: "后端工程师 Bob"，职能 "Backend Development"

4. **发送测试消息**
   - 选中一个角色（点击卡片）
   - 点击"Send Task"按钮
   - 输入测试消息，如："请帮我实现用户登录功能"
   - 等待 AI 响应（模拟响应会在 2 秒后出现）

5. **切换到另一个角色并发送消息**
   - 点击另一个角色的卡片
   - 再次点击"Send Task"
   - 输入另一条测试消息

**验收检查点**：

- [ ] Message Summary 面板中显示了所有发送的消息
- [ ] 每条消息显示格式为："发送者 → 接收者"
  - 用户发送的消息：`User → [AI角色名]`
  - AI 响应的消息：`[AI角色名] → User`
- [ ] 每条消息显示时间戳（HH:MM 格式）
- [ ] 每条消息显示完整内容
- [ ] 消息按时间倒序排列（最新消息在最上面）

**调试技巧**：

打开浏览器开发者工具（Help → Toggle Developer Tools），在 Console 中执行：
```javascript
// 查看所有消息
document.querySelectorAll('.message-card').forEach((card, index) => {
  console.log(`Message ${index}:`, {
    participants: card.querySelector('.message-participants')?.textContent,
    timestamp: card.querySelector('.message-timestamp')?.textContent,
    content: card.querySelector('.message-content')?.textContent
  });
});
```

---

### 测试用例 2：转发按钮

**目标**: 验证每条消息都有转发按钮，并且转发功能正常工作

**操作步骤**：

1. **检查转发按钮存在**
   - 在 Message Summary 面板中，观察每条消息卡片
   - 每条消息底部应该有一个"→ Forward"按钮

2. **测试转发功能**
   - 点击某条消息的"→ Forward"按钮
   - 应该弹出一个选择器，显示所有可用的 AI 角色
   - 选择一个目标角色（例如选择"后端工程师 Bob"）
   - 点击确认

3. **验证转发结果**
   - 切换到 AI Team Commander 面板
   - 点击刚才选择的目标角色卡片
   - 观察该角色的消息摘要（卡片上的最后一条消息）
   - 应该显示"[Forwarded message]..."

**验收检查点**：

- [ ] 每条消息都有"→ Forward"按钮
- [ ] 点击转发按钮后显示角色选择器
- [ ] 选择器中列出所有 AI 角色（显示名称和职能）
- [ ] 选择目标角色后，消息成功转发
- [ ] 转发的消息带有"[Forwarded message]"前缀
- [ ] 转发后，目标角色自动被激活（卡片背景变蓝）

**调试技巧**：

在浏览器开发者工具 Console 中执行：
```javascript
// 查看转发按钮数量
const forwardButtons = document.querySelectorAll('.message-action-button');
console.log(`Found ${forwardButtons.length} forward buttons`);

// 查看某个角色的对话历史
// 需要在代码中添加日志或使用断点调试
```

---

### 测试用例 3：消息过滤

**目标**: 验证可以按关键词过滤消息

**操作步骤**：

1. **准备测试数据**
   - 确保 Message Summary 面板中有多条消息
   - 其中至少有 2 条消息包含特定关键词（如"登录"）
   - 至少有 1 条消息不包含该关键词

2. **测试关键词过滤**
   - 在 Message Summary 面板顶部，点击"🔍 Filter"按钮
   - 在弹出的输入框中输入关键词，如："登录"
   - 按 Enter 确认

3. **验证过滤结果**
   - 观察消息列表
   - 应该只显示包含"登录"关键词的消息
   - 不包含该关键词的消息应该被隐藏

4. **测试清除过滤**
   - 再次点击"🔍 Filter"按钮
   - 清空输入框（删除所有文字）
   - 按 Enter 确认
   - 应该显示所有消息

5. **测试大小写不敏感**
   - 点击"🔍 Filter"按钮
   - 输入大写关键词，如："LOGIN"
   - 验证是否能匹配到包含"登录"或"login"的消息

**验收检查点**：

- [ ] 点击"🔍 Filter"按钮显示输入框
- [ ] 输入关键词后，只显示包含该关键词的消息
- [ ] 过滤是不区分大小写的
- [ ] 清空关键词后，显示所有消息
- [ ] 如果没有匹配的消息，显示"No messages yet"

**调试技巧**：

在浏览器开发者工具 Console 中执行：
```javascript
// 查看当前显示的消息数量
const visibleMessages = document.querySelectorAll('.message-card');
console.log(`Visible messages: ${visibleMessages.length}`);

// 查看每条消息的内容
visibleMessages.forEach((card, index) => {
  console.log(`Message ${index}:`, card.querySelector('.message-content')?.textContent);
});
```

---

## 高级过滤功能（服务层已实现，UI 未暴露）

虽然 UI 目前只提供关键词过滤，但服务层已经实现了更多过滤选项。如果需要测试这些功能，可以通过浏览器开发者工具手动调用：

```javascript
// 在 Console 中执行（需要先获取 messageHubService 实例）

// 按会话 ID 过滤
const sessionMessages = messageHubService.getAllMessages({
  sessionId: 'session_xxx'
});

// 按时间范围过滤
const recentMessages = messageHubService.getAllMessages({
  timeRange: {
    start: Date.now() - 3600000,  // 最近 1 小时
    end: Date.now()
  }
});

// 按消息方向过滤
const userMessages = messageHubService.getAllMessages({
  direction: 'user-to-ai'  // 只显示用户发送的消息
});

// 组合过滤
const filteredMessages = messageHubService.getAllMessages({
  sessionId: 'session_xxx',
  keyword: '登录',
  timeRange: { start: Date.now() - 3600000, end: Date.now() }
});
```

---

## 空状态测试

**操作步骤**：

1. 清空所有消息（需要重启 VS Code 或清除缓存）
2. 打开 Message Summary 面板
3. 应该显示"No messages yet"

**验收检查点**：

- [ ] 没有消息时显示空状态提示
- [ ] 空状态文字为"No messages yet"
- [ ] 空状态居中显示，使用灰色斜体

---

## 样式和交互测试

**验收检查点**：

- [ ] 消息卡片有边框和圆角
- [ ] 鼠标悬停在消息卡片上时有阴影效果
- [ ] 消息内容支持换行显示
- [ ] 长消息内容自动换行，不会溢出
- [ ] 时间戳使用较小的灰色字体
- [ ] 发送者/接收者使用粗体显示

---

## 集成测试

**测试场景**: 验证消息汇总面板与 AI Team Commander 的集成

**操作步骤**：

1. 在 AI Team Commander 中选中一个角色
2. 发送一条消息
3. 立即切换到 Message Summary 面板
4. 验证新消息是否立即出现（无需刷新）

**验收检查点**：

- [ ] 新消息自动出现在 Message Summary 面板
- [ ] 无需手动刷新页面
- [ ] 消息顺序正确（最新消息在最上面）

---

## 常见问题排查

### 问题 1: Message Summary 面板不显示

**可能原因**：
- 面板被折叠或隐藏
- 视图注册失败

**排查步骤**：
1. 检查 AI Team 侧边栏是否打开
2. 在侧边栏标题栏右键，查看是否有"Message Summary"选项
3. 检查浏览器开发者工具 Console 是否有错误

### 问题 2: 消息不显示

**可能原因**：
- MessageHubService 未正确监听消息事件
- 消息未被添加到消息中心

**排查步骤**：
1. 打开浏览器开发者工具
2. 在 Console 中查找"[MessageHubService]"相关日志
3. 检查是否有错误信息

### 问题 3: 转发功能不工作

**可能原因**：
- 目标会话不存在
- 转发逻辑错误

**排查步骤**：
1. 确认目标角色已创建
2. 检查浏览器开发者工具 Console 是否有错误
3. 验证转发后目标角色的对话历史

---

## 相关文件

- 验收文档: [TEST-P2-B.md](TEST-P2-B.md)
- 验收报告: [TEST-P2-B-验收报告.md](TEST-P2-B-验收报告.md)
- 接口定义: [messageHub.ts](../../../src/vs/workbench/contrib/aiTeam/common/messageHub.ts)
- 服务实现: [messageHubService.ts](../../../src/vs/workbench/contrib/aiTeam/browser/messageHubService.ts)
- UI 面板: [messageSummaryPanel.ts](../../../src/vs/workbench/contrib/aiTeam/browser/messageSummaryPanel.ts)
- 样式文件: [messageSummary.css](../../../src/vs/workbench/contrib/aiTeam/browser/media/messageSummary.css)

---

**创建时间**: 2026-03-25
