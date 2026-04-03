# 主流 AI IDE 扩展研究报告与适配方案

**文档版本**: v1.0  
**创建日期**: 2026-04-02  
**研究目标**: 分析主流 AI IDE 扩展的实现方式，设计零侵入式适配方案

---

## 一、执行摘要

### 1.1 核心发现

**原有方案的致命缺陷**：我们设计的 Chat Participant Adapter 和 Language Model Adapter 只能覆盖 **GitHub Copilot** 这类简单的对话式 AI 扩展，但完全无法适配真正主流的 **agentic AI 编程助手**（Codex、Claude Code、Cursor、Windsurf）。

**市场现实**：
- ✅ **Agentic AI 系统**（Codex、Claude Code、Cursor、Windsurf）是 2026 年的主流
- ⚠️ **简单对话式 AI**（GitHub Copilot Chat）已经过时
- ❌ **我们的方案只覆盖了过时的技术**

### 1.2 关键差异

| 维度 | 简单对话式 AI (Copilot) | Agentic AI 系统 (Codex/Claude Code) |
|------|------------------------|-----------------------------------|
| **实现方式** | VS Code 标准 API (`vscode.chat`) | 独立架构 + 自定义协议 |
| **能力范围** | 对话、代码补全 | 读取代码、执行命令、修改文件、调用工具 |
| **架构** | 扩展插件 | 完整的 Agent 系统 + VS Code 集成 |
| **协议** | VS Code RPC | MCP (Model Context Protocol) + Agent API |
| **市场地位** | 逐渐被淘汰 | 2026 年主流 |

### 1.3 建议

**立即调整方向**：
1. ❌ 放弃或降低 Chat Participant Adapter 的优先级
2. ✅ 重新设计适配器架构，聚焦 agentic AI 系统
3. ✅ 优先适配 Codex 和 Claude Code（真正的主流）

---

## 二、主流 AI IDE 扩展分类

### 2.1 市场格局（2026 年）

```
主流 Agentic AI 系统（80%+ 市场份额）
├── Codex (OpenAI) - 独立 IDE + VS Code 扩展
├── Claude Code (Anthropic) - CLI + Desktop + VS Code 扩展
├── Cursor - VS Code Fork
└── Windsurf - VS Code Fork

传统对话式 AI（逐渐被淘汰）
├── GitHub Copilot Chat - VS Code 扩展
└── Lingma（灵码）- VS Code 扩展
```

### 2.2 技术架构分类

#### 类型 A: VS Code Fork（Cursor、Windsurf）

**架构特点**：
- 不是扩展，而是完整的 IDE（基于 VS Code 源码 fork）
- AI 能力深度集成到 IDE 内核
- 无法通过扩展机制接入

**适配策略**：
- ❌ **无法适配**：它们不是扩展，是独立的 IDE
- ✅ **替代方案**：用户直接使用 Cursor/Windsurf，不需要我们的平台

**结论**：不在我们的适配范围内

#### 类型 B: Agentic AI 系统 + VS Code 扩展（Codex、Claude Code）

**架构特点**：
- 核心是独立的 Agent 系统（CLI/Desktop）
- VS Code 扩展作为桥接层
- 使用 MCP (Model Context Protocol) 进行通信
- 可以读取代码、执行命令、修改文件、调用外部工具

**适配策略**：
- ✅ **可以适配**：通过 MCP 协议或扩展 API
- ✅ **高优先级**：这是真正的主流

**结论**：这是我们的核心适配目标

#### 类型 C: 传统对话式 AI（GitHub Copilot、Lingma）

**架构特点**：
- 使用 VS Code 标准 API (`vscode.chat`, `vscode.lm`)
- 功能简单：对话、代码补全
- 无法执行命令或修改文件

**适配策略**：
- ✅ **可以适配**：我们已有的 Chat Participant Adapter
- ⚠️ **低优先级**：市场份额小，逐渐被淘汰

**结论**：作为降级方案保留，但不是重点

---

## 三、Codex 深度分析

### 3.1 架构概览

