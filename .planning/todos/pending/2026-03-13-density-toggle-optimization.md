# 密度切换功能优化

## 概述
优化布局密度切换功能，解决以下问题：

1. 卡片内部 padding 随密度变化的问题
2. 网格行高未随宽松程度增大的问题
3. 卡片间隙不一致的问题

## 当前状态
- [x] 隐藏密度切换按钮（暂不提供给用户）
- [x] 修复卡片内部 padding 使用固定值
- [x] 修复网格 gap 使用固定值
- [x] 在 SDUI 编码规范中添加 CSS 变量使用要求

## 待完成
- [ ] 重新启用密度切换按钮
- [ ] 确保所有 SDUI 组件使用 CSS 变量进行间距书写
- [ ] 测试不同密度下的视觉效果

## 相关文件
- `ui-react/src/index.css` - CSS 变量定义
- `ui-react/src/pages/Dashboard.tsx` - 密度切换逻辑
- `docs/sdui/01_architecture_and_guidelines.md` - SDUI 编码规范
