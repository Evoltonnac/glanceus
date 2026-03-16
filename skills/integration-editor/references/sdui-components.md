# Glancier SDUI Components 速查表

这个文件包含了所有可用的 Server-Driven UI (SDUI) 组件及其支持的属性。

## 核心概念

**变量绑定**: 在组件的字符串属性中，你可以使用大括号 `{变量名}` 来绑定 `flow` 阶段输出的变量，或者使用 `$.jsonpath` 引用数据。
例如：`text: "Hello {user.name}"` 或 `value: "{followers}"`

## 通用 Props 枚举 (重要变更)

所有 widget 仅暴露最小通用能力，统一使用以下枚举，不再支持旧值（如 small/default/large, good/attention, left/right/top/bottom 等）：
- `spacing`: `none` | `sm` | `md` | `lg`
- `size`: `sm` | `md` | `lg` | `xl`
- `tone`: `default` | `muted` | `info` | `success` | `warning` | `danger`
- `align_x` / `align_y`: `start` | `center` | `end`

## Widget 集合 (Component Map)

在 YAML 的 `templates[x].widgets` 数组中，你可以组合以下组件（必须包含 `type` 字段）。

### 1. 布局组件

```yaml
# Container: 通用容器
type: "Container"
spacing: none|sm|md|lg               # 默认: md
align_y: start|center|end            # 默认: start
selectAction:                        # 可选：点击事件
  type: "Action.OpenUrl"
  url: string
items: [Widget]                      # 必需：子组件列表

# ColumnSet: 多列布局
type: "ColumnSet"
spacing: none|sm|md|lg
align_x: start|center|end
columns:                             # 必需：列数组
  - type: "Column"
    width: auto|stretch|"{var}"      # auto:自适应内容, stretch:占据剩余空间
    align_y: start|center|end
    spacing: none|sm|md|lg
    items: [Widget]                  # 必需：列内的子组件

# List: 动态列表渲染
type: "List"
data_source: "{数组变量}"             # 必需：引用的数组源
item_alias: "item"                   # 必需：渲染每一项时的局部变量别名
layout: col|grid                     # 默认: col
columns: int | "{var}"               # grid布局时的列数(1-6)
spacing: none|sm|md|lg
limit: int | "{var}"                 # 最大渲染数量
render: [Widget]                     # 必需：用于渲染单项的模板组件
```

### 2. 内容组件

```yaml
# TextBlock: 文本块
type: "TextBlock"
text: string | "{var}"               # 必需
size: sm|md|lg|xl
weight: normal|medium|semibold|bold
tone: default|muted|info|success|warning|danger
align_x: start|center|end
wrap: boolean | "{var}"              # 是否换行
maxLines: int | "{var}"              # 截断行数

# FactSet: 键值对列表（适合展示属性）
type: "FactSet"
spacing: none|sm|md|lg
facts:                               # 必需
  - label: string | "{var}"          # 必需
    value: string | "{var}"          # 必需
    tone: default|muted|info|success|warning|danger # 单个fact的色调

# Image: 图片
type: "Image"
url: string | "{var}"                # 必需
altText: string
size: sm|md|lg|xl
style: default|avatar                # avatar会将图片裁切为圆形

# Badge: 状态/标签徽章
type: "Badge"
text: string | "{var}"               # 必需
size: sm|md|lg|xl
tone: default|muted|info|success|warning|danger

# Progress: 进度条/环
type: "Progress"
value: int | "{var}"                 # 必需：0-100的数值
label: string | "{var}"              # 可选说明文本
style: bar|ring                      # 条形或环形
size: sm|md|lg|xl
tone: default|muted|info|success|warning|danger
thresholds:                          # 可选告警阈值
  warning: int
  danger: int
```

### 3. 交互组件

```yaml
# ActionSet: 按钮组
type: "ActionSet"
align_x: start|center|end
spacing: none|sm|md|lg
actions:                             # 必需
  - type: "Action.OpenUrl"
    title: string                    # 必需
    url: string                      # 必需
    size: sm|md|lg|xl
    tone: default|muted|info|success|warning|danger
  # 或者
  - type: "Action.Copy"
    title: string                    # 必需
    text: string                     # 必需: 要复制的文本
    size: sm|md|lg|xl
    tone: default|muted|info|success|warning|danger
```
