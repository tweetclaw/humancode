
---

# 4. `04-session-state-machine.md`

```md
# AI Interop 平台能力：会话状态机文档

## 1. 目标

本文档定义 Session、Turn、Invocation、Participant 的生命周期与状态转移规则，作为恢复、重试、取消与审计的统一依据。

## 2. 核心对象

### 2.1 Session
表示一个平台级协作会话，承载多轮交互、多参与者与共享状态。

### 2.2 Turn
表示主控方发起的一轮任务或子任务窗口。一个 Turn 下可包含多个 Invocation。

### 2.3 Invocation
表示一次确定目标端点的实际调用，是流式通信和取消的最小执行单元。

### 2.4 Participant
表示加入 Session 的成员，角色包括：
- controller
- worker
- observer
- ui

## 3. Session 状态机

### 3.1 状态定义
- `active`
- `suspended`
- `closed`

### 3.2 状态图

```mermaid
stateDiagram-v2
  [*] --> active
  active --> suspended: host_lost / remote_disconnect
  suspended --> active: endpoint_rebind / reconnect
  active --> closed: user_close / workspace_close
  suspended --> closed: timeout / explicit_abort

3.3 规则

Session 创建后默认进入 active；

任一关键 participant 丢失时，Session 可进入 suspended；

所有 invocation 结束且用户关闭后，进入 closed；

closed 不可恢复，只能新建 session。

4. Invocation 状态机
4.1 状态定义

pending

streaming

waiting_authorization

waiting_tool

completed

failed

canceled

orphaned

4.2 状态图



5. Participant 生命周期
5.1 状态

joining

joined

offline

removed

5.2 规则

joining 仅为短暂过渡态；

endpoint 注册完成并获得权限后进入 joined；

host 丢失后进入 offline；

被用户或系统移除后进入 removed。

6. 恢复机制
6.1 Session 恢复

允许恢复：

session 元数据

participant 列表

invocation 索引

审计事件引用

结构化 state

不保证恢复：

正在进行的模型生成上下文

正在运行的 CLI 子进程内部堆栈

非幂等工具的已执行副作用

6.2 Invocation 恢复

若目标 handler 支持 resume，则可带 cursor 恢复；

若不支持 resume，则只能重试；

重试必须创建新 invocationId，但可保留 retryOf 引用。

7. Retry 边界
7.1 可重试

route error

host lost

timeout

transient tool failure

7.2 不可重试

permission denied

remoteAuthority mismatch

protocol violation

user explicit cancel

non-idempotent side effect already committed

8. Orphaned 语义

orphaned 不是失败，它表示：

平台失去了目标执行端；

当前 invocation 无法继续推进；

用户可以选择 retry / switch worker / abort。

平台要求：

orphaned 必须在 UI 中可见；

orphaned 必须写审计；

orphaned 不得被静默吞掉。
