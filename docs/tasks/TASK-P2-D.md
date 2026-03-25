# TASK-P2-D — 全局上下文库

**任务编号**: TASK-P2-D
**任务名称**: 全局上下文库实现
**所属阶段**: Phase 2 — AI 团队协作基础设施
**开发 AI**: 待分配
**验收 AI**: 待分配
**依赖任务**: TASK-P1-001 (AISessionManagerService)
**状态**: ⬜ 待开始

---

## 一、任务目标

实现全局上下文库，跨会话共享项目记忆，简化 AI 重新整理思路的过程。

---

## 二、功能需求

### 核心功能
1. 跨会话共享项目记忆（技术栈、架构决策、已实现功能）
2. Token 预算管理
3. 上下文检索

---

## 三、实现要点

- 使用 `IStorageService` 持久化上下文
- 提供 `addContext()`, `getContext()`, `retrieveContext()` 方法
- 在 `getSessionContext()` 中注入全局上下文

**接口文件**：`src/vs/workbench/services/aiContext/common/contextLibrary.ts` ✅ 已存在

---

**创建时间**：2026-03-25
