# AI Interop 平台能力：Adapter 方案文档

## 1. 文档目标

本文档定义 Adapter Layer 的整体策略和各类适配方案。

**重要更新**：基于 [主流 AI IDE 扩展研究报告](14-mainstream-ai-extensions-research-report.md)，Adapter Layer 的优先级已完全调整。

## 2. Adapter Layer 定位

### 2.1 核心职责

| 职责 | 说明 |
|------|------|
| **自动发现** | 扫描和监听现有 AI 扩展的注册（MCP 服务器、Chat Participant、Language Model 等） |
| **零侵入包装** | 自动将现有 API 包装为 AI Interop Endpoint，无需扩展修改代码 |
| **协议转换** | 双向转换 AI Interop 协议和现有 API（MCP、vscode.chat、vscode.lm） |
| **能力映射** | 将现有 API 的能力（流式、Cancel、上下文）映射为 AI Interop 能力 |
| **降级支持** | 为不支持的功能提供降级方案 |

### 2.2 设计原则

1. **MCP 优先**：优先适配使用 MCP 协议的主流 agentic AI 系统
2. **零侵入优先**：现有 AI 扩展无需修改任何代码即可接入
3. **自动发现**：平台启动时自动扫描并适配所有 AI 能力
4. **双向桥接**：支持现有扩展 ↔ AI Interop Bus 的双向调用
5. **渐进增强**：扩展可选择主动适配以获得更好的功能
6. Adapter 不能改变总线内核语义
7. 所有 Adapter 最终都映射为 Endpoint 或 ToolEndpoint
8. 所有 Adapter 都必须经过权限层
9. 不支持的能力必须显式降级，而不是隐式失败

## 3. 优先级策略（基于市场研究）

根据 [主流 AI IDE 扩展研究报告](14-mainstream-ai-extensions-research-report.md)，2026 年的市场格局：

| 优先级 | 适配器 | 目标扩展 | 市场份额 | 技术 | 状态 |
|-------|--------|---------|---------|------|------|
| **P0** | **MCP Adapter** | **Codex, Claude Code** | **60%+** | **MCP Protocol** | ✅ 已设计 |
| P2 | Chat Participant Adapter | GitHub Copilot | < 20% | vscode.chat API | ✅ 已设计（降级） |
| P2 | Language Model Adapter | GitHub Copilot | < 20% | vscode.lm API | ✅ 已设计（降级） |
| P3 | Command Adapter | 其他 | < 5% | vscode.commands API | 待设计 |

**关键发现**：
- Codex 和 Claude Code 是 2026 年的真正主流（市场份额 60%+）
- 它们都使用 MCP (Model Context Protocol)，不是简单的 Chat API
- GitHub Copilot 这类对话式 AI 已经过时（市场份额 < 20%）

**结论**：MCP Adapter 是最高优先级，必须优先实现。

## 6. Command Adapter (Level 3 - 降级方案)

### 输入输出模型

- 输入：`commandId + args`
- 输出：一次性 `result`

### 工作原理

**手动配置适配**：
- 用户或扩展作者在 `settings.json` 中声明需要暴露的 Command
- 平台根据配置自动包装为 AI Interop Endpoint
- 需要提供参数映射和输出映射配置

### 流式支持

- 不支持原生流式
- 仅可通过 wrapper 模拟阶段状态

### Cancel

- 通常不支持
- 若 command 自身可取消，需 wrapper 显式桥接

### 授权

- 跨扩展调用仍需授权
- 若 command 触发副作用，需要额外工具审批

### 适配目标

- 只提供 Command 的 AI 扩展（没有 Chat 或 LM API）

### 降级策略

- 仅作为 legacy compatibility
- 不承诺 session-aware 行为
- 功能有限，仅用于无更好 API 的扩展

### 实现位置

- `src/vs/workbench/services/aiInterop/browser/adapters/commandAdapter.ts`

### 详细设计

