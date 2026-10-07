# ADR-010: Release to GitHub Pages through a governed manual workflow

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

The product is static and targets this repository's GitHub Pages site. The delivery contract
forbids deployment before human sign-off and requires a visible governance control.

## Decision

Build with Vite base `/ai-sdlc-practice/` and deploy `dist/` through a manually dispatched GitHub
Actions workflow. Require `governance_approved=true`, run release gates on the selected commit,
and use GitHub's Pages artifact and deployment actions.

## Consequences

The release is reproducible and tied to an auditable commit. The input is a workflow guard rather
than proof by itself; the orchestrator must still verify the persisted Product Owner, Security
Team, and Tech Lead approvals before deployment.
