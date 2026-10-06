# ADR-005: Isolate a pure domain core behind browser adapters

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

Parsing, scaling, conversion, and shopping merges require deterministic tests. Storage, locale,
DOM, wake lock, and service workers are browser concerns that can make core behavior difficult to
test and couple unrelated features.

## Decision

Keep domain functions pure and independent of the DOM, storage, locale, and network. Application
controllers coordinate domain functions through typed repository, formatter, wake-lock, and view
interfaces. Browser implementations are composed at startup.

## Consequences

Core behavior is fast and deterministic under Vitest, and browser limitations can be simulated.
The design introduces small interfaces and mapping code, but avoids framework or global-state
coupling.
