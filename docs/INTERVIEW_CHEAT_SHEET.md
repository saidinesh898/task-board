# Task Board Interview Cheat Sheet

Use this for final revision. The complete explanations and implementation reference are in [`APPLICATION_IMPLEMENTATION.md`](./APPLICATION_IMPLEMENTATION.md).

## 1. Opening answer

### 30 seconds

> This is a Next.js 16 task board designed to stay responsive with 1,000 tasks. TanStack Query owns the server-like task collection and optimistic mutation lifecycle, Zustand owns durable UI and workflow state, TanStack Virtual limits mounted cards, and dnd-kit provides pointer and keyboard movement. A validated `localStorage` repository simulates a backend, including latency, failure, offline queuing, remote edits, presence, and conflict resolution.

### Core design decision

> Confirmed state is never confused with optimistic state. The visible board is rebuilt as confirmed tasks plus a replayable persisted operation log. On failure, only the failed operation is removed and the projection is rebuilt, so unrelated pending or newly confirmed work is preserved.

## 2. Architecture from memory

```text
app/layout.tsx + app/page.tsx
        ↓
app/providers.tsx
        ↓
BoardApp / feature components
        ↓
TaskOperations Context façade
        ↓
TanStack Query + Zustand
        ↓
Zod-validated localStorage repository
```

| Concern | Owner |
| --- | --- |
| Confirmed tasks | `task-board:db:v1` repository |
| Visible projected tasks | TanStack Query `["tasks"]` |
| Pending operations/history/draft/filters | Zustand |
| Temporary interaction | Component `useState` |
| Shareable filters | URL parameters |
| Theme | `next-themes` |

## 3. The four task states

1. **Confirmed:** operations that succeeded.
2. **Pending:** durable intentions awaiting success/failure.
3. **Projected:** confirmed tasks with pending operations replayed.
4. **Draft:** unsaved form input.

```text
visible = pending.reduce(applyOperation, confirmed)
```

Never call the draft or the query cache “the database.”

## 4. Feature traces

### Create

```text
TaskForm validation
→ build ID/timestamps/position
→ execute(null, task)
→ persist pending/history/event
→ replay into query cache
→ render immediately
→ commit and increment version
   OR remove failed operation/history and replay
```

### Drag

```text
sensor
→ active task
→ closest-center target
→ destination task/column
→ fractional position
→ optimistic update
```

Position formula:

```text
between: (before + after) / 2
at end:  before + 1000
at start: after - 1000
empty:    0
```

### Offline

```text
offline action
→ pending operation with waitForConnection
→ optimistic UI + persistence
→ reconnect
→ reload confirmed
→ replay pending
→ reset latency deadline
→ start once
```

### Conflict

```text
dirty draft + base task
→ remote update/version increment
→ incoming task + changed fields
→ Take theirs | Keep mine | Merge manually
→ optional optimistic resolve operation
```

### Query

```text
recursive UI
→ immutable AST
→ URL ruleN + logic
→ compiled predicate
→ filtered tasks
→ grouped/sorted columns
→ virtual rows
```

## 5. TanStack Virtual

### One-sentence answer

> It preserves the full logical scroll range but mounts only visible rows plus overscan, positioning measured rows inside a full-height spacer.

### Configuration

```ts
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

| Option | Answer |
| --- | --- |
| `count` | Logical number of rows |
| `getScrollElement` | Supplies the current independently scrolling column |
| `estimateSize` | Initial height before real measurement |
| `overscan` | Extra buffer against fast-scroll blanking |
| `getItemKey` | Stable measurement identity |
| `initialRect` | Deterministic initial viewport before browser measurement |
| `useFlushSync` | Avoid forced synchronous React updates |

### Layout

```tsx
<div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
  {virtualizer.getVirtualItems().map((row) => (
    <div
      data-index={row.index}
      ref={virtualizer.measureElement}
      style={{
        position: "absolute",
        transform: `translateY(${row.start}px)`,
      }}
    />
  ))}
