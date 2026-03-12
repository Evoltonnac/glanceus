# Glancier Terminology Dictionary

This document defines the core terminology for **Glancier**.

## Core Identity

| Term | Definition |
|------|------------|
| **Glancier** | The product name. Represents the "at-a-glance" nature of the data dashboard. |
| **Personal Data Aggregator & Hub** | The project's positioning. A system that fetches, processes, and visualizes arbitrary data from APIs and web sources. |

## Logic & Execution (The Flow Engine)

| Term | Usage |
|------|-------|
| **Flow** | The execution pipeline for an integration, defining the sequence of Steps. |
| **Step** | An atomic unit of execution within a Flow (e.g., `http`, `oauth`, `extract`, `webview`). |
| **Interaction** | A state where a Flow is suspended (`SUSPENDED`) waiting for user input or external action (e.g., entering an API key, completing OAuth, or manual web scraping). |
| **Secrets** | Sensitive credentials (tokens, keys, session strings) managed by the `SecretsController` and excluded from standard data persistence. |

## Data & Logic Concepts (The Result Set)

| Term | Usage |
|------|-------|
| **Attribute (Data Point)** | A single piece of information (Number, String, Boolean, or Object) extracted via Flow. |
| **Result Set** | The complete dictionary of all Attributes produced by a Source's Flow after extraction. |
| **Context** | The environment where expressions (e.g., `"{usage > 80}"`) are evaluated, typically scoped to the Result Set or a List Item. |

## UI & Presentation (The Bento Engine)

The interface follows a **Bento Grid** philosophy, where data is organized into clean, modular tiles.

| Term | Usage |
|------|-------|
| **SDUI (Schema-Driven UI)** | The architecture where UI is defined by templates (YAML/JSON) rather than hardcoded React components. |
| **Bento Widget (Card)** | The top-level modular tile on the dashboard representing an integration (Source + Template). |
| **Template** | The SDUI definition that maps a Result Set to a visual layout. |
| **Atomic Widget** | The smallest visual building blocks: `TextBlock`, `Progress`, `Badge`, `Image`, `FactSet`. |
| **Structural Widget** | Components used for organization and layout: `Container`, `ColumnSet`, `List`. |

## Technical & Environment Constants

| Constant | Description |
|----------|-------------|
| `GLANCIER_DATA_DIR` | The environment variable defining the root directory for data, configuration, and secrets. |

## Usage Rule

- Documentation, code comments, UI labels, and config examples must use this dictionary as the single source of truth.