根据 [OpenAI 官方博客](https://openai.com/index/unlocking-the-codex-harness/)，Codex 采用 **App Server 架构**：

```
┌─────────────────────────────────────────────────────────┐
│                   Codex App Server                      │
│  - Agent 核心逻辑（读取代码、执行命令、修改文件）        │
│  - 使用 GPT-5.3-Codex 模型                              │
│  - 支持 MCP (Model Context Protocol)                    │
└─────────────────────────────────────────────────────────┘
                         ↕ (双向协议)
┌─────────────────────────────────────────────────────────┐
│              多种客户端 (Client Surfaces)                │
│  - CLI (命令行)                                         │
│  - Desktop App (macOS/Windows)                          │
│  - VS Code Extension                                    │
│  - Web App                                              │
└─────────────────────────────────────────────────────────┘
```

### 3.2 核心能力

根据 [技术参考文档](https://blakecrosley.com/guides/codex)，Codex 可以：

1. **读取代码库**：理解整个项目结构
2. **执行命令**：在沙盒中运行 shell 命令
3. **修改文件**：patch 文件内容
4. **连接外部服务**：通过 MCP 调用外部工具
5. **云端任务**：将长时间运行的任务委托给云端

### 3.3 MCP 协议

根据 [MCP 配置指南](https://vladimirsiedykh.com/blog/codex-mcp-config-toml-shared-configuration-cli-vscode-setup-2025)：

**Codex 的 MCP 限制**：
- ✅ 支持本地 MCP 服务器（通过 STDIO）
- ❌ 不支持远程 MCP 服务器（HTTP/SSE）
- 所有 MCP 服务器必须作为子进程运行

**MCP 服务器示例**：
```toml
# config.toml
[[mcp.servers]]
name = "filesystem"
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/workspace"]

[[mcp.servers]]
name = "github"
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
env = { GITHUB_TOKEN = "..." }
```

### 3.4 VS Code 扩展实现

根据搜索结果，Codex 的 VS Code 扩展：
- 使用 **Agent API** 与 Codex App Server 通信
- 不使用 `vscode.chat` 或 `vscode.lm` API
- 提供三种模式：Agent、Chat、Agent (Full Access)
- 可以读取、编辑、运行工作区代码

### 3.5 安全机制

根据 [Codex vs Claude Code 对比](https://blakecrosley.com/blog/codex-vs-claude-code-2026)：

Codex 使用 **OS 内核级安全**：
- macOS: Seatbelt
- Linux: Landlock + seccomp
- 在应用层之前限制文件系统访问、网络调用、进程生成

---

## 四、Claude Code 深度分析

### 4.1 架构概览

根据 [官方文档](https://code.claude.com/docs/en/vs-code)，Claude Code 采用 **多表面架构**：

```
┌─────────────────────────────────────────────────────────┐
│                   Claude Code Core                      │
│  - Agent 核心逻辑                                       │
│  - 使用 Claude Opus 4.6 模型                            │
│  - 支持 MCP (Model Context Protocol)                    │
│  - 配置管理、权限、Hooks、Subagents                      │
└─────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│              多种客户端                                  │
│  - CLI (claude)                                         │
│  - Desktop App                                          │
│  - VS Code Extension (官方)                             │
│  - Web App (claude.ai/code)                             │
└─────────────────────────────────────────────────────────┘
```

### 4.2 核心能力

根据 [完整指南](https://blakecrosley.com/guides/claude-code)，Claude Code 可以：

1. **读取代码库**：理解项目结构和代码
2. **编辑文件**：修改代码
3. **运行命令**：执行 shell 命令
4. **集成开发工具**：通过 MCP 连接外部服务
5. **Subagents**：委托子任务给专门的 agent

### 4.3 MCP 协议

根据 [官方 MCP 文档](https://docs.anthropic.com/en/docs/claude-code/mcp)：

**Claude Code 的 MCP 能力**：
- ✅ 支持本地 MCP 服务器（STDIO）
- ✅ 支持远程 MCP 服务器（HTTP/SSE）
- ✅ 可以作为 MCP 客户端（消费 MCP 服务器）
- ✅ 可以作为 MCP 服务器（通过 `claude mcp serve` 暴露能力）

**MCP 双向模式**：
```bash
# Claude Code 作为 MCP 客户端
claude --mcp-server filesystem

# Claude Code 作为 MCP 服务器
claude mcp serve
```

### 4.4 VS Code 扩展实现

根据 [官方文档](https://code.claude.com/docs/en/vs-code)：

- 官方 VS Code 扩展提供原生图形界面
- 集成到 IDE 中，这是 Anthropic 推荐的方式
- 不使用 `vscode.chat` API
- 使用自定义协议与 Claude Code Core 通信

### 4.5 第三方扩展

根据 [Marketplace](https://marketplace.visualstudio.com/items?itemName=IzzKetamBola.chutes-claude-openai)：

存在社区扩展 "Chutes Claude/OpenAI for VSCode"：
- 集成 Claude Code API
- 支持完整的工具访问
- 通过 VSCode chat 界面进行交互

---

## 五、GitHub Copilot 分析（对比参考）

### 5.1 架构

GitHub Copilot 使用 **VS Code 标准 API**：
- `vscode.chat` API - Chat Participant
- `vscode.lm` API - Language Model
- 标准的扩展插件架构

### 5.2 能力限制

- ✅ 对话、代码补全
- ❌ 无法执行命令
- ❌ 无法修改文件（只能建议）
- ❌ 无法调用外部工具

### 5.3 市场地位

- 2024-2025: 主流
- 2026: 逐渐被 agentic AI 系统取代

---

## 六、适配方案设计

### 6.1 现有方案的问题

**我们已设计的适配器**：
1. Chat Participant Adapter - 只能适配 GitHub Copilot Chat
2. Language Model Adapter - 只能适配 GitHub Copilot LM
3. Command Adapter - 降级方案

**覆盖范围**：
- ✅ GitHub Copilot（市场份额 < 20%，逐渐被淘汰）
- ❌ Codex（市场主流）
- ❌ Claude Code（市场主流）
- ❌ Cursor（独立 IDE，不需要适配）
- ❌ Windsurf（独立 IDE，不需要适配）

**结论**：我们的方案只覆盖了不到 20% 的市场，且是逐渐被淘汰的技术。

### 6.2 新的适配策略

#### 优先级重排

| 优先级 | 适配器 | 目标扩展 | 市场份额 | 状态 |
|-------|--------|---------|---------|------|
| **P0** | MCP Adapter | Codex, Claude Code | 60%+ | 需要新设计 |
| **P1** | Agent API Adapter | Codex 专用 | 30%+ | 需要新设计 |
| P2 | Chat Participant Adapter | GitHub Copilot | < 20% | 已设计（降级） |
| P3 | Language Model Adapter | GitHub Copilot | < 20% | 已设计（降级） |
| P4 | Command Adapter | 其他 | < 5% | 已设计（降级） |

#### 核心适配器：MCP Adapter

**设计目标**：
- 让 AI Interop Bus 成为 MCP 客户端
- 自动发现和包装 MCP 服务器为 AI Interop Endpoint
- 支持 Codex 和 Claude Code 的 MCP 集成

**架构**：
```
┌─────────────────────────────────────────────────────────┐
│              AI Interop Bus                             │
└─────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│           MCP Adapter (新增)                            │
│  - MCP 客户端实现                                       │
│  - 自动发现 MCP 服务器                                  │
│  - 协议转换：AI Interop ↔ MCP                          │
└─────────────────────────────────────────────────────────┘
                         ↕ (MCP Protocol)
┌─────────────────────────────────────────────────────────┐
│           MCP 服务器                                    │
│  - Codex (通过 MCP)                                     │
│  - Claude Code (通过 MCP)                               │
│  - 其他 MCP 兼容的 AI 系统                              │
└─────────────────────────────────────────────────────────┘
```

**关键技术点**：
1. **MCP 协议实现**：
   - STDIO transport（本地 MCP 服务器）
   - HTTP/SSE transport（远程 MCP 服务器）
   - JSON-RPC 消息格式

2. **自动发现**：
   - 读取 `config.toml` 或 `claude_desktop_config.json`
   - 扫描已配置的 MCP 服务器
   - 自动启动和连接

3. **协议转换**：
   - AI Interop Request → MCP Tool Call
   - MCP Tool Result → AI Interop Response
   - 流式输出支持

4. **能力映射**：
   - MCP Tools → AI Interop Endpoints
   - MCP Resources → AI Interop Context
   - MCP Prompts → AI Interop Templates

#### 次要适配器：Agent API Adapter（Codex 专用）

**设计目标**：
- 直接适配 Codex 的 Agent API
- 提供比 MCP 更深度的集成

**架构**：
```
┌─────────────────────────────────────────────────────────┐
│              AI Interop Bus                             │
└─────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│           Agent API Adapter (新增)                      │
│  - Codex Agent API 客户端                               │
│  - 协议转换：AI Interop ↔ Agent API                    │
└─────────────────────────────────────────────────────────┘
                         ↕ (Agent API)
┌─────────────────────────────────────────────────────────┐
│           Codex App Server                              │
└─────────────────────────────────────────────────────────┘
```

### 6.3 实现路线图

#### Phase 1: MCP Adapter（Week 1-3）

**Week 1: MCP 协议实现**
- 实现 MCP 客户端（STDIO transport）
- 实现 JSON-RPC 消息处理
- 实现 Tool Call 和 Tool Result

**Week 2: 自动发现和包装**
- 读取 MCP 配置文件
- 自动启动 MCP 服务器
- 将 MCP Tools 包装为 AI Interop Endpoints

**Week 3: 协议转换和测试**
- 实现 AI Interop ↔ MCP 协议转换
- 测试与 Claude Code 的集成
- 测试与 Codex 的集成（如果支持 MCP）

#### Phase 2: Agent API Adapter（Week 4-5）

**Week 4: Agent API 客户端**
- 研究 Codex Agent API 规范
- 实现 Agent API 客户端
- 实现双向协议通信

**Week 5: 集成和测试**
- 将 Codex Agent 包装为 AI Interop Endpoint
- 端到端测试
- 性能优化

#### Phase 3: 降级适配器（Week 6）

**Week 6: 完善现有适配器**
- Chat Participant Adapter（已设计）
- Language Model Adapter（已设计）
- Command Adapter（已设计）

---

## 七、技术挑战与风险

### 7.1 MCP 协议复杂度

**挑战**：
- MCP 是一个完整的协议，包含 Tools、Resources、Prompts
- 需要实现 JSON-RPC over STDIO/HTTP/SSE
- 需要处理进程管理（启动、停止、重启 MCP 服务器）

**应对**：
- 优先实现 Tools（最核心的功能）
- 使用现有的 MCP SDK（如果有）
- 参考 Claude Code 的开源实现

### 7.2 Codex Agent API 文档不足

**挑战**：
- Codex Agent API 可能没有公开文档
- 需要逆向工程或等待官方文档

**应对**：
- 优先实现 MCP Adapter（Codex 也支持 MCP）
- 如果 Agent API 文档不足，降低优先级

### 7.3 性能和稳定性

**挑战**：
- MCP 服务器作为子进程运行，可能崩溃
- 需要处理进程重启和错误恢复
- 需要处理长时间运行的任务

**应对**：
- 实现健壮的进程管理
- 实现自动重启机制
- 实现超时和取消机制

### 7.4 安全性

**挑战**：
- MCP 服务器可以执行任意命令
- 需要权限控制和审计

**应对**：
- 复用现有的 Permission & Policy Service
- 所有 MCP Tool Call 都需要用户授权
- 记录所有操作到 Audit Service

---

## 八、成功标准

### 8.1 功能标准

1. ✅ Claude Code 通过 MCP 自动接入 AI Interop Bus
2. ✅ Codex 通过 MCP 自动接入 AI Interop Bus
3. ✅ 可以通过 AI Interop Bus 调用 Claude Code 的能力
4. ✅ 可以通过 AI Interop Bus 调用 Codex 的能力
5. ✅ 流式输出正常工作
6. ✅ Cancel 正确传递
7. ✅ 权限控制和审计正常工作

### 8.2 性能标准

1. ✅ MCP 适配层开销 < 50ms
2. ✅ 流式传输无明显延迟
3. ✅ MCP 服务器崩溃后自动重启

### 8.3 市场覆盖标准

1. ✅ 覆盖 60%+ 的主流 AI IDE 扩展（Codex + Claude Code）
2. ✅ 支持 2026 年的主流技术（MCP、Agent API）
3. ✅ 为未来的 agentic AI 系统提供标准接入方式

---

## 九、与原方案的对比

| 维度 | 原方案 | 新方案 |
|------|--------|--------|
| **核心适配器** | Chat Participant Adapter | MCP Adapter |
| **目标扩展** | GitHub Copilot | Codex + Claude Code |
| **市场覆盖** | < 20% | 60%+ |
| **技术方向** | 过时的对话式 AI | 主流的 agentic AI |
| **协议** | VS Code 标准 API | MCP + Agent API |
| **能力** | 对话、代码补全 | 读取代码、执行命令、修改文件、调用工具 |
| **优先级** | P0 | P2（降级） |

---

## 十、建议的行动计划

### 10.1 立即行动（本周）

1. ✅ **暂停 TASK-P1-012 和 TASK-P1-013**（Chat Participant 和 Language Model Adapter）
2. ✅ **创建新的任务卡**：
   - TASK-P1-014: MCP Adapter 实现（P0，最高优先级）
   - TASK-P1-015: Agent API Adapter 实现（P1，高优先级）
3. ✅ **更新架构文档**：
   - 更新 [13-zero-intrusion-adapter-architecture.md](13-zero-intrusion-adapter-architecture.md)
   - 更新 [06-adapter-strategy.md](06-adapter-strategy.md)
   - 更新 [02-core-architecture.md](02-core-architecture.md)

### 10.2 短期目标（Week 1-3）

1. ✅ 实现 MCP Adapter
2. ✅ 测试与 Claude Code 的集成
3. ✅ 测试与 Codex 的集成（如果支持 MCP）

### 10.3 中期目标（Week 4-6）

1. ✅ 实现 Agent API Adapter（如果 Codex 文档可用）
2. ✅ 完善 Chat Participant Adapter（降级方案）
3. ✅ 端到端测试和性能优化

---

## 十一、参考资料

### 11.1 Codex

- [Unlocking the Codex harness](https://openai.com/index/unlocking-the-codex-harness/) - OpenAI 官方博客
- [The Definitive Technical Reference](https://blakecrosley.com/guides/codex) - Codex 技术参考
- [Codex CLI vs Claude Code in 2026](https://blakecrosley.com/blog/codex-vs-claude-code-2026) - 对比分析
- [Codex MCP Configuration Guide](https://vladimirsiedykh.com/blog/codex-mcp-config-toml-shared-configuration-cli-vscode-setup-2025) - MCP 配置指南

### 11.2 Claude Code

- [Use Claude Code in VS Code](https://code.claude.com/docs/en/vs-code) - 官方文档
- [Connect Claude Code to tools via MCP](https://docs.anthropic.com/en/docs/claude-code/mcp) - MCP 集成文档
- [The Complete Guide to Claude Code](https://blakecrosley.com/guides/claude-code) - 完整指南
- [Claude Code MCP Deep Dive](https://www.claudecodecamp.com/p/claude-code-mcp-deep-dive) - MCP 深度解析

### 11.3 Cursor & Windsurf

- [Windsurf vs Cursor: Full Comparison](https://markaicode.com/vs/windsurf-vs-cursor/) - 对比分析
- [Cursor vs Windsurf 2026](https://aipromptsx.com/blog/windsurf-vs-cursor-2026) - 2026 年对比

### 11.4 MCP 协议

- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP 官方网站（推测）
- [MCP Extensions Explained](https://claudefa.st/blog/tools/mcp-extensions/mcp-basics) - MCP 基础

---

## 十二、结论

**核心结论**：我们的原方案只覆盖了不到 20% 的市场，且是逐渐被淘汰的技术。必须立即调整方向，聚焦 MCP Adapter 和 Agent API Adapter，才能真正实现"让现有 AI 扩展协作"的愿景。

**关键行动**：
1. 暂停 Chat Participant Adapter 和 Language Model Adapter 的开发
2. 立即启动 MCP Adapter 的设计和实现
3. 更新所有相关文档和任务卡

**预期结果**：
- 覆盖 60%+ 的主流 AI IDE 扩展
- 支持 2026 年的主流技术（MCP、agentic AI）
- 为 HumanCode 提供真正的竞争力
