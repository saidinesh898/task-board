# Task Board: Complete Implementation Guide

This document explains how the application works from the first HTTP render through client hydration, local persistence, task mutations, filtering, collaboration simulation, conflict resolution, history, testing, and deployment. It also teaches the syntax and engineering patterns you need to defend the implementation in an interview. It describes the current working tree as inspected on July 29, 2026.

## 1. What the application is

The project is a single-route, browser-persisted collaborative task-board simulation. It has three Kanban columns—Todo, In progress, and Done—and supports:

- task creation and editing;
- pointer and keyboard drag-and-drop, plus a status select as a non-drag alternative;
- optimistic two-second mutations with forced or random failure and rollback;
- persisted pending mutations that resume after a reload;
- simulated remote edits and edit-conflict review;
- a 50-action local undo/redo history;
- quick filtering and an advanced nested query builder;
- readable, shareable URL filters and saved query favorites;
- independent list virtualization for 1,000-task stress data;
- system, light, and dark themes;
- keyboard shortcuts and accessible dialogs, sheets, controls, and drag announcements;
- unit, browser end-to-end, lint, type/build, Docker, and Dokploy support.

This is deliberately not a networked multi-user system. The “server,” network delay, remote users, and failures are deterministic or randomized browser-side simulations. Browser `localStorage` is the durable data store.

## 2. High-level architecture

The application divides responsibility among four main layers:

| Layer | Main implementation | Responsibility |
| --- | --- | --- |
| Next.js shell | `app/layout.tsx`, `app/page.tsx`, `app/error.tsx` | Route, document shell, metadata, fonts, provider boundary, route error fallback |
| Feature UI | `features/board/**`, `features/query-builder/**`, `features/developer-tools/**`, `features/keyboard-shortcuts/**` | Visible board, dialogs, filtering UI, DnD, virtual columns, developer controls, shortcuts |
| Client orchestration | `features/tasks/task-operations.tsx`, `stores/board-store.ts` | Query cache, mutations, optimistic projection, remote events, scheduling, global client state, persistence |
| Domain and persistence | `features/tasks/types.ts`, `repository.ts`, `seed.ts`, `selectors.ts`, `format.ts` | Runtime validation, domain types, mock database, deterministic data, pure filtering and formatting |

```mermaid
flowchart TD
  Request["GET /"] --> Layout["RootLayout (Server Component)"]
  Layout --> Providers["Providers (Client boundary)"]
  Providers --> Page["Home page (Server Component output)"]
  Page --> BoardApp["BoardApp (Client Component)"]
  BoardApp --> Ops["TaskOperationsProvider"]
  Ops --> Experience["BoardExperience"]

  Experience --> QueryCache["TanStack Query cache"]
  Experience --> Store["Zustand board store"]
  Ops --> Repository["localStorage mock repository"]

  QueryCache --> Columns["Filtered, grouped virtual columns"]
  Store --> Filters["Filters, dialogs, history, pending ops, simulation"]
  Repository --> DB["task-board:db:v1"]
  QueryCache --> CacheStorage["task-board:query-cache:v1"]
  Store --> ClientStorage["task-board:client:v1"]
```

### Why there are both TanStack Query and Zustand

The two state systems intentionally own different kinds of state:

- TanStack Query owns the current visible task collection and mutation lifecycle. It represents “server state,” even though the source is a simulated local repository.
- Zustand owns UI and workflow state: filters, selected task, editing draft, conflict, undo/redo stacks, pending-operation descriptions, developer settings, and the event log.

The `pending` operation array lives in Zustand because it must persist across reloads. The visible task projection lives in TanStack Query because every optimistic change is expressed as confirmed tasks with the pending patches replayed on top.

## 3. Route and rendering lifecycle

### `app/layout.tsx`

`RootLayout` is a Server Component because it has no `"use client"` directive. It:

1. Imports global CSS.
2. Loads Geist Sans and Geist Mono through `next/font/google`.
3. exposes both fonts as CSS variables (`--font-geist-sans` and `--font-geist-mono`);
4. exports static Next.js metadata for the title and description;
5. renders the required root `<html>` and `<body>` elements;
6. applies `suppressHydrationWarning` to `<html>` because `next-themes` can change the class before hydration;
7. wraps only the route children in the client-side `Providers` component.

The provider is kept below `<html>` and `<body>`, preserving a small server-rendered document boundary while still making all route content interactive.

### `app/providers.tsx`

`Providers` is the first explicit Client Component. It owns browser APIs, React state, and context providers.

The provider nesting order is:

1. `ThemeProvider` from `next-themes`, using a class attribute, system preference by default, system change support, and transition suppression during a theme switch.
2. `PersistQueryClientProvider`, which supplies TanStack Query and persists its cache.
3. `TooltipProvider`, which supplies Base UI tooltip context.
4. Motion's `MotionConfig`, which honors the user's reduced-motion preference.
5. `LazyMotion` with `domAnimation`, which loads only the DOM animation feature set.
6. Route children.
7. A Sonner `Toaster`, positioned at the bottom-right with rich status colors.

The `QueryClient` and persister are each constructed in lazy `useState` initializers. This gives each mounted provider one stable instance rather than recreating clients on renders.

Default query behavior:

- data is fresh for 5 seconds (`staleTime`);
- unused query data may remain cached for 24 hours (`gcTime`);
- mutations do not retry automatically.

The `lazyBrowserStorage` object implements the `Storage` interface without touching `window` during server rendering. Every method checks `typeof window !== "undefined"`; reads become empty or `null` on the server and writes become no-ops. The query persister uses this adapter and the versioned key `task-board:query-cache:v1`. Its buster is `v1`, allowing future incompatible cache versions to be invalidated.

### `app/page.tsx`

The only public application route is `/`. `Home` remains a Server Component and renders `<BoardApp />`, a focused client boundary. The production build confirms `/` is statically prerendered.

### `app/error.tsx`

The route-segment error fallback is a Client Component, as required by Next.js 16.2. It receives:

- the thrown `error`, which it logs in an effect; and
- `unstable_retry`, the Next.js 16.2 retry function that re-fetches and re-renders the failed boundary's children.

It renders a centered error message, reassures the user that confirmed local data remains stored, and exposes a “Try again” button. It catches render-time errors below the root layout. It does not catch arbitrary asynchronous errors or exceptions inside event handlers; expected mutation failures are handled explicitly in the mutation callbacks instead.

## 4. Runtime component tree

`BoardApp` adds `TaskOperationsProvider`, then renders the private `BoardExperience` component.

```text
BoardApp
└── TaskOperationsProvider
    └── BoardExperience
        ├── AppHeader
        │   ├── Undo / redo controls
        │   ├── Keyboard shortcut control
        │   ├── Theme menu
        │   └── New-task control
        ├── DeveloperTools
        ├── main
        │   ├── BoardFilters
        │   │   └── QueryBuilder (when expanded)
        │   └── DndContext
        │       ├── TaskColumn: Todo
        │       ├── TaskColumn: In progress
        │       ├── TaskColumn: Done
        │       └── DragOverlay
        ├── AppFooter
        ├── CreateTaskDialog
        ├── TaskDetailsSheet
        │   └── conflict-resolution Dialog
        └── ShortcutsDialog
```

The dialogs and sheet are mounted once at the board root. Zustand booleans and `selectedTaskId` control their visibility, so any card or keyboard handler can open them without prop drilling.

## 5. Domain model and validation

### Task schema

`features/tasks/types.ts` defines the runtime Zod schemas and derives TypeScript types from them. This prevents the runtime and compile-time definitions from drifting.

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Stable task identity; deterministic seed ID or UUID for user-created tasks |
| `title` | non-empty string | Card and sheet title |
| `description` | non-empty string | Task details and quick-search source |
| `status` | `todo \| in-progress \| done` | Column membership |
| `priority` | `low \| medium \| high` | Priority badge and filter value |
| `assignee` | non-empty string | One of the configured people in normal UI flows |
| `tags` | string array | Card badges and queryable labels |
| `createdAt` | string | ISO timestamp assigned once |
| `updatedAt` | string | ISO timestamp updated optimistically and again at confirmation |
| `updatedBy` | string | Local acting user or simulated remote user |
| `version` | non-negative integer | Confirmed version counter; remote changes increment immediately |
| `position` | number | Sort key within a status column |

`TaskDraft` contains only the six editable fields: title, description, status, priority, assignee, and tags. System fields are never directly edited by the form.

`TaskPatch` permits partial changes to all fields except `id` and `createdAt`, although the current mutation API usually passes complete before/after snapshots rather than sparse patches.

### Shared constants

- `PEOPLE`: You, Alex Morgan, Priya Shah, Jordan Lee.
- `STATUSES`: Todo, In progress, Done in board order.
- `PRIORITIES`: Low, Medium, High.
- `STATUS_LABELS`: display labels for status values.

### Operation and collaboration types

`PendingOperation` is the durable description of one simulated request. It carries a UUID, task ID, operation kind, human-readable label, actor, full before/after snapshots, predetermined outcome, deadline, and history policy.

The outcome is chosen when the operation is queued—not after the two-second wait. Persisting both `outcome` and `dueAt` makes reload behavior deterministic.

`HistoryEntry` stores a separate ID plus the originating operation ID. Its nullable `before` and `after` values let creation be reversed by treating `after: null` as deletion.

`EditConflict` records the selected task, draft base version, complete incoming remote task, and only the editable fields changed by the remote event.

`SimulationEvent` is a compact audit row for queued, resumed, succeeded, failed, cancelled, or remote-updated activity. The current runtime emits all listed results except `cancelled`.

## 6. Deterministic seed data

`makeSeedTasks(count = 30)` creates reproducible data without external fixtures.

- Status cycles every task: todo, in-progress, done.
- Priority cycles high, medium, low on the same cadence.
- Assignee cycles across four people.
- Titles cycle across 10 templates; for datasets over 100 tasks, `#N` is appended to keep visible titles distinguishable.
- Descriptions cycle across five templates.
- Two tags are selected from a six-tag list.
- Dates are deterministic UTC values in July 2026.
- IDs are `task-1`, `task-2`, and so on.
- Every seed task starts at version 1.
- Position is `floor(index / 3) * 1000`, leaving large gaps for insertion.

Because status and priority advance together, the default 30 tasks happen to place high-priority tasks in Todo, medium-priority tasks in In progress, and low-priority tasks in Done. This is a property of the seed generator, not a board rule.

The 30- and 1,000-task developer datasets use the same generator, making tests and performance comparisons repeatable.

## 7. Persistent storage model

The browser contains three versioned application stores with different purposes:

| Key | Owner | Stored data |
| --- | --- | --- |
| `task-board:db:v1` | `features/tasks/repository.ts` | Confirmed task database as `{ version: 1, tasks }` |
| `task-board:query-cache:v1` | TanStack Query persister | Serialized query cache |
| `task-board:client:v1` | Zustand persist middleware | Filters, UI settings, draft/conflict, history, pending operations, event log |

The theme library also maintains its normal browser preference, but the application does not customize that storage key.

### Confirmed database behavior

`loadConfirmedTasks()` is safe on the server and in the browser:

1. If no browser storage exists, it returns 30 seed tasks without persisting them.
2. If the key is missing in the browser, it seeds 30 tasks and saves them.
3. If JSON parsing or Zod validation fails, it replaces the invalid data with a fresh 30-task dataset.
4. If validation succeeds, it returns the stored tasks.

This is recovery by reset, not partial migration. Any corrupt or schema-incompatible confirmed database is discarded.

### Zustand persistence boundary

The store intentionally excludes transient functions and `hydrated`; `onRehydrateStorage` sets `hydrated: true` after state restoration. It persists:

- quick and advanced filters;
- query-builder state and up to 20 favorites;
- selected task and developer panel state;
- acting/remote user and simulation settings;
- dataset size and next scheduled simulation time;
- draft, dirty/base metadata, and conflict;
- undo/redo stacks;
- pending operations;
- the 30 most recent events.

Create-dialog and shortcuts-dialog open state are not persisted.

### Reset behavior

Developer Tools “Reset” asks for confirmation, removes the persisted TanStack Query key, restores the Zustand store to its initial values while keeping it marked hydrated, and writes a fresh 30-task confirmed database.

The theme preference is not reset. The Zustand storage entry is subsequently rewritten from the reset state by the persist middleware.

## 8. Initial load and hydration

The task query uses key `['tasks']`, `queryFn: loadConfirmedTasks`, deterministic seed `initialData`, and `refetchOnMount: 'always'`.

The complete startup sequence is:

