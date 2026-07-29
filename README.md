# Thomson Reuters Board

A real-time collaboration simulation built for the optional React assignment. It combines a polished shadcn/ui board with optimistic mutations, persistent undo/redo, virtualized columns, accessible drag-and-drop, and deterministic developer controls.

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Documentation

- Open the interactive [Board Systems Lab](http://localhost:3000/interview-guide) inside the running application for guided lessons, code examples, system-flow labs, and interview drills.
- [`docs/APPLICATION_IMPLEMENTATION.md`](docs/APPLICATION_IMPLEMENTATION.md) is the comprehensive feature, architecture, syntax, patterns, tradeoffs, and interview-drill guide.
- [`docs/INTERVIEW_CHEAT_SHEET.md`](docs/INTERVIEW_CHEAT_SHEET.md) is the condensed last-minute revision sheet.

## Docker and Dokploy

The production image uses Next.js standalone output and runs as the non-root `nextjs` user:

```bash
docker build -t task-board .
docker run --rm -p 3000:3000 task-board
```

For Dokploy, create an application from the Git repository and use:

- Build type: **Dockerfile**
- Dockerfile path: `Dockerfile`
- Build context: repository root (`.`)
- Container port: `3000`
- Health-check path: `/`

Confirm the deployment log says **Dockerfile build**. Dokploy defaults to Nixpacks; if it still reports `Nixpacks build`, change the application's build type to Dockerfile and redeploy without cache. The repository also declares Node `22.x` and includes `nixpacks.toml` as a safe fallback, because Next.js 16 cannot build on Nixpacks' default Node 18 runtime.

No persistent server volume is required. Task data, query favorites, settings, and history are intentionally stored in each browser's versioned `localStorage`. Dokploy can terminate TLS and proxy the public domain to container port 3000.

Verification commands:

```bash
npm test
npm run lint
npm run build
```

## Architecture

- **TanStack Query** owns task server-state, optimistic cache updates, mutation status, and rollback reconciliation.
- **Zustand** owns global client state: filters, selected task, drafts, Developer Tools, pending-operation metadata, and the 50-entry undo/redo history.
- **The mock database** is the confirmed source of truth in `task-board:db:v1`. Query cache and client state use their own versioned local-storage keys.
- **TanStack Virtual** gives each status column an independent virtual viewport. Stable task IDs, measured rows, and overscan keep the mounted DOM bounded in the 1,000-task mode.
- **dnd-kit** handles pointer, touch, and keyboard movement. A DragOverlay avoids clipping inside the virtual scroll containers.
- **The advanced query engine** compiles a validated nested AND/OR tree into one predicate. The board applies it in the same memoized pass as quick filters, keeping query changes responsive with 1,000 tasks.

The page remains a Next.js Server Component. Interactive providers and browser-only persistence begin at a focused client boundary.

## Optimistic lifecycle

Every create, edit, move, reorder, undo, redo, and conflict resolution updates the Query cache immediately. An operation records its before/after values, actor, deterministic outcome, and completion deadline. The affected card alone shows a saving indicator while the simulated request waits two seconds.

Confirmed tasks and remaining pending patches are replayed after every success or failure. This prevents an older rollback from erasing newer changes. Pending operations are persisted with their outcome and deadline, so a reload resumes them once rather than silently losing them.

Use Developer Tools → **Force next failure** to inspect rollback behavior without waiting for the random 10% failure path.

## Developer Tools

Developer Tools is the only source of simulated activity. It starts paused and provides:

- Acting-user and remote-user emulation.
- Random or targeted remote updates.
- A guaranteed conflict trigger for the task currently being edited.
- Optional recurring updates every 10–15 seconds.
- Random, forced-success, and forced-failure network outcomes.
- A compact event log and pending-operation counter.
- Deterministic 30-task and 1,000-task datasets.

External updates are written to confirmed state and then reconciled with local optimistic patches. Viewing an updated task refreshes it and shows a toast. Editing preserves the draft and offers Keep mine, Take theirs, or per-field review.

## Presence, locking, and reconnects

Opening a task publishes viewing presence; changing its draft promotes that presence to editing. Presence avatars appear directly on cards, and a remote editing presence locks drag, status, and form controls until that user releases the task. Developer Tools can place or release deterministic viewing/editing presence for the configured remote user and target task.

Conflicts preserve the original local base, the local draft, and the newest remote task. The merge dialog exposes the required **Keep mine**, **Take theirs**, and **Merge manually** paths. Manual description reconciliation starts from a deterministic sentence-block CRDT-like merge: base blocks use observed-remove semantics, while concurrent additions converge by actor identity and source order. The result remains editable before it is saved as one undoable optimistic operation.

Developer Tools can force the simulated connection offline. Local changes remain visible and persist in the pending queue without being treated as failures. Reconnecting rebuilds the view from confirmed data plus queued patches, waits the normal two-second latency, and commits each inactive operation once. Browser `online` and `offline` events drive the same status banner and replay behavior. This remains a browser-side collaboration simulation rather than a WebSocket-backed multi-device system.

## Undo and redo

Local history records task creation and every editable field, status, and position change. History is capped at 50 actions and persists across reloads. Undo applies a forced inverse operation over the newest confirmed task; fields in the inverse patch intentionally win over simulated remote edits. Remote activity itself is never added to local history.

The header and shortcut reference show the exact next undo and redo action.

## Advanced query builder

Select **Advanced** beside the quick filters to build compound conditions. Every connector between rules can independently be AND or OR, so a flat sequence can express `Rule 1 OR Rule 2 AND Rule 3`; AND has standard precedence over OR. Nested groups remain available for explicit grouping. Fields include title, description, status, priority, assignee, and tags, with equals, not-equals, contains, and not-contains operators.

The active query is stored as readable URL rules, such as `rule1=priority.equals.high`, with a `logic` expression such as `1-or-(2-and-3)`. Search, assignee, and priority are synchronized as readable `search`, `assignee`, and `priority` parameters. Copying the address recreates the complete result set; older base64url and JSON query links remain compatible and are upgraded automatically. Invalid or incompatible URL rules are ignored safely. Named favorites are persisted with the rest of the client state in `task-board:client:v1` and can be applied or removed from the builder.

For example, the UI can represent:

```text
(priority = high AND assignee = You) OR (status = done AND tags contains "urgent")
```

## Keyboard and accessibility

Press `?` or select **Shortcuts** to see the complete reference. Key actions are ignored while typing in an input, textarea, select, combobox, or content-editable control.

- `?` — shortcut reference
- `/` — focus search
- `N` — create task
- `D` — toggle Developer Tools
- `Ctrl/Cmd+Z` — undo
- `Ctrl/Cmd+Shift+Z` — redo
- `Tab`, `Space/Enter`, arrow keys, `Esc` — keyboard drag-and-drop

Cards expose saving state through `aria-busy`; drag actions have screen-reader announcements; dialogs restore focus; motion respects the system reduced-motion preference; and status changes are also available without dragging.

## Performance notes

The 1,000-task control exists specifically for profiling. Filtering, grouping, sorting, pending-ID lookup, and derived counts are memoized. Cards use `React.memo` and Zustand consumers select only the state they need.

In React DevTools Profiler, validate that:

1. Typing in search re-renders the board projection but not unrelated Developer Tools controls.
2. A single optimistic mutation updates only its affected virtual column/card plus header counters.
3. Scrolling mounts only the visible range plus eight overscan rows per column rather than all 1,000 cards.

TanStack Virtual currently emits an informational React Compiler lint warning because its returned functions cannot safely be compiler-memoized; React intentionally skips compiler memoization for that component while the virtualizer continues managing its own updates.

## Scope decisions

Expert Options A, B, and C are implemented. Option C is intentionally a deterministic browser-side simulation: it demonstrates presence, edit locks, three-way resolution, convergent description merging, offline queueing, and reconnect replay without claiming a production multi-device transport. Deletion, service workers, and the optional blog post remain outside this submission.