参见 [13-zero-intrusion-adapter-architecture.md](13-zero-intrusion-adapter-architecture.md) 第 3.3 节

### 输入输出模型

- 输入：`commandId + args`
- 输出：一次性 `result`

### 流式支持

- 不支持原生流式
- 仅可通过 wrapper 模拟阶段状态

### Cancel

- 通常不支持
- 若 command 自身可取消，需 wrapper 显式桥接

### 授权

- 跨扩展调用仍需授权
- 若 command 触发副作用，需要额外工具审批

### 降级策略

- 仅作为 legacy compatibility
- 不承诺 session-aware 行为

## 4. Chat Participant Adapter (Level 2 - 最高优先级)

### 输入输出模型

- 输入：`prompt + session context`
- 输出：流式 `markdown / text / toolCall`

### 工作原理

**零侵入式自动适配**：
- 平台监听 `IChatAgentService.onDidRegisterAgent` 事件
- 自动将每个注册的 Chat Participant 包装为 AI Interop Endpoint
- 无需扩展修改任何代码

### 流式支持

- 完整支持，复用 chat session chunk 模式
- 自动转换 Chat 的流式输出为 AI Interop chunk

### Cancel

- 完整支持，CancellationToken 正确传递
- 依赖 invocation cancel 穿透机制

### 授权

- 首次跨扩展调用需要用户授权
- 授权后在 session 内复用

### 适配目标

- **GitHub Copilot Chat** (主要目标)
- 其他使用 `vscode.chat` API 的 AI 扩展

### 实现位置

- `src/vs/workbench/services/aiInterop/browser/adapters/chatParticipantAdapter.ts`

### 详细设计

参见 [13-zero-intrusion-adapter-architecture.md](13-zero-intrusion-adapter-architecture.md) 第 3.1 节

## 5. Language Model API Adapter (Level 2 - 高优先级)

### 输入输出模型

- 输入：`messages + options`
- 输出：流式 `text / tool calls`

### 工作原理

**零侵入式自动适配**：
- 平台监听 `ILanguageModelsService.onDidChangeLanguageModels` 事件
- 自动将每个注册的 Language Model 包装为 AI Interop Endpoint
- 无需扩展修改任何代码

### 流式支持

- 完整支持
- 自动转换 Language Model 的流式输出为 AI Interop chunk

### Cancel

- 完整支持
- CancellationToken 正确传递

### 授权

- 首次跨扩展调用需要用户授权
- 授权后在 session 内复用

### 适配目标

- **GitHub Copilot Language Model** (主要目标)
- 其他使用 `vscode.lm` API 的 AI 扩展

### 实现位置

- `src/vs/workbench/services/aiInterop/browser/adapters/languageModelAdapter.ts`

### 详细设计

参见 [13-zero-intrusion-adapter-architecture.md](13-zero-intrusion-adapter-architecture.md) 第 3.2 节

### 输入输出模型

- 输入：`toolId + structured input`
- 输出：`toolResult`

### 流式支持

- 视工具实现而定
- 平台统一允许 progress chunk

### Cancel

- 应支持
- 工具若不支持，平台需在 UI 中标记“不支持中断”

### 授权

- 复用工具审批心智
- 非只读工具必须审批

### 降级策略

- 不支持 progress 的工具只回最终结果

## 6. MCP Adapter

### 输入输出模型

- 输入：tool / prompt / resource 请求
- 输出：toolResult / resource payload / elicitation

### 流式支持

- 取决于 MCP bridge 实现
- 平台至少支持阶段状态与最终结果

### Cancel

- 优先支持
- 若 transport 不支持取消，则平台仅终止上层等待

### 授权

- 复用 MCP 工具审批
- 尊重只读提示与 host 约束

### 降级策略

- web host 禁 stdio
- remoteAuthority 不匹配拒绝
- Node host 优先

## 7. Webview Adapter

### 输入输出模型

- 输入：UI event / user action / selection / approval decision
- 输出：render update / prompt update / status event

### 流式支持