```mermaid
sequenceDiagram
  participant S as Server render
  participant Q as TanStack Query
  participant Z as Zustand
  participant DB as localStorage DB
  participant UI as Board UI

  S->>Q: Render with 30 deterministic initial tasks
  S->>UI: Produce prerendered HTML
  UI->>UI: Hydrate client components
  Z->>Z: Restore task-board:client:v1
  Z->>Z: Set hydrated = true
  Q->>DB: Refetch confirmed tasks on mount
  DB-->>Q: Validated stored tasks or new seed
  Q->>Z: Read persisted pending operations
  Q->>Q: Reconcile confirmed + pending
  loop each operation not active in this runtime
    Q->>Z: Add resumed event
    Q->>Q: Resume until original dueAt
  end
```

The deterministic initial data lets server and first client render agree, which avoids hydration mismatches. The stored database is applied after mount. `hydrated` prevents pending-operation recovery and automatic simulation scheduling before Zustand has restored the durable client state.

`runtimeActive` is a module-level `Set` of operation IDs. It prevents a single JavaScript runtime from starting the same restored operation more than once when effects re-run. It is intentionally not persisted; persisted operation IDs are the recovery source after a full reload.

## 9. Optimistic mutation engine

All local creates, edits, moves, reorders, conflict resolutions, undo actions, and redo actions pass through `execute()` in `TaskOperationsProvider`.

### Queueing a new operation

For a new operation, `execute()`:

1. reads the latest Zustand state imperatively;
2. generates an operation UUID;
3. resolves the task ID from `after.id` or `before.id`;
4. assigns the operation kind, label, and current acting user;
5. copies the complete `after` task and stamps an optimistic `updatedAt` and `updatedBy`;
6. consumes the selected failure mode;
7. sets `dueAt` to two seconds in the future;
8. appends the operation to persisted pending state;
9. records a history entry unless disabled;
10. records a `queued` event;
11. reloads confirmed tasks and replays every pending operation into the query cache;
12. starts the mutation.

Failure modes behave as follows:

- `random`: `Math.random() < 0.1` fails, producing a 10% failure rate;
- `success`: the next operation is guaranteed to succeed, then the mode resets to random;
- `failure`: the next operation is guaranteed to fail, then the mode resets to random.

### The visible optimistic projection

`reconcilePending(confirmed, operations)` reduces the pending list in array order. Each operation is applied using `applyOperationToTasks`:

- `after === null`: remove the task;
- task not present: append `after` as a new task;
- task present: replace its complete object with `after`.

Because complete snapshots are replayed, a later pending operation for the same task wins over earlier pending snapshots. Operations for different tasks compose independently.

### Simulated request and success

The mutation adds the operation ID to `runtimeActive`, waits until its stored deadline, and throws if the predetermined outcome is failure.

On success, `commitOperation()`:

1. reloads the latest confirmed database;
2. finds the current confirmed version of the task;
3. takes the operation's `after` snapshot;
4. stamps a new confirmation time and actor;
5. sets version to the current confirmed version plus one (or 1 for a new task);
6. inserts, replaces, or removes the task;
7. saves the confirmed database.

The success callback then removes the operation from `runtimeActive` and persisted pending state, replays any remaining pending operations over the returned confirmed tasks, updates the query cache, and logs a `success` event.

### Failure and rollback

On failure, the callback:

1. removes the runtime-active marker;
2. removes the pending operation;
3. removes its history entry if the failed operation originally recorded history;
4. reloads the unchanged confirmed database;
5. replays all other pending operations;
6. updates the query cache;
7. logs a `failed` event;
8. shows an error toast naming the action.

This rollback strategy is safer than restoring one captured array snapshot: an older failed operation cannot erase newer confirmed changes or unrelated optimistic operations.

```mermaid
flowchart LR
  Action["User action"] --> Op["Persist operation with outcome + dueAt"]
  Op --> Project["Confirmed tasks + all pending ops"]
  Project --> Visible["Immediate optimistic UI"]
  Op --> Wait["Wait until dueAt"]
  Wait -->|success| Commit["Commit to mock DB; increment version"]
  Wait -->|failure| Drop["Drop failed op and history entry"]
  Commit --> Reconcile["Reconcile remaining pending ops"]
  Drop --> Reconcile
  Reconcile --> Visible
```

### Reload recovery

After Zustand hydration, every persisted pending operation absent from `runtimeActive` gets a `resumed` event and is passed back to `execute()` as `existing`. Existing operations are not added to history or pending state a second time. `sleepUntil` waits only for the remaining duration; if the deadline passed during reload, it resolves immediately.

## 10. Task creation and editing

### Reusable `TaskForm`

The create dialog and details sheet share `TaskForm`. It is a controlled form: the parent owns the `TaskDraft`, while the form owns only validation errors.

On submit it requires trimmed title, description, and assignee. Errors are shown next to fields using `role="alert"`, and invalid text inputs get `aria-invalid`. Priority defaults to medium, status to todo, and tags are parsed from comma-separated input by trimming and dropping empty items.

The form uses `useId()` to create stable, instance-specific label/control IDs. Select controls use the typed constant lists. `showStatus` exists for reuse, although both current callers use the default and show status.

### Creating a task

`CreateTaskDialog` keeps its draft in local component state. On valid submission it:

1. assigns `crypto.randomUUID()`;
2. assigns current ISO creation/update timestamps;
3. assigns the selected acting user;
4. starts at version 0 so the first successful commit becomes version 1;
5. calculates a position before the current first task in the chosen status;
6. queues a `create` operation;
7. resets its local draft and closes immediately.

The position calculation is `min(1000, existing positions...) - 1000`. An empty column therefore receives position 0. A populated column receives a value at least 1,000 less than its lowest relevant position, which makes the optimistic card visible at the top even in a virtualized list.

### Opening and maintaining an edit draft

Clicking the textual portion of a card sets `selectedTaskId`. `TaskDetailsSheet` finds that ID in the current query tasks, derives the six-field draft, and stores it in Zustand with the complete task as `draftBaseTask`. The base snapshot supports later three-way reconciliation rather than tracking only a version number.

Every form edit calls `updateDraft`, merges the changed fields, and sets `draftDirty: true`. The draft is persisted, so an in-progress edit can survive a reload.

The initialization effect keys to the selected task ID, while the remote-update coordinator explicitly refreshes a clean open draft. Dirty local drafts remain protected and create a conflict against their stored base snapshot.

Saving without a conflict creates a complete `after` task by merging the draft over the current visible task and queues an `update`. The stored draft is then marked clean with an anticipated version of `before.version + 1` while confirmation continues asynchronously.

Closing the sheet clears selection, draft, and conflict.

## 11. Drag-and-drop, ordering, and the status fallback

`BoardExperience` configures dnd-kit with:

- a pointer sensor that requires 6 pixels of movement, reducing accidental drags;
- a keyboard sensor using `sortableKeyboardCoordinates`;
- `closestCenter` collision detection;
- an overlay card during drag;
- spoken announcements for pickup, movement, drop, and cancel.

Each task card uses `useSortable`. The drag-handle button receives dnd-kit's attributes and listeners, is marked `touch-none`, and has a task-specific accessible label. The whole original card becomes partially transparent during dragging.

Each column uses `useDroppable` with ID `column-<status>`, allowing a drop on empty column space as well as on a card.

### Position calculation

When moving or reordering a task, `moveTask`:

1. takes all tasks in the target status except the moving task;
2. sorts them by numeric position;
3. locates the card currently under the dragged card, or chooses the end for a column drop;
4. computes a midpoint between neighbors;
5. uses `before + 1000`, `after - 1000`, or 0 at an open boundary;
6. queues a normal update with a move or reorder label.

Fractional midpoints avoid renumbering the whole column. There is no compaction routine; JavaScript numbers provide enough practical midpoint precision for this demonstration, but indefinite repeated insertion between the same two positions would eventually merit normalization.

Ordering uses the full unfiltered task list. Therefore reordering while filters are active positions a task relative to hidden tasks as well as visible ones. This preserves a single canonical order but may make a filtered drop appear somewhere different after clearing filters.

The status select at the bottom of every card calls the same `moveTask` path, providing accessible status movement without drag gestures.

## 12. Column virtualization and rendering performance

Every `TaskColumn` owns a scroll container and a separate TanStack Virtual virtualizer.

Configuration:

- `count`: tasks in that status;
- estimated row height: 190 pixels;
- overscan: 8 rows above and below the viewport;
- stable key: task ID;
- initial rect: 400 by 600 pixels for a stable initial estimate;
- measured row height through `measureElement`;
- `useFlushSync: false` to avoid forced synchronous React flushes.

The inner container receives the virtualizer's total height. Only virtual items are rendered as absolutely positioned wrappers translated to `row.start`. Each real row is measured because content and responsive wrapping can change its height.

Column height is tied to the viewport (`100vh - 17.5rem`) with a 420-pixel minimum. On smaller screens columns are 88 viewport-width units in a horizontal snap scroller. At the large breakpoint they become a three-column grid.

Other render controls include:

- `TaskCard` wrapped in `React.memo`;
- memoized compiled query predicate;
- memoized filtered array;
- memoized grouped and sorted status arrays;
- memoized set of pending task IDs;
- stable callback functions from the operations provider;
- Zustand selector subscriptions in most feature components, limiting updates to selected slices.

`DeveloperTools` intentionally calls `useBoardStore()` without a selector because it displays many fields. It therefore re-renders for every store change, but it is one compact control surface rather than a repeated card.

The React lint plugin reports one known warning: `useVirtualizer()` returns functions that React Compiler cannot safely memoize. React skips compiler memoization for that component; TanStack Virtual still manages its own list updates.

## 13. Quick filters and board projection

`filterTasks()` is a pure function. It combines all enabled filters with logical AND:

- trimmed, case-insensitive search in title or description;
- exact assignee unless the filter is `all`;
- exact priority unless the filter is `all`;
- the compiled advanced predicate.

`BoardExperience` compiles the advanced tree only when it changes, then performs filtering in one memoized pass. A second memo groups results into the three statuses and sorts each group by position.

`BoardFilters` displays the result count and total task count. “Clear” resets search, assignee, priority, and the advanced tree.

Opening Advanced mode clears the three quick filters and disables their controls. Closing it re-enables quick controls but leaves the advanced query active. The count badge and Clear button make that state visible. Thus “advanced open” controls editing mode, while “advanced conditions exist” controls actual advanced filtering.

## 14. Advanced query representation

The query is a recursive tree:

```text
QueryGroup
├── kind: "group"
├── id
├── combinator: "and" | "or"
├── children: QueryNode[]
└── connectors?: ("and" | "or")[]

QueryCondition
├── kind: "condition"
├── id
├── field
├── operator
└── value
```

Supported fields are title, description, status, priority, assignee, and tags. Supported operators are equals, not-equals, contains, and not-contains.

`combinator` is both the group's default and the value used when “Set all connectors” is changed. Optional `connectors` allows each boundary between children to differ. If `connectors` is absent, the group combinator is repeated.

Zod validates legacy decoded query payloads, including a maximum of 50 children per group and 49 connectors. Factories use UUIDs for interactive nodes and stable `root` for the root group.

## 15. Query editing and evaluation

### Immutable tree operations

- `updateQueryNode` recursively visits the tree and replaces the matching node.
- `appendQueryNode` adds a child and maintains the connector array.
- `removeQueryNode` removes a direct child from each visited group and removes the connector adjacent to it. If all remaining connectors equal the group's combinator, it removes the explicit connector array as a normalization.
- Removing the root returns a fresh empty query.
- `countConditions` recursively counts leaf conditions.
- `describeQuery` produces the readable summary shown above the editor.

### Predicate compilation

`compileTaskQuery` recursively creates one predicate function.

For a condition:

1. trim and lower-case the query value;
2. return true for an empty query value, so an unfinished rule does not hide all tasks;
3. normalize the task field to an array of lower-case strings;
4. test exact equality or substring containment against any value;
5. negate for the two negative operators.

For a group, child predicates are compiled once. Empty groups always match.

AND has higher precedence than OR within a group. The implementation splits the child predicate sequence into OR-separated clauses, then requires every predicate within at least one clause. Consequently:

```text
A OR B AND C
```

is evaluated as:

```text
A OR (B AND C)
```

Nested groups provide explicit parentheses.

For array fields such as tags, equals means any individual tag exactly equals the query value, and contains means any individual tag contains it. It does not join the array before matching.

### Query-builder UI

`QueryBuilder` renders itself recursively through `QueryGroupEditor`:

- groups can set all connectors, add a rule, add a nested group, or be removed;
- every connector after the first rule can be changed independently;
- condition fields and operators are selects;
- priority, status, and assignee use constrained value selects;
- text fields and tags use free text;
- changing a field also selects a sensible default value;
- the root can be cleared without removing the editor.

