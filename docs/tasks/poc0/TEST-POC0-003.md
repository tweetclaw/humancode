# 验收卡：TEST-POC0-003

## 验收信息
- **验收编号**：TEST-POC0-003
- **对应任务**：TASK-POC0-003
- **验收 AI**：AI-QA-002
- **验收类型**：功能验收 + 集成验收
- **状态**：⬜ 待验收

## 验收目标

验证 TASK-POC0-003 的实现是否符合要求,确保跨 Host 路由与隔离机制正确工作。

## 验收前准备

1. 阅读对应的开发任务卡 [TASK-POC0-003.md](TASK-POC0-003.md)
2. 确认开发 AI 已标记任务为"待验收"
3. 使用 `/Users/immeta/work/humancode/startcode.sh` 启动开发环境
4. 准备分析日志文件 `/Users/immeta/work/humancode/1.log`

## 验收步骤

### 1. 代码质量检查

- [ ] TypeScript 编译通过(运行 `npm run compile-check-ts-native`)
- [ ] 无 ESLint 错误
- [ ] 代码符合 VS Code 编码规范(见 [CLAUDE.md](../../../.claude/CLAUDE.md))
  - 使用 tabs 缩进
  - 接口使用 PascalCase
  - 方法使用 camelCase
  - 正确使用依赖注入模式

### 2. DTO 扩展验收

- [ ] **EndpointDescriptorDto 包含必要字段**
  - 位置: [src/vs/workbench/services/aiInterop/common/aiInterop.ts](../../../src/vs/workbench/services/aiInterop/common/aiInterop.ts)
  - 验证点: `hostKind: 'local' | 'remote' | 'web'` 字段存在
  - 验证点: `remoteAuthority?: string` 字段存在
  - 验证点: 字段类型定义正确

### 3. 错误码定义验收

- [ ] **错误码已定义**
  - 位置: [src/vs/workbench/services/aiInterop/common/aiInterop.ts](../../../src/vs/workbench/services/aiInterop/common/aiInterop.ts)
  - 验证点: `REMOTE_AUTHORITY_MISMATCH` 错误码存在
  - 验证点: `HOST_KIND_UNSUPPORTED` 错误码存在

### 4. 路由逻辑验收

- [ ] **路由检查函数实现正确**
  - 位置: [src/vs/workbench/services/aiInterop/browser/aiInteropService.ts](../../../src/vs/workbench/services/aiInterop/browser/aiInteropService.ts)
  - 验证点: `canRoute()` 或类似函数存在
  - 验证点: 实现了 web → local 拒绝规则
  - 验证点: 实现了 remote authority 匹配检查
  - 验证点: 返回值包含 `allowed` 和 `reason` 信息

- [ ] **invoke 方法集成路由检查**
  - 验证点: `invoke()` 方法在调用前执行路由检查
  - 验证点: 路由拒绝时抛出正确的错误或返回错误结果

### 5. 审计日志验收

- [ ] **路由拒绝事件被记录**
  - 位置: [src/vs/workbench/services/aiInterop/browser/aiInteropAuditService.ts](../../../src/vs/workbench/services/aiInterop/browser/aiInteropAuditService.ts)
  - 验证点: 路由拒绝时调用 `logEvent()`
  - 验证点: 事件类型为 `invocation_rejected` 或类似
  - 验证点: 记录包含 caller 和 target 的 hostKind 和 remoteAuthority

### 6. 功能验收(通过测试扩展)

**验收方法**: 启动程序 → 执行测试命令 → 分析日志输出

#### 场景 1: 同 host 调用(local → local)

**操作步骤**:
1. 启动程序: `/Users/immeta/work/humancode/startcode.sh`
2. 打开命令面板,执行 `Test AI Interop: Test Routing` 或类似命令
3. 选择"场景 1: 同 host 调用"

**预期结果**:
- [ ] 调用成功完成
- [ ] 日志中显示调用成功,无路由拒绝错误
- [ ] 日志格式示例: `[Controller] Scenario 1 (local → local): SUCCESS`

**日志关键字**: `Scenario 1`, `local → local`, `SUCCESS`

#### 场景 2: 跨 host 调用(local → remote)

**操作步骤**:
1. 执行"场景 2: 跨 host 调用"

**预期结果**:
- [ ] 根据策略,调用成功或被拒绝(本阶段默认允许)
- [ ] 日志中显示调用结果
- [ ] 日志格式示例: `[Controller] Scenario 2 (local → remote): SUCCESS` 或 `REJECTED`

**日志关键字**: `Scenario 2`, `local → remote`

#### 场景 3: Remote authority 错配(remote(A) → remote(B))

**操作步骤**:
1. 执行"场景 3: Remote authority 错配"

**预期结果**:
- [ ] 调用被拒绝
- [ ] 返回错误码 `REMOTE_AUTHORITY_MISMATCH`
- [ ] 日志中显示拒绝原因
- [ ] 日志格式示例: `[Controller] Scenario 3 (remote(A) → remote(B)): REJECTED - REMOTE_AUTHORITY_MISMATCH`

**日志关键字**: `Scenario 3`, `REMOTE_AUTHORITY_MISMATCH`, `REJECTED`

