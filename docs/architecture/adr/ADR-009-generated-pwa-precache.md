# ADR-009: Generate the PWA manifest and revisioned precache

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

Pinch must install and operate fully offline. A hand-maintained service-worker asset list is easy
to desynchronize from Vite's hashed output and can combine incompatible revisions.

## Decision

Use `vite-plugin-pwa` at build time to generate the manifest and a revisioned application-shell
precache. Cache only same-origin production assets, use navigation fallback beneath the configured
base path, and activate updates on a controlled reload rather than during an active session.

## Consequences

Offline assets track each build automatically and stale combinations are less likely. The plugin
is a build dependency that must pass dependency audit and be covered by offline acceptance tests.
