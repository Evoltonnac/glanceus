---
status: verifying
trigger: "layout-spacing-inconsistent"
created: 2026-03-13T00:00:00.000Z
updated: 2026-03-13T00:00:00.000Z
---

## Current Focus
hypothesis: "GridStack is initialized once and never updates when density changes - causing stale cellHeight/margin values. Additionally, card internal padding incorrectly scales with density."
test: "Applied fix: 1) Added useEffect to update GridStack on density change, 2) Fixed CSS to use constant padding and gap"
expecting: "Card gap remains constant, internal padding remains constant, only row height changes"
next_action: "Request human verification"

## Symptoms
expected: |
  卡片间隙不变，列不变（本身是按照可用空间响应式的），行变化
actual: |
  切换布局时，卡片内部padding随宽松程度明显变化；卡片外部间距增大，但卡片本身面积缩小；网格行未变大
errors: 无
reproduction: 切换布局模式（紧凑/普通/宽松）
started: 新增时就有

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Evidence
- timestamp: 2026-03-13
  checked: index.css CSS variables
  found: |
    - Density overrides: compact(0.5), normal(0.75), relaxed(1)
    - --qb-card-pad-x/y multiplied by density
    - .grid-stack-item-content margin: 2px/4px/6px per density
    - --qb-grid-row-height: 48px/56px/60px per density
  implication: "CSS variables change with density, but GridStack doesn't re-init"

- timestamp: 2026-03-13
  checked: Dashboard.tsx GridStack initialization
  found: |
    - gridGap/gridRowHeight read from computed CSS variables
    - GridStack.init() called with these values ONCE
    - useEffect dependency: [viewConfig?.items, dataMap, handleGridChange]
    - NO dependency on currentDensity or settings?.density
  implication: "GridStack never re-initializes when density changes"

- timestamp: 2026-03-13
  checked: density change handling
  found: |
    - cycleDensity() updates document.documentElement.setAttribute("data-density", newDensity)
    - This triggers CSS variable changes
    - But GridStack instance keeps old cellHeight and margin values
  implication: "CSS updates but GridStack internal state is stale"

## Resolution
root_cause: |
  1. GridStack在初始化后，当density改变时不会重新初始化，导致GridStack的cellHeight和margin保持旧值
  2. 卡片内部padding (--qb-card-pad-x/y)错误地与density相乘，导致切换时padding变化明显
  3. CSS的.grid-stack-item-content margin覆盖与GridStack内部margin不一致，导致外部间距异常

fix: |
  1. 在Dashboard.tsx中添加useEffect监听density变化，调用gs.cellHeight()和gs.margin()更新GridStack
  2. 修改index.css中卡片padding使用固定值(12px/8px)，不与density关联
  3. 修改grid gap保持固定值(8px)，不随density变化

verification: "等待用户验证"

files_changed:
  - ui-react/src/pages/Dashboard.tsx: 添加useEffect更新GridStack
  - ui-react/src/index.css: 修复CSS变量
