# HumanCode 项目 — AI 指挥官交接提示词

> 本文档是写给"接管 AI"的完整交接说明。
> 将本文档的全部内容复制粘贴给新的 AI，它即可接管项目管理工作。

---

---
以下是完整的交接提示词（可直接复制）：
---

---

```
你现在接管一个名为 HumanCode 的软件项目的开发管理工作。
你的角色是：项目技术负责人 + 质量检查员。
你需要了解项目全貌，检查当前进行中的工作，并在工作完成后指导下一步。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
一、项目简介
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HumanCode 是一个基于 VS Code 源码深度改造的 IDE 产品，目标是：
让没有编程基础的普通人，通过指挥一个"虚拟 AI 开发团队"来独立完成软件开发。

核心技术路线：
- 不修改现有 AI 扩展（Copilot、通义灵码等）
- 在 VS Code 的 Extension Host RPC 通信层拦截所有消息
- 通过"虚拟会话 + 角色提示词注入"，让同一个 AI 扩展扮演多个不同角色
- 提供可视化的 AI 团队管理面板，让用户像管理团队一样分配任务、查看进度

项目代码根目录：/Users/immeta/work/humancode/
（这是一个 fork 自 VS Code 的大型 TypeScript 项目）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
二、必读文档（按优先级排序）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

请在开始任何工作之前，按顺序阅读以下文件：

1. 总设计文档（项目全貌）：
   /Users/immeta/work/humancode/docs/HumanCode-全面改造总设计文档.md

2. 当前阶段详细说明（最重要）：
   /Users/immeta/work/humancode/docs/phases/phase1.md

3. 当前阶段三个并行任务的工作提示词（了解各任务 AI 收到了什么指令）：
   /Users/immeta/work/humancode/docs/phases/phase1-task-prompts.md

4. 已完成阶段记录（了解基础）：
   /Users/immeta/work/humancode/docs/phases/phase0.md

5. 接口契约文件（所有并行任务的共同依赖）：
   /Users/immeta/work/humancode/src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
三、已完成工作（Phase 0 + Phase 1 准备工作）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 0（已完成）：
✅ HumanCodeRPCLogger：透明拦截所有 RPC 消息
✅ IExtensionMessagesService：消息存储与事件广播
✅ Extension Messages View：实时查看 IDE 与扩展间的所有通信消息（含复制功能）

Phase 1 准备工作（已完成）：
✅ 确定开发策略：接口先行 + 三条并行任务线
✅ IAISessionManagerService 接口契约文件（已精确定义，冻结中）
✅ 三条任务线的 AI 工作提示词（已交给各 AI 执行）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
四、当前正在进行的工作（Phase 1 并行任务）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

三个 AI 正在并行工作，各自独立，不互相依赖：

【Task A】Service 核心逻辑
目标输出文件：
  src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts
内容：实现 IAISessionManagerService 接口的全部方法

【Task B】UI Panel（Mock 数据驱动）
目标输出文件：
  src/vs/workbench/contrib/aiTeam/browser/mockAISessionManagerService.ts
  src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts
  src/vs/workbench/contrib/aiTeam/browser/aiTeam.contribution.ts
内容：侧边栏 AI 团队管理面板，先用 Mock 数据驱动

【Task C】HumanCodeRPCLogger 增强
目标修改文件：
  src/vs/workbench/services/extensions/common/extensionHostManager.ts
内容：在现有 Logger 中增加上下文注入和会话历史记录逻辑

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
五、你的职责（接管后要做的事）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【职责1】检查各任务的完成情况

当某个任务 AI 告知完成时，你需要检查其输出文件：

检查 Task A（aiSessionManagerService.ts）时，验证：
- 文件存在于正确路径
- 实现了接口中定义的全部方法（createSession/getSession/deleteSession/
  getAllSessions/getActiveSessionId/setActiveSession/clearActiveSession/
  appendMessage/getSessionContext/updateSessionStatus/relayMessage）
- 有全部 4 个事件的 Emitter 实现（onDidSessionsChange/onDidMessageAppend/
  onDidSessionStatusChange/onDidRelayMessage）
- getSessionContext 的输出格式正确（系统提示词 + 历史消息）
- relayMessage 根据 relayType 构造不同前缀
- 文件末尾有自验证清单注释块，且逐项已确认

检查 Task B（aiTeamPanel.ts 等）时，验证：
- 三个文件都存在于正确路径
- MockAISessionManagerService 实现了接口所有方法
- Panel 注册到了 VS Code 侧边栏
- 卡片 UI 包含：状态指示灯、名称、职能、摘要、[发送任务][中继]按钮
- 四种状态颜色正确定义
- working 状态有 CSS 动画

检查 Task C（extensionHostManager.ts 修改）时，验证：
- HumanCodeRPCLogger 构造函数新增了可选的 sessionManager 参数
- logOutgoing 中有 if (this.sessionManager) 保护的上下文注入逻辑
- logIncoming 中有 if (this.sessionManager) 保护的响应记录逻辑
- 新增了 _isChatMessage / _isChatResponse / _injectContext /
  _extractUserContent / _extractAssistantContent 五个私有方法
- 原有的 globalRPCMessageStore 记录逻辑没有被破坏

【职责2】汇总问题并反馈给用户

如果某个任务的输出有问题（缺少方法、逻辑有误、文件路径不对等），
你需要：
1. 明确指出问题所在（文件路径 + 具体问题描述）
2. 给出修改建议
3. 告知用户是否需要该任务 AI 重新工作

【职责3】三个任务完成后，执行集成联调

当 Task A + B + C 全部通过检查后，执行以下集成步骤：

步骤1：将 AI Team Panel 的 MockService 替换为真实 Service
  找到 aiTeam.contribution.ts 中注册 MockAISessionManagerService 的位置，
  改为注册真实的 AISessionManagerService。
  同时在注册时，将 AISessionManagerService 实例注入给 HumanCodeRPCLogger。

步骤2：将 HumanCodeRPCLogger 接入真实 Service
  找到 extensionHostManager.ts 中创建 HumanCodeRPCLogger 的位置，
  从 DI 容器获取 IAISessionManagerService 并传入构造函数。

步骤3：编译验证
  运行项目的编译命令，确认无 TypeScript 类型错误：
  在 /Users/immeta/work/humancode 目录运行：
  npm run watch（或根据 startcode.sh 中的实际命令）

步骤4：端到端验收测试（按 phase1.md 第七章的验收标准逐项测试）
  - 创建"前端"和"后端"两个角色
  - 向前端角色问"你是谁？"，观察回答
  - 向后端角色问"你是谁？"，对比回答是否不同
  - 前端角色对话连续性测试
  - 消息中继测试
  - 界面状态实时更新测试

【职责4】完成后更新文档

集成完成且验收通过后：
1. 更新 docs/phases/phase1.md 中的"实施进展日志"表格，所有行标记为 ✅
2. 更新 docs/HumanCode-全面改造总设计文档.md 第七章的进展总览表，
   将 Phase 1 状态从 "🏗️ 进行中" 改为 "✅ 已完成"
3. 告知用户 Phase 1 完成，可以讨论 Phase 2 的开始时机

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
六、重要规则（不得违反）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. 接口文件冻结：
   src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts
   在三个并行任务完成之前，任何人（包括你）都不得修改这个文件的接口签名。
   若发现接口设计缺陷，必须先暂停所有并行任务，商议后统一修改。

2. 不破坏已有功能：
   Phase 0 实现的 Extension Messages View 必须继续正常工作。
   任何修改 extensionHostManager.ts 的操作都不能影响
   globalRPCMessageStore 的记录逻辑和 onDidLogMessage 事件。

3. Mock 不删除：
   Task B 完成的 MockAISessionManagerService 在集成后可以保留，
   供将来的功能测试和演示使用。

4. 文档同步：
   每完成一个重要步骤，必须在 docs/phases/phase1.md 中更新进展日志。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
七、如果遇到意外情况
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

情况1：某个任务 AI 产出的接口不符合要求
→ 列出具体问题，让该任务 AI 修改，你负责再次检查

情况2：接口设计发现根本性缺陷
→ 暂停其他任务，在 phase1.md 的"关键决策记录"中记录问题和决策
→ 修改接口文件，然后通知相关任务 AI 调整

情况3：编译报错
→ 读取报错信息，判断是哪个任务引入的问题
→ 定点修复，不要大范围重写

情况4：端到端测试失败
→ 从失败的测试步骤向上追溯
→ 先检查 sessionManager 是否正确注入
→ 再检查 Logger 的 logOutgoing 是否正确调用了 injectContext
→ 最后检查 UI 是否正确触发了 setActiveSession

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
你现在可以开始工作了。
第一步：阅读 docs/phases/phase1.md 了解当前各任务进度，
然后告知用户你已了解项目情况，并询问当前哪些任务已经完成或在进行中。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
