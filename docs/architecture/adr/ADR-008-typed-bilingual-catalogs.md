# ADR-008: Use typed English and French catalogs with a parity gate

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

English and French are equal product experiences. Type checks alone may not catch empty values or
catalog files that drift outside a shared type, and user-authored recipe text must not be
machine-translated.

## Decision

Treat English as the source message-key set, require both locale catalogs to satisfy one TypeScript
key type, and run an independent `i18n-parity` script that rejects missing, extra, or empty values.
Store explicit bilingual content for bundled samples and preserve user-authored text as entered.

## Consequences

Translation omissions block delivery and locale switching is deterministic. Every new UI message
requires both translations in the same change.
