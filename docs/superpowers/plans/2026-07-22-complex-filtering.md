# Complex Filtering and Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visual compound-query builder with nested AND/OR logic, shareable URL state, persisted favorites, and efficient filtering for 1,000 tasks.

**Architecture:** A typed, validated query AST is evaluated by a pure selector and encoded as versioned base64url JSON in the `q` search parameter. Zustand owns the active query and saved favorites; a focused client hook synchronizes the active query with browser history. The UI recursively renders query groups while immutable helpers keep edits predictable.

**Tech Stack:** React 19, Next.js 16 App Router, TypeScript, Zustand persist, Zod, shadcn/ui, Vitest, Playwright.

---

### Task 1: Query model and evaluator

**Files:**
- Create: `features/query-builder/types.ts`
- Create: `features/query-builder/query-engine.ts`
- Test: `features/query-builder/query-engine.test.ts`

- [ ] Define Zod schemas for condition nodes, nested group nodes, fields, operators, and the versioned URL payload.
- [ ] Add immutable helpers to add, update, remove, and nest query nodes by stable ID.
- [ ] Compile the query tree once into a task predicate supporting equality, inequality, contains, and does-not-contain semantics.
- [ ] Test the documented `(priority = high AND assignee = You) OR (status = done AND tags contains urgent)` example, nesting, invalid payload fallback, and immutable edits.

### Task 2: Zustand query state and favorites

**Files:**
- Modify: `stores/board-store.ts`
- Test: `features/query-builder/query-engine.test.ts`

- [ ] Add the active query, favorite query records, builder visibility, and typed mutations to the persisted client state.
- [ ] Cap favorite names and preserve stable IDs and creation timestamps.
- [ ] Ensure clear/reset operations return the advanced query to an empty root group.

### Task 3: URL synchronization

**Files:**
- Create: `features/query-builder/use-query-url-sync.ts`
- Modify: `features/board/board-app.tsx`
- Test: `features/query-builder/query-engine.test.ts`
- Test: `tests/e2e/board.spec.ts`

- [ ] On initial hydration, decode and validate `q`; a valid URL query overrides the persisted active query.
- [ ] Replace the current URL when the query changes without navigating or resetting scroll.
- [ ] Remove `q` for an empty query and preserve unrelated search parameters.
- [ ] Verify a copied URL recreates the same result set after reload.

### Task 4: Visual query builder

**Files:**
- Create: `features/query-builder/query-builder.tsx`
- Create: `features/query-builder/query-group.tsx`
- Modify: `features/board/board-filters.tsx`

- [ ] Add an Advanced query button and active-condition count to the filter toolbar.
- [ ] Render nested bordered groups with AND/OR selectors, field/operator/value controls, add-condition, add-group, and remove actions.
- [ ] Use field-aware value inputs for priority, status, assignee, tags, title, and description.
- [ ] Add named favorite save, apply, and delete controls using accessible labels.
- [ ] Show a readable query summary and keep the builder usable on mobile.

### Task 5: Board integration, documentation, and verification

**Files:**
- Modify: `features/tasks/selectors.ts`
- Modify: `features/board/board-app.tsx`
- Modify: `README.md`
- Modify: `tests/e2e/board.spec.ts`

- [ ] Memoize the compiled query predicate separately from task filtering so 1,000 tasks are scanned only once per task/query change.
- [ ] Combine legacy quick filters and the advanced tree with AND semantics and update result counts and clear behavior.
- [ ] Document query syntax, URL sharing, favorite persistence, and the performance strategy.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `npm run test:e2e`; expect all tests to pass with only the known TanStack Virtual compiler warning.
