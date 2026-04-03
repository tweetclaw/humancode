# 任务卡：TASK-P1-009

## 任务信息
- **任务编号**：TASK-P1-009
- **任务名称**：审计视图 UI 实现
- **对应验收**：TEST-P1-009
- **开发 AI**：AI-Dev-004
- **验收 AI**：AI-QA-003
- **依赖任务**：TASK-P1-006
- **优先级**：低
- **状态**：⬜ 待开始

## 任务目标

实现审计日志查看 UI。

## 实现内容

1. 审计日志列表视图
2. 事件过滤(按类型、时间、扩展等)
3. 事件详情查看
4. 事件统计面板(按类型统计事件数量)
5. 导出审计日志功能(导出为 JSON 或 CSV，可选)

## 实现位置

- `src/vs/workbench/contrib/aiInterop/browser/aiInterop.contribution.ts`
- `src/vs/workbench/contrib/aiInterop/browser/aiInteropAuditView.ts`

## 验收标准

- 审计日志可查看
- 事件过滤功能正常
- 事件详情显示完整
- 事件统计面板显示正确

## 实施记录

**开发 AI**：AI-Dev-004
**完成时间**：2026-03-31

### 实现详情

1. **审计视图组件** ([aiInteropAuditView.ts](../../../src/vs/workbench/contrib/aiInterop/browser/aiInteropAuditView.ts))
   - 实现了完整的审计日志查看界面
   - 继承自 ViewPane,集成到 AI Interop 视图容器中

2. **事件过滤功能**
   - 按事件类型过滤(下拉选择框)
   - 按扩展 ID 过滤(文本输入框)
   - 清除过滤器按钮

3. **事件统计面板**
   - 显示前 5 个最常见的事件类型及其数量
   - 显示总事件数
   - 使用网格布局展示统计卡片

4. **事件列表视图**
   - 按时间倒序显示所有事件
   - 显示事件类型、时间戳和扩展 ID
   - 支持点击选择事件查看详情
   - 根据事件类型使用不同颜色标识

5. **事件详情查看**
   - 侧边栏显示选中事件的完整信息
   - 包含 ID、类型、时间戳、扩展 ID、调用 ID、会话 ID
   - 以 JSON 格式展示详细信息
   - 支持关闭详情面板

6. **导出功能**
   - 支持导出当前过滤的事件为 JSON 格式
   - 自动生成带时间戳的文件名
   - 使用浏览器下载机制

7. **样式文件** ([aiInteropAuditView.css](../../../src/vs/workbench/contrib/aiInterop/browser/media/aiInteropAuditView.css))
   - 完整的 CSS 样式定义
   - 响应式布局
   - 使用 VS Code 主题变量

8. **视图注册** ([aiInterop.contribution.ts](../../../src/vs/workbench/contrib/aiInterop/browser/aiInterop.contribution.ts))
   - 在 AI Interop 视图容器中注册审计视图
   - 设置视图图标为 history
   - 配置视图顺序为 2

### 技术实现

- 使用原生 HTML select 和 input 元素实现过滤控件,避免复杂的依赖
- 实时监听审计服务的事件,自动刷新视图
- 使用 VS Code 的 Button 组件实现操作按钮
- 遵循 VS Code 编码规范和样式指南