Favorites are named, capped to 60 characters, assigned UUIDs, and capped to the last 20 saved values. Applying a favorite replaces the active advanced query and opens the builder. Deleting a favorite removes it immediately from persisted client state.

Favorites currently store the query object by reference at save time. Because all query editing operations return new immutable objects, later edits do not mutate a saved favorite.

## 16. Shareable URL format and synchronization

The preferred URL format is readable:

```text
?rule1=priority.equals.high&rule2=assignee.equals.You&logic=1-and-2
```

Quick filters use:

```text
?search=authentication&assignee=You&priority=high
```

### Writing a query

`writeQueryParams` first removes all existing `ruleN`, `logic`, and legacy `q` parameters. It walks the query depth-first, writes each condition as `field.operator.value`, and generates a numeric logic expression. Nested groups become parentheses. The outermost parentheses are omitted.

Values may contain periods: parsing assigns the first segment to field, the second to operator, and joins all remaining segments back into the value.

### Reading a query

`readQueryParams`:

1. finds every `ruleN` entry;
2. validates field and operator;
3. creates stable URL-derived condition IDs;
4. uses `logic`, or an AND sequence in rule-number order if logic is absent;
5. tokenizes numbers, `and`, `or`, and parentheses;
6. parses with recursive-descent functions where primary/parentheses bind first, then AND, then OR;
7. rejects malformed or partially consumed expressions;
8. normalizes the result to a root group.

The code also retains `encodeQuery` and `decodeQuery` for backward compatibility with versioned JSON or base64url `q` payloads. New writes always upgrade to readable parameters and delete `q`.

### Hydration-safe two-way synchronization

`useQueryUrlSync` waits for Zustand hydration, then performs an inbound read before allowing outbound synchronization:

- readable rules win over legacy `q`;
- an invalid legacy `q` is removed;
- initial assignee and priority values are accepted only if present in configured constants;
- quick search is accepted as text;
- a microtask flips `ready` only after the URL-derived Zustand updates can settle.

Once ready, changes update the current address with `window.history.replaceState`. This does not navigate or add a history entry for each keystroke.

A `popstate` listener restores filters for browser back/forward navigation. The listener clears advanced filtering if the destination has no valid query.

The hook intentionally uses `window.location` rather than Next.js server `searchParams`: filtering is entirely client-side over already-loaded local tasks, and the route remains statically prerenderable.

## 17. Undo and redo

Normal local operations add a history entry before confirmation. The past stack is capped to its latest 50 entries, and every new local history entry clears the future stack.

Undo:

1. `takeUndo()` removes the newest past entry and appends it to future;
2. the operations provider looks up the task's current visible state;
3. it queues the entry's original `before` snapshot as a forced inverse operation;
4. the inverse is labeled `Undo: <original label>` and does not create another history entry.

Redo mirrors this process: it removes the latest future entry, returns it to past, and queues its original `after` snapshot.

Because undo uses the current task as `before` and the historical snapshot as `after`, the historical fields deliberately win over intervening remote edits. Undoing creation uses `after: null`, which removes the task. Redo then restores the recorded created task.

The header reads the latest labels to disable or describe its buttons. The shortcuts dialog also renders the exact next undo/redo descriptions.

If an original optimistic operation fails, `removeHistory(operation.id)` removes the corresponding entry from `past`. Remote events never enter history.

Implementation nuance: undo/redo moves the stack entry before its own simulated request resolves. An undo or redo request is configured with `recordHistory: false`; if that inverse request fails, the stack movement is not automatically reversed. The visible task data rolls back correctly, but the history cursor may no longer represent that failed attempt. This is an edge case to address if history semantics must be transactional.

## 18. Remote update simulation

Developer Tools is the only source of simulated remote changes. Auto simulation starts disabled.

`triggerRemote(source, forcedTaskId?)`:

1. loads confirmed tasks, not the optimistic query projection;
2. resolves a forced, configured, or random task;
3. chooses a remote actor different from the current acting user;
4. chooses the configured field or a random editable field;
5. creates a new confirmed task with incremented version, current timestamp, and remote actor;
6. applies a deterministic field-specific change;
7. writes the confirmed database immediately;
8. reconciles the new confirmed state with local pending operations;
9. detects an active edit conflict when applicable;
10. logs an event and shows a toast with a View action.

Field mutations are deliberately obvious:

- title appends `· updated` without repeatedly duplicating the suffix;
- description appends an actor-specific note;
- status advances through the three statuses;
- priority advances through the three priorities;
- assignee becomes a random remote person;
- tags add `collaboration` without duplication.

### Automatic scheduling

When enabled after hydration, auto simulation uses the persisted `nextSimulationAt` if it is still in the future. Otherwise it schedules 10,000 to 15,000 milliseconds ahead. After firing, it writes the next randomized deadline. Developer Tools updates a local clock once per second only while auto simulation is enabled so it can display the countdown.

Disabling or changing auto simulation clears the timer through the effect cleanup. The persisted deadline allows the schedule to survive reloads.

### Developer controls

The panel exposes:

- current acting user;
- fixed or random remote user;
- fixed or random changed field;
- fixed or random target task (first 100 tasks are offered to bound menu size);
- manual remote update;
- forced conflict for a dirty selected task;
- deterministic remote viewing/editing presence and release controls;
- automatic 10–15 second updates;
- random, next-success, or next-failure network outcome;
- forced offline/reconnected network state;
- 30/1,000 dataset toggle;
- event-log clear;
- complete local board reset;
- current pending count and latest event summary.

Changing datasets pauses auto simulation, clears selection, updates the query cache, and displays a success toast. It does not call `resetClient`, so filters, history, events, and most developer settings remain unless the separate Reset action is used.

## 19. Conflict detection and resolution

A conflict is created only when a remote update affects the selected task while:

- the edit draft is dirty; and
- a complete draft base task exists.

`changedDraftFields` compares the six editable fields with JSON serialization, which gives value comparison for the tags array rather than reference comparison.

The sheet keeps the local draft, shows a warning, and changes the submit label to “Review and save.” Saving then opens a comparison dialog. Only fields changed remotely are shown as choices; untouched fields implicitly keep the local draft value.

Resolution paths:

- **Take theirs:** replace the draft with the complete incoming task's editable fields, update the base snapshot, mark clean, clear the conflict, and close the dialog. No mutation is needed because the remote version is already confirmed.
- **Keep mine:** merge the complete local draft over the incoming confirmed task and queue one `resolve` mutation.
- **Merge manually:** use “theirs” for fields explicitly selected that way and local values for all others. Description conflicts start with the deterministic block reconciliation result in an editable textarea, then queue one `resolve` mutation.

Keep-mine and reviewed resolution use the incoming remote task as `before`, so the new optimistic operation builds on the newest known confirmed version. The resolution is one undoable history action.

### Presence, locks, and CRDT-like description reconciliation

Opening the task sheet publishes local viewing presence, and the first draft change promotes it to editing. Cards show accessible avatar groups for each present user. A remote `editing` entry locks the drag handle, status selector, and edit form until that presence is released. Developer Tools provides deterministic viewing/editing/release controls; simulated remote updates also publish viewing presence.

Description merging is a compact sequence CRDT-like strategy over sentence blocks. Blocks observed in the base but deleted by either side use observed-remove semantics. Concurrent additions carry actor identity and source position, then sort deterministically and deduplicate. Swapping arrival order while preserving actor identity therefore produces the same result. Because task descriptions are free-form text rather than a production replicated document, the user can edit the proposed merged result before commit.

### Reconciliation limits

Pending operations carry complete task snapshots. A local optimistic snapshot replayed after a remote confirmation may visually cover the remote change until the local operation resolves. A successful local commit also writes its complete snapshot, so fields outside the user's intended edit can overwrite remote changes unless the conflict workflow caught and resolved them.

When a selected draft is clean, a remote update refreshes the form and its base snapshot immediately. When it is dirty, the original base remains fixed until the user resolves or discards the conflict.

### Offline and reconnect behavior

`NetworkStatus` combines browser `online`/`offline` events with the deterministic Developer Tools override. Offline operations still enter the optimistic and persisted pending arrays, but they do not begin their simulated request. On reconnect, confirmed tasks are reloaded, every pending patch is replayed, offline deadlines are reset to the normal two-second latency, and inactive operations start exactly once. An operation that loses connectivity while already waiting pauses until reconnection and then observes the same latency before committing. The banner and toasts explain queued and resumed work.

## 20. Header, footer, themes, motion, and notifications

The sticky header contains:

- product mark and title;
- tooltip-wrapped undo and redo buttons;
- shortcuts button with `?` hint;
- theme dropdown for light, dark, or system;
- create button with `N` hint.

The footer contains the owner name and mail, GitHub, and LinkedIn links. External profile links open in a new tab with `rel="noreferrer"`; brand icons are marked decorative where the text already supplies the accessible name.

Theme colors are defined as OKLCH CSS variables in `app/globals.css`, with separate `:root` and `.dark` values. Tailwind's inline theme maps semantic utility names such as `bg-background`, `text-muted-foreground`, and `border-border` onto those variables. The stylesheet also defines radii, font mappings, selection color, a 320-pixel minimum body width, and pointer cursors for enabled button-like controls.

Motion is used only for the drag overlay's scale/opacity entrance. `MotionConfig reducedMotion="user"` delegates to the user's operating-system preference.

Sonner reports successful dataset changes, mutation rollback, and remote activity. The remote toast includes a View action that selects the affected task.

## 21. Keyboard and accessibility implementation

The global shortcut hook installs one `keydown` listener and removes it on cleanup. It ignores:

- already prevented events;
- key repeats;
- input, textarea, select, contenteditable, textbox, or combobox targets.

Supported shortcuts:

| Shortcut | Action |
| --- | --- |
| `?` | Open shortcut reference |
| `/` | Focus the quick-search input |
| `N` | Open create dialog |
| `D` | Toggle Developer Tools |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |

The shortcut dialog detects Apple platforms after mount and renders `⌘` or `Ctrl` accordingly. Its history rows are dynamic and show the exact next actions.

Additional accessibility measures:

- semantic page landmarks: header, main, footer, and labeled footer navigation;
- real headings for app, columns, cards, dialog/sheet titles, and groups;
- Base UI-backed dialog, menu, select, sheet, switch, and tooltip primitives;
- focus-restoring modal primitives and escape-to-close behavior;
- visible labels and stable IDs in forms;
- inline validation alerts and `aria-invalid`;
- `aria-busy` on pending cards and a labeled saving spinner;
- task-specific labels for drag handles and status selects;
- dnd-kit screen-reader announcements;
- keyboard DnD through Tab, Space/Enter, arrows, and Escape;
- non-drag status selection;
- user reduced-motion preference;
- dark-mode-aware semantic colors.

## 22. UI primitive layer

`components.json` configures shadcn's Base Nova style, React Server Component compatibility, TypeScript, Tailwind CSS variables, neutral base color, Lucide icons, and `@/` aliases.

`lib/utils.ts` exposes `cn()`, which first conditionally composes classes with `clsx`, then resolves conflicting Tailwind utilities with `tailwind-merge`.

The UI directory is a project-owned component layer rather than calls to shadcn at runtime:

| File | Implementation and current role |
| --- | --- |
| `alert.tsx` | CVA-styled semantic alert container, title, description, and action; used for edit conflicts |
| `avatar.tsx` | Base UI avatar image/fallback, badge, and group helpers; used by collaboration presence indicators |
| `badge.tsx` | CVA badge variants with Base UI render composition; used for counts, tags, priority, version, and shortcuts |
| `button.tsx` | Base UI button plus CVA size/variant system; the common action primitive |
| `card.tsx` | Styled structural card sections; task cards use Card and CardContent |
| `command.tsx` | `cmdk` command palette wrappers, optional dialog form, items, groups, and shortcuts; currently unused |
| `dialog.tsx` | Base UI modal root, portal, backdrop, close control, content, header/footer/title/description; used for create, conflict, and shortcuts |
| `dropdown-menu.tsx` | Base UI menu wrappers including nested, checkbox, and radio items; theme menu uses the basic subset |
| `input-group.tsx` | Composite input/textarea addons and buttons; available but unused |
| `input.tsx` | Styled Base UI/native input wrapper; used by forms, search, and favorite name |
| `label.tsx` | Styled native label; used by `TaskForm` |
| `popover.tsx` | Base UI popover wrappers; available but unused |
| `scroll-area.tsx` | Base UI custom scroll area and scrollbar; available but task columns use native overflow for virtualization |
| `select.tsx` | Base UI select root, trigger, popup, items, labels, separators, and scroll buttons; used throughout filters, forms, cards, queries, and Developer Tools |
| `separator.tsx` | Base UI separator; available but unused |
| `sheet.tsx` | Dialog-based edge sheet with side variants and close control; used for task details |
| `skeleton.tsx` | Animated placeholder block; used by `LoadingBoard` |
| `sonner.tsx` | Theme-aware Sonner toaster with Lucide status icons; mounted globally |
| `switch.tsx` | Base UI switch; used for automatic simulation and the forced-offline control |
| `textarea.tsx` | Styled native textarea; used for task description |
| `tooltip.tsx` | Base UI provider, root, trigger, and portal content with arrow; used in the header |

