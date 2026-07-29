# Option C Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add simulated presence, edit locking, explicit three-way conflict resolution, deterministic CRDT-like description merging, and resilient offline/reconnection behavior to the task board.

**Architecture:** Keep collaboration metadata in the persisted Zustand client store while keeping description reconciliation in a pure domain module. The task operation provider remains the single coordinator for optimistic projection, remote activity, network state, and reconnect replay. UI components receive narrow presence/lock props so task cards remain memoizable.

**Tech Stack:** React 19 client components, Next.js 16 App Router, TypeScript, Zustand, TanStack Query, Zod, Vitest, Playwright, shadcn/Base UI components.

---

## File structure

- Create `features/collaboration/description-crdt.ts`: pure deterministic block merge.
- Create `features/collaboration/description-crdt.test.ts`: convergence and merge behavior tests.
- Create `features/collaboration/network-status.tsx`: browser online/offline listener and reconnect banner.
- Create `features/collaboration/presence-indicators.tsx`: compact accessible task presence UI.
- Modify `features/tasks/types.ts`: presence, network, and conflict-base types.
- Modify `stores/board-store.ts`: presence, network state, pending-operation update, and reset/persistence rules.
- Modify `features/tasks/task-operations.tsx`: lock checks, remote presence, offline queueing, and reconnect replay.
- Modify `features/board/task-card.tsx`: presence indicators and disabled locked controls.
- Modify `features/board/task-column.tsx`: pass collaboration state to cards.
- Modify `features/board/board-app.tsx`: derive locks/presence, guard drag/drop, and render network status.
- Modify `features/board/task-form.tsx`: support a disabled locked state.
- Modify `features/board/task-details-sheet.tsx`: publish local presence and provide Keep mine, Take theirs, and Merge manually paths.
- Modify `features/developer-tools/developer-tools.tsx`: deterministic presence and network controls.
- Modify `tests/e2e/board.spec.ts`: exercise locking, manual merge, and reconnection.
- Modify `README.md` and `docs/APPLICATION_IMPLEMENTATION.md`: document Option C and simulation boundaries.

### Task 1: Description CRDT-like merge

**Files:**
- Create: `features/collaboration/description-crdt.test.ts`
- Create: `features/collaboration/description-crdt.ts`

- [ ] **Step 1: Write failing convergence tests**

```ts
expect(mergeDescription({ base: "Base.", mine: "Base. Mine.", theirs: "Base. Theirs.", mineActor: "You", theirsActor: "Alex" }))
  .toBe(mergeDescription({ base: "Base.", mine: "Base. Theirs.", theirs: "Base. Mine.", mineActor: "Alex", theirsActor: "You" }))
```

- [ ] **Step 2: Run the focused test and verify the module is missing**

Run: `npm test -- features/collaboration/description-crdt.test.ts`
Expected: FAIL because `description-crdt.ts` does not exist.

- [ ] **Step 3: Implement deterministic block reconciliation**

```ts
export function mergeDescription(input: DescriptionMergeInput) {
  if (input.mine === input.base) return input.theirs
  if (input.theirs === input.base || input.mine === input.theirs) return input.mine
  const retained = blocks(input.base).filter((block) => blocks(input.mine).includes(block) && blocks(input.theirs).includes(block))
  const additions = actorTaggedAdditions(input).sort((a, b) => a.key.localeCompare(b.key))
  return [...retained, ...unique(additions.map((item) => item.block))].join("\n\n")
}
```

- [ ] **Step 4: Run the focused test and verify convergence, add/add, delete, and unchanged-side cases pass**

Run: `npm test -- features/collaboration/description-crdt.test.ts`
Expected: PASS.

### Task 2: Collaboration state and reconnectable operations

**Files:**
- Modify: `features/tasks/types.ts`
- Modify: `stores/board-store.ts`
- Modify: `features/tasks/task-operations.tsx`
- Create: `features/collaboration/network-status.tsx`

- [ ] **Step 1: Add typed presence and network state**

```ts
export interface PresenceEntry {
  user: string
  taskId: string
  mode: "viewing" | "editing"
  updatedAt: string
  remote: boolean
}
```

- [ ] **Step 2: Add store actions for presence, network, and pending deadline updates**

```ts
upsertPresence: (entry) => set((state) => ({ presence: [...state.presence.filter((item) => item.user !== entry.user), entry] })),
removePresence: (user) => set((state) => ({ presence: state.presence.filter((item) => item.user !== user) })),
setNetworkOnline: (networkOnline) => set({ networkOnline }),
updatePending: (id, patch) => set((state) => ({ pending: state.pending.map((item) => item.id === id ? { ...item, ...patch } : item) })),
```

- [ ] **Step 3: Queue optimistic operations while offline and resume them once online**

```ts
if (useBoardStore.getState().networkOnline) mutation.mutate(operation)
// The reconnect effect reloads confirmed tasks, replays pending snapshots, moves
// their deadline to now + 2s, and starts each inactive operation exactly once.
```

- [ ] **Step 4: Listen to browser connectivity and show an accessible status banner**

```tsx
useEffect(() => {
  const sync = () => setNetworkOnline(navigator.onLine && !forcedOffline)
  window.addEventListener("online", sync)
  window.addEventListener("offline", sync)
  return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync) }
}, [forcedOffline, setNetworkOnline])
```

- [ ] **Step 5: Run unit tests**

Run: `npm test`
Expected: all tests pass.

### Task 3: Presence indicators and editing locks

