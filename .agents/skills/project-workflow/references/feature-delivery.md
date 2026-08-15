# Feature Delivery Checklist

## Problem Fit

- Identify the documented user problem the feature addresses.
- Reject features that do not have a clear user outcome or completion criterion.

## Implementation

- Define the Client, Server, and shared contract responsibilities.
- Include loading, empty, permission, and error states.
- Keep original user input separate from generated or transformed content when review is required.

## Verification

- Verify the primary user flow locally.
- Verify failure behavior for unavailable input, disconnected clients, timeout, or provider errors when relevant.
- Attach screenshots or a short recording for visible changes.

## Evidence

- Link the relevant Issue, Discussion, PRD, Figma file, or ADR.
- Record actual AI assistance and human validation in `docs/AI_AGENT_WORKFLOW.md` when applicable.
