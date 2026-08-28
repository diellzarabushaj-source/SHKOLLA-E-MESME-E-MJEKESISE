---
name: karpathy-guidelines
description: Project-local coding discipline derived from multica-ai/andrej-karpathy-skills.
source: https://github.com/multica-ai/andrej-karpathy-skills
---

# Karpathy-style implementation rules

## Think before coding
- State material assumptions.
- Resolve ambiguity before making destructive or broad changes.
- Surface tradeoffs when two valid approaches materially differ.

## Simplicity first
- Write the minimum code needed for the requested outcome.
- Do not add speculative abstractions or configuration.
- Prefer existing project patterns.

## Surgical changes
- Every changed line should trace to the task.
- Do not rewrite educational content during design work.
- Do not change the palette during design polish.
- Do not refactor unrelated code.
- Clean up only artifacts introduced by your own change.

## Goal-driven execution
For UI work define verifiable goals, for example:
- same content before/after;
- same color tokens before/after;
- no horizontal overflow at 390px;
- keyboard focus visible;
- build and TypeScript green;
- browser audits green.

Loop until those criteria are met before merge.
