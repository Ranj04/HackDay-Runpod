---
name: ghost-shot-coach
description: Given a measured basketball shooting-form flaw, return one source-cited corrective drill and a concise coaching correction.
version: 1.0.0
license: MIT
---

# Ghost Shot Coach

Use this skill after a basketball shot-analysis system has identified one
directional form flaw.

## Input

Accept exactly one flaw matching `input.schema.json`. The measurement must
include the observed value, reference value, severity, and direction.

## Workflow

1. Validate the flaw against the input schema.
2. Retrieve a drill that directly targets the named flaw.
3. Prefer recognized coaching or player-development sources.
4. Write a short correction grounded in the measurement and retrieved source.
5. Return exactly one drill with actionable steps and its source URL.
6. Include every supporting source in `references`.
7. Validate the response against `output.schema.json`.

## Guardrails

- Do not diagnose an injury or provide medical advice.
- Do not invent sources, titles, URLs, or unsupported biomechanics claims.
- Do not claim 2D pose measurements are clinically precise.
- If no credible cited drill is available, return an explicit retrieval error
  instead of fabricating coaching guidance.

## Output

Return a `CoachingResult`: `flawId`, `summary`, one cited `drill`, and a
`references` list.
