export type CodeSample = {
  label: string
  file: string
  language: string
  code: string
}

export type InterviewQuestion = {
  id: string
  question: string
  answer: string
  followUp?: string
}

export type Lesson = {
  id: string
  index: string
  title: string
  shortTitle: string
  eyebrow: string
  summary: string
  minutes: number
  accent: "violet" | "cyan" | "amber" | "emerald" | "rose"
  outcomes: string[]
  concepts: Array<{ title: string; body: string }>
  code: CodeSample[]
  mentalModel: string[]
  pitfalls: string[]
  questions: InterviewQuestion[]
}

export type Flow = {
  id: string
  title: string
  summary: string
  accent: Lesson["accent"]
  steps: Array<{
    label: string
    owner: string
    detail: string
    state: string
  }>
}

export const lessons: Lesson[] = [
  {
    id: "architecture",
    index: "01",
    title: "Architecture & rendering",
    shortTitle: "Architecture",
    eyebrow: "Start here",
    summary:
      "Build the story from the Next.js route shell to the visible board, then separate confirmed, pending, projected, and draft state.",
    minutes: 14,
    accent: "violet",
    outcomes: [
      "Deliver a confident 30-second and 90-second project explanation.",
      "Draw the component and data architecture without listing libraries first.",
      "Explain Server Components, client boundaries, prerendering, and hydration.",
    ],
    concepts: [
      {
        title: "Responsibilities before libraries",
        body:
          "Describe the route shell, interactive features, operation façade, state owners, and persistence boundary first. Then name Next.js, Context, TanStack Query, Zustand, and localStorage as implementations of those responsibilities.",
      },
      {
        title: "Server/client boundary",
        body:
          "layout.tsx and page.tsx remain Server Components. providers.tsx starts the client graph because themes, context, browser storage, effects, and event handlers require client JavaScript.",
      },
      {
        title: "Hydration contract",
        body:
          "The server and first client render both use deterministic seed tasks. Browser-persisted data is restored after mount. Theme suppression is narrow and does not hide general hydration bugs.",
      },
    ],
    code: [
      {
        label: "Route boundary",
        file: "app/page.tsx",
        language: "tsx",
        code: `import { BoardApp } from "@/features/board/board-app"

export default function Home() {
  return <BoardApp />
}`,
      },
      {
        label: "Provider shell",
        file: "app/providers.tsx",
        language: "tsx",
        code: `"use client"

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <ThemeProvider attribute="class">
      <PersistQueryClientProvider client={queryClient}>
        {children}
      </PersistQueryClientProvider>
    </ThemeProvider>
  )
}`,
      },
    ],
    mentalModel: [
      "Request → Server Component route shell",
      "Providers → first client boundary",
      "BoardExperience → derived interactive UI",
      "TaskOperations → application command façade",
      "Query + Zustand → projected and workflow state",
      "Repository → confirmed durable state",
    ],
    pitfalls: [
      "Saying “use client means client-side rendering only.” Client Components can still be prerendered to HTML.",
      "Calling the query cache the database.",
      "Listing dependencies without explaining ownership and data flow.",
    ],
    questions: [
      {
        id: "architecture-1",
        question: "Why is app/page.tsx still a Server Component?",
        answer:
          "It needs no state, effects, handlers, or browser APIs. Keeping the route entry on the server preserves the framework boundary and avoids adding unnecessary client code. It simply composes the interactive BoardApp client boundary.",
      },
      {
        id: "architecture-2",
        question: "What causes hydration mismatches, and how does this app avoid them?",
        answer:
          "A mismatch occurs when the first browser render differs from server HTML. Deterministic initial tasks, browser API guards, delayed persisted-state restoration, and narrow theme warning suppression keep both trees aligned.",
      },
      {
        id: "architecture-3",
        question: "Give the 30-second architecture explanation.",
        answer:
          "This is a Next.js 16 task board that stays responsive with 1,000 tasks. TanStack Query owns server-like task data and optimistic mutations, Zustand owns durable workflow state, TanStack Virtual limits mounted cards, and dnd-kit handles accessible movement. A validated localStorage repository simulates latency, failure, offline work, remote edits, presence, and conflicts.",
      },
    ],
  },
  {
    id: "typescript",
    index: "02",
    title: "TypeScript & runtime validation",
    shortTitle: "TypeScript",
    eyebrow: "Language foundations",
    summary:
      "Learn the exact unions, utility types, generics, discriminated unions, assertions, and Zod inference used throughout the project.",
    minutes: 16,
    accent: "cyan",
    outcomes: [
      "Explain why TypeScript alone cannot validate localStorage or URL data.",
      "Read Pick, Omit, Partial, Record, keyof, satisfies, and as const aloud.",
      "Use a discriminated union to model recursive query nodes safely.",
    ],
    concepts: [
      {
        title: "One runtime source of truth",
        body:
          "Zod schemas validate parsed values at runtime. z.infer derives TypeScript types from those schemas so runtime and compile-time definitions cannot silently drift.",
      },
      {
        title: "Derived domain types",
        body:
          "TaskDraft uses Pick to expose only editable fields. TaskPatch combines Partial and Omit. keyof TaskDraft safely represents editable field names in conflict logic.",
      },
      {
        title: "Narrow inference",
        body:
          "as const preserves literal tuples such as the query key. satisfies checks an object against PendingOperation without discarding the expression's useful inferred type.",
      },
    ],
    code: [
      {
        label: "Schema and inference",
        file: "features/tasks/types.ts",
        language: "ts",
        code: `export const taskSchema = z.object({
  id: z.string(),
  status: z.enum(["todo", "in-progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  version: z.number().int().nonnegative(),
})

export type Task = z.infer<typeof taskSchema>`,
      },
      {
        label: "Utility types",
        file: "features/tasks/types.ts",
        language: "ts",
        code: `export type TaskDraft = Pick<
  Task,
  "title" | "description" | "status" |
  "priority" | "assignee" | "tags"
>

export type TaskPatch =
  Partial<Omit<Task, "id" | "createdAt">>`,
      },
    ],
    mentalModel: [
      "TypeScript protects authored code before execution.",
      "Zod protects values that arrive during execution.",
      "z.infer connects both worlds.",
      "Utility types derive smaller contracts from Task.",
      "Discriminants turn one union into safe branches.",
    ],
    pitfalls: [
      "Using a type assertion as if it performed validation.",
      "Forgetting that object spread is shallow.",
      "Using the non-null assertion operator without a runtime invariant.",
    ],
    questions: [
      {
        id: "typescript-1",
        question: "Why use Zod when Task is already a TypeScript type?",
        answer:
          "TypeScript types disappear at runtime. Parsed localStorage and URL JSON can be malformed or from an older version. Zod validates those values, and z.infer avoids maintaining a duplicate compile-time model.",
      },
      {
        id: "typescript-2",
        question: "What is the difference between satisfies and as?",
        answer:
          "satisfies asks the compiler to verify compatibility while preserving the expression's inferred type. An as assertion tells the compiler to treat a value as another type and can hide missing or incorrect fields.",
      },
      {
        id: "typescript-3",
        question: "Why is QueryNode a discriminated union?",
        answer:
          "Condition and group nodes share a kind field with different literals. Checking kind narrows the type, allowing recursive code to access children only for groups and condition fields only for leaves.",
      },
    ],
  },
  {
    id: "state",
    index: "03",
    title: "State ownership",
    shortTitle: "State ownership",
    eyebrow: "Query + Zustand",
    summary:
      "Know why the app uses multiple state layers, where each value belongs, and how Context hides infrastructure behind application commands.",
    minutes: 18,
    accent: "emerald",
    outcomes: [
      "Compare local state, Zustand, TanStack Query, storage, and URL state.",
      "Explain selector subscriptions and persisted Zustand middleware.",
      "Defend the TaskOperations Context façade.",
    ],
    concepts: [
      {
        title: "Narrowest suitable owner",
        body:
          "Local interaction stays in component state. Shared workflow lives in Zustand. Asynchronous entity state lives in TanStack Query. Confirmed data lives in the repository. Shareable filters live in the URL.",
      },
      {
        title: "Server state without a server",
        body:
          "Server state describes async external data with cache, stale, and mutation semantics. The repository is browser-local today, but its boundary is intentionally replaceable with HTTP.",
      },
      {
        title: "Context façade",
        body:
          "Components call execute, undo, redo, triggerRemote, and resetDataset. They do not manipulate storage keys or mutation callbacks directly.",
      },
    ],
    code: [
      {
        label: "Query owner",
        file: "features/tasks/task-operations.tsx",
        language: "ts",
        code: `const query = useQuery({
  queryKey: ["tasks"],
  queryFn: loadConfirmedTasks,
  initialData: () => makeSeedTasks(),
  refetchOnMount: "always",
})`,
      },
      {
        label: "Zustand persistence",
        file: "stores/board-store.ts",
        language: "ts",
        code: `create<BoardState>()(
  persist(
    (set, get) => ({ /* state and actions */ }),
    {
      name: "task-board:client:v1",
      partialize: (state) => ({
        search: state.search,
        pending: state.pending,
        past: state.past,
      }),
    }
  )
)`,
      },
    ],
    mentalModel: [
      "Local state → temporary interaction",
      "Zustand → shared workflow",
      "TanStack Query → async entity projection",
      "Repository → confirmed durability",
      "URL → shareable navigation state",
    ],
    pitfalls: [
      "Duplicating one authoritative value across multiple owners.",
      "Subscribing every component to the entire Zustand store.",
      "Putting dialog state into a server-state query cache.",
    ],
    questions: [
      {
        id: "state-1",
        question: "Why not keep everything in Zustand?",
        answer:
          "It could work, but it would mix asynchronous entity/cache behavior with UI workflow behavior. TanStack Query already supplies query identity, cache writes, mutation callbacks, freshness, and persistence integration.",
      },
      {
        id: "state-2",
        question: "Why not keep everything in TanStack Query?",
        answer:
          "Dialogs, shortcuts, edit drafts, undo stacks, presence, and simulation controls are client workflow state, not one remote query. Modeling them as query data would blur semantics.",
      },
      {
        id: "state-3",
        question: "Why use useBoardStore(selector)?",
        answer:
          "A selector subscribes the component to only the chosen slice. That avoids re-rendering a card when unrelated filters, timers, or dialogs change.",
      },
    ],
  },
  {
    id: "optimistic",
    index: "04",
    title: "Optimistic mutations & offline replay",
    shortTitle: "Optimistic engine",
    eyebrow: "Core differentiator",
    summary:
      "Trace one command through persistence, projection, latency, confirmation, rollback, reload recovery, and undo/redo.",
    minutes: 22,
    accent: "amber",
    outcomes: [
      "Distinguish confirmed, pending, projected, and draft task state.",
      "Explain why rollback replays operations instead of restoring a snapshot.",
      "Trace offline work and exact-once runtime recovery.",
    ],
    concepts: [
      {
        title: "Operation log projection",
        body:
          "The visible board is confirmed tasks with pending operations reduced over them in order. The operation log preserves intent and causality; a cached array alone cannot.",
      },
      {
        title: "Safe rollback",
        body:
          "Failure removes one operation, reloads the latest confirmed tasks, and replays everything still pending. It never restores a stale whole-array snapshot.",
      },
      {
        title: "Durable recovery",
        body:
          "Outcome and deadline are selected at queue time and persisted. A module-level active ID set prevents duplicate starts inside one runtime; the persisted log is the source after reload.",
      },
    ],
    code: [
      {
        label: "Projection",
        file: "features/tasks/repository.ts",
        language: "ts",
        code: `export function reconcilePending(
  confirmed: Task[],
  operations: PendingOperation[]
) {
  return operations.reduce(
    (tasks, operation) =>
      applyOperationToTasks(tasks, operation),
    confirmed
  )
}`,
      },
      {
        label: "Failure path",
        file: "features/tasks/task-operations.tsx",
        language: "ts",
        code: `onError: (_error, operation) => {
  store.removePending(operation.id)
  if (operation.recordHistory) {
    store.removeHistory(operation.id)
  }

  const confirmed = loadConfirmedTasks()
  queryClient.setQueryData(
    ["tasks"],
    reconcilePending(confirmed, getState().pending)
  )
}`,
      },
    ],
    mentalModel: [
      "Draft → unsaved form intent",
      "Execute → durable pending operation",
      "Projection → immediate visible state",
      "Success → commit into confirmed state",
      "Failure → remove one operation and replay",
      "Offline → keep intent, delay request",
    ],
    pitfalls: [
      "Calling optimistic UI the same thing as optimistic concurrency control.",
      "Restoring an old cache snapshot after failure.",
      "Claiming the runtime Set provides server idempotency.",
    ],
    questions: [
      {
        id: "optimistic-1",
        question: "Why is replay safer than snapshot rollback?",
        answer:
          "A captured snapshot can erase changes confirmed after the request began or unrelated optimistic work. Replay starts from the latest confirmed data and applies only operations still pending.",
      },
      {
        id: "optimistic-2",
        question: "What survives a reload?",
        answer:
          "Confirmed tasks, query cache, selected Zustand workflow state, drafts, history, filters, conflicts, simulation settings, and pending operations. The active runtime Set and transient dialog state do not.",
      },
      {
        id: "optimistic-3",
        question: "How does an offline operation resume?",
        answer:
          "It is persisted with waitForConnection and projected immediately. On reconnect the provider reloads confirmed data, replays all pending work, assigns normal latency to offline operations, and starts IDs absent from the runtime active set.",
      },
      {
        id: "optimistic-4",
        question: "How do undo and redo work?",
        answer:
          "History stores before and after snapshots. Undo submits before and redo submits after through the same optimistic command path, so latency, offline behavior, persistence, confirmation, and rollback remain consistent.",
      },
    ],
  },
  {
    id: "virtual",
    index: "05",
    title: "TanStack Virtual",
    shortTitle: "Virtualization",
    eyebrow: "Performance lab",
    summary:
      "Understand the spacer-and-translate model, every virtualizer option, measurement, overscan, stable keys, and drag integration.",
    minutes: 20,
    accent: "rose",
    outcomes: [
      "Draw the virtual scroll geometry from memory.",
      "Explain each useVirtualizer option used by TaskColumn.",
      "Differentiate virtualization, pagination, and memoization.",
    ],
    concepts: [
      {
        title: "Full list, partial DOM",
        body:
          "The full task array stays in memory and the scrollbar represents every row. Only the visible range plus overscan is mounted in the DOM.",
      },
      {
        title: "Spacer and translated rows",
        body:
          "A relative spacer uses getTotalSize. Mounted rows are absolute and translated to row.start. measureElement corrects estimated heights with real card sizes.",
      },
      {
        title: "Independent virtualizers",
        body:
          "Each status column has its own scroll element, offset, measurements, and logical list, so each needs its own virtualizer.",
      },
    ],
    code: [
      {
        label: "Configuration",
        file: "features/board/task-column.tsx",
        language: "ts",
        code: `const virtualizer = useVirtualizer({
  count: tasks.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 190,
  overscan: 8,
  getItemKey: (index) => tasks[index]?.id ?? index,
  initialRect: { width: 400, height: 600 },
  useFlushSync: false,
})`,
      },
      {
        label: "Virtual rows",
        file: "features/board/task-column.tsx",
        language: "tsx",
        code: `<div style={{
  height: virtualizer.getTotalSize(),
  position: "relative"
}}>
  {virtualizer.getVirtualItems().map((row) => (
    <div
      data-index={row.index}
      ref={virtualizer.measureElement}
      style={{
        position: "absolute",
        transform: \`translateY(\${row.start}px)\`,
      }}
    />
  ))}
</div>`,
      },
    ],
    mentalModel: [
      "count → logical list length",
      "estimateSize → provisional row geometry",
      "scroll element → current viewport",
      "overscan → buffer around viewport",
      "total size → scrollbar range",
      "measureElement → actual row sizes",
    ],
    pitfalls: [
      "Saying virtualization fetches less data.",
      "Using array indexes as keys after filtering or reordering.",
      "Assuming unmounted rows expose DOM rectangles to dnd-kit.",
    ],
    questions: [
      {
        id: "virtual-1",
        question: "Explain TanStack Virtual without library vocabulary.",
        answer:
          "The browser gets a full-height scroll area, but only nearby rows exist as DOM nodes. Those rows are measured and translated to their logical offsets, so scrolling looks complete while layout work stays bounded.",
      },
      {
        id: "virtual-2",
        question: "Why pass getScrollElement as a function?",
        answer:
          "The ref is null during render and populated after mount. The virtualizer needs a callback that returns the current scroll element when available.",
      },
      {
        id: "virtual-3",
        question: "What does overscan trade off?",
        answer:
          "Too little can show blanking during fast scroll; too much mounts extra DOM and reduces the performance benefit. Eight card rows is the chosen buffer.",
      },
      {
        id: "virtual-4",
        question: "How would you prove virtualization works?",
        answer:
          "Load 1,000 tasks, assert or inspect that only visible rows plus overscan are mounted, then compare render, layout, memory, and scrolling profiles with a nonvirtual baseline.",
      },
    ],
  },
  {
    id: "drag",
    index: "06",
    title: "dnd-kit & fractional ordering",
    shortTitle: "Drag & ordering",
    eyebrow: "Interaction system",
    summary:
      "Trace sensors, droppable columns, sortable cards, collision detection, overlay behavior, accessible fallbacks, and rank calculation.",
    minutes: 16,
    accent: "violet",
    outcomes: [
      "Explain the DndContext/useDroppable/useSortable hierarchy.",
      "Calculate a task position between any two neighbors.",
      "Defend keyboard sensors and the status-select fallback.",
    ],
    concepts: [
      {
        title: "Three interaction layers",
        body:
          "DndContext owns sensors and lifecycle. Columns use useDroppable. Cards use useSortable. The grip receives listeners so card content remains interactive.",
      },
      {
        title: "Fractional indexing",
        body:
          "A move calculates a number between neighbor ranks rather than renumbering every following task. Sorting by position reconstructs the column.",
      },
      {
        title: "Accessible redundancy",
        body:
          "Keyboard sensors and announcements support spatial interaction. The status select supplies a simpler non-drag path and works even when a target virtual row is unmounted.",
      },
    ],
    code: [
      {
        label: "Sensors",
        file: "features/board/board-app.tsx",
        language: "ts",
        code: `const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
)`,
      },
      {
        label: "Position",
        file: "features/board/board-app.tsx",
        language: "ts",
        code: `const position =
  before && after
    ? (before.position + after.position) / 2
    : before
      ? before.position + 1000
      : after
        ? after.position - 1000
        : 0`,
      },
    ],
    mentalModel: [
      "Pointer/keyboard sensor → active ID",
      "closestCenter → over ID",
      "target task or column → destination status",
      "neighbor ranks → new position",
      "execute → optimistic move",
    ],
    pitfalls: [
      "Attaching drag listeners to the entire interactive card.",
      "Claiming advisory presence locks are a security boundary.",
      "Ignoring rank precision after repeated midpoint insertions.",
    ],
    questions: [
      {
        id: "drag-1",
        question: "Why use fractional positions instead of indexes?",
        answer:
          "Only the moved task needs a new rank. Renumbering all following tasks would create many writes and larger optimistic operations.",
      },
      {
        id: "drag-2",
        question: "Why disable DragOverlay drop animation?",
        answer:
          "The optimistic card has already moved. Default animation can target stale source geometry and appear to fly backward before settling.",
      },
      {
        id: "drag-3",
        question: "What is the production limitation of midpoint ranks?",
        answer:
          "Repeated insertion into the same gap creates very close floating-point values. Production should periodically normalize or use a ranking scheme designed for distributed ordering.",
      },
    ],
  },
  {
    id: "query",
    index: "07",
    title: "Query AST, compiler & URL parser",
    shortTitle: "Query engine",
    eyebrow: "Recursive data",
    summary:
      "Treat the advanced query as a small language: model its syntax tree, edit it immutably, compile predicates, parse precedence, and synchronize safely.",
    minutes: 22,
    accent: "cyan",
    outcomes: [
      "Draw a nested condition/group AST.",
      "Explain structural sharing and recursive updates.",
      "Derive AND precedence from both compiler and parser structure.",
    ],
    concepts: [
      {
        title: "AST over executable strings",
        body:
          "The query is structured data. That makes it safe, serializable, validateable, recursively editable, and testable without eval.",
      },
      {
        title: "OR of AND clauses",
        body:
          "Compilation splits child predicates at OR connectors and evaluates clauses.some(clause.every). This gives AND higher precedence.",
      },
      {
        title: "Hydration-safe URL state",
        body:
          "Inbound URL state is applied after Zustand hydration. A microtask readiness gate prevents persisted store state from overwriting a shared link before the URL update settles.",
      },
    ],
    code: [
      {
        label: "Recursive update",
        file: "features/query-builder/query-engine.ts",
        language: "ts",
        code: `const visit = (node: QueryNode): QueryNode => {
  if (node.id === id) return update(node)

  return node.kind === "group"
    ? { ...node, children: node.children.map(visit) }
    : node
}`,
      },
      {
        label: "Predicate compiler",
        file: "features/query-builder/query-engine.ts",
        language: "ts",
        code: `const clauses: Predicate[][] = [[]]

children.forEach((predicate, index) => {
  if (index > 0 && connectors[index - 1] === "or") {
    clauses.push([])
  }
  clauses.at(-1)!.push(predicate)
})

return (task) =>
  clauses.some((clause) =>
    clause.every((predicate) => predicate(task))
  )`,
      },
    ],
    mentalModel: [
      "Condition → leaf predicate",
      "Group → recursive children",
      "Immutable editor → new path references",
      "Compiler → task predicate",
      "Serializer → ruleN + logic",
      "Parser → validated AST",
    ],
    pitfalls: [
      "Using eval for user-built expressions.",
      "Mutating nodes in place and expecting predictable React updates.",
      "Letting persisted state overwrite URL state during hydration.",
    ],
    questions: [
      {
        id: "query-1",
        question: "Why model the query recursively?",
        answer:
          "Nested boolean groups are recursive by nature: groups contain conditions or more groups. The editor, compiler, serializer, parser, and description function can all mirror that shape.",
      },
      {
        id: "query-2",
        question: "How is A OR B AND C evaluated?",
        answer:
          "AND binds more tightly, so it becomes A OR (B AND C). The compiler creates OR-separated clauses of AND predicates and evaluates some(every).",
      },
      {
        id: "query-3",
        question: "Why use replaceState for filters?",
        answer:
          "Filtering happens on an already-loaded client collection. replaceState makes the URL shareable without server navigation or adding one browser-history entry per keystroke.",
      },
      {
        id: "query-4",
        question: "How are malformed URLs handled?",
        answer:
          "Fields and operators are validated, the grammar rejects incomplete or leftover tokens, legacy payloads use Zod, and invalid data returns null rather than executing or crashing.",
      },
    ],
  },
  {
    id: "collaboration",
    index: "08",
    title: "Conflicts, presence & CRDT-like merge",
    shortTitle: "Collaboration",
    eyebrow: "Distributed concepts",
    summary:
      "Separate simulation from production guarantees while explaining versions, dirty drafts, advisory locks, convergence, and observed-remove behavior.",
    minutes: 20,
    accent: "amber",
    outcomes: [
      "Distinguish optimistic UI from optimistic concurrency control.",
      "Trace clean and dirty draft behavior during a remote update.",
      "Explain why the description algorithm is CRDT-like, not a text CRDT.",
    ],
    concepts: [
      {
        title: "Conflict snapshot",
        body:
          "A dirty draft retains its original base while the newest remote task becomes incoming. Changed editable fields drive Take theirs, Keep mine, or manual review.",
      },
      {
        title: "Advisory presence",
        body:
          "Viewing and editing avatars improve coordination. Editing disables controls for other simulated users, but no client-only lock can enforce security or correctness.",
      },
      {
        title: "Deterministic merge",
        body:
          "Base blocks removed by either branch stay removed. Concurrent additions sort by actor, source index, and text, so equivalent branches converge regardless of arrival order.",
      },
    ],
    code: [
      {
        label: "Remote conflict",
        file: "features/tasks/task-operations.tsx",
        language: "ts",
        code: `if (
  store.selectedTaskId === next.id &&
  store.draftDirty &&
  store.draftBaseTask
) {
  store.setConflict({
    taskId: next.id,
    base: store.draftBaseTask,
    incoming: next,
    changedFields,
  })
}`,
      },
      {
        label: "Convergent additions",
        file: "features/collaboration/description-crdt.ts",
        language: "ts",
        code: `const concurrent = [
  ...additions(mine, baseSet, mineActor),
  ...additions(theirs, baseSet, theirsActor),
].sort((left, right) =>
  left.actor.localeCompare(right.actor) ||
  left.index - right.index ||
  left.block.localeCompare(right.block)
)`,
      },
    ],
    mentalModel: [
      "Clean draft → refresh from remote",
      "Dirty draft → preserve mine + base",
      "Incoming task → newest confirmed version",
      "Changed fields → focused comparison",
      "Resolution → one optimistic operation",
    ],
    pitfalls: [
      "Calling version increments compare-and-swap enforcement.",
      "Calling a deterministic sentence merge a complete text CRDT.",
      "Equating convergence with a semantically perfect result.",
    ],
    questions: [
      {
        id: "collaboration-1",
        question: "Is version enforcing concurrency?",
        answer:
          "No. It communicates ordering and supports conflict UX, but commitOperation does not reject a stale expected version. Complete OCC needs a server compare-and-swap rule.",
      },
      {
        id: "collaboration-2",
        question: "What makes the description merge convergent?",
        answer:
          "Concurrent additions have a deterministic order based on stable actor identity, source index, and text. Swapping branch arrival while preserving actors produces the same order.",
      },
      {
        id: "collaboration-3",
        question: "Why call it CRDT-like?",
        answer:
          "It demonstrates convergence and observed-remove behavior over sentence blocks, but lacks stable element IDs, causal metadata, replicated operations, cursors, and transport.",
      },
      {
        id: "collaboration-4",
        question: "Could full snapshots lose updates?",
        answer:
          "Yes. A complete local snapshot can overwrite an unrelated remote field. Production should use expected versions plus field patches, or an appropriate OT/CRDT design.",
      },
    ],
  },
  {
    id: "react-ui",
    index: "09",
    title: "React performance, UI & accessibility",
    shortTitle: "React & UI",
    eyebrow: "Product quality",
    summary:
      "Connect hooks, selectors, stable identities, headless primitives, semantic tokens, motion preferences, and accessible alternative paths.",
    minutes: 18,
    accent: "emerald",
    outcomes: [
      "Differentiate memo, useMemo, and useCallback.",
      "Explain controlled forms and effect cleanup.",
      "Name concrete accessibility measures beyond the component library.",
    ],
    concepts: [
      {
        title: "Memoization roles",
        body:
          "memo can skip a component render by props. useMemo caches a computed value. useCallback caches a function identity. They optimize; they do not establish correctness.",
      },
      {
        title: "Headless behavior, owned styling",
        body:
          "Base UI supplies interaction and accessibility mechanics. Project-owned shadcn components add CVA variants and semantic Tailwind tokens.",
      },
      {
        title: "Accessibility as composition",
        body:
          "Keyboard DnD, status selects, drag announcements, form labels, busy/invalid states, shortcut guards, focus primitives, and reduced motion work together.",
      },
    ],
    code: [
      {
        label: "Derived board state",
        file: "features/board/board-app.tsx",
        language: "ts",
        code: `const advancedPredicate = useMemo(
  () => compileTaskQuery(advancedQuery),
  [advancedQuery]
)

const pendingIds = useMemo(
  () => new Set(pending.map((op) => op.taskId)),
  [pending]
)`,
      },
      {
        label: "Controlled field",
        file: "features/board/task-form.tsx",
        language: "tsx",
        code: `<Input
  id={\`\${prefix}-title\`}
  value={value.title}
  aria-invalid={Boolean(errors.title)}
  onChange={(event) =>
    onChange({ title: event.target.value })
  }
/>`,
      },
    ],
    mentalModel: [
      "Render → derive values",
      "Effect → synchronize external system",
      "Selector → narrow subscription",
      "Stable ID → identity across systems",
      "Headless primitive → interaction behavior",
      "Semantic token → theme-independent style",
    ],
    pitfalls: [
      "Using effects to copy values that can be derived during render.",
      "Claiming memoization alone solves 1,000 mounted cards.",
      "Assuming a headless library automatically makes composition accessible.",
    ],
    questions: [
      {
        id: "react-ui-1",
        question: "What is the difference between memo, useMemo, and useCallback?",
        answer:
          "memo may skip a component render when props are shallowly equal. useMemo caches a computed value. useCallback caches a function identity.",
      },
      {
        id: "react-ui-2",
        question: "Why use controlled forms?",
        answer:
          "The explicit draft enables validation, persistence, reset, create/edit reuse, conflict comparison, and programmatic replacement without reading the DOM imperatively.",
      },
      {
        id: "react-ui-3",
        question: "Name concrete accessibility measures in the board.",
        answer:
          "Keyboard and pointer DnD, a status-select fallback, announcements, landmarks, headings, labels, stable IDs, aria-busy and aria-invalid, focus-managed primitives, shortcut guards, lock descriptions, and reduced motion.",
      },
    ],
  },
  {
    id: "testing",
    index: "10",
    title: "Testing, deployment & production redesign",
    shortTitle: "Ship & scale",
    eyebrow: "Close strongly",
    summary:
      "Defend the test split, describe standalone Docker output, identify honest limitations, and propose a credible real-world evolution.",
    minutes: 18,
    accent: "rose",
    outcomes: [
      "Choose unit versus browser tests based on the behavior boundary.",
      "Explain the multi-stage standalone Docker build.",
      "Turn every current limitation into a concrete production change.",
    ],
    concepts: [
      {
        title: "Test semantic properties",
        body:
          "Pure query, replay, validation, and merge logic belongs in fast unit tests. Hydration, DnD, persistence, focus, and multi-feature journeys belong in Playwright.",
      },
      {
        title: "Minimal runtime",
        body:
          "Next.js standalone output traces the server dependencies. A multi-stage Dockerfile installs, builds, then copies only public, standalone, and static output into a non-root runtime.",
      },
      {
        title: "Constraint → evolution",
        body:
          "Frame localStorage, simulated presence, full snapshots, fractional ranks, and client locks as assignment-fit choices with explicit production replacements.",
      },
    ],
    code: [
      {
        label: "Property test",
        file: "features/collaboration/description-crdt.test.ts",
        language: "ts",
        code: `const first = mergeDescription({
  base, mine: local, theirs: remote,
  mineActor: "You", theirsActor: "Alex",
})

const second = mergeDescription({
  base, mine: remote, theirs: local,
  mineActor: "Alex", theirsActor: "You",
})

expect(first).toBe(second)`,
      },
      {
        label: "Standalone build",
        file: "next.config.ts",
        language: "ts",
        code: `const nextConfig: NextConfig = {
  output: "standalone",
}

export default nextConfig`,
      },
    ],
    mentalModel: [
      "Pure rule → unit test",
      "Browser boundary → E2E test",
      "Build stage → compile and trace",
      "Runtime stage → minimal non-root image",
      "Client simulation → real API/realtime evolution",
    ],
    pitfalls: [
      "Defending every current choice as universally production-ready.",
      "Testing pure algorithms only through slow browser journeys.",
      "Claiming browser localStorage becomes shared because the container scales.",
    ],
    questions: [
      {
        id: "testing-1",
        question: "Why not test everything through Playwright?",
        answer:
          "Pure recursive and reconciliation algorithms are faster and clearer as unit tests. Browser tests are reserved for DOM, focus, persistence, actual events, and cross-feature integration.",
      },
      {
        id: "testing-2",
        question: "What would you test next?",
        answer:
          "Forced rollback with unrelated pending work, exact-once resume, undo failure cursor recovery, keyboard reorder, every conflict path, bounded DOM count, and malformed storage or URL recovery.",
      },
      {
        id: "testing-3",
        question: "How would this become a real collaborative system?",
        answer:
          "Use authenticated APIs and a transactional database, server version preconditions and field patches, idempotency keys, realtime invalidation and expiring presence, normalized or paginated data, and a mature CRDT only if text collaboration requires it.",
      },
      {
        id: "testing-4",
        question: "What is the most important current limitation?",
        answer:
          "There is no authoritative multi-user backend. Full snapshots, local versions, and client-only locks demonstrate collaboration workflows but cannot guarantee cross-client consistency, authorization, or conflict safety.",
      },
    ],
  },
]