**Files:**
- Create: `features/collaboration/presence-indicators.tsx`
- Modify: `features/board/task-card.tsx`
- Modify: `features/board/task-column.tsx`
- Modify: `features/board/board-app.tsx`
- Modify: `features/board/task-form.tsx`

- [ ] **Step 1: Render accessible per-task presence**

```tsx
<div aria-label={summary} title={summary}>
  {entries.slice(0, 3).map((entry) => <Avatar key={entry.user}>...</Avatar>)}
</div>
```

- [ ] **Step 2: Treat another user's editing presence as a lock**

```ts
const lockedBy = presence.find((entry) => entry.taskId === task.id && entry.mode === "editing" && entry.user !== activeUser)
```

- [ ] **Step 3: Disable drag handles, status selectors, and edit forms while locked**

```tsx
const sortable = useSortable({
  id: task.id,
  index,
  group: task.status,
  type: "task",
  accept: "task",
  data: { task },
  disabled: Boolean(lockedBy),
})
<Select disabled={Boolean(lockedBy)} ... />
<TaskForm disabled={Boolean(lockedBy)} ... />
```

- [ ] **Step 4: Publish local viewing/editing presence from the details sheet and clean it up on close**

```ts
useEffect(() => {
  if (!selectedTaskId) return removePresence(activeUser)
  upsertPresence({ user: activeUser, taskId: selectedTaskId, mode: draftDirty ? "editing" : "viewing", remote: false, updatedAt: new Date().toISOString() })
  return () => removePresence(activeUser)
}, [activeUser, draftDirty, selectedTaskId])
```

### Task 4: Explicit conflict resolution paths

**Files:**
- Modify: `features/tasks/types.ts`
- Modify: `features/tasks/task-operations.tsx`
- Modify: `features/board/task-details-sheet.tsx`

- [ ] **Step 1: Preserve the original base snapshot in every edit conflict**

```ts
store.setConflict({ taskId: next.id, base: store.conflict?.base ?? original, incoming: next, changedFields })
```

- [ ] **Step 2: Refresh a clean open draft when a remote task changes**

```ts
if (selected && !draftDirty) setDraft(toDraft(incoming), incoming, false)
```

- [ ] **Step 3: Expose the required top-level actions**

```tsx
<Button onClick={keepMine}>Keep mine</Button>
<Button onClick={takeTheirs}>Take theirs</Button>
<Button onClick={openManualMerge}>Merge manually</Button>
```

- [ ] **Step 4: Seed manual description merge from the deterministic reconciliation result**

```ts
const description = mergeDescription({
  base: conflict.base.description,
  mine: draft.description,
  theirs: conflict.incoming.description,
  mineActor: activeUser,
  theirsActor: conflict.incoming.updatedBy,
})
```

- [ ] **Step 5: Allow manual editing before saving one undoable resolution operation**

Run: `npm test`
Expected: all unit tests pass.

### Task 5: Deterministic developer controls and browser tests

**Files:**
- Modify: `features/developer-tools/developer-tools.tsx`
- Modify: `tests/e2e/board.spec.ts`

- [ ] **Step 1: Add remote presence mode, set/release presence, and offline controls**

```tsx
<Button onClick={() => setRemotePresence("editing")}>Set editing presence</Button>
<Button onClick={clearRemotePresence}>Release presence</Button>
<Switch checked={forcedOffline} onCheckedChange={setForcedOffline} />
```

- [ ] **Step 2: Test that remote editing locks a task and presence is visible**

```ts
await expect(page.getByText(/Editing: Alex Morgan/)).toBeVisible()
await expect(page.getByLabel(/Change status/)).toBeDisabled()
```

- [ ] **Step 3: Test manual conflict merge**

```ts
await page.getByRole("button", { name: "Merge manually" }).click()
await expect(page.getByLabel("Merged description")).toBeVisible()
```

- [ ] **Step 4: Test offline optimistic queue and reconnect completion**

```ts
await expect(page.getByText(/offline/i)).toBeVisible()
await expect(page.getByText("1 pending", { exact: true })).toBeVisible()
await expect(page.getByText("0 pending", { exact: true })).toBeVisible({ timeout: 5_000 })
```

- [ ] **Step 5: Run all browser tests**

Run: `npm run test:e2e`
Expected: all browser tests pass.

### Task 6: Documentation and full verification

**Files:**
- Modify: `README.md`
- Modify: `docs/APPLICATION_IMPLEMENTATION.md`

- [ ] **Step 1: Document presence, locks, merge semantics, and reconnect behavior**

```md
Presence and connectivity are browser-side simulations. Description reconciliation is a deterministic block CRDT-like merge: unchanged content is preserved, concurrent additions converge by actor identity, and the result remains editable before commit.
```

- [ ] **Step 2: Run the complete verification suite**

Run: `npm test && npm run lint && npm run build && npm run test:e2e`
Expected: tests and build pass; lint has no errors, with the existing TanStack Virtual compiler warning allowed.

- [ ] **Step 3: Review the diff for unrelated user changes**

Run: `git diff --check && git status --short`
Expected: no whitespace errors; existing user changes remain preserved.

## Self-review

- Presence indicators: Tasks 2, 3, and 5.
- Edit locks: Tasks 3 and 5.
- Keep mine / Take theirs / Merge manually: Task 4.
- CRDT-like description logic: Tasks 1 and 4.
- Network reconnection: Tasks 2 and 5.
- Testing and documentation: Tasks 1, 5, and 6.
- Placeholder scan: no deferred implementation placeholders remain.
- Type consistency: `PresenceEntry`, conflict `base`, network fields, and merge inputs are used consistently across the plan.
