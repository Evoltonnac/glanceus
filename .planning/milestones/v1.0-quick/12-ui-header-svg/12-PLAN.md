---
phase: quick
plan: 12
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - "Settings About page uses LogoIcon SVG from Header"
    - "Icon has header-style background"
    - "Introduction text is polished and product-style"
  artifacts:
    - path: "ui-react/src/pages/Settings.tsx"
      provides: "Settings About page with new design"
  key_links:
    - from: "ui-react/src/pages/Settings.tsx"
      to: "ui-react/src/components/TopNav.tsx"
      via: "LogoIcon import"
---

<objective>
Redesign Settings About page UI: replace icon with Header SVG, add matching background, polish introduction text.
</objective>

<context>
@ui-react/src/pages/Settings.tsx (lines 946-971: About tab section)
@ui-react/src/components/TopNav.tsx (lines 13-45: LogoIcon SVG component)
@ui-react/src/i18n/messages/en.ts (line 61: tagline)
@ui-react/src/i18n/messages/zh.ts (line 61: tagline)
</context>

<tasks>

<task type="auto">
  <name>Task: Import LogoIcon and update About page icon</name>
  <files>ui-react/src/pages/Settings.tsx</files>
  <action>
1. Import LogoIcon from TopNav: `import { LogoIcon } from "../components/TopNav";`
2. Replace the icon section (lines 951-960):
   - Remove the `<img src={logoMark}>` and surrounding brand-colored container
   - Replace with LogoIcon SVG with header-style background
   - Use matching layout: `div className="flex items-center justify-center p-4 bg-background/80 backdrop-blur-md rounded-2xl border border-border/50"`
   - Add LogoIcon with className "w-16 h-16"
3. Keep existing title, tagline, and version section below unchanged
  </action>
  <verify>
    <automated>grep -n "LogoIcon" ui-react/src/pages/Settings.tsx</automated>
  </verify>
  <done>LogoIcon renders with header-style background on Settings About page</done>
</task>

<task type="auto">
  <name>Task: Polish introduction tagline</name>
  <files>ui-react/src/i18n/messages/en.ts, ui-react/src/i18n/messages/zh.ts</files>
  <action>
Update the tagline translations to be more polished and product-style:
- EN: "Personal data hub and monitoring dashboard" → "Your unified data aggregation & monitoring dashboard"
- ZH: "个人数据聚合与监控看板" → "统一数据聚合与监控看板"
  </action>
  <verify>
    <automated>grep -n "settings.about.tagline" ui-react/src/i18n/messages/en.ts ui-react/src/i18n/messages/zh.ts</automated>
  </verify>
  <done>Tagline text is polished and professional</done>
</task>

</tasks>

<verification>
[ ] Settings About page displays LogoIcon SVG
[ ] Icon has header-style background (backdrop blur, border)
[ ] No extra margins/padding beyond the icon container
[ ] Tagline is polished in both EN and ZH
</verification>

<success_criteria>
- LogoIcon from TopNav renders on Settings About page
- Icon has background matching header style
- Introduction tagline is polished
</success_criteria>

<output>
After completion, create `.planning/milestones/v1.0-quick/12-ui-header-svg/12-SUMMARY.md`
</output>