export const flows: Flow[] = [
  {
    id: "create",
    title: "Create → confirm",
    summary: "Follow a new task from controlled form state to confirmed storage.",
    accent: "emerald",
    steps: [
      {
        label: "Validate draft",
        owner: "TaskForm",
        detail: "Required title, description, and assignee are checked in the controlled form.",
        state: "Draft only",
      },
      {
        label: "Build task",
        owner: "CreateTaskDialog",
        detail: "Generate ID, timestamps, actor, version 0, and a top-of-column fractional position.",
        state: "Draft → task",
      },
      {
        label: "Queue command",
        owner: "TaskOperations.execute",
        detail: "Persist the operation, history entry, predetermined outcome, and dueAt.",
        state: "Pending + history",
      },
      {
        label: "Project immediately",
        owner: "TanStack Query",
        detail: "Replay every pending operation over confirmed tasks and update the cache.",
        state: "Projected board",
      },
      {
        label: "Commit",
        owner: "Repository",
        detail: "After latency, save confirmed tasks and increment the task version.",
        state: "Confirmed",
      },
      {
        label: "Reconcile",
        owner: "Mutation success",
        detail: "Remove the completed operation and replay anything still pending.",
        state: "Confirmed + remaining pending",
      },
    ],
  },
  {
    id: "failure",
    title: "Failure → safe rollback",
    summary: "See why operation replay is safer than restoring an old array.",
    accent: "rose",
    steps: [
      {
        label: "Optimistic view",
        owner: "Query projection",
        detail: "The intended task change is already visible while the request waits.",
        state: "Confirmed + P1 + P2 + P3",
      },
      {
        label: "Request fails",
        owner: "useMutation",
        detail: "The predetermined failure throws after the simulated deadline.",
        state: "P2 failed",
      },
      {
        label: "Remove one intent",
        owner: "Zustand",
        detail: "Only P2 and its history entry are removed.",
        state: "P1 + P3 remain",
      },
      {
        label: "Reload truth",
        owner: "Repository",
        detail: "Load the newest confirmed database rather than a captured old cache snapshot.",
        state: "Latest confirmed",
      },
      {
        label: "Replay survivors",
        owner: "reconcilePending",
        detail: "Apply P1 and P3 in order, preserving unrelated optimistic and remote work.",
        state: "Latest confirmed + P1 + P3",
      },
    ],
  },
  {
    id: "offline",
    title: "Offline → reconnect",
    summary: "Trace durable local intent when no mutation can start yet.",
    accent: "amber",
    steps: [
      {
        label: "Detect offline",
        owner: "NetworkStatus",
        detail: "Combine navigator events with the deterministic forced-offline setting.",
        state: "connected = false",
      },
      {
        label: "Persist intent",
        owner: "execute",
        detail: "Create a pending operation marked waitForConnection and show it immediately.",
        state: "Optimistic + durable",
      },
      {
        label: "Reconnect",
        owner: "Browser/Zustand",
        detail: "The online state change wakes the recovery effect.",
        state: "connected = true",
      },
      {
        label: "Rebase",
        owner: "TaskOperations effect",
        detail: "Reload confirmed tasks and replay all pending operations.",
        state: "Latest truth + local intent",
      },
      {
        label: "Resume once",
        owner: "runtimeActive",
        detail: "Reset normal latency and start operations absent from the active runtime set.",
        state: "Mutation active",
      },
    ],
  },
  {
    id: "query",
    title: "Query → virtual columns",
    summary: "Follow one rule from recursive editor to mounted task cards.",
    accent: "cyan",
    steps: [
      {
        label: "Edit AST",
        owner: "QueryBuilder",
        detail: "Immutable recursion replaces the selected condition and its ancestor path.",
        state: "advancedQuery",
      },
      {
        label: "Share URL",
        owner: "useQueryUrlSync",
        detail: "Serialize rules and boolean logic with history.replaceState.",
        state: "ruleN + logic",
      },
      {
        label: "Compile",
        owner: "query-engine",
        detail: "Turn the tree into an OR-of-AND predicate with standard precedence.",
        state: "(task) => boolean",
      },
      {
        label: "Filter and group",
        owner: "BoardExperience",
        detail: "Apply quick and advanced filters, then sort three status arrays by position.",
        state: "Record<Status, Task[]>",
      },
      {
        label: "Virtualize",
        owner: "TaskColumn",
        detail: "Render only each viewport's visible task rows plus overscan.",
        state: "Bounded DOM",
      },
    ],
  },
  {
    id: "conflict",
    title: "Remote edit → resolution",
    summary: "Follow versioned remote state into a reviewed optimistic resolution.",
    accent: "violet",
    steps: [
      {
        label: "Preserve base",
        owner: "TaskDetailsSheet",
        detail: "A dirty controlled draft retains the task snapshot it began from.",
        state: "base + mine",
      },
      {
        label: "Confirm remote",
        owner: "triggerRemote",
        detail: "The simulated remote update increments version in confirmed storage.",
        state: "incoming",
      },
      {
        label: "Detect fields",
        owner: "changedDraftFields",
        detail: "Compare editable fields and store the conflict snapshot.",
        state: "base + mine + incoming",
      },
      {
        label: "Resolve",
        owner: "Conflict dialog",
        detail: "Take theirs, keep mine, or review the deterministic description proposal.",
        state: "reviewed draft",
      },
      {
        label: "Queue one action",
        owner: "execute",
        detail: "Use incoming as before and save resolution as one undoable optimistic operation.",
        state: "Pending resolve",
      },
    ],
  },
]

