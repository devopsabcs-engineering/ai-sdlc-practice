# ADR-007: Convert compatible units through canonical dimensions

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

Scaling and shopping require repeatable arithmetic across metric and imperial units. Direct
pairwise conversions are error-prone, while mass-to-volume conversion would require ingredient
density that v1 does not know.

## Decision

Convert mass through grams and volume through millilitres using documented constants. Preserve
the recipe's source amount and unit, derive converted display values, and merge shopping entries
only when normalized names and dimensions are compatible. Never infer mass/volume conversion.

## Consequences

Conversion and merge behavior is deterministic and auditable. Some ingredient lines remain
unconverted or separate by design; this is safer than presenting invented precision.