Unused primitives are harmless scaffold capacity; they still contribute code only if imported into the client module graph.

## 23. Loading and error states

The query uses synchronous `initialData`, so normal startup usually has tasks immediately. `LoadingBoard` remains as a defensive query-loading state and shows three columns with heading and card skeletons.

Expected simulated request errors never escape to the route error boundary. They are modeled as mutation outcomes, reconciled, logged, and shown via toast.

Unexpected render errors use `app/error.tsx`. Confirmed data remains in the database key, and the Next.js `unstable_retry` action attempts to render the route segment again.

Repository corruption is handled silently by validation failure and reseeding. There is no UI to recover invalid stored data selectively.

## 24. Automated tests

### Unit tests

Vitest runs in jsdom, loads `@testing-library/jest-dom`, resolves TypeScript aliases, and includes `features/**/*.test.{ts,tsx}`.

`features/tasks/task-logic.test.ts` verifies:

- 1,000 deterministic, schema-valid, uniquely identified seed tasks;
- combined search, assignee, and priority filters;
- replay of multiple optimistic operations over confirmed data;
- inverse removal of an optimistic creation.

`features/query-builder/query-engine.test.ts` verifies:

- nested AND/OR evaluation over 1,000 tasks;
- versioned base64url and JSON legacy round trips;
- immutable append, edit, and remove operations;
- readable query parameter generation and parse equivalence;
- mixed per-rule connectors with AND precedence.

`features/collaboration/description-crdt.test.ts` verifies:

- the unchanged side yields to the changed side;
- concurrent additions converge even when branch arrival order is reversed;
- base blocks deleted by either participant stay removed;
- identical concurrent additions are deduplicated.

Current unit result: 3 files, 13 tests, all passing.

### End-to-end tests

Playwright runs Chromium against a reused or automatically started `npm run dev` server at port 3000. Traces are retained on failure.

`tests/e2e/board.spec.ts` verifies:

1. shortcut help opens from the button and `?`;
2. reload produces no hydration mismatch console errors;
3. task creation appears optimistically and exposes the pending counter before confirmation;
4. a pointer drag crosses columns without the overlay animating back to its old column;
5. Developer Tools can trigger remote activity;
6. simulated remote editing presence appears, locks task controls, and can be released;
7. a description conflict can be resolved with the deterministic CRDT-like manual merge;
8. optimistic work queues while offline and commits after reconnection;
9. an advanced mixed-connector query updates readable URL parameters, filters results, saves a favorite, and survives reload;
10. normal search synchronizes to the URL and survives reload.

`tests/e2e/interview-guide.spec.ts` verifies:

1. the study route reloads without browser runtime errors;
2. lesson completion persists across reload;
3. the virtualization lab updates mounted geometry when overscan changes;
4. the system-flow lab advances and switches scenarios;
5. interview answers can be revealed and confidence-rated;
6. mobile study navigation opens and selects a lesson.

Current browser result: 16 tests, all passing when the two suites are run serially. The full eight-worker run can exceed the development server's 30-second test timeout on this machine; the same original and new journeys pass with `--workers=1`.

### Gaps in automated coverage

The current suite does not directly exercise:

- keyboard drag ordering and same-column pointer reordering;
- forced failure rollback;
- pending-operation resume across reload;
- undo/redo success and failure;
- conflict take-mine, take-theirs, and non-description field selection paths;
- automatic simulation timing;
- 1,000-task mounted-node bounds;
- theme behavior;
- the route error fallback.

The pure reconciliation and query logic have strong focused tests, while several multi-step interaction edges remain candidates for browser tests.

## 25. Build, lint, and TypeScript configuration

### Package scripts

```text
npm run dev       Next.js development server
npm run build     Optimized Next.js production build and TypeScript validation
npm run start     Start the production Next.js server
npm run lint      ESLint
npm test          Vitest once
npm run test:watch
npm run test:e2e  Playwright Chromium suite
```

The package requires Node 22.x. TypeScript is strict, emits no files, uses bundler module resolution, React JSX, incremental checking, DOM/ESNext libraries, and the `@/* -> ./*` path alias.

ESLint composes Next.js core-web-vitals and TypeScript rules. Generated Next/build outputs are globally ignored.

Verified current results:

- unit tests: pass, 13/13;
- end-to-end tests: pass, 16/16 across the original board and interview-guide suites when run serially;
- lint: exits successfully with one known TanStack Virtual/React Compiler warning;
- production build: pass;
- route `/`: statically prerendered.

## 26. Deployment implementation

`next.config.ts` uses `output: "standalone"`. Next.js therefore emits a traced minimal Node server and only required runtime dependencies under `.next/standalone`.

### Dockerfile

The multi-stage image uses Node 22 Alpine:

1. `base` disables telemetry and sets `/app`.
2. `dependencies` installs `libc6-compat`, copies lock files, and runs `npm ci`.
3. `builder` copies dependencies and source, then runs the production build.
4. `runner` creates an unprivileged `nextjs` user and group.
5. Only `public`, `.next/standalone`, and `.next/static` are copied into the runtime image.
6. Environment config binds to `0.0.0.0:3000` in production.
7. The container runs as the non-root user.
8. A `wget` health check probes `/` every 30 seconds after a 20-second startup grace period.
9. `node server.js` starts the traced standalone server.

`.dockerignore` removes Git metadata, dependencies, builds, secrets, test artifacts, output, and local OS files from the build context.

### Nixpacks fallback

`nixpacks.toml` explicitly selects Node 22, runs `npm ci`, builds with `npm run build`, and starts with `npm run start`. It exists because Dokploy may default to Nixpacks if Dockerfile mode is not selected.

No persistent server volume is required or useful: all application state is per-browser `localStorage`. Deploying a new container does not move one browser's data to another browser and cannot provide shared multi-user collaboration.

## 27. Dependency responsibilities

| Dependency | Purpose |
| --- | --- |
| Next.js 16.2.11 | App Router, server/client component composition, fonts, metadata, error boundary, build/runtime |
| React/React DOM 19.2.4 | Component and hook runtime |
| TanStack Query + persist packages | Task query cache, mutations, cache persistence |
| Zustand | Durable global client/workflow state |
| Zod | Task and query runtime validation |
| dnd-kit | Pointer/keyboard drag-and-drop and sortable behavior |
| TanStack Virtual | Per-column row virtualization |
| Base UI | Accessible headless primitives behind the shadcn layer |
| shadcn + CVA + clsx + tailwind-merge | UI scaffolding, variants, and class composition |
| Tailwind CSS 4 + animation packages | Styling and theme utilities |
| next-themes | system/light/dark class management |
| Motion | reduced-motion-aware drag overlay animation |
| Sonner | toast notifications |
| Lucide React + React Icons | general and brand icons |
| date-fns | Installed but not imported; dates currently use native `Intl.DateTimeFormat` |
| cmdk | Used by the available but currently unmounted command primitive |
| Vitest + Testing Library + jsdom | unit-test environment |
| Playwright | Chromium end-to-end tests |

## 28. File-by-file responsibility map

### Route and styling

| File | Responsibility |
| --- | --- |
| `app/layout.tsx` | Root document, metadata, Geist fonts, global provider insertion |
| `app/page.tsx` | `/` route that renders the board client boundary |
| `app/providers.tsx` | Theme, query persistence, tooltip, motion, and toast providers |
| `app/error.tsx` | Route-level unexpected render error UI and retry |
| `app/globals.css` | Tailwind imports, semantic theme tokens, dark theme, base styles |
| `app/favicon.ico` | Browser/site icon through App Router metadata convention |

### Board feature

| File | Responsibility |
| --- | --- |
| `features/board/board-app.tsx` | Feature composition, memoized projection, DnD context, move ordering, header/footer/loading UI |
| `features/board/board-filters.tsx` | Quick filters, advanced-mode toggle, counts, clear action |
| `features/board/create-task-dialog.tsx` | New-task local draft, metadata/position creation, optimistic create |
| `features/board/task-card.tsx` | Memoized sortable card, task summary, pending state, status fallback |
| `features/board/task-column.tsx` | Droppable status container and virtual row layout |
| `features/board/task-details-sheet.tsx` | Persisted edit draft, task metadata, conflict comparison and resolution |
| `features/board/task-form.tsx` | Shared controlled task form and required-field validation |

### Task/domain feature

| File | Responsibility |
| --- | --- |
| `features/tasks/types.ts` | Zod schemas, derived domain types, operation/history/conflict/event types, constants |
| `features/tasks/seed.ts` | Deterministic 30/1,000-task data generator |
| `features/tasks/repository.ts` | Confirmed browser database, validation/recovery, operation commit/replay, deadline wait |
| `features/tasks/selectors.ts` | Pure quick/advanced task filtering |
| `features/tasks/format.ts` | UTC date formatting through `Intl.DateTimeFormat` |
| `features/tasks/task-operations.tsx` | Query/provider API, optimistic lifecycle, rollback, resume, history commands, remote simulation, reset |

### Query feature

| File | Responsibility |
| --- | --- |
| `features/query-builder/types.ts` | Query tree types, schemas, favorite type, node factories |
| `features/query-builder/query-engine.ts` | Immutable editing, compilation, precedence, descriptions, legacy/readable URL codecs |
| `features/query-builder/query-builder.tsx` | Recursive query editor and favorites UI |
| `features/query-builder/use-query-url-sync.ts` | Hydration-ordered inbound/outbound URL synchronization and popstate handling |

### Interview guide feature

| File | Responsibility |
| --- | --- |
| `app/interview-guide/page.tsx` | Static route metadata and Server Component entry for the study experience |
| `features/interview-guide/content.ts` | Ten lesson modules, 35 interview questions, five system flows, code samples, and accent metadata |
| `features/interview-guide/interview-guide.tsx` | Responsive learning UI, persistent progress, code explorer, interactive labs, flow stepper, and confidence drill |

### Supporting features and state

| File | Responsibility |
| --- | --- |
| `stores/board-store.ts` | Zustand state/actions and selective durable persistence |
| `features/developer-tools/developer-tools.tsx` | Simulation, failure, dataset, countdown, log, and reset controls |
| `features/keyboard-shortcuts/use-keyboard-shortcuts.ts` | Global shortcut event handling and editable-target guard |
| `features/keyboard-shortcuts/shortcuts-dialog.tsx` | Platform-aware shortcut reference and live history labels |
| `features/collaboration/network-status.tsx` | Browser/forced network state, offline banner, and reconnect feedback |
| `features/collaboration/presence-indicators.tsx` | Accessible viewing/editing avatar summaries rendered on cards |
| `features/collaboration/description-crdt.ts` | Deterministic sentence-block reconciliation for description conflicts |
| `lib/utils.ts` | Tailwind-aware class-name composition |

### Tests and configuration

| File | Responsibility |
| --- | --- |
| `features/tasks/task-logic.test.ts` | Domain, seed, filter, and reconciliation unit tests |
| `features/query-builder/query-engine.test.ts` | Query evaluation, editing, precedence, and URL unit tests |
| `features/collaboration/description-crdt.test.ts` | Convergence, deletion, unchanged-branch, and deduplication tests |
| `tests/e2e/board.spec.ts` | Core user-flow browser tests |
| `tests/e2e/interview-guide.spec.ts` | Study route runtime, progress, labs, drill, and mobile navigation tests |
| `vitest.config.mts` | jsdom unit runner, React/alias plugins, coverage reporters |
| `vitest.setup.ts` | jest-dom matcher registration |
| `playwright.config.ts` | Chromium project, local dev server, base URL, failure traces |
| `eslint.config.mjs` | Next core-web-vitals and TypeScript lint configuration |
| `tsconfig.json` | Strict TypeScript and `@/` alias configuration |
| `postcss.config.mjs` | Tailwind CSS 4 PostCSS plugin |
| `next.config.ts` | Standalone production output |
| `components.json` | shadcn style, aliases, CSS, and icon configuration |
| `package.json` / `package-lock.json` | Node constraint, scripts, exact dependency graph |

### Deployment and project documentation