</div>
```

Important:

- Virtualization is not pagination.
- It reduces DOM work, not the number of task objects.
- There is one virtualizer per independently scrolling column.
- Stable task IDs prevent wrong DOM/measurement reuse.
- Only mounted rows have rectangles available to dnd-kit.

## 6. TanStack Query

```ts
useQuery({
  queryKey: ["tasks"],
  queryFn: loadConfirmedTasks,
  initialData: makeSeedTasks,
  refetchOnMount: "always",
})
```

```ts
useMutation({
  mutationFn,
  onSuccess,
  onError,
})
```

Why use it:

- query identity and cache;
- asynchronous mutation lifecycle;
- direct cache projection through `setQueryData`;
- persistence integration;
- a replaceable server-like boundary.

Why optimistic work begins in `execute`, not `onMutate`:

- offline actions may not call `mutate` yet;
- the operation must first be persisted;
- history and event logging are part of the command;
- restored operations reuse the same execution path.

## 7. Zustand

```ts
create<BoardState>()(
  persist(
    (set, get) => ({ /* state + actions */ }),
    {
      name: "task-board:client:v1",
      partialize: (state) => ({ /* durable subset */ }),
    }
  )
)
```

Remember:

- `set` changes state.
- `get` reads current state inside actions.
- `useBoardStore(selector)` subscribes narrowly.
- `useBoardStore.getState()` reads imperatively.
- `partialize` excludes functions and transient state.
- hydration must finish before pending recovery and URL sync.

## 8. dnd-kit

```text
DndContext
├── PointerSensor: 6px activation distance
├── KeyboardSensor: sortableKeyboardCoordinates
├── closestCenter collision
├── announcements
└── drag start/end/cancel
```

```text
useDroppable → status column
useSortable  → task card
DragOverlay  → visual preview
```

Key answers:

- Listeners live on the grip so the card body remains clickable.
- `dropAnimation={null}` avoids animation toward stale source geometry.
- Locks disable sortable behavior and are rechecked in the command.
- The status select is the accessible/non-spatial fallback.

## 9. Query builder

### AST

```ts
type QueryNode = QueryCondition | QueryGroup
```

`kind` is the discriminant:

```text
condition → leaf predicate
group     → recursive children
```

### Compiler

```text
A OR B AND C
= A OR (B AND C)
= clauses.some(clause => clause.every(predicate))
```

### Parser grammar

```text
orExpression  := andExpression ("or" andExpression)*
andExpression := primary ("and" primary)*
primary       := rule | "(" orExpression ")"
```

### URL

```text
rule1=priority.equals.high
rule2=assignee.equals.You
logic=1-or-2
```

Why no `eval`:

- AST is safe, validateable, serializable, editable, testable.

Why a readiness microtask:

- URL state must enter Zustand after hydration before the outbound effect can overwrite the URL with persisted state.

## 10. Collaboration concepts

### Optimistic UI

Show the intended change before confirmation.

### Optimistic concurrency control

Reject a write when its expected version is stale. The app tracks versions but does not enforce compare-and-swap at commit, so it is not complete OCC.

### Presence

Viewing/editing metadata rendered as avatars. Editing presence creates an advisory UI lock, not a security boundary.

### CRDT-like merge

```text
split sentence blocks
→ keep base blocks present in both branches
→ collect concurrent additions
→ sort by actor + index + text
→ deduplicate
→ user reviews
```

Why “CRDT-like”:

- it tests convergence and observed-remove behavior;
- it lacks stable element IDs, causal metadata, replica operations, and transport.

Convergence does not guarantee semantic quality.

## 11. React and Next.js

### `"use client"`

- Declares a client module boundary.
- Enables state, effects, handlers, context, and browser APIs.
- Pulls the imported client graph into the client bundle.
- Does not mean no server prerendering occurs.

### Hydration

React attaches interactivity to prerendered HTML and reconciles server/client trees.

Hydration protections:

- deterministic seed `initialData`;
- no unguarded browser API during server rendering;
- restore persisted state after mount;
- root warning suppression only for theme-controlled attributes.

### Hooks

| Hook | Use here |
| --- | --- |
| `useState` | Local interaction and stable provider instances |
| `useEffect` | Subscriptions, timers, recovery, URL sync |
| `useMemo` | Derived filters/groups/maps/predicates |
| `useCallback` | Stable commands |
| `useRef` | DOM node and previous value |
| `useContext` | Task operations façade |
| `useId` | Accessible form IDs |

```text
memo         → caches component result by props
useMemo      → caches a computed value
useCallback  → caches a function identity
```

Effects synchronize external systems and require cleanup. Derived values should usually be computed, not copied into effect-managed state.

## 12. TypeScript syntax

```ts
Pick<Task, "title" | "status">       // keep fields
Omit<Task, "id">                    // remove fields
Partial<TaskDraft>                  // optional fields
keyof TaskDraft                     // union of keys
Record<TaskStatus, Task[]>          // fixed keyed object
Task | null                         // union
readonly T[]                        // nonmutating input
z.infer<typeof taskSchema>          // type from runtime schema
["tasks"] as const                  // readonly literal tuple
object satisfies PendingOperation   // checked without blunt assertion
```

```text
?.   optional chaining
??   nullish fallback
!    non-null assertion; compile-time only
...  shallow spread/copy
```

Important: TypeScript disappears at runtime; Zod validates parsed storage and URL data.

## 13. Performance

Structural wins:

- virtualized rows;
- stable IDs;
- one projection and grouped arrays;
- memoized predicate/maps/sets;
- memoized `TaskCard`;
- bounded history, events, favorites, and developer target menu;
- lazy Motion feature loading.

Complexity:

```text
filter/group: O(n)
sort:         O(n log n)
replay:       O(p × n)
mounted DOM:  visible rows + overscan
```

At a larger scale:

- normalize tasks by ID;
- keep ordered ID lists;
- paginate or stream;
- filter on the server;
- index pending operations;
- serialize operations per task.

## 14. Accessibility

Be ready to name concrete measures:

- pointer and keyboard DnD;
- status-select fallback;
- drag announcements;
- semantic landmarks/headings;
- labeled forms and stable IDs;
- `aria-invalid`, `aria-busy`, status feedback;
- accessible Base UI dialogs, sheets, menus, selects, and tooltips;
- editable-target shortcut guard;
- reduced-motion preference;
- visible and programmatically described locks/presence.

Accessibility is not guaranteed merely by using a primitive library; composition and application labels still matter.

## 15. Tests

Current suite status:

```text
Vitest:     3 files, 13 tests passing
Playwright: 16 tests passing serially across board + study guide
Lint:       success with known virtualizer/compiler warning
Build:      success
```

Unit-test:

- pure query, replay, filter, seed, validation, and merge semantics.

E2E-test:

- hydration, optimistic UI, DnD, remote activity, presence locks, merge UI, offline reconnect, URL sync, favorites, shortcuts.

Next tests to add:

1. forced failure with unrelated pending work;
2. exact-once resume after reload;
3. undo/redo failure cursor recovery;
4. keyboard and same-column reorder;
5. all conflict resolution paths;
6. bounded DOM count with 1,000 tasks;
7. malformed storage/URL recovery.

## 16. Honest limitations

Say these confidently:

- It is a collaboration simulation, not a cross-client system.
- `localStorage` is per browser, not server persistence.
- Full snapshots can overwrite unrelated remote fields.
- Version numbers are not enforced compare-and-swap.
- Presence locks are advisory.
- The sentence merge is CRDT-like, not a production text CRDT.
- Fractional positions are never normalized.
- Failed undo/redo does not restore the history cursor.
- Storage quota/denial is not surfaced.
- No service worker supports a cold offline load.

## 17. Production redesign

```text
localStorage repository
→ authenticated HTTP API + transactional database

