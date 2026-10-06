# ADR-006: Persist one versioned localStorage state envelope

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

V1 stores a small text-only recipe library, shopping list, and preferences on one device. Cross-
entity updates must not expose partial state, and future schema changes and imports need explicit
validation.

## Decision

Persist one validated, versioned state envelope under `pinch.state` in localStorage. Replace the
whole envelope per successful command. Before falling back from invalid stored data, retain one
copy under `pinch.state.recovery`. Import validates fully in memory before one replacement write.

## Consequences

V1 gains simple coherent writes, export parity, and an explicit migration boundary. localStorage
is synchronous and quota-limited, but the repository interface permits a later IndexedDB adapter
without changing domain or UI code.