| File | Responsibility |
| --- | --- |
| `Dockerfile` | Reproducible non-root standalone production image |
| `.dockerignore` | Minimal, secret-safe Docker build context |
| `nixpacks.toml` | Node 22 Dokploy/Nixpacks fallback |
| `README.md` | Operator-facing overview, run/deploy instructions, feature notes, scope decisions |
| `Optional-React-Assignment.md` | Original assignment and acceptance requirements |
| `AGENTS.md` | Repository-specific contributor instruction to consult bundled Next.js docs |
| `CLAUDE.md` | Minimal repository marker with no application behavior |
| `public/*.svg` | Default static starter assets; not referenced by the current board UI |

Generated/local files such as `.next/**`, `next-env.d.ts`, and `tsconfig.tsbuildinfo` support framework execution and type checking; they do not contain authored application behavior.

## 29. Important design strengths

1. **Confirmed state is separated from optimistic projection.** Rollback always rebuilds from confirmed data plus remaining operations instead of restoring stale snapshots.
2. **Pending operations are durable.** Outcome and deadline persistence prevents reload from silently converting, duplicating, or extending an operation.
3. **The URL is a first-class filter state.** Readable rules, legacy compatibility, validation, and hydration ordering make links shareable without dynamic server rendering.
4. **Performance work is structural.** Virtualization, stable IDs, memoized projections, and bounded menus/logs address the 1,000-task path directly.
5. **Accessibility has alternative paths.** Keyboard DnD, status selects, shortcut guards, live labels, semantic primitives, announcements, and reduced motion are implemented rather than merely documented.
6. **Developer controls make race paths reproducible.** Forced success/failure, targeted remote fields/tasks, presence/locks, offline mode, conflict trigger, and deterministic datasets make behavior inspectable.
7. **Runtime schemas protect persisted data.** Corrupt database and legacy query payloads fail closed into known states.

## 30. Known boundaries and future-hardening opportunities

These are not hidden failures; they define the line between the current simulation and a production collaborative system.

- There is no backend, authentication, authorization, server database, cross-device sync, or websocket; presence is simulated within one browser.
- Full task snapshots can overwrite unrelated remote fields; production collaboration should use server-side version checks and field-level patches or a CRDT/OT model where appropriate.
- Failed undo/redo requests do not restore the history cursor movement.
- Runtime storage writes do not handle quota or browser-denied storage errors.
- Database corruption recovery replaces all tasks instead of migrating or offering export/recovery.
- Position values are never normalized after repeated midpoint insertion.
- The first 100 tasks only are selectable as explicit Developer Tools targets in the stress dataset.
- History entries store complete task snapshots; 50 entries are bounded but still larger than patch-only history.
- Query readable-rule parsing is deliberately permissive and separate from the stricter legacy Zod payload validation.
- No delete UI exists, although the operation/repository layer supports removal for undoing creation.
- No service worker means a cold load without cached application assets still requires a network, although already-loaded task changes queue and reconnect correctly.

## 31. Practical tracing recipes

To follow a task creation in code:

```text
AppHeader or N shortcut
→ board-store.setCreateOpen(true)
→ CreateTaskDialog
→ TaskForm validation
→ CreateTaskDialog.create()
→ TaskOperationsProvider.execute()
→ pending/history/event in Zustand
→ reconcilePending() into TanStack Query
→ immediate TaskCard with aria-busy
→ mutation wait
→ commitOperation() or rollback
→ final query reconciliation and toast/event
```

To follow an advanced filter:

```text
QueryBuilder control
→ immutable query-engine update
→ board-store.advancedQuery
→ useQueryUrlSync writes ruleN + logic
→ BoardExperience recompiles predicate
→ filterTasks combines quick + advanced tests
→ memoized grouping/sorting
→ TaskColumn virtualizers receive new arrays
```

To follow a simulated conflict:

```text
Dirty TaskDetailsSheet draft
→ DeveloperTools triggerRemote("conflict")
→ confirmed DB remote update + version increment
→ query reconciliation
→ EditConflict stored with changed fields
→ sheet warning
→ save opens comparison dialog
→ take theirs OR resolve with mine/reviewed fields
→ optional optimistic resolve operation and history entry
```

## 32. Verification snapshot

The implementation described here was checked against:

- the complete application-specific source tree;
- all reusable UI primitive entry points;
- the repository's Next.js 16.2 bundled guides for App Router structure, server/client boundaries, and error handling;
- the live local page and its accessibility tree;
- `npm test`;
- `npx playwright test board.spec.ts --workers=1`;
- `npx playwright test interview-guide.spec.ts --workers=1`;
- `npm run lint`;
- `npm run build`.

At the time of verification, all 13 unit tests, all 16 serial browser tests, and the production build passed. Lint completed with the single documented `useVirtualizer()` React Compiler compatibility warning and no errors.

---

# Part II: Concepts, syntax, and patterns

The first part is the implementation reference. This part turns the same code into interview knowledge. For each pattern, be ready to explain four things:

1. what problem it solves;
2. where this repository uses it;
3. why it was chosen over a simpler alternative;
4. where the current implementation stops being production-grade.

## 33. How to present the application in an interview

### The 30-second answer

> This is a Next.js 16 task board that remains responsive with 1,000 tasks. It uses TanStack Query for the task collection and optimistic mutation lifecycle, Zustand for durable UI and workflow state, TanStack Virtual to render only visible cards, and dnd-kit for accessible pointer and keyboard movement. The backend is intentionally simulated in `localStorage`, including latency, failure, offline queuing, remote edits, presence, and conflict resolution.

### The 90-second answer

> The main architectural decision is to separate confirmed data from projected data. Confirmed tasks live in a validated `localStorage` repository. Every local action becomes a persisted operation containing complete before and after snapshots, a predetermined outcome, and a deadline. The UI immediately shows confirmed tasks with every pending operation replayed over them. Success commits to the confirmed store and failure removes only the failed operation, then rebuilds the projection. This avoids restoring a stale whole-array snapshot.
>
> TanStack Query owns the task collection because it models server state and mutation lifecycles. Zustand owns filters, dialogs, edit drafts, history, pending operations, simulation settings, presence, and conflicts. The board derives filtered and grouped columns with memoized selectors. Each column has its own TanStack Virtual virtualizer, while dnd-kit supplies droppable columns and sortable cards. The advanced query builder is a recursive AST that is immutably edited, compiled into a predicate, and serialized to readable URL rules. Collaboration is a deterministic single-browser simulation, not a real distributed system.

### The architecture answer

Use this order when drawing the application:

```text
Next.js route and provider shell
        ↓
Board UI and feature components
        ↓
TaskOperations context façade
        ↓
TanStack Query cache + Zustand workflow store
        ↓
validated localStorage repository
```

Do not begin by listing libraries. Begin with responsibilities and data flow, then name the library that implements each responsibility.

## 34. JavaScript and TypeScript syntax used in the project

### ES module imports and type-only imports

```ts
import { useMemo, type ReactNode } from "react"
import type { Task } from "@/features/tasks/types"
```

- A normal import may produce a runtime JavaScript dependency.
- `import type` is erased by TypeScript and exists only for checking.
- `@/` is a `tsconfig.json` path alias for the repository root.
- Named imports use braces; default imports do not.

Interview point: type-only imports make runtime intent explicit and avoid accidentally preserving type dependencies in emitted module code.

### Object destructuring and default values

```ts
function TaskForm({
  value,
  onChange,
  submitLabel = "Save task",
  disabled = false,
}: TaskFormProps) {
  // ...
}
```

Destructuring extracts named properties. Defaults apply only when a property is `undefined`, not when it is `null`, `false`, or an empty string.

### Spread syntax and immutable updates

```ts
const nextTask = { ...before, ...draft }
const nextTags = [...new Set([...original.tags, "collaboration"])]
```

- Object spread copies enumerable fields from left to right; later fields win.
- Array spread creates a new array.
- The nested spreads add a tag and `Set` removes duplicates.
- These are shallow copies. Nested objects still share references unless copied separately.

React and Zustand updates use new references because reference changes are how selectors, memoization, and rendering detect updated state.

### Optional chaining and nullish coalescing

```ts
const taskId = after?.id ?? before!.id
const tasks = query.data ?? []
```

- `after?.id` stops and yields `undefined` when `after` is `null` or `undefined`.
- `a ?? b` chooses `b` only when `a` is `null` or `undefined`.
- This differs from `a || b`, which also replaces `0`, `false`, and `""`.
- `before!` is a non-null assertion. It tells TypeScript the value exists but adds no runtime check. It is safe here only because the operation contract requires either `before` or `after`.

### Literal unions

```ts
type FailureMode = "random" | "success" | "failure"
type OperationKind = "create" | "update" | "undo" | "redo" | "resolve"
```

A union restricts values to a known set. Compared with a TypeScript `enum`, string unions:

- emit no runtime enum object;
- serialize naturally to JSON;
- narrow well in conditionals;
- align directly with Zod string enums.

### Utility types

```ts
type TaskDraft = Pick<
  Task,
  "title" | "description" | "status" | "priority" | "assignee" | "tags"
>

type TaskPatch = Partial<Omit<Task, "id" | "createdAt">>
```

- `Pick<T, K>` keeps selected fields.
- `Omit<T, K>` removes selected fields.
- `Partial<T>` makes every property optional.
- `keyof TaskDraft` produces the union of draft field names.
- `Array<keyof TaskDraft>` is an array containing only those names.

Interview point: derive related types from the source model instead of duplicating them. If `Task` changes, TypeScript reveals dependent code that must be reconsidered.

### Records, maps, and sets

```ts
const grouped = Object.fromEntries(/* ... */) as Record<TaskStatus, Task[]>
const pendingIds = new Set(pending.map((operation) => operation.taskId))
const presenceByTask = new Map<string, PresenceEntry[]>()
```

- `Record<K, V>` models an object with a known key set.
- `Set` provides fast membership checks and uniqueness.
- `Map` is useful when keys are dynamic and values are built incrementally.
- The board uses a `Set` so each card can test pending status without repeatedly scanning all operations.

### Generics

```ts
function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}
```

`T` represents the element type supplied by the caller. If the input is `readonly Priority[]`, the output is inferred as `Priority`. `readonly` promises the function will not mutate the input array.

### `as const` and `satisfies`

```ts
const TASKS_KEY = ["tasks"] as const

const operation = {
  // ...
} satisfies PendingOperation
```

- `as const` preserves narrow literal types and makes the tuple readonly.
- `satisfies` verifies that an expression matches a type without replacing its useful inferred type.
- A blunt `as PendingOperation` assertion would tell the compiler to trust the author; `satisfies` asks the compiler to check the object.

### Discriminated unions

```ts
type QueryNode = QueryCondition | QueryGroup

if (node.kind === "condition") {
  return conditionMatches(task, node)
}
return node.children.map(compile)
```

Both query node types have a `kind` property with different literal values. Checking `kind` narrows the union, so TypeScript knows which fields exist. This pattern is ideal for ASTs, reducers, state machines, and protocol messages.

### Zod inference

```ts
export const taskSchema = z.object({
  id: z.string(),
  status: z.enum(["todo", "in-progress", "done"]),
  // ...
})

export type Task = z.infer<typeof taskSchema>
```

TypeScript checks code during development but disappears at runtime. Zod validates untrusted runtime values, such as parsed `localStorage` JSON and URL payloads. Inferring the TypeScript type from the schema prevents two separate definitions from drifting.

### JSX expressions and list keys

```tsx
{STATUSES.map((status) => (
  <TaskColumn key={status} status={status} tasks={grouped[status]} />
))}
```

- Braces enter JavaScript expression mode inside JSX.
- `map` converts data into elements.
- `key` gives React stable sibling identity. It is not passed as a normal prop.
- Stable task IDs are better keys than indexes because filtering, sorting, and movement change indexes.

### Controlled components

```tsx
<Input
  value={value.title}
  onChange={(event) => onChange({ title: event.target.value })}
/>
```

The React state is the source of truth. The input renders the current value and emits changes upward. This enables validation, persisted drafts, conflict comparison, reset, and reuse of the same form for create and edit.

### Closures and stale values

Event handlers close over values from the render that created them:

```ts
const moveTask = useCallback(() => {
  // reads tasks from this render
}, [tasks])
```

Dependencies make React recreate the callback when captured inputs change. In long-running mutation callbacks, the code instead calls `useBoardStore.getState()` so it reads the latest imperative state rather than a potentially stale render snapshot.

## 35. React and Next.js rendering concepts

### Server Components and Client Components

Files in `app/` are Server Components by default. `app/layout.tsx` and `app/page.tsx` can therefore render without sending their component logic to the browser. A file beginning with:

```ts
"use client"
```

declares a client module boundary. Client Components can use state, effects, event handlers, context, and browser APIs. Their props crossing from a Server Component must be serializable.

