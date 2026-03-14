---
status: resolved
trigger: "sources-polling-stop: dashboard的sources列表接口会自动停止轮询，理应一直轮询"
created: "2026-03-14T00:00:00Z"
updated: "2026-03-14T00:00:00Z"
---

## Current Focus
hypothesis: 轮询只在transient状态时运行，一旦所有sources稳定就停止
test: 检查Dashboard.tsx中的polling逻辑
expecting: 找到polling停止的具体条件
next_action: 验证修复是否有效

## Symptoms
expected: "页面在前台时一直刷新"
actual: "轮询停止"
errors: "无"
reproduction: "页面打开后等待一段时间，轮询自动停止"
started: "有一段时间了，最近改了接口请求逻辑时暴露出来了"

## Eliminated

## Evidence
- timestamp: "2026-03-14"
  checked: "Dashboard.tsx lines 561-628"
  found: "polling逻辑只在hasTransient为true时运行"
  implication: "一旦所有sources状态稳定(hasTransient=false)，polling立即停止"

- timestamp: "2026-03-14"
  checked: "hasTransient判断逻辑 (lines 563-569)"
  found: "检查source.status === 'refreshing' 或 (!s.has_data && !s.suspended && !hasError)"
  implication: "当所有source都不是refreshing且都有数据时，polling停止"

- timestamp: "2026-03-14"
  checked: "useSWR.ts polling配置"
  found: "revalidateOnFocus: false, revalidateOnReconnect: false"
  implication: "没有基于focus/reconnect的自动刷新"

## Resolution
root_cause: "Dashboard.tsx的polling逻辑(原第571行)只在hasTransient为true时运行。当所有sources状态稳定后，hasTransient变为false，polling的useEffect返回空，interval被清除且不会重新建立。"

fix: "移除了hasTransient条件检查，让polling无条件持续运行；同时在interval回调内检查document.hidden以在页面隐藏时跳过API调用节省资源。"

verification: "等待用户验证"
files_changed:
- "ui-react/src/pages/Dashboard.tsx": "修改polling逻辑，移除hasTransient条件，添加document.hidden检查"
