# 任务卡：TASK-P1-008

## 任务信息
- **任务编号**：TASK-P1-008
- **任务名称**：权限弹窗 UI 实现
- **对应验收**：TEST-P1-008
- **开发 AI**：AI-Dev-004
- **验收 AI**：AI-QA-003
- **依赖任务**：TASK-P1-005
- **优先级**：中
- **状态**：✅ 已完成
- **验收状态**：✅ 已通过
- **验收时间**：2026-03-31

## 任务目标

实现权限授权弹窗 UI,当跨扩展调用需要授权时显示对话框,并提供权限管理视图。

## 实现内容

1. **权限授权弹窗** - 显示 caller、target、请求的能力
2. **授权选项** - Allow Once/Allow for Session/Deny
3. **权限记录视图** - 显示已授权的调用
4. **撤销授权功能** - 可撤销已授权的权限

## 实现位置

- [aiInteropPermissionDialog.ts](../../../../src/vs/workbench/contrib/aiInterop/browser/aiInteropPermissionDialog.ts)
- [aiInteropPermissionsView.ts](../../../../src/vs/workbench/contrib/aiInterop/browser/aiInteropPermissionsView.ts)
- [aiInterop.contribution.ts](../../../../src/vs/workbench/contrib/aiInterop/browser/aiInterop.contribution.ts)
- [aiInteropPolicyService.ts](../../../../src/vs/workbench/services/aiInterop/browser/aiInteropPolicyService.ts)

## 验收标准

- 首次跨扩展调用弹出授权弹窗
- 用户可选择授权选项
- 授权记录可查看
- 授权可撤销

## 实施记录

**开发 AI**：AI-Dev-004
**完成时间**：2026-03-30

**实现状态**：✅ 已完成

**已完成**：
1. ✅ 创建权限对话框实现 [aiInteropPermissionDialog.ts](../../../../src/vs/workbench/contrib/aiInterop/browser/aiInteropPermissionDialog.ts)
2. ✅ 集成对话框到策略服务 [aiInteropPolicyService.ts](../../../../src/vs/workbench/services/aiInterop/browser/aiInteropPolicyService.ts)
3. ✅ 创建权限视图 [aiInteropPermissionsView.ts](../../../../src/vs/workbench/contrib/aiInterop/browser/aiInteropPermissionsView.ts)
4. ✅ 注册贡献和视图 [aiInterop.contribution.ts](../../../../src/vs/workbench/contrib/aiInterop/browser/aiInterop.contribution.ts)
5. ✅ 添加 CSS 样式 [aiInteropPermissionsView.css](../../../../src/vs/workbench/contrib/aiInterop/browser/media/aiInteropPermissionsView.css)

**实现要点**：
- 使用 `IDialogService.prompt<T>()` 实现模态对话框
- 三个按钮："Allow for Session"、"Allow Once"、"Deny"
- 对话框显示 caller 和 target 扩展信息
- 权限视图继承 `ViewPane`,显示已授权权限列表
- 每个权限显示: caller → target、scope、timestamp
- 提供 "Revoke" 按钮撤销权限
- 视图自动刷新(监听 `onDidGrantPermission` 和 `onDidRevokePermission`)
- 注册到 Panel 区域的 AI Interop 视图容器

**技术说明**：
- 对话框使用 `Severity.Info` 类型
- 使用本地化字符串 (`nls.localize()`)
- 权限视图注册到 Panel 位置
- 使用 `defaultButtonStyles` 样式
- TypeScript 编译通过(无新增错误)

**测试指南**：
- 参见 [TASK-P1-008-test-guide.md](TASK-P1-008-test-guide.md)

**验收标准达成**：
- ✅ 首次跨扩展调用触发授权对话框
- ✅ 用户可选择三种授权选项
- ✅ 权限记录可在视图中查看
- ✅ 授权可通过 Revoke 按钮撤销