In this project:

- `layout.tsx` and `page.tsx` are server-side shell components;
- `providers.tsx` is the first client boundary;
- the interactive board and its imported feature graph execute on the client.

The boundary is intentionally near the route root because nearly the whole application is browser-interactive and backed by `localStorage`.

### Prerendering and hydration

On the initial request:

1. Next.js renders HTML for the route.
2. The browser displays that HTML.
3. React loads the client bundle.
4. Hydration attaches event handlers and reconciles the server and client trees.

The query uses deterministic `initialData`, so both sides initially render the same 30 tasks. After hydration, the query refetches from browser storage. Reading random or browser-only data during the first render would risk a hydration mismatch.

`suppressHydrationWarning` is used narrowly for theme-controlled root elements because `next-themes` may change the class before React hydrates. It does not repair general hydration bugs.

### Provider composition

React context makes cross-cutting services available below a provider:

```tsx
<ThemeProvider>
  <PersistQueryClientProvider client={queryClient}>
    <TooltipProvider>
      {children}
    </TooltipProvider>
  </PersistQueryClientProvider>
</ThemeProvider>
```

Provider order matters when an inner provider or child consumes an outer context. The `Providers` component constructs the query client and persister in lazy `useState` initializers:

```ts
const [queryClient] = useState(() => new QueryClient(/* ... */))
```

The initializer runs for the component instance instead of constructing a new client on every render.

### Context as a feature façade

`TaskOperationsContext` exposes a small application-level API:

```ts
interface TaskOperationsValue {
  tasks: Task[]
  execute: /* ... */
  undo: () => void
  redo: () => void
  triggerRemote: /* ... */
  resetDataset: /* ... */
}
```

UI components do not need to know repository keys, mutation callbacks, or query-cache mechanics. This is a façade pattern implemented with React Context.

The custom hook guards correct usage:

```ts
export function useTaskOperations() {
  const context = useContext(TaskOperationsContext)
  if (!context) {
    throw new Error("useTaskOperations must be used inside TaskOperationsProvider")
  }
  return context
}
```

Failing immediately is better than producing a later undefined-property error.

### Hook responsibilities

| Hook | Role in this application |
| --- | --- |
| `useState` | Component-local drafts, dialog choices, active drag card, stable provider instances |
| `useEffect` | Browser subscriptions, hydration recovery, timers, presence lifecycle, URL synchronization |
| `useMemo` | Expensive or identity-sensitive derived values: predicates, groups, maps, context value |
| `useCallback` | Stable command functions passed to children or used by effects |
| `useRef` | DOM scroll element and previous online state without causing renders |
| `useContext` | Task operation façade |
| `useId` | Stable accessible form-control IDs |

### Effects and cleanup

An effect synchronizes React with an external system:

```ts
useEffect(() => {
  window.addEventListener("online", sync)
  return () => window.removeEventListener("online", sync)
}, [sync])
```

The returned function cleans up the subscription. Timers and presence entries follow the same pattern. Missing cleanup can cause duplicate listeners, memory leaks, and updates after a component is gone.

Effects should not be used for values that can be calculated while rendering. Filtering and grouping are derivations, so the board uses `useMemo`, not an effect plus extra state.

### `memo`, `useMemo`, and `useCallback` are different

- `memo(TaskCard)` can skip re-rendering a component when its props are shallowly equal.
- `useMemo(factory, deps)` caches a computed value.
- `useCallback(fn, deps)` caches a function identity; it is equivalent to `useMemo(() => fn, deps)`.

These are performance tools, not correctness tools. They help here because a stress dataset could otherwise create many unnecessary card renders and unstable props.

### Selector subscriptions in Zustand

```ts
const search = useBoardStore((state) => state.search)
```

This component subscribes to one selected value. By contrast:

```ts
const state = useBoardStore()
```

subscribes to the entire store and re-renders for any store change. `DeveloperTools` accepts that broader behavior because it displays many store fields. Board cards select only the action they need.

## 36. State ownership: local state, Zustand, TanStack Query, and storage

### The ownership rule

Use the narrowest suitable owner:

| State kind | Owner | Example |
| --- | --- | --- |
| Temporary component interaction | React local state | active drag card, conflict dialog choices |
| Shared UI/workflow state | Zustand | filters, selected task, history, presence |
| Server-like async collection | TanStack Query | visible task list and mutation lifecycle |
| Durable confirmed data | repository storage | confirmed tasks |
| Shareable navigation state | URL | quick and advanced filters |

Duplicating the same authority in multiple stores causes synchronization bugs. This application deliberately distinguishes confirmed tasks, pending operations, and the visible projection.

### TanStack Query

The task query:

```ts
const query = useQuery({
  queryKey: ["tasks"],
  queryFn: loadConfirmedTasks,
  initialData: () => makeSeedTasks(),
  refetchOnMount: "always",
})
```

- `queryKey` is the stable cache identity.
- `queryFn` supplies confirmed data.
- `initialData` allows deterministic first rendering.
- `refetchOnMount` replaces the initial or persisted view with validated repository data.

The mutation:

```ts
const mutation = useMutation({
  mutationFn: runOperation,
  onSuccess: reconcileAfterSuccess,
  onError: reconcileAfterFailure,
})
```

Mutation callbacks receive the variables passed to `mutate`. The project performs its optimistic projection before calling `mutate`, rather than using `onMutate`, because the same `execute` command must also persist operations and support offline work that does not start a mutation immediately.

### Why this is called server state without a server

“Server state” means asynchronous external data with fetch, stale, cache, and mutation semantics. The current repository is browser-local, but it intentionally behaves like an API boundary. Replacing it with HTTP would preserve much of the UI architecture, although conflict checks and security must move server-side.

### Zustand middleware

```ts
export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({ /* state and actions */ }),
    {
      name: "task-board:client:v1",
      partialize: (state) => ({ /* durable subset */ }),
    }
  )
)
```

- `create` builds the hook-backed store.
- `set` updates state.
- `get` reads the current store inside an action.
- `persist` serializes selected state.
- `partialize` prevents transient values and functions from being persisted.
- `onRehydrateStorage` marks restoration complete.

Actions centralize invariants. For example, `addHistory` caps history at 50 entries and clears the redo future whenever a new user action branches history.

### The four task states

Interviewers may test whether “task state” has been treated as one vague concept. It has four forms:

1. **Confirmed database:** durable operations that succeeded.
2. **Pending operation log:** durable intentions that have not resolved.
3. **Query projection:** confirmed data with pending operations replayed.
4. **Edit draft:** form-local intent that has not yet become an operation.

Remote edits change confirmed data. Local typing changes only the draft. Saving produces a pending operation and updates the projection. Success moves the change into confirmed data.

### Optimistic update algorithm

```text
confirmed C
pending operations P1, P2, ... Pn
visible = apply(apply(apply(C, P1), P2), ... Pn)
```

When `P2` fails, the app does not restore a captured old screen:

```text
visible = replay(latest confirmed, [P1, P3, ... Pn])
```

This is operation-log replay. It preserves unrelated optimistic work and any confirmed updates that occurred after the failed request started.

### Why the outcome and deadline are persisted

Choosing the outcome at queue time makes behavior deterministic across reload. Persisting `dueAt` prevents a reload from automatically restarting a fresh two-second wait for online work. Offline operations are deliberately marked `waitForConnection` and receive a fresh normal latency after reconnection.

### Undo and redo as commands

History stores `before` and `after` snapshots. Undo does not directly mutate the array. It submits a normal optimistic operation whose target is `before`; redo targets `after`. Therefore undo and redo exercise the same latency, offline, success, failure, persistence, and reconciliation paths as ordinary edits.

Current limitation: the history cursor moves before the inverse request resolves. If that request fails, the task rolls back correctly, but the past/future cursor is not restored.

### Interview drill

**Why not keep everything in Zustand?**
It could work, but it would mix asynchronous entity/cache behavior with UI workflow behavior. TanStack Query already provides query identity, cache updates, mutation callbacks, freshness, and persistence integration. Zustand remains focused on client workflow state.

**Why not rely only on TanStack Query?**
Dialogs, keyboard state, persisted draft metadata, undo stacks, simulation options, and presence are not naturally one server query. Storing them in a query cache would blur semantics and make updates awkward.

**Why are pending operations persisted separately from the query cache?**
A cached projected array cannot explain which changes are confirmed, how to resume requests, or which optimistic change to remove on failure. The operation log preserves causality.

## 37. TanStack Virtual deep dive

### What virtualization solves

Without virtualization, 1,000 tasks could create 1,000 card component trees, selects, event bindings, and layout boxes. Virtualization keeps the full logical list but mounts only rows near the visible scroll window.

It does not reduce the number of task objects in memory and does not fetch pages from a server. It reduces rendered DOM and layout work.

### One virtualizer per column

Each status column scrolls independently, so each column needs its own virtualizer:

```ts
const parentRef = useRef<HTMLDivElement>(null)

const virtualizer = useVirtualizer({
  count: tasks.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 190,
  overscan: 8,
  getItemKey: (index) => tasks[index]?.id ?? index,
  initialRect: { width: 400, height: 600 },
  useFlushSync: false,
})
```

Option meanings:

| Option | Meaning |
| --- | --- |
| `count` | Total logical row count |
| `getScrollElement` | Function returning the element whose scroll offset is observed |
| `estimateSize` | Initial estimated row height before measurement |
| `overscan` | Extra rows rendered before and after the visible range |
| `getItemKey` | Stable identity for measurement caching |
| `initialRect` | Deterministic initial viewport geometry for prerendering |
| `useFlushSync: false` | Avoid forcing React synchronous updates for virtualizer notifications |

The estimate does not need to be exact because real rows are measured. A reasonable estimate reduces scrollbar jumps before measurements settle.

### The spacer-and-translate layout

```tsx
<div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
  {virtualizer.getVirtualItems().map((row) => (
    <div
      key={tasks[row.index].id}
      data-index={row.index}
      ref={virtualizer.measureElement}
      style={{
        position: "absolute",
        transform: `translateY(${row.start}px)`,
      }}
    >
      <TaskCard task={tasks[row.index]} />
    </div>
  ))}
</div>
```

There are two coordinate systems:

1. the spacer has the height of the entire logical list, so the browser scrollbar has the correct range;
2. each mounted row is absolutely positioned and translated to its logical offset.

`measureElement` observes the actual card height. `data-index` lets the virtualizer associate the measured DOM node with its logical row.

### Why stable keys matter more with virtualization

Rows are repeatedly mounted and unmounted as the user scrolls. A task ID lets React and the measurement cache recognize the same logical item after filtering or reordering. An index key could reuse a row's DOM state for a different task.

### Overscan tradeoff

- Too little overscan can reveal blank space during fast scrolling.
- Too much overscan mounts more DOM and weakens the performance benefit.
- Eight rows is a pragmatic buffer for card-sized content.

### Virtualization and drag-and-drop

Only mounted cards can expose DOM rectangles to dnd-kit. The destination column itself is always droppable, so a task can still move to a status even if a specific far-away target row is not mounted. Precise dragging to an unmounted row would require a more advanced integration, auto-scrolling strategy, or keyboard/status control.

The status select is both an accessibility alternative and a robust non-spatial fallback.

### What to say about the React Compiler warning

The installed virtualizer exposes functions that React's compiler lint cannot safely memoize. The code explicitly uses `useFlushSync: false`, and lint reports the known compatibility warning without an error. Do not claim the warning is a runtime failure. In production work, track the library's supported integration and measure behavior before suppressing warnings broadly.

### Interview drill

**Virtualization versus pagination?**
Pagination changes which data is loaded or presented as pages. Virtualization keeps a continuous list and changes only which DOM rows are mounted. They can be combined.

**Why not virtualize the entire board once?**
The columns have independent scroll containers and logical lists. One virtualizer would not correctly model three scroll offsets.

**Why is `initialRect` useful here?**
The app is prerendered before the browser ref exists. Supplying deterministic geometry gives the virtualizer a stable initial range and supports hydration consistency.

## 38. dnd-kit, sorting, and fractional positions

### The three layers

1. `DndContext` owns sensors, collision detection, announcements, and drag lifecycle.
2. Each column calls `useDroppable`.
3. Each task card calls `useSortable`.

```ts
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
)
```

The pointer must move six pixels before a drag activates, which reduces accidental drags when the user intends to click the card. The keyboard sensor supplies an accessible spatial interaction.

### Sortable card syntax

```ts
const sortable = useSortable({
  id: task.id,
  data: { task },
  disabled: Boolean(lockedBy),
})

const style = {
  transform: CSS.Transform.toString(sortable.transform),
  transition: sortable.transition,
}
```

