"use client"

import { useCallback, useMemo } from "react"
import { DragDropProvider, DragOverlay, type DragEndEvent, type DragOverEvent, type DragStartEvent } from "@dnd-kit/react"
import { Accessibility, Feedback, PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom"
import { useTheme } from "next-themes"
import { BookOpenCheck, Keyboard, Laptop, Mail, Moon, Plus, Redo2, Sun, Undo2, Zap } from "lucide-react"
import Link from "next/link"
import { FaGithub, FaLinkedin } from "react-icons/fa"
import { toast } from "sonner"
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
import { TaskDragPreview } from "./task-card"
import { CreateTaskDialog } from "./create-task-dialog"
import { TaskDetailsSheet } from "./task-details-sheet"
import { filterTasks } from "@/features/tasks/selectors"
import { compileTaskQuery } from "@/features/query-builder/query-engine"
import { useQueryUrlSync } from "@/features/query-builder/use-query-url-sync"
import { NetworkStatus } from "@/features/collaboration/network-status"
import styles from "./board-app.module.css"

export function BoardApp() { return <TaskOperationsProvider><BoardExperience /></TaskOperationsProvider> }

function BoardExperience() {
  const { tasks, isLoading, execute, undo, redo } = useTaskOperations()
  const search = useBoardStore((state) => state.search)
  const assignee = useBoardStore((state) => state.assignee)
  const priority = useBoardStore((state) => state.priority)
  const advancedQuery = useBoardStore((state) => state.advancedQuery)
  const pending = useBoardStore((state) => state.pending)
  const past = useBoardStore((state) => state.past)
  const future = useBoardStore((state) => state.future)
  const presence = useBoardStore((state) => state.presence)
  const activeUser = useBoardStore((state) => state.activeUser)
  const setCreateOpen = useBoardStore((state) => state.setCreateOpen)
  const setShortcutsOpen = useBoardStore((state) => state.setShortcutsOpen)
  useKeyboardShortcuts({ undo, redo })
  useQueryUrlSync()

  const advancedPredicate = useMemo(() => compileTaskQuery(advancedQuery), [advancedQuery])
  const filtered = useMemo(() => filterTasks(tasks, { search, assignee, priority }, advancedPredicate), [advancedPredicate, assignee, priority, search, tasks])
  const grouped = useMemo(() => Object.fromEntries(STATUSES.map((status) => [status, filtered.filter((task) => task.status === status).sort((a, b) => a.position - b.position)])) as Record<TaskStatus, Task[]>, [filtered])
  const pendingIds = useMemo(() => new Set(pending.map((operation) => operation.taskId)), [pending])
  const presenceByTask = useMemo(() => {
    const result = new Map<string, typeof presence>()
    presence.forEach((entry) => result.set(entry.taskId, [...(result.get(entry.taskId) ?? []), entry]))
    return result
  }, [presence])
  const lockedByTask = useMemo(() => {
    const result = new Map<string, string>()
    presence.forEach((entry) => {
      if (entry.mode === "editing" && entry.user !== activeUser) result.set(entry.taskId, entry.user)
    })
    return result
  }, [activeUser, presence])

  const moveTask = useCallback((task: Task, status: TaskStatus, overTask?: Task) => {
    const lockedBy = lockedByTask.get(task.id)
    if (lockedBy) {
      toast.warning(`Task is locked by ${lockedBy}`)
      return
    }
    if (task.status === status && overTask?.id === task.id) return
    const ordered = tasks.filter((item) => item.status === status && item.id !== task.id).sort((a, b) => a.position - b.position)
    let index = overTask ? ordered.findIndex((item) => item.id === overTask.id) : ordered.length
    if (index < 0) index = ordered.length
    const before = ordered[index - 1]
    const after = ordered[index]
    const position = before && after ? (before.position + after.position) / 2 : before ? before.position + 1000 : after ? after.position - 1000 : 0
    execute(task, { ...task, status, position }, status === task.status ? `Reorder “${task.title}”` : `Move “${task.title}” to ${status}`, { kind: "update" })
  }, [execute, lockedByTask, tasks])
  const onDragEnd = (event: DragEndEvent) => {
    if (event.canceled) return
    const { source, target } = event.operation
    if (!source || !target) return
    const task = tasks.find((item) => item.id === source.id)
    if (!task) return
    const overTask = tasks.find((item) => item.id === target.id)
    const status = (overTask?.status ?? target.data.status ?? String(target.id).replace("column-", "")) as TaskStatus
    if (STATUSES.includes(status)) moveTask(task, status, overTask)
  }

  return <div className={styles.style1}>
    <AppHeader undo={undo} redo={redo} undoLabel={past.at(-1)?.label} redoLabel={future.at(-1)?.label} onCreate={() => setCreateOpen(true)} onShortcuts={() => setShortcutsOpen(true)} />
    <NetworkStatus />
    <DeveloperTools />
    <main className={styles.style2}>
      <div><h1 className={styles.style3}>Thomson Reuters Board</h1><p className={styles.style4}>Optimistic, collaborative, and designed to stay fast at 1,000+ tasks.</p></div>
      <BoardFilters resultCount={filtered.length} totalCount={tasks.length} />
      {isLoading ? <LoadingBoard /> : <DragDropProvider
        sensors={(defaults) => [
          ...defaults.filter((sensor) => sensor !== PointerSensor),
          PointerSensor.configure({
            activationConstraints: [
              new PointerActivationConstraints.Distance({ value: 6 }),
            ],
          }),
        ]}
        plugins={(defaults) => defaults.map((plugin) => {
          if (plugin === Accessibility) {
            return Accessibility.configure({
              id: "task-board-dnd",
              announcements: {
                dragstart: ({ operation }: DragStartEvent) => `Picked up ${(operation.source?.data.task as Task | undefined)?.title ?? "task"}`,
                dragover: ({ operation }: DragOverEvent) => operation.target ? `Over ${operation.target.id}` : undefined,
                dragend: ({ canceled }: DragEndEvent) => canceled ? "Drag cancelled" : "Task dropped",
              },
            })
          }
          return plugin === Feedback ? Feedback.configure({ dropAnimation: { duration: 0 } }) : plugin
        })}
        onDragStart={(_event, manager) => {
          const feedback = manager.plugins.find((plugin) => plugin instanceof Feedback)
          if (feedback) feedback.dropAnimation = { duration: 0 }
        }}
        onDragEnd={onDragEnd}
      >
        <div className={styles.style5}>{STATUSES.map((status) => <div key={status} className={styles.style6}><TaskColumn status={status} tasks={grouped[status]} pendingIds={pendingIds} onStatusChange={moveTask} presenceByTask={presenceByTask} lockedByTask={lockedByTask} /></div>)}</div>
        <DragOverlay dropAnimation={null}>{(source) => {
          const task = source.data.task as Task | undefined
          return task ? <div className={styles.style7}><TaskDragPreview task={task} pending={pendingIds.has(task.id)} /></div> : null
        }}</DragOverlay>
      </DragDropProvider>}
    </main>
    <AppFooter />
    <CreateTaskDialog /><TaskDetailsSheet /><ShortcutsDialog />
  </div>
}

function AppHeader({ undo, redo, undoLabel, redoLabel, onCreate, onShortcuts }: { undo: () => void; redo: () => void; undoLabel?: string; redoLabel?: string; onCreate: () => void; onShortcuts: () => void }) {
  const { setTheme } = useTheme()
  return <header className={styles.style8}><div className={styles.style9}><div className={styles.style10}><div className={styles.style11}><Zap className={styles.style12} fill="currentColor" /></div><span className={styles.style13}>Thomson Reuters Board</span></div>
    <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" disabled={!undoLabel} onClick={undo} aria-label={undoLabel ? `Undo ${undoLabel}` : "Nothing to undo"} />}><Undo2 /></TooltipTrigger><TooltipContent>{undoLabel ? `Undo: ${undoLabel}` : "Nothing to undo"}</TooltipContent></Tooltip>
    <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" disabled={!redoLabel} onClick={redo} aria-label={redoLabel ? `Redo ${redoLabel}` : "Nothing to redo"} />}><Redo2 /></TooltipTrigger><TooltipContent>{redoLabel ? `Redo: ${redoLabel}` : "Nothing to redo"}</TooltipContent></Tooltip>
    <Button variant="outline" onClick={onShortcuts} aria-label="Keyboard Shortcuts"><Keyboard /><span className={styles.style14}>Keyboard Shortcuts</span><span className={styles.style15}>?</span></Button>
    <Button variant="outline" nativeButton={false} render={<Link href="/interview-guide" />} aria-label="Open interview guide"><BookOpenCheck /><span className={styles.style16}>Interview guide</span></Button>
    <DropdownMenu>
      <Tooltip><TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Choose theme" />} />}><Moon /></TooltipTrigger><TooltipContent>Choose theme</TooltipContent></Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}><Sun />Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}><Moon />Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}><Laptop />System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button onClick={onCreate}><Plus /><span className={styles.style14}>New task</span><span className={styles.style17}>N</span></Button>
  </div></header>
}

function AppFooter() {
  return <footer className={styles.style18}>
    <div className={styles.style19}>
      <p className={styles.style20}>Sai Dinesh</p>
      <nav aria-label="Owner contact links" className={styles.style21}>
        <a className={styles.style22} href="mailto:sai_dinesh@epam.com"><Mail className={styles.style12} />sai_dinesh@epam.com</a>
        <a className={styles.style22} href="https://github.com/saidinesh898/task-board" target="_blank" rel="noreferrer"><FaGithub className={styles.style12} aria-hidden="true" />GitHub</a>
        <a className={styles.style23} href="https://www.linkedin.com/in/saidineshkumar/" target="_blank" rel="noreferrer"><FaLinkedin className={styles.style12} aria-hidden="true" />LinkedIn</a>
      </nav>
    </div>
  </footer>
}

function LoadingBoard() { return <div className={styles.style24}>{STATUSES.map((status) => <div key={status} className={styles.style25}><Skeleton className={styles.style26} />{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className={styles.style27} />)}</div>)}</div> }