- UI 渲染可以流式接收
- 但 webview 本身不是总线核心

### Cancel

- UI 层可发起 cancel
- 实际 cancel 由总线传播

### 授权

- Webview 共享 session 内容时必须经用户同意

### 降级策略

- 仅通过宿主扩展桥接
- 不允许 webview 直接跨扩展通信

## 8. CLI / Terminal Adapter

### 输入输出模型

- 输入：`command / args / stdin / env / cwd`
- 输出：`stdout / stderr / exit status / artifacts`

### 流式支持

- 强支持
- stdout/stderr 应作为 chunk 回传

### Cancel

- 强支持
- 本地用 SIGINT / kill，远端走对应 host 管道

### 授权

- 必须作为高危能力审批
- 默认拒绝

### 降级策略

- web host 拒绝
- 无 Node runtime 时拒绝
- 用户拒绝授权时返回显式 denied

## 7. 适配器对比表

| Adapter | 适配方式 | 原生流式 | Cancel | 需要授权 | 优先级 | 定位 |
|---|---|---:|---:|---:|---|---|
| **Chat Participant** | 零侵入自动适配 | 是 | 是 | 是 | **最高** | 核心接入（GitHub Copilot Chat） |
| **Language Model** | 零侵入自动适配 | 是 | 是 | 是 | **高** | 核心接入（GitHub Copilot LM） |
| **Command** | 手动配置 | 否 | 弱 | 是 | 低 | 降级方案（legacy 兼容） |
| Tool | 待设计 | 中 | 中/强 | 是 | 中 | Phase 2 |
| MCP | 待设计 | 中 | 中 | 是 | 中 | Phase 2 |
| Webview | 待设计 | UI级 | 是 | 是 | 低 | Phase 2 |
| CLI / Terminal | 待设计 | 是 | 是 | 强制 | 低 | Phase 2 |

**Phase 1 重点**：
- Chat Participant Adapter（最高优先级）
- Language Model API Adapter（高优先级）
- Command Adapter（降级方案）

## 8. 实现优先级与路线图

### Phase 1: 零侵入式核心适配器 (PoC-1)

**Week 1-2: Chat Participant Adapter**
- 目标：GitHub Copilot Chat 自动接入
- 优先级：最高
- 验收标准：Copilot Chat 无需修改即可通过 AI Interop Bus 调用

**Week 3: Language Model API Adapter**
- 目标：GitHub Copilot Language Model 自动接入
- 优先级：高
- 验收标准：Copilot LM 无需修改即可通过 AI Interop Bus 调用

**Week 4: Command Adapter**
- 目标：提供降级方案
- 优先级：低
- 验收标准：可通过配置暴露 Command

### Phase 2: 扩展适配器 (未来)

- Tool Adapter
- MCP Adapter
- Webview Adapter
- CLI / Terminal Adapter

## 9. 成功标准

### 功能标准
1. ✅ GitHub Copilot Chat 自动接入 AI Interop Bus
2. ✅ 可以通过 AI Interop Bus 调用 Copilot
3. ✅ 流式输出正常工作
4. ✅ Cancel 正确传递
5. ✅ 其他 Chat 扩展也能自动接入

### 性能标准
1. ✅ 适配层开销 < 10ms
2. ✅ 流式传输无明显延迟
3. ✅ 内存占用合理

### 用户体验标准
1. ✅ 用户无需配置即可使用现有 AI 扩展
2. ✅ 所有 AI 扩展在统一界面中展示
3. ✅ 扩展间协作流畅

## 10. 参考文档

- [13-zero-intrusion-adapter-architecture.md](13-zero-intrusion-adapter-architecture.md) - 零侵入式适配器架构设计（详细）
- [02-core-architecture.md](02-core-architecture.md) - 核心架构设计
- [VS Code Chat API](https://code.visualstudio.com/api/extension-guides/chat)
- [VS Code Language Model API](https://code.visualstudio.com/api/extension-guides/language-model)
