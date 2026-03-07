---
created: 2026-03-06T14:08:34Z
title: dashboard-sidebar-hover-add-widget
area: ui
files:
  - ui-react/src/pages/Dashboard.tsx
  - ui-react/src/components/AddWidgetDialog.tsx
---

## Problem

Users need a more direct and intuitive way to add widgets for a specific data source. Currently, the workflow requires opening a general add widget dialog and then filtering or finding the data source. We want to streamline this by allowing users to initiate the widget addition directly from the dashboard sidebar's data source list.

## Solution

1. Implement a hover state for data source items in the dashboard sidebar.
2. On hover, display a right-arrow action button ("添加到视图") that slightly breaks out of the item frame on the right side.
3. Clicking this button should trigger the "add widget" flow in the active view on the right side.
4. The add widget dialog or panel should automatically select the clicked data source and immediately display its available widget components.