#### 场景 4: 不兼容 hostKind(web → local)

**操作步骤**:
1. 执行"场景 4: 不兼容 hostKind"

**预期结果**:
- [ ] 调用被拒绝
- [ ] 返回错误码 `HOST_KIND_UNSUPPORTED`
- [ ] 日志中显示拒绝原因
- [ ] 日志格式示例: `[Controller] Scenario 4 (web → local): REJECTED - HOST_KIND_UNSUPPORTED`

**日志关键字**: `Scenario 4`, `HOST_KIND_UNSUPPORTED`, `REJECTED`

### 7. 审计日志验证

**操作步骤**:
1. 执行所有测试场景后,检查日志文件 `1.log`
2. 搜索审计日志相关输出

**预期结果**:
- [ ] 场景 3 和场景 4 的拒绝事件被记录到审计日志
- [ ] 审计日志包含 `invocation_rejected` 或类似事件类型
- [ ] 审计日志包含 caller 和 target 的详细信息(hostKind, remoteAuthority)
- [ ] 审计日志包含拒绝原因(REMOTE_AUTHORITY_MISMATCH 或 HOST_KIND_UNSUPPORTED)

**日志关键字**: `[AiInteropAudit]`, `invocation_rejected`, `REMOTE_AUTHORITY_MISMATCH`, `HOST_KIND_UNSUPPORTED`

### 8. 性能指标验证

- [ ] **匹配路由成功率**: 场景 1 和场景 2(如果允许)调用成功 → 目标 100%
- [ ] **错配拒绝率**: 场景 3 和场景 4 调用被拒绝 → 目标 100%
- [ ] **错误码准确性**: 场景 3 返回 `REMOTE_AUTHORITY_MISMATCH`,场景 4 返回 `HOST_KIND_UNSUPPORTED` → 目标 100%
- [ ] **审计记录完整性**: 所有拒绝事件都记录到审计日志 → 目标 100%

### 9. 边界条件测试

- [ ] **undefined remoteAuthority 处理**
  - local host 的 remoteAuthority 为 undefined 时不应导致崩溃
  - local → local 调用应成功(即使两者 remoteAuthority 都是 undefined)

- [ ] **相同 remoteAuthority 的 remote 调用**
  - remote(A) → remote(A) 应成功

- [ ] **空字符串 remoteAuthority**
  - 如果 remoteAuthority 为空字符串,应视为无效并拒绝或视为 undefined

### 10. 文档检查

- [ ] 开发 AI 已填写 TASK-POC0-003.md 的"实施记录"区域
- [ ] 实施记录包含实现要点和遇到的问题

## 验收结果

**⚠️ 重要说明**:
- 验收任务卡本身**不应被修改**
- 验收 AI 完成验收后,应创建独立的**验收报告文件**
- 验收报告位置: `docs/reports/TEST-POC0-003-report.md`

**验收 AI 操作流程**:
1. 按照验收步骤逐项检查
2. 创建验收报告文件(参考 [TEST-POC0-001-report.md](../../reports/TEST-POC0-001-report.md) 和 [TEST-POC0-002-report.md](../../reports/TEST-POC0-002-report.md))
3. 在任务跟踪表([docs/phases/poc-0.md](../../phases/poc-0.md))中更新状态
4. 通知项目经理验收结果

## 后续操作

### 如果验收通过
- [ ] 在任务跟踪表中将 TASK-POC0-003 状态改为 ✅ 已完成
- [ ] 在任务跟踪表中将 TEST-POC0-003 状态改为 ✅ 通过
- [ ] 通知项目经理验收通过
- [ ] 将性能基线数据记录到 PoC-0 验证计划文档

### 如果验收失败
- [ ] 在任务跟踪表中将 TASK-POC0-003 状态改为 ❌ 验收失败
- [ ] 在任务跟踪表中将 TEST-POC0-003 状态改为 ❌ 失败
- [ ] 在验收报告中详细记录发现的问题
- [ ] 通知开发 AI 修复问题,修复后重新提交验收

## 附录

### 测试环境信息
- 操作系统: macOS
- 启动脚本: `/Users/immeta/work/humancode/startcode.sh`
- 日志文件: `/Users/immeta/work/humancode/1.log`
- Node 版本: [验收时填写]
- VS Code 版本: Code - OSS (开发版本)

### 关键代码位置

**DTO 定义**:
- [src/vs/workbench/services/aiInterop/common/aiInterop.ts](../../../src/vs/workbench/services/aiInterop/common/aiInterop.ts)

**路由逻辑**:
- [src/vs/workbench/services/aiInterop/browser/aiInteropService.ts](../../../src/vs/workbench/services/aiInterop/browser/aiInteropService.ts)

**审计服务**:
- [src/vs/workbench/services/aiInterop/browser/aiInteropAuditService.ts](../../../src/vs/workbench/services/aiInterop/browser/aiInteropAuditService.ts)

**测试扩展**:
- [extensions/test-ai-interop-controller/](../../../extensions/test-ai-interop-controller/)
- [extensions/test-ai-interop-worker/](../../../extensions/test-ai-interop-worker/)
