"use client"

import { useMemo, useState } from "react"
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import * as m from "motion/react-m"
import { useTheme } from "next-themes"
import { Github, Keyboard, Laptop, Linkedin, Mail, Moon, Plus, Redo2, Sun, Undo2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useBoardStore } from "@/stores/board-store"
import { STATUSES, type Task, type TaskStatus } from "@/features/tasks/types"
import { TaskOperationsProvider, useTaskOperations } from "@/features/tasks/task-operations"
import { DeveloperTools } from "@/features/developer-tools/developer-tools"
import { ShortcutsDialog } from "@/features/keyboard-shortcuts/shortcuts-dialog"
import { useKeyboardShortcuts } from "@/features/keyboard-shortcuts/use-keyboard-shortcuts"
import { BoardFilters } from "./board-filters"
import { TaskColumn } from "./task-column"
import { TaskCard } from "./task-card"
import { CreateTaskDialog } from "./create-task-dialog"
import { TaskDetailsSheet } from "./task-details-sheet"
import { filterTasks } from "@/features/tasks/selectors"

export function BoardApp() { return <TaskOperationsProvider><BoardExperience /></TaskOperationsProvider> }

function BoardExperience() {
  const { tasks, isLoading, execute, undo, redo } = useTaskOperations()
  const search = useBoardStore((state) => state.search)
  const assignee = useBoardStore((state) => state.assignee)
  const priority = useBoardStore((state) => state.priority)
  const pending = useBoardStore((state) => state.pending)
  const past = useBoardStore((state) => state.past)
  const future = useBoardStore((state) => state.future)
  const setCreateOpen = useBoardStore((state) => state.setCreateOpen)
  const setShortcutsOpen = useBoardStore((state) => state.setShortcutsOpen)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  useKeyboardShortcuts({ undo, redo })

  const filtered = useMemo(() => filterTasks(tasks, { search, assignee, priority }), [assignee, priority, search, tasks])
  const grouped = useMemo(() => Object.fromEntries(STATUSES.map((status) => [status, filtered.filter((task) => task.status === status).sort((a, b) => a.position - b.position)])) as Record<TaskStatus, Task[]>, [filtered])
  const pendingIds = useMemo(() => new Set(pending.map((operation) => operation.taskId)), [pending])

  const moveTask = (task: Task, status: TaskStatus, overTask?: Task) => {
    if (task.status === status && overTask?.id === task.id) return
    const ordered = tasks.filter((item) => item.status === status && item.id !== task.id).sort((a, b) => a.position - b.position)
    let index = overTask ? ordered.findIndex((item) => item.id === overTask.id) : ordered.length
    if (index < 0) index = ordered.length
    const before = ordered[index - 1]
    const after = ordered[index]
    const position = before && after ? (before.position + after.position) / 2 : before ? before.position + 1000 : after ? after.position - 1000 : 0
    execute(task, { ...task, status, position }, status === task.status ? `Reorder “${task.title}”` : `Move “${task.title}” to ${status}`, { kind: "update" })
  }
  const onDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    if (!event.over) return
    const task = tasks.find((item) => item.id === event.active.id)
    if (!task) return
    const overTask = tasks.find((item) => item.id === event.over!.id)
    const status = (overTask?.status ?? String(event.over.id).replace("column-", "")) as TaskStatus
    if (STATUSES.includes(status)) moveTask(task, status, overTask)
  }
  const onDragStart = (event: DragStartEvent) => setActiveTask(tasks.find((task) => task.id === event.active.id) ?? null)

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--color-muted),transparent_35%)]">
    <AppHeader undo={undo} redo={redo} undoLabel={past.at(-1)?.label} redoLabel={future.at(-1)?.label} onCreate={() => setCreateOpen(true)} onShortcuts={() => setShortcutsOpen(true)} />
    <DeveloperTools />
    <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-5 sm:px-6">
      <div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Thomson Reuters Board</h1><p className="mt-1 text-sm text-muted-foreground">Optimistic, collaborative, and designed to stay fast at 1,000+ tasks.</p></div>
      <BoardFilters resultCount={filtered.length} totalCount={tasks.length} />
      {isLoading ? <LoadingBoard /> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveTask(null)} accessibility={{ announcements: { onDragStart: ({ active }) => `Picked up ${tasks.find((task) => task.id === active.id)?.title}`, onDragOver: ({ over }) => over ? `Over ${over.id}` : undefined, onDragEnd: () => "Task dropped", onDragCancel: () => "Drag cancelled" } }}>
        <div className="flex snap-x gap-4 overflow-x-auto pb-3 lg:grid lg:grid-cols-3 lg:overflow-visible">{STATUSES.map((status) => <div key={status} className="snap-center"><TaskColumn status={status} tasks={grouped[status]} pendingIds={pendingIds} onStatusChange={moveTask} /></div>)}</div>
        <DragOverlay>{activeTask && <m.div initial={{ scale: .98, opacity: .7 }} animate={{ scale: 1.02, opacity: 1 }} className="w-[360px] rotate-1 shadow-2xl"><TaskCard task={activeTask} pending={pendingIds.has(activeTask.id)} onStatusChange={moveTask} /></m.div>}</DragOverlay>
      </DndContext>}
    </main>
    <AppFooter />
    <CreateTaskDialog /><TaskDetailsSheet /><ShortcutsDialog />
  </div>
}

