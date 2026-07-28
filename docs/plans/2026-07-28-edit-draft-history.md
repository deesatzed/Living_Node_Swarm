# Edit Draft History Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task.

**Goal:** Make persisted, version-bound edit drafts visible in the existing-model Edit workspace.

**Architecture:** Extend the shared API client with the already-existing project revision endpoint, then render a read-only revision history in `EditModel`. This exposes durable draft bases and timestamps without treating a draft as an approved or active graph change.

**Tech Stack:** React, TypeScript, Vitest, FastAPI/SQLite workspace API.

---

### Task 1: Expose persisted drafts through the shared client

**Files:**

- Modify: `packages/lns_ui_shared/src/api/client.ts`
- Test: `packages/lns_ui_shared/src/api/client.test.ts`

1. Write a failing client contract test for `listDrafts(projectId)` using `GET /projects/{id}/revisions`.
2. Run the focused test and verify it fails because the method is absent.
3. Add the typed optional client method and minimal request implementation.
4. Re-run the focused test and the shared type build.

### Task 2: Render a non-active draft history

**Files:**

- Modify: `packages/lns_ui_shared/src/modes/EditModel.tsx`
- Test: `packages/lns_ui_shared/src/modes/EditModel.test.tsx`

1. Write a failing component test for loading and rendering a persisted draft’s ID/base version.
2. Run the focused test and verify it fails because history is absent.
3. Load history on mount and after successful draft creation; display an explicit status that it is a draft history, not an active graph.
4. Re-run the focused test and complete shared tests/type build.

### Task 3: Record verified scope

**Files:**

- Modify: `PROGRESS.md`

1. State that revision history is visible and durable, while undo/redo commands, candidate changes, validation, shadow comparison, and approval remain incomplete.
2. Run `git diff --check`, commit only the focused files, and preserve unrelated work.
