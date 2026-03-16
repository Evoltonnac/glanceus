# Glanceus Terminology Dictionary

Use these terms consistently in docs, code comments, UI labels, and config examples.

## Core Identity

| Term | Definition |
|------|------------|
| **Glanceus** | Product name. |
| **Personal Data Aggregator & Hub** | Product positioning for multi-source personal data collection and visualization. |

## Logic and Execution

| Term | Usage |
|------|-------|
| **Flow** | Ordered execution pipeline for one integration. |
| **Step** | Atomic flow action (for example `http`, `oauth`, `extract`, `webview`). |
| **Interaction** | Suspended flow state waiting for user input/external action. |
| **Secrets** | Sensitive credentials stored in encrypted secret storage. |

## Data Concepts

| Term | Usage |
|------|-------|
| **Metric** | Key numeric value shown to users. |
| **Signal** | State or trend indicator derived from data. |
| **Integration Data** | Structured data produced by integration flows. |
| **Context** | Runtime expression scope for template evaluation. |

## UI and Presentation

| Term | Usage |
|------|-------|
| **SDUI (Schema-Driven UI)** | UI defined by templates instead of hardcoded component trees. |
| **Bento Card** | Top-level dashboard card for one source/integration view. |
| **Template** | SDUI layout definition that maps data to UI. |
| **Atomic Widget** | Smallest render unit (`TextBlock`, `Progress`, `Badge`, `Image`, `FactSet`). |
| **Structural Widget** | Layout/grouping unit (`Container`, `ColumnSet`, `List`). |

## Constants

| Constant | Description |
|----------|-------------|
| `GLANCEUS_DATA_DIR` | Root path for local data, config, and secrets. |
