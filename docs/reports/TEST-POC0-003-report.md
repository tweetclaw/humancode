# 验收报告：TEST-POC0-003

## 基本信息
- **验收编号**：TEST-POC0-003
- **对应任务**：TASK-POC0-003
- **验收 AI**：AI-QA-002
- **验收时间**：2026-03-29
- **验收轮次**：第 3 次验收
- **验收结论**：✅ 验收通过（自动化检查通过，且人工验收 UI 流程完全无误）

## 验收执行情况

### 1. 代码质量与缺陷修复检查
- ✅ **TypeScript 编译**：通过
  - 执行 `npm run compile-check-ts-native` 无错误，核心源码目前可正常编译。
- ✅ **缺陷修复验证**：通过
  - 开发者已依据反馈将 `MainThreadTestAiInteropShape` 中缺失的接口前缀补齐为 `$invokeWithRouting` 及 `$getAuditLog`。
  - ExtHost Proxy 中调用也同步进行了更正，不再会抛出 `is not a function` 错误。

### 2. DTO 扩展与规范验收
- ✅ **EndpointDescriptorDto**：包含指定的 `hostKind: 'local' | 'remote' | 'web'` 和 `remoteAuthority?: string` 字段，通过。
- ✅ **AiInteropErrorCode**：新增错误码 `REMOTE_AUTHORITY_MISMATCH` 和 `HOST_KIND_UNSUPPORTED`，通过。

### 3. 后端执行逻辑和审计框架
- ✅ **路由匹配安全逻辑实现**：`canRoute` 等内部拦截鉴别逻辑代码规范完整。
- ✅ **审计持久化逻辑实现**：触发拒绝时能够调用至 `_auditLog` 进行归档存储。

---

## 🛠️ 人工操作验收指南 (UI / 终端交互)

由于作为验收程序的我被禁止执行自动化的 UI 环境模拟测试并修改原测试扩展代码，我们将上述涉及 Extension API 层面的 4 个主要路由和安全审计拦截测试剥离，需要你**手动启动调试**并逐一验证以下情况。

**准备工作**：
在当前的终端中继续使用 `startcode.sh` 启动了测试宿主 (或者按 F5 启动当前项目的开发扩展窗口)。该控制台测试命令已注册为 `test-ai-interop.testRouting`。

### 测试执行方式
在被弹出的新 VS Code 开发宿主窗口中，按下 `Cmd+Shift+P` 打开控制台，并执行命令：**`Test AI Interop: Test Routing`**。
执行完毕后，切回原本的打印终端台（或检索 `1.log`）。

#### 【场景 1: 同 host 调用 (local → local)】预期结果判断：
- 观察终端输出。应出现：`[Controller] ✓ Scenario 1 passed: Same host call succeeded`
- 若提示 ✗ 红色报错，则未通过。

#### 【场景 2: 跨 host 调用 (local → remote)】预期结果判断：
- 因当前默认策略下，从 local 调用 remote 是允许的，你应寻找：`[Controller] ✓ Scenario 2 passed` 或者 `[Controller] ✓ Scenario 2` 的相关提示。

#### 【场景 3: Remote authority 错配 (remote(A) → remote(B))】预期结果判断：
- 应在控制台看到模拟请求发出的跨源调用被主线程拒绝了。
- 预期包含关键字被安全组件捕捉：`[Controller] ✓ Scenario 3 passed: Remote authority mismatch rejected correctly` (提示报错字样 `REMOTE_AUTHORITY_MISMATCH`)。

#### 【场景 4: 不兼容 hostKind (web → local)】预期结果判断：
- 预期应当看到被拒绝（web 无权限路由回 local）。
- 控制台预期输出：`[Controller] ✓ Scenario 4 passed` 并提示包含 `HOST_KIND_UNSUPPORTED` 字样的捕获提示。

#### 【审计组件持久化 (Audit Logs)】预期结果判断：
- 当该测试流跑完后，代码会自动抓取并拉取审计报告 `getAuditLog`，观察打印。
- 你应当能在日志尾部找到：`[Controller] Audit log entries:` 相关条目，包含被拦截的 `invocation_rejected` 事件、`caller: test-controller-remote-a` 等。

---

---

## 🎉 第三轮人工验收结果与归档
在最新的验证中，开发/你已经添加了关键的 `await api.getAuditLog()` 修复：
- **测试结果**：4 个路由场景全部正确阻塞/通行。不仅输出了全部的 `✓ Scenario X passed` 日志，最后底部的 Audit 日志也已不再抛错，正确列出了长度为 4 的 `Audit log entries`，包含 `REMOTE_AUTHORITY_MISMATCH` 以及 `HOST_KIND_UNSUPPORTED` 事件。
- **UI 弹窗反馈**：控制台正确弹出 `Routing test completed. Check console for results.`


## 测试结束后续操作

- ✅ 在任务跟踪表 (`docs/phases/poc-0.md`) 中，已将 `TASK-POC0-003` 更新为 **✅ 已完成**。
- ✅ 将 `TEST-POC0-003` 更新为 **✅ 通过**。
- 任务完结！
