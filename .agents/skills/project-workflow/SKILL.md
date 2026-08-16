---
name: project-workflow
description: Plan, implement, review, and document features in this monorepo with traceable collaboration records. Use when work involves Client-Server contracts, AI features, PRD updates, ADRs, Issues, Pull Requests, tests, or team documentation.
---

# Project Workflow

## Overview

Build features with a traceable path from user problem to verified implementation. Preserve monorepo boundaries and keep humans in control of AI-generated results.

## Start Every Task

1. Read `AGENTS.md` and `docs/CONVENTIONS.md`.
2. Read `docs/PRD.md` when it exists and inspect the relevant Issue, Discussion, and adjacent code.
3. State the user problem, affected package, and completion criteria before editing.
4. Read `references/feature-delivery.md` for the delivery checklist.

## Monorepo Boundaries

- Put user interface, Phaser rendering, and client state in `apps/client`.
- Put NestJS APIs, Socket handling, external service access, and AI provider access in `apps/server`.
- Put cross-app DTOs, event names, and constants in `packages/shared`.
- Update shared contracts before or with changes that affect both Client and Server.

## AI Feature Protocol

For AI features:

1. Define the input, output, latency expectation, and human confirmation step.
2. Preserve original input separately from model output when the user needs to review it.
3. Handle unavailable input, timeout, provider failure, and partial output.
4. Do not claim a generated result is final until a user confirms it.
5. Record model assumptions, prompt changes, and verification in `docs/AI_AGENT_WORKFLOW.md`.

## Finish Every Task

1. Check type contracts, error states, and affected user flow.
2. Run the smallest relevant validation command available.
3. Update product or technical documentation when a decision or contract changed.
4. Link the implementation Issue in the PR body with `Closes #<issue-number>`, not `Refs`, so GitHub closes it when the PR is merged into `dev`.
5. Prepare a focused commit and PR with actual verification evidence.
6. Verify that the linked Issue is closed after the PR merge, then update its Project status.

## Resource

Read `references/feature-delivery.md` before implementing or reviewing a feature.