The hook returns:

- `setNodeRef` for the draggable/sortable element;
- `setActivatorNodeRef`, `attributes`, and `listeners` for the handle;
- a transform and transition during movement;
- state such as `isDragging`.

Keeping listeners on the grip handle lets the rest of the card remain clickable and interactive.

### Droppable column syntax

```ts
const droppable = useDroppable({
  id: `column-${status}`,
  data: { status },
})
```

The scroll container receives `droppable.setNodeRef`. `droppable.isOver` drives destination highlighting.

### Drag lifecycle

```text
onDragStart
→ find active task
→ render DragOverlay preview

onDragEnd
→ clear preview
→ identify task under `active.id`
→ resolve target task or target column from `over.id`
→ compute status and position
→ execute optimistic update
```

`DragOverlay dropAnimation={null}` prevents the overlay from animating back toward stale pre-update coordinates while the optimistic card has already moved columns.

### Collision detection

`closestCenter` chooses the droppable whose center is closest to the active rectangle's center. It is a practical board default, but dense lists, nested droppables, or unusual card sizes may need a custom collision strategy.

### Fractional indexing

The code does not renumber every task when one moves. It chooses a position between neighbors:

```ts
const position =
  before && after
    ? (before.position + after.position) / 2
    : before
      ? before.position + 1000
      : after
        ? after.position - 1000
        : 0
```

Examples:

| Destination | New position |
| --- | --- |
| Between 1000 and 2000 | 1500 |
| After 2000 | 3000 |
| Before 1000 | 0 |
| Empty column | 0 |

This makes a move an O(1) position update after locating neighbors, instead of rewriting all following tasks. Repeated insertions into the same gap eventually produce very close floating-point values, so a production system should periodically normalize ranks or use a dedicated sortable-ranking representation.

### Interview drill

**Why keep both drag-and-drop and a status select?**
The select is easier for keyboard, screen-reader, touch, and precision-limited users. It also works when virtualization means a desired row is not mounted.

**How is a remote editing lock enforced?**
The board derives `lockedByTask` from presence. It disables `useSortable`, the grip, status select, and task form, and rechecks the lock inside `moveTask`. UI disabling alone is not a security boundary; a real backend must enforce authorization/version rules.

## 39. Query builder as an AST, compiler, and parser

### Abstract syntax tree

The query is data, not executable code:

```ts
type QueryNode = QueryCondition | QueryGroup

interface QueryCondition {
  kind: "condition"
  id: string
  field: QueryField
  operator: QueryOperator
  value: string
}

interface QueryGroup {
  kind: "group"
  id: string
  combinator: "and" | "or"
  connectors?: Array<"and" | "or">
  children: QueryNode[]
}
```

This is an AST because it represents logical syntax as a tree. Nested groups represent parentheses. Conditions are leaves.

### Recursive immutable updates

```ts
const visit = (node: QueryNode): QueryNode => {
  if (node.id === id) return update(node)
  return node.kind === "group"
    ? { ...node, children: node.children.map(visit) }
    : node
}
```

The traversal:

1. checks the current node;
2. returns a replacement if IDs match;
3. recursively visits children for a group;
4. rebuilds ancestors with new references;
5. leaves nonmatching leaf nodes unchanged.

This is structural sharing: only the path to the changed node is new. It supports predictable React updates and preserves all unaffected subtrees.

### Compilation into predicates

`compileTaskQuery` converts a tree into a function:

```ts
type Predicate = (task: Task) => boolean
```

Each condition compiles to a leaf predicate. Each group compiles its children, splits them into AND clauses at OR connectors, and returns:

```ts
task => clauses.some(
  clause => clause.every(
    predicate => predicate(task)
  )
)
```

This expresses OR-of-ANDs and gives AND higher precedence:

```text
A OR B AND C
= A OR (B AND C)
```

An empty group returns `true`, so an empty advanced query does not filter out every task.

### Readable URL format

Conditions become:

```text
rule1=priority.equals.high
rule2=assignee.equals.You
logic=1-or-2-and-3
```

Nested groups add parentheses. Values may contain dots because the parser takes the first two dot-separated pieces as field and operator, then rejoins the remaining pieces as the value.

### Recursive-descent parser

The URL parser implements a small grammar:

```text
orExpression  := andExpression ("or" andExpression)*
andExpression := primary ("and" primary)*
primary       := RULE_NUMBER | "(" orExpression ")"
```

Because `orExpression` calls `andExpression`, and `andExpression` consumes all adjacent AND terms first, AND has higher precedence. The parser rejects:

- unknown fields or operators;
- missing values;
- references to missing rules;
- unbalanced parentheses;
- leftover tokens after a valid-looking prefix.

### URL and persisted-state precedence

Two effects avoid a race:

1. after Zustand hydration, read and validate the URL into the store;
2. queue a microtask that marks synchronization ready;
3. only then let the outbound effect write store state to the URL.

Without the readiness gate, persisted Zustand state could overwrite a shared URL before URL state is applied.

`history.replaceState` updates the current URL without adding one browser-history entry per keystroke. A `popstate` listener still supports Back and Forward navigation.

### Interview drill

**Why not store a JavaScript expression and use `eval`?**
An AST is structured, serializable, validateable, safely editable, and does not execute arbitrary code. `eval` would be a security and maintainability problem.

**Why compile once with `useMemo`?**
The query tree changes less often than board renders. Compilation creates nested closures, so caching the predicate avoids rebuilding them when unrelated state changes.

**Why keep a legacy base64url decoder?**
Previously shared links are a public compatibility surface. The readable format improves debuggability while the validated legacy path avoids breaking old links.

## 40. Optimistic concurrency, offline work, presence, and CRDT-like merging

### Optimistic UI versus optimistic concurrency control

These are related but different:

- **Optimistic UI** shows the intended result before confirmation.
- **Optimistic concurrency control** uses a version or compare-and-swap rule to reject writes based on stale data.

This application fully simulates optimistic UI. It tracks versions and detects selected-draft conflicts, but `commitOperation` does not reject a stale base version. Therefore it is not a complete server-enforced optimistic concurrency-control system.

### Version-based conflict detection

When a remote simulation changes a task:

1. the confirmed task version increments;
2. the current clean form refreshes immediately; or
3. a dirty form retains its draft and base snapshot;
4. changed editable fields are recorded in `EditConflict`;
5. saving opens a resolution UI.

Resolution uses the incoming task as the new `before` snapshot so the submitted operation builds on the newest visible confirmed version.

### Presence and advisory locks

Presence entries state that a user is viewing or editing a task. Editing presence disables local controls for other users. This is a pessimistic user-experience hint, not a durable distributed lock:

- it lives in one browser store;
- it has no lease or expiry;
- there is no server arbiter;
- a malicious client could bypass it.

A real implementation would use expiring presence over WebSocket or another realtime channel and enforce writes independently on the server.

### Offline queue

Offline actions still:

- create a pending operation;
- persist it;
- add history;
- update the query projection;
- show immediately.

They do not call the mutation until `NetworkStatus` observes reconnection. After reconnection, the provider reloads confirmed data, replays pending operations, resets offline deadlines, and starts inactive operations.

This is eventual consistency: local visible state may temporarily differ from confirmed state, then converges after operations succeed or roll back.

### CRDT-like description merge

The merge is intentionally described as CRDT-like, not a complete text CRDT.

Algorithm:

1. split base, mine, and theirs into sentence-like blocks;
2. return the changed side immediately when the other side equals base;
3. retain base blocks only if both branches still contain them;
4. collect branch additions absent from base;
5. tag additions with actor and source index;
6. deterministically sort by actor, position, then block text;
7. deduplicate and append additions.

The deterministic ordering gives the tested convergence property:

```text
merge(base, mine-by-You, theirs-by-Alex)
=
merge(base, mine-by-Alex, theirs-by-You)
```

Limitations:

- sentence splitting is heuristic;
- editing one sentence can look like delete-plus-add;
- character-level intent and cursor positions are not preserved;
- there are no stable operation IDs, vector clocks, tombstones, or replica protocol;
- the user must review the result.

### CRDT vocabulary

| Term | Meaning here |
| --- | --- |
| Convergence | Equivalent branches produce the same merged output despite arrival order |
| Observed remove | A base block removed by either branch is not retained |
| Concurrent addition | A block present in a branch but absent from base |
| Deterministic tie-break | Actor, source index, and text decide one stable order |
| Replica | In a real CRDT, an independently updating participant; only simulated here |

### Interview drill

**Is this a real collaborative application?**
It is a faithful browser-side simulation of collaboration workflows. It does not provide cross-client communication or server-enforced consistency.

**Could full snapshots cause lost updates?**
Yes. Replaying or committing a full local snapshot can overwrite a remote field that the user did not intend to change. Production code should use version preconditions plus field-level patches, or a suitable OT/CRDT design.

**Why offer manual review after deterministic merge?**
Convergence is not the same as preserving human meaning. The algorithm can be deterministic yet semantically awkward.

## 41. Performance patterns beyond virtualization

### Derive once per relevant change

The board computes:

- one compiled advanced predicate;
- one filtered task array;
- three sorted status arrays;
- one pending ID set;
- one presence map;
- one lock map.

Each derivation is memoized with the source values it depends on. This prevents every card from independently repeating whole-board searches.

### Algorithmic shape

For `n` tasks and `p` pending operations:

- filtering is approximately O(n);
- grouping uses three filters, approximately O(3n), which simplifies to O(n);
- sorting is O(n log n) in aggregate;
- pending reconciliation is currently O(p × n) because each full-snapshot operation scans or maps the task array;
- mounted DOM is bounded by visible virtual rows plus overscan.

The current scale is 1,000 tasks and a small pending list, so clarity wins. At much larger scale, normalize tasks into `Map<id, Task>` plus ordered ID lists and index operations by task ID.

### Stable identities

Stable task IDs serve several systems:

- React list keys;
- dnd-kit draggable identity;
- virtualizer measurement keys;
- pending-operation targets;
- history targets;
- presence targets;
- selected task identity.

Identity is an architectural primitive, not merely a React warning fix.

### Avoiding unnecessary client code

The Next.js server/client boundary keeps the route shell on the server, but most board modules belong in the client graph because they depend on hooks, events, context, or browser storage. Unused shadcn files do not enter the client bundle unless imported.

## 42. Accessibility, headless UI, styling, and motion

### Headless primitives

Base UI supplies interaction behavior and ARIA semantics; the project-owned shadcn files supply styling and composition. This separation makes primitives customizable without rebuilding focus management, portals, escape handling, and keyboard interaction from scratch.

### CVA and class composition

Class Variance Authority models variant props:

```ts
const buttonVariants = cva("base classes", {
  variants: {
    variant: {
      default: "default classes",
      destructive: "destructive classes",
    },
  },
})
```

`cn()` combines:

1. `clsx` for conditional class expressions;
2. `tailwind-merge` so later conflicting Tailwind utilities win predictably.

### Tailwind semantic tokens

Components use names such as:

```text
bg-background
text-foreground
text-muted-foreground
border-border
```

These map to CSS custom properties in `globals.css`. Theme switching changes variable values rather than requiring every component to branch between light and dark classes.

### Accessibility is a system

The implementation combines:

- native landmarks and headings;
- labels and stable IDs;
- keyboard drag sensor;
- status-select alternative;
- accessible modal primitives;
- live drag announcements;
- `aria-busy`, `aria-invalid`, and status text;
- shortcut guards inside editable controls;
- reduced-motion preference;
- visible lock and pending feedback.

An interview answer should connect each measure to a user need. Saying “we used an accessible library” is insufficient because application composition can still break accessibility.

### Motion

`LazyMotion` loads the smaller DOM animation feature set, while `MotionConfig reducedMotion="user"` follows the operating-system preference. Motion is limited to drag feedback rather than applied indiscriminately.

## 43. Testing strategy and how to defend it

### Testing pyramid

Pure rules are tested with Vitest:

- deterministic data and schema validity;
- task filtering;
- operation replay;
- query AST editing, compilation, parsing, and precedence;
- description merge convergence and deletion behavior.

Cross-component browser flows are tested with Playwright:

- hydration;
- optimistic pending UI;
- drag behavior;
- developer simulation;
- presence locking;
- conflict merging;
- offline queue and reconnect;
- URL state and favorites;
- keyboard shortcut UI.

### Why not test everything through the browser

Pure recursive and reconciliation algorithms are faster, clearer, and more exhaustive as unit tests. Browser tests are reserved for integration boundaries that depend on DOM behavior, focus, persistence, real event dispatch, or multiple features working together.

### Query tests as semantic tests

The strongest query tests compare the IDs produced by an encoded/decoded query with the IDs produced by the original tree. This verifies behavior, not just JSON shape.