function AppHeader({ undo, redo, undoLabel, redoLabel, onCreate, onShortcuts }: { undo: () => void; redo: () => void; undoLabel?: string; redoLabel?: string; onCreate: () => void; onShortcuts: () => void }) {
  const { resolvedTheme, setTheme } = useTheme()
  return <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-4 sm:px-6"><div className="mr-auto flex items-center gap-2"><div className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Zap className="size-4" fill="currentColor" /></div><span className="hidden font-semibold sm:block">Thomson Reuters Board</span></div>
    <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" disabled={!undoLabel} onClick={undo} aria-label={undoLabel ? `Undo ${undoLabel}` : "Nothing to undo"} />}><Undo2 /></TooltipTrigger><TooltipContent>{undoLabel ? `Undo: ${undoLabel}` : "Nothing to undo"}</TooltipContent></Tooltip>
    <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" disabled={!redoLabel} onClick={redo} aria-label={redoLabel ? `Redo ${redoLabel}` : "Nothing to redo"} />}><Redo2 /></TooltipTrigger><TooltipContent>{redoLabel ? `Redo: ${redoLabel}` : "Nothing to redo"}</TooltipContent></Tooltip>
    <Button variant="outline" onClick={onShortcuts} aria-label="Keyboard Shortcuts"><Keyboard /><span className="hidden sm:inline">Keyboard Shortcuts</span><span className="hidden rounded border px-1 font-mono text-[10px] text-muted-foreground md:inline">?</span></Button>
    <DropdownMenu>
      <Tooltip><TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Theme: ${resolvedTheme ?? "system"}`} />} />}><Moon /></TooltipTrigger><TooltipContent>Choose theme</TooltipContent></Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}><Sun />Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}><Moon />Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}><Laptop />System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button onClick={onCreate}><Plus /><span className="hidden sm:inline">New task</span><span className="hidden rounded border border-primary-foreground/30 px-1 font-mono text-[10px] md:inline">N</span></Button>
  </div></header>
}

function AppFooter() {
  return <footer className="border-t bg-background/80">
    <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p><span className="font-medium text-foreground">Application owner: Sai Dinesh.</span> Designed and built as part of an interview assessment.</p>
      <nav aria-label="Owner contact links" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <a className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground" href="mailto:sai_dinesh@epam.com"><Mail className="size-4" />sai_dinesh@epam.com</a>
        <a className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground" href="https://github.com/saidinesh898" target="_blank" rel="noreferrer"><Github className="size-4" />GitHub</a>
        <a className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground" href="https://www.linkedin.com/in/saidineshkumar/" target="_blank" rel="noreferrer"><Linkedin className="size-4" />LinkedIn</a>
      </nav>
    </div>
  </footer>
}

function LoadingBoard() { return <div className="grid gap-4 lg:grid-cols-3">{STATUSES.map((status) => <div key={status} className="space-y-3 rounded-2xl border p-4"><Skeleton className="h-8 w-32" />{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-40 w-full" />)}</div>)}</div> }