browser simulation
→ WebSocket/SSE realtime invalidation and presence

full snapshots
→ field patches + expected version

runtime Set
→ server idempotency keys

advisory locks
→ server authorization + optional leases

sentence merger
→ mature CRDT/OT only if collaborative text requires it

floating ranks
→ normalized or distributed ranking scheme

single task query
→ pagination/streaming + server filters + normalized cache
```

## 18. Rapid-fire answers

**Why Query and Zustand?**
Query owns asynchronous entity/cache state; Zustand owns UI and durable workflow state.

**Why replay on rollback?**
It preserves latest confirmed data and unrelated pending work.

**Why persist pending operations?**
The app must know what remains unconfirmed and resume it after reload.

**Why Zod?**
Runtime data is untrusted even when it came from this app's older storage.

**Why stable IDs?**
React, virtualization, DnD, selection, history, operations, and presence all need durable identity.

**Why one virtualizer per column?**
Each column has an independent scroll offset and list.

**Why `measureElement`?**
Card heights vary.

**Why overscan?**
It prevents blanks during fast scrolling at the cost of extra mounted rows.

**Why fractional ranking?**
One task changes position instead of renumbering a whole column.

**Why query AST?**
Nested logic is structured, safe, recursive, serializable, and testable.

**Why `replaceState`?**
Shareable filters without navigation or history spam per keystroke.

**Why deterministic failure outcome?**
Reload should not change whether an already queued operation succeeds.

**Why Context around task operations?**
It hides cache/repository/mutation mechanics behind one feature API.

**Why controlled forms?**
Draft persistence, validation, reuse, reset, and conflict comparison.

**Why manual merge after deterministic merge?**
Deterministic ordering does not guarantee human meaning.

## 19. Final self-test

Before the interview, explain aloud:

- the 90-second architecture;
- `confirmed + pending = projected`;
- a failure with two other pending operations;
- every `useVirtualizer` option;
- spacer height and `translateY`;
- dnd-kit start/end flow;
- fractional position edge cases;
- query AST, compiler, and parser precedence;
- hydration and URL readiness;
- offline reload/resume;
- version conflict and three resolution paths;
- why the merge is only CRDT-like;
- top five production changes.