export const allQuestions = lessons.flatMap((lesson) =>
  lesson.questions.map((question) => ({
    ...question,
    lessonId: lesson.id,
    lessonTitle: lesson.shortTitle,
    accent: lesson.accent,
  }))
)

export const accentClasses: Record<
  Lesson["accent"],
  {
    text: string
    soft: string
    border: string
    solid: string
    glow: string
  }
> = {
  violet: {
    text: "text-violet-700 dark:text-violet-300",
    soft: "bg-violet-500/10",
    border: "border-violet-500/25",
    solid: "bg-violet-600",
    glow: "shadow-violet-500/20",
  },
  cyan: {
    text: "text-cyan-700 dark:text-cyan-300",
    soft: "bg-cyan-500/10",
    border: "border-cyan-500/25",
    solid: "bg-cyan-600",
    glow: "shadow-cyan-500/20",
  },
  amber: {
    text: "text-amber-700 dark:text-amber-300",
    soft: "bg-amber-500/10",
    border: "border-amber-500/25",
    solid: "bg-amber-500",
    glow: "shadow-amber-500/20",
  },
  emerald: {
    text: "text-emerald-700 dark:text-emerald-300",
    soft: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    solid: "bg-emerald-600",
    glow: "shadow-emerald-500/20",
  },
  rose: {
    text: "text-rose-700 dark:text-rose-300",
    soft: "bg-rose-500/10",
    border: "border-rose-500/25",
    solid: "bg-rose-600",
    glow: "shadow-rose-500/20",
  },
}
