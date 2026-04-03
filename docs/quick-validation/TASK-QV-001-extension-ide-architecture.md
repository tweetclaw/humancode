# 任务卡：TASK-QV-001 - 扩展与 IDE 架构研究

**任务编号**: TASK-QV-001  
**任务名称**: 扩展与 IDE 宿主的架构与交互流程研究  
**创建时间**: 2026-04-02  
**优先级**: P0（最高优先级）  
**状态**: 🏗️ 进行中

---

## 一、任务目标

系统性地研究和整理 VS Code 扩展与 IDE 宿主之间的架构关系和交互流程，为后续实现与 Claude Code 扩展的交互提供理论基础。

---

## 二、研究范围

### 2.1 架构层次

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  (Workbench UI, Webview, Editor, Sidebar, Panel)       │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                  Main Process (Electron)                 │
│  - Window Management                                     │
│  - Native APIs                                           │
│  - IPC Communication                                     │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              Workbench Services (Browser)                │
│  - Extension Management Service                          │
│  - Extension Host Management                             │
│  - RPC Protocol                                          │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              Extension Host Process                      │
│  - Extension Activation                                  │
│  - Extension API (vscode.*)                             │
│  - ExtHost Services                                      │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                  Extension Code                          │
│  - extension.ts (activate/deactivate)                   │
│  - Commands, Providers, Webviews                        │
└─────────────────────────────────────────────────────────┘
```

### 2.2 核心交互流程

1. **扩展生命周期**
   - 扩展发现与加载
   - 扩展激活（Activation Events）
   - 扩展运行时
   - 扩展停用与卸载

2. **通信机制**
   - Main Thread ↔ Extension Host (RPC)
   - Extension ↔ Workbench (Commands, Events)
   - Extension ↔ Extension (Extension API)
   - Webview ↔ Extension (postMessage)

3. **能力暴露**
   - Extension API (vscode.*)
   - Contribution Points (package.json)
   - Extension Exports (Public API)

---

## 三、研究内容

### 3.1 扩展加载机制

**关键问题**:
- 扩展如何被发现？（扫描路径、package.json 解析）
- 扩展如何被加载到 Extension Host？
- Activation Events 如何触发扩展激活？
- 多个 Extension Host 如何管理？（Local, Remote, Web）

**需要研究的文件**:
- [ ] `src/vs/workbench/services/extensions/common/extensions.ts` - 扩展服务接口
- [ ] `src/vs/workbench/services/extensions/browser/extensionService.ts` - 扩展服务实现
- [ ] `src/vs/workbench/services/extensions/common/extensionHostManager.ts` - Extension Host 管理
- [ ] `src/vs/workbench/services/extensions/common/extensionPoints.ts` - 扩展点定义

### 3.2 RPC 通信机制

**关键问题**:
- Main Thread 和 Extension Host 如何通信？
- RPC Protocol 的消息格式是什么？
- 如何定义新的 RPC Shape？
- 流式数据如何传输？

**需要研究的文件**:
- [ ] `src/vs/workbench/services/extensions/common/rpcProtocol.ts` - RPC 协议实现
- [ ] `src/vs/workbench/services/extensions/common/proxyIdentifier.ts` - 代理标识符
- [ ] `src/vs/workbench/api/common/extHost.protocol.ts` - ExtHost RPC Shape 定义
- [ ] `src/vs/workbench/api/browser/mainThreadExtensionService.ts` - Main Thread 扩展服务

### 3.3 Extension API 实现

**关键问题**:
- `vscode.*` API 是如何实现的？
- 扩展如何调用 Workbench 的功能？
- 如何添加新的 API？
- API 的版本管理和兼容性如何处理？

**需要研究的文件**:
- [ ] `src/vs/workbench/api/common/extHost.api.impl.ts` - API 装配
- [ ] `src/vs/workbench/api/common/extHostCommands.ts` - 命令 API
- [ ] `src/vs/workbench/api/common/extHostExtensionService.ts` - 扩展服务 API
- [ ] `src/vs/vscode.d.ts` - VS Code API 类型定义

### 3.4 扩展间通信

**关键问题**:
- 扩展如何获取其他扩展的实例？
- 扩展如何调用其他扩展的 API？
- 扩展如何导出公共 API？
- 扩展间通信的安全性如何保证？

**需要研究的文件**:
- [ ] `src/vs/workbench/api/common/extHostExtensionService.ts` - `getExtension()` 实现
- [ ] `src/vs/workbench/services/extensions/common/extensionsRegistry.ts` - 扩展注册表

### 3.5 Webview 通信

**关键问题**:
- Webview 如何创建和管理？
- Webview 和 Extension 如何通信？
- Webview 的安全沙箱机制是什么？
- 如何在 Webview 中调用 Extension 功能？

**需要研究的文件**:
- [ ] `src/vs/workbench/api/browser/mainThreadWebview.ts` - Main Thread Webview
- [ ] `src/vs/workbench/api/common/extHostWebview.ts` - ExtHost Webview API
- [ ] `src/vs/workbench/contrib/webview/browser/webview.ts` - Webview 实现

### 3.6 Contribution Points

**关键问题**:
- package.json 中的 `contributes` 如何被解析？
- 如何注册 Commands, Views, Menus 等？
- Contribution Points 的生命周期是什么？

**需要研究的文件**:
- [ ] `src/vs/workbench/services/extensions/common/extensionsRegistry.ts` - 扩展注册
- [ ] `src/vs/platform/jsonschemas/common/jsonContributionRegistry.ts` - JSON Schema 注册

---

## 四、研究方法

### 4.1 代码阅读

1. **自顶向下**：从 Workbench 启动流程开始，追踪扩展加载
2. **自底向上**：从 Extension API 实现开始，追踪到 Main Thread
3. **横向对比**：对比不同类型的扩展（Language, Theme, Webview）

### 4.2 实验验证

1. **创建测试扩展**：验证扩展生命周期
2. **调试 RPC 通信**：使用 Chrome DevTools 监听消息
3. **分析现有扩展**：研究 Claude Code 扩展的实现

### 4.3 文档整理

1. **架构图**：绘制扩展与 IDE 的架构图
2. **时序图**：绘制关键交互流程的时序图
3. **API 清单**：整理所有扩展相关的 API

---

## 五、输出成果

### 5.1 架构文档

**文件**: `docs/quick-validation/extension-ide-architecture.md`

**内容**:
- 扩展与 IDE 的整体架构
- 各层次的职责和边界
- 关键组件的说明

### 5.2 交互流程图

**文件**: `docs/quick-validation/extension-ide-interaction-flows.md`

**内容**:
- 扩展加载流程
- RPC 通信流程
- Webview 通信流程
- 扩展间通信流程

### 5.3 关键发现

**文件**: `docs/quick-validation/extension-ide-key-findings.md`

**内容**:
- 可以利用的扩展点
- 可以复用的机制
- 潜在的技术风险
- 推荐的实现方案

---

## 六、研究进展

### 已完成
- [x] 创建任务卡
- [ ] 扩展加载机制研究
- [ ] RPC 通信机制研究
- [ ] Extension API 实现研究
- [ ] 扩展间通信研究
- [ ] Webview 通信研究
- [ ] Contribution Points 研究

### 当前进展
- 正在研究扩展加载机制...

### 遇到的问题
- 待记录...

---

## 七、参考资源

- VS Code Extension API 文档: https://code.visualstudio.com/api
- VS Code 源码: https://github.com/microsoft/vscode
- Extension Host 架构: https://code.visualstudio.com/api/advanced-topics/extension-host
