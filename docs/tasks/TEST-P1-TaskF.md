# 验收卡：TEST-P1-TaskF

## 验收信息
- **验收编号**：TEST-P1-TaskF
- **对应任务**：TASK-P1-TaskF
- **验收 AI**：AI-QA-001
- **验收类型**：功能验收 + 集成验收
- **状态**：⬜ 待验收

## 验收目标
验证 TASK-P1-TaskF 的实现是否符合要求,确保 AI Team 能够通过桥接层调用真实的 AI Extension API,并将响应记录到目标会话中。

## 验收前准备
1. 阅读对应的开发任务卡 TASK-P1-TaskF
2. 确认开发 AI 已标记任务为"待验收"
3. 确认 TASK-P1-TaskG 已完成 (Panel 已连接到 Service)
4. 确保已安装通义灵码或 GitHub Copilot 扩展
5. 拉取最新代码,确保环境干净
6. 启动开发环境：`./startcode.sh`

## 验收步骤

### 1. 代码质量检查
- [ ] TypeScript 编译通过（运行 `npm run compile-check-ts-native`）
- [ ] 无 ESLint 错误
- [ ] 代码符合 VS Code 编码规范（见 CLAUDE.md）
- [ ] `AITeamExtensionBridge` 类已正确实现
- [ ] 桥接服务已在 `aiTeam.contribution.ts` 中注册
- [ ] 事件监听器使用 `this._register()` 注册

### 2. 功能验收

#### 2.1 检测 AI Extension
- [ ] 打开 DevTools Console
- [ ] 查看启动日志,确认桥接服务已初始化
- [ ] 验证日志中显示检测到的 AI Extension (如 "Detected AI Extension: tongyi.lingma")
- [ ] 如果没有安装 AI Extension,验证显示错误提示

#### 2.2 创建测试会话
- [ ] 打开 AI Team Commander Panel
- [ ] 创建两个会话:
  - 会话 1: "前端开发" / "Frontend Developer" / "你是一个专业的前端开发工程师"
  - 会话 2: "代码审查" / "Code Reviewer" / "你是一个严格的代码审查专家"
- [ ] 激活"前端开发"会话

#### 2.3 发送任务到第一个会话
- [ ] 在"前端开发"会话中输入任务: "帮我写一个 React 按钮组件"
- [ ] 点击"Send Task"按钮
- [ ] 验证会话状态变为 "working"

#### 2.4 中继消息到第二个会话
- [ ] 点击"前端开发"会话的"Relay"按钮
- [ ] 选择"代码审查"作为目标会话
- [ ] 验证中继成功的提示消息
- [ ] 验证"代码审查"会话状态变为 "working"

#### 2.5 验证 AI API 调用
- [ ] 查看 DevTools Console 或日志文件 `1.log`
- [ ] 验证日志中显示:
  - `[AITeamExtensionBridge] Handling relay message`
  - `[AITeamExtensionBridge] Calling AI Extension: <扩展ID>`
  - `[AITeamExtensionBridge] Received response from AI Extension`
- [ ] 验证没有错误日志

#### 2.6 验证响应记录
- [ ] 等待 AI 响应完成
- [ ] 验证"代码审查"会话状态变回 "idle"
- [ ] 验证"代码审查"会话的卡片显示新的消息摘要
- [ ] 通过代码或日志验证响应已添加到会话的 `conversationHistory` 中

### 3. 集成测试

#### 3.1 端到端工作流
- [ ] 创建三个会话: "需求分析" → "开发" → "测试"
- [ ] 在"需求分析"会话中输入: "用户需要一个登录页面"
- [ ] 中继到"开发"会话
- [ ] 验证"开发"会话收到响应
- [ ] 中继到"测试"会话
- [ ] 验证"测试"会话收到响应
- [ ] 验证整个链路流畅,无阻塞

#### 3.2 与 RPC Logger 的集成
- [ ] 在中继过程中查看 Extension Messages View
- [ ] 验证能看到 AI Extension 的请求和响应消息
- [ ] 验证上下文注入正常工作

### 4. 边界条件测试

#### 4.1 无可用 AI Extension
- [ ] 禁用或卸载所有 AI Extension
- [ ] 重启开发环境
- [ ] 尝试中继消息
- [ ] 验证显示错误通知: "No AI Extension available"
- [ ] 验证目标会话状态变为 'error'

#### 4.2 API 调用失败
- [ ] 模拟 API 调用失败 (如网络断开)
- [ ] 尝试中继消息
- [ ] 验证显示错误通知
- [ ] 验证目标会话状态变为 'error'
- [ ] 验证错误日志已记录

#### 4.3 空响应处理
- [ ] 发送一个可能导致空响应的 prompt
- [ ] 验证系统能正常处理,不会崩溃
- [ ] 验证有警告日志记录

#### 4.4 长响应处理
- [ ] 发送一个会产生长响应的 prompt (如"详细解释 React Hooks")
- [ ] 验证能完整接收所有响应内容
- [ ] 验证响应被正确记录到会话历史中

### 5. 性能测试
- [ ] 连续中继 5 条消息
- [ ] 验证每次中继都能成功
- [ ] 验证没有内存泄漏 (查看 DevTools Memory 面板)
- [ ] 验证响应时间合理 (< 10 秒)

### 6. 文档检查
- [ ] 开发任务卡的"实施记录"区域已填写
- [ ] 记录了调用 AI Extension API 的具体方法
- [ ] 如果遇到问题,问题和解决方案已记录

## 验收结果

**验收 AI**：_待填写_
**验收时间**：_待填写_
**验收结论**：⬜ 待验收 / ✅ 通过 / ❌ 失败

### 通过情况（如通过）
_待验收 AI 填写_

**操作**：
1. 在任务跟踪表中将 TASK-P1-TaskF 状态改为 ✅ 已完成
2. 在任务跟踪表中将 TEST-P1-TaskF 状态改为 ✅ 通过
3. **重要**: 通知项目经理,Phase 1 集成阶段全部完成

### 失败情况（如失败）
**发现的问题**：
_待验收 AI 填写_

**操作**：
1. 在任务跟踪表中将 TASK-P1-TaskF 状态改为 ❌ 验收失败
2. 在任务跟踪表中将 TEST-P1-TaskF 状态改为 ❌ 失败
3. 通知开发 AI 修复问题,修复后重新提交验收
