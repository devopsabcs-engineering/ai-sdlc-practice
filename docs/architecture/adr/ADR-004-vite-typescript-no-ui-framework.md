# ADR-004: Use Vite and strict TypeScript without a UI framework

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

Pinch is a small static teaching application. The product brief mandates Vite, TypeScript, and no
UI framework, while requiring a production build, tests, and GitHub Pages base-path support.

## Decision

Use Vite as the development/build tool and strict TypeScript with semantic DOM APIs and modular
CSS. Do not add React, Vue, another component framework, or a runtime styling library.

## Consequences

The dependency and conceptual footprint stays small and the output remains static. The team must
implement rendering, event lifecycle, and dialog focus behavior explicitly, so those boundaries
must be covered by unit and end-to-end tests.
