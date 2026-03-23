# Phase 0 — 基础消息通路验证

**状态**: ✅ 已完成  
**完成日期**: 2026-03-23  
**目标**: 证明在不修改任何第三方 AI 扩展的前提下，IDE 可以透明地拦截并可视化展示扩展的完整通信内容。

---

## 一、阶段目标

> 方案可行性验证：能否读到 IDE 与扩展之间的消息？

在开始构建多 AI 协作系统之前，必须首先回答这个根本性问题：

**"VS Code 的 Extension Host 与主进程之间的 RPC 通信，是否可以被我们透明拦截、记录、并展示给用户？"**

如果这个问题的答案是"可以"，整个 HumanCode 多 AI 协作系统才有技术可行性。

---

## 二、技术发现

### 2.1 VS Code RPC 架构

VS Code 使用清晰的 JSON-RPC 2.0 协议实现主进程（Workbench）与扩展进程（Extension Host）之间的通信：

```
主进程 (Workbench)  ←──── JSON-RPC ────→  Extension Host
                           ↕
                    IRPCProtocolLogger
                    (内置钩子接口)
```

关键发现：VS Code 已经内置了完整的 RPC 日志接口 `IRPCProtocolLogger`，定义于：
- `src/vs/workbench/services/extensions/common/rpcProtocol.ts`

该接口有两个钩子方法：
- `logOutgoing`：捕获主进程发往扩展的消息
- `logIncoming`：捕获扩展发往主进程的消息

### 2.2 扩展管理器集成点

在 `src/vs/workbench/services/extensions/common/extensionHostManager.ts` 中，`RPCProtocol` 在创建时接受一个可选的 `logger` 参数。我们只需注入自定义 Logger 即可接管所有消息流。

---

## 三、实现方案

### 3.1 新增文件

| 文件路径 | 作用 |
|---------|------|
| `src/vs/workbench/services/extensionMessages/common/extensionMessages.ts` | 定义 `IExtensionMessagesService` 接口和 `IRPCMessage` 数据结构 |
| `src/vs/workbench/services/extensionMessages/browser/extensionMessagesService.ts` | 服务实现，内含全局消息存储 `globalRPCMessageStore` |
| `src/vs/workbench/contrib/extensionMessages/browser/extensionMessagesView.ts` | VS Code ViewPane 实现，渲染消息列表 UI |
| `src/vs/workbench/contrib/extensionMessages/browser/extensionMessages.contribution.ts` | 注册视图到 VS Code 扩展点 |

### 3.2 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `src/vs/workbench/services/extensions/common/extensionHostManager.ts` | 新增 `HumanCodeRPCLogger` 类，替换原始 logger 注入逻辑 |

### 3.3 核心逻辑说明

**`HumanCodeRPCLogger`** 实现了 `IRPCProtocolLogger` 接口：
- 每条消息被包装为 `IRPCMessage` 对象（含时间戳、方向、内容、请求ID等）
- 消息写入 `globalRPCMessageStore`（内存数组）
- 同时通过 `IExtensionMessagesService` 触发 `onDidLogMessage` 事件

**`Extension Messages View`** 订阅事件：
- 监听 `onDidLogMessage`，每次触发时追加新行到列表
- 支持按方向（incoming/outgoing）过滤
- 支持复制单条消息内容

---

## 四、验收结果

### ✅ 验收标准全部通过

| 验收项 | 结果 |
|-------|------|
| 能实时显示扩展发出的所有 RPC 请求 | ✅ 通过 |
| 能实时显示主进程返回的所有 RPC 响应 | ✅ 通过 |
| 消息显示时间戳、方向、类型、内容 | ✅ 通过 |
| 支持复制单条消息内容 | ✅ 通过 |
| 不影响任何 AI 扩展的正常功能 | ✅ 通过 |
| 不影响 VS Code 原有其他功能 | ✅ 通过 |

### 验收操作步骤

1. 启动 HumanCode（`./startcode.sh`）
2. 在左侧 Activity Bar 中找到"Extension Messages"视图
3. 安装任意 AI 扩展（如 GitHub Copilot 或通义灵码）
4. 与 AI 扩展进行对话，观察消息视图实时更新
5. 点击任意消息行，验证可以复制内容

---

## 五、结论

**阶段一技术验证成功**，核心结论：

- VS Code 的 RPC 通信层完全可以被透明拦截
- 拦截层的实现成本极低，且对扩展完全无感知
- 这为 Phase 1 的虚拟会话管理和上下文注入奠定了坚实基础

---

## 六、遗留问题 & 下阶段注意事项

| 问题 | 说明 | 处理阶段 |
|------|------|---------|
| Webview 通信无法通过此方案拦截 | 部分扩展使用独立 Webview 渲染，消息不经过 RPC 层 | Phase 2 研究 |
| 消息量大时性能开销 | 高频消息（如 LSP 补全）会产生大量日志 | Phase 1 增加过滤 |
| 消息内容解析不完整 | 部分消息 data 字段为二进制或加密内容 | Phase 1 按需处理 |

---

↩️ 返回 [总设计文档](../HumanCode-全面改造总设计文档.md) | 下一阶段 → [Phase 1](./phase1.md)