### CRDT-like tests as algebraic properties

The arrival-order test verifies convergence by swapping branches and actors. This is more valuable than asserting only one hard-coded example because it targets the property the algorithm claims.

### High-value missing tests

If asked what you would add next:

1. forced mutation failure preserves unrelated pending operations;
2. reload resumes an operation exactly once;
3. undo/redo failure restores the history cursor;
4. same-column reorder and keyboard drag;
5. conflict take-mine/take-theirs/non-description choices;
6. a DOM-count assertion for the 1,000-task dataset;
7. malformed URL and corrupted storage recovery;
8. storage quota/denial feedback.

## 44. Build and deployment concepts

### Strict TypeScript

`strict: true` enables the family of strict checks. `noEmit: true` means TypeScript validates but Next.js owns output generation. `moduleResolution: "bundler"` matches modern package exports and the Next.js toolchain.

### ESLint

The configuration composes Next.js Core Web Vitals and TypeScript rules. Lint catches framework-specific mistakes, unsafe hook dependencies, accessibility issues covered by rules, and general code-quality problems.

### Standalone Next.js output

`output: "standalone"` traces the minimal server runtime required by the application. The Docker runtime copies:

- public assets;
- `.next/standalone`;
- `.next/static`.

It does not copy the full development repository or complete `node_modules`.

### Multi-stage Docker build

The Dockerfile separates:

1. dependency installation;
2. application build;
3. minimal production runtime.

Benefits include layer reuse, smaller runtime images, fewer build tools in production, and a reduced attack surface. The runtime uses an unprivileged user and an HTTP health check.

### Important deployment truth

The container is stateless, but the application is not globally persistent. Data belongs to each browser's `localStorage`. Replacing or scaling containers does not share user tasks because the server never owns them.

---

# Part III: Interview drills

## 45. Feature-by-feature question bank

### Architecture and Next.js

**1. Why use Next.js for a single-page client-heavy board?**
It provides the App Router shell, server/client composition, metadata, optimized fonts, error conventions, build tooling, static prerendering, and a deployable standalone server. The board could be built with Vite, but Next.js demonstrates production routing and rendering conventions.

**2. Why is `app/page.tsx` still a Server Component if it only renders a client board?**
Server Components are the default and there is no reason to move the route entry itself to the client. It preserves the framework boundary and keeps the option to add server-rendered content later.

**3. What causes hydration mismatches, and how does this app avoid them?**
They occur when the first client render differs from server HTML. Deterministic seed data, browser guards, delayed persisted-state recovery, and theme-specific suppression on the root keep the initial trees aligned.

**4. What does `"use client"` do?**
It marks a client module entry point. That module and its imported client graph can use browser interactivity and are included in the client bundle. It does not mean the component skips server prerendering.

### State and mutations

**5. Walk through task creation.**
The dialog owns a controlled draft, validates required fields, creates IDs/timestamps/initial position, and calls `execute`. `execute` persists a pending operation and history entry, projects it into the query cache, and starts or queues the mutation. Success commits and reconciles; failure removes the operation/history and rebuilds from confirmed data.

**6. Why is rollback based on replay rather than an old snapshot?**
An old snapshot can erase newer remote changes or unrelated optimistic operations. Replay starts from the latest confirmed database and applies only operations still pending.

**7. What happens if two pending updates target the same task?**
They replay in array order, so the later full snapshot wins visually. Confirmation order and full-snapshot commits can still produce lost-field problems; production code needs sequencing, version preconditions, and patches.

**8. What survives a reload?**
Confirmed tasks, the persisted query cache, selected Zustand workflow state, pending operations, history, drafts, conflicts, filters, and simulation settings. Runtime-only active-operation markers and transient dialog state do not.

**9. Why use a module-level `Set` for active operations?**
It prevents repeated effects in one JavaScript runtime from starting the same persisted operation twice. It is intentionally not durable; the persisted pending list is the recovery source after a full reload.

**10. How would the simulated repository become a real API?**
Replace repository reads/commits with HTTP calls, keep query keys and most UI commands, move validation and authorization to the server, send version preconditions and patches, use durable server IDs, and add realtime invalidation/presence.

### Virtualization and performance

**11. Explain TanStack Virtual without library vocabulary.**
The scrollbar represents the full list, but the DOM contains only the visible slice plus a buffer. Rows are measured and translated to their logical offsets inside a full-height spacer.

**12. Why is the scroll element passed as a function?**
The DOM ref is `null` during rendering and assigned after mount. The virtualizer calls the function when it needs the current element.

**13. What does `measureElement` solve?**
Cards have variable height. It records real sizes so later row offsets and total scroll height are accurate.

**14. How would you prove virtualization is effective?**
Load 1,000 tasks, inspect or test the mounted card count, profile commit/layout time, and compare scrolling behavior and memory against a nonvirtual baseline.

**15. Is `useMemo` enough to make 1,000 cards fast?**
No. Memoization can reduce recalculation and re-rendering but still leaves 1,000 DOM subtrees. Virtualization changes the structural amount of mounted UI.

### Drag-and-drop and ordering

**16. Why fractional positions instead of array indexes?**
A move updates one task rather than renumbering all following tasks. Sorting by `position` reconstructs order.

**17. What can go wrong with fractional positions?**
Repeated midpoint insertions shrink gaps until numeric precision or readability becomes problematic. Normalize ranks periodically or use a production ranking algorithm.

**18. Why disable overlay drop animation?**
The optimistic move updates the destination immediately. A default overlay animation can target stale source geometry and visually fly backward.

**19. How is drag accessible?**
Keyboard sensors and announcements support keyboard/screen-reader interaction, while the status select provides a simpler non-drag alternative.

### Query builder and URL state

**20. Why is the query model recursive?**
Nested boolean groups are naturally recursive: a group contains conditions or more groups. The UI, immutable editor, compiler, serializer, parser, and description function mirror that structure.

**21. How is boolean precedence handled?**
Compilation groups adjacent AND predicates into clauses separated by OR and evaluates `some(every(...))`. The URL parser's grammar consumes AND expressions inside OR expressions.

**22. How are malformed shared URLs handled?**
Fields and operators are validated, grammar failures return `null`, legacy payloads pass through Zod, and an invalid legacy `q` parameter is removed instead of crashing the route.

**23. Why use `replaceState` rather than router navigation?**
Filters operate entirely on an already-loaded client list. `replaceState` updates the shareable URL without a server navigation or a history entry for every keystroke.

### Collaboration and offline behavior

**24. How is a conflict detected?**
A remote update targets the selected task while its persisted local draft is dirty and has a base snapshot. The app compares editable fields, stores the newest incoming task, and accumulates changed fields.

**25. Is the version field enforcing concurrency?**
No. It communicates ordering and supports conflict UX, but commit does not perform compare-and-swap validation. This distinction is important.

**26. What makes the description merge convergent?**
Concurrent additions are ordered by stable actor identity, source index, and text, independent of which branch is passed as mine or theirs.

**27. Why call it CRDT-like instead of a CRDT?**
It demonstrates deterministic convergence and observed-remove behavior over blocks, but lacks a replicated-operation model, stable element IDs, causal metadata, and a transport protocol.

**28. What if the tab closes while offline?**
The confirmed repository and pending operation log remain in storage. On the next load, hydration restores the operations; once connected, the provider reprojects and resumes them.

**29. Are editing locks safe?**
They are useful advisory UX in this simulation. Only a server-authorized write rule can be a correctness or security boundary.

### React, TypeScript, UI, and tests

**30. Why controlled forms?**
They make draft state explicit and reusable, enable persisted edits and conflicts, and allow validation and reset without reading values imperatively from the DOM.

**31. Why Zod if TypeScript already defines `Task`?**
TypeScript cannot validate runtime JSON. Zod checks storage and URL data; `z.infer` then supplies the compile-time type from the same schema.

**32. Why use Base UI/shadcn primitives?**
They provide tested interaction and accessibility behavior with project-owned styling. The tradeoff is another abstraction layer whose APIs and generated code the team must understand.

**33. Why unit-test query and merge logic separately?**
They are pure algorithms with important semantic properties. Unit tests provide precise, fast coverage; Playwright then verifies their integration through actual UI flows.

**34. What would you monitor in production?**
Mutation success/failure/latency, pending-queue age, conflict rate, storage/API errors, query/cache errors, client exceptions, interaction latency, mounted DOM count, and reconnect/resume behavior.

**35. What is the most important current limitation?**
There is no authoritative multi-user backend. Full snapshots plus client-only locks mean collaboration correctness is demonstrated, not guaranteed.

## 46. Whiteboard traces to practice

Practice drawing each flow from memory in under two minutes.

### Create, confirm, or roll back

```text
TaskForm
→ execute(before=null, after=task)
→ pending + history + event
→ confirmed + pending replay
→ query cache renders card
→ wait/reconnect
→ success: commit/version/reconcile
   or
→ failure: remove op/history/reconcile/toast
```

### Drag to another column

```text
Pointer/keyboard sensor
→ active task ID
→ collision target ID
→ destination task or column
→ fractional position
→ execute full task snapshot
→ optimistic projection
```

### Advanced query

```text
recursive editor
→ immutable AST update
→ Zustand advancedQuery
→ URL rule/logic serialization
→ memoized predicate compiler
→ quick + advanced filtering
→ grouped virtual columns
```

### Offline operation

```text
browser/forced offline
→ execute persists waitForConnection operation
→ optimistic projection remains visible
→ reconnect event
→ reload confirmed data
→ replay all pending
→ reset offline deadline
→ start inactive mutation once
```

### Conflict

```text
dirty draft + base snapshot
→ remote confirmed update/version increment
→ changed fields + incoming task
→ warning
→ take theirs
   or keep mine
   or deterministic description proposal + manual review
→ one optimistic resolve operation
```

## 47. Honest tradeoffs and production redesign

When an interviewer challenges the design, do not defend every choice as universally optimal. State the assignment constraint, current benefit, limitation, and production evolution.

| Current choice | Why it fits here | Production evolution |
| --- | --- | --- |
| `localStorage` repository | Self-contained deterministic demo | Authenticated API and transactional database |
| Full task snapshots | Simple replay, history, and rollback | Field patches plus version preconditions |
| Browser presence | Reproducible UI demonstration | Realtime service with leases/heartbeats |
| CRDT-like sentence merge | Teaches convergence with readable output | Mature text CRDT/OT library if collaborative text requires it |
| Floating positions | O(1) single-card rank update | Rank normalization or distributed ordering keys |
| One tasks query | Simple at 1,000 local tasks | Pagination/streaming, normalized cache, server filtering |
| Persisted edit draft | Survives reload and enables conflicts | Per-user server drafts or bounded local recovery policy |
| Random simulated failures | Exercises rollback paths | Real error taxonomy, retry policy, telemetry, idempotency keys |

### Senior follow-up: idempotency

A durable offline queue can resend work after uncertain failure. A real API should accept a client-generated operation ID as an idempotency key and return the original result for duplicate submissions. The current browser repository uses one runtime `Set`, which prevents local duplicate starts but is not a server idempotency guarantee.

### Senior follow-up: ordering and races

Multiple operations currently use independent mutation calls and full snapshots. Production choices include:

- serialize operations per task;
- include expected versions and reject conflicts;
- send field patches;
- make server responses authoritative;
- cancel or supersede obsolete queued operations;
- use idempotency keys;
- invalidate or merge query data after server acknowledgement.

### Senior follow-up: storage migrations

The keys and payloads are versioned, but corrupt confirmed task data currently resets. A mature client would define explicit migrations, preserve an export/recovery path, handle quota denial, and monitor migration failures.

## 48. Final mastery checklist

You are interview-ready when you can do all of the following without reading the code:

- give the 30-second and 90-second architecture summaries;
- draw confirmed, pending, projected, and draft task state;
- trace success, failure, offline, reload, undo, and conflict flows;
- explain `useVirtualizer` option by option and draw its spacer layout;
- trace dnd-kit sensors, droppable/sortable hooks, collision, overlay, and position calculation;
- draw the query AST and explain recursive immutable editing;
- explain why the compiler implements OR-of-ANDs;
- explain URL precedence and the microtask readiness gate;
- distinguish optimistic UI from optimistic concurrency control;
- explain why the description merge is CRDT-like rather than a complete CRDT;
- explain Server Components, client boundaries, prerendering, and hydration;
- compare local state, Zustand, TanStack Query, storage, and URL ownership;
- explain the main TypeScript utility types and Zod inference used here;
- name accessibility alternatives to drag-and-drop;
- identify current test coverage and the highest-value gaps;
- state the application's production limitations honestly and propose concrete upgrades.
