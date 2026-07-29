"use client"

import { useCallback, useMemo } from "react"
import {
  DragDropProvider,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/react"
import {
  Accessibility,
  Feedback,
  PointerActivationConstraints,
  PointerSensor,
} from "@dnd-kit/dom"
import { toast } from "sonner"
import { useBoardStore } from "@/stores/board-store"
import {
  STATUSES,
  type Task,
  type TaskStatus,
} from "@/features/tasks/types"
import {
  TaskOperationsProvider,
  useTaskOperations,
} from "@/features/tasks/task-operations"
import { filterTasks } from "@/features/tasks/selectors"
import { compileTaskQuery } from "@/features/query-builder/query-engine"
import { useQueryUrlSync } from "@/features/query-builder/use-query-url-sync"
import { NetworkStatus } from "@/features/collaboration/network-status"
import { DeveloperTools } from "@/features/developer-tools/developer-tools"
import { ShortcutsDialog } from "@/features/keyboard-shortcuts/shortcuts-dialog"
import { useKeyboardShortcuts } from "@/features/keyboard-shortcuts/use-keyboard-shortcuts"
import { BoardFilters } from "./board-filters"
import {
  BoardFooter,
  BoardHeader,
  LoadingBoard,
} from "./board-chrome"
import { CreateTaskDialog } from "./create-task-dialog"
import { TaskDragPreview } from "./task-card"
import { TaskColumn } from "./task-column"
import { TaskDetailsSheet } from "./task-details-sheet"
import styles from "./board-app.module.css"

export function BoardApp() {
  return (
    <TaskOperationsProvider>
      <BoardExperience />
    </TaskOperationsProvider>
  )
}

function BoardExperience() {
  const { tasks, isLoading, execute, undo, redo } =
    useTaskOperations()
  const search = useBoardStore((state) => state.search)
  const assignee = useBoardStore((state) => state.assignee)
  const priority = useBoardStore((state) => state.priority)
  const advancedQuery = useBoardStore(
    (state) => state.advancedQuery
  )
  const pending = useBoardStore((state) => state.pending)
  const past = useBoardStore((state) => state.past)
  const future = useBoardStore((state) => state.future)
  const presence = useBoardStore((state) => state.presence)
  const activeUser = useBoardStore((state) => state.activeUser)
  const setCreateOpen = useBoardStore(
    (state) => state.setCreateOpen
  )
  const setShortcutsOpen = useBoardStore(
    (state) => state.setShortcutsOpen
  )

  useKeyboardShortcuts({ undo, redo })
  useQueryUrlSync()

  // Query compilation is memoized separately from task filtering so typing in
  // unrelated UI does not rebuild the advanced predicate.
  const advancedPredicate = useMemo(
    () => compileTaskQuery(advancedQuery),
    [advancedQuery]
  )
  const filteredTasks = useMemo(
    () =>
      filterTasks(
        tasks,
        { search, assignee, priority },
        advancedPredicate
      ),
    [
      advancedPredicate,
      assignee,
      priority,
      search,
      tasks,
    ]
  )
  const tasksByStatus = useMemo(
    () =>
      Object.fromEntries(
        STATUSES.map((status) => [
          status,
          filteredTasks
            .filter((task) => task.status === status)
            .sort((a, b) => a.position - b.position),
        ])
      ) as Record<TaskStatus, Task[]>,
    [filteredTasks]
  )
  const pendingTaskIds = useMemo(
    () =>
      new Set(
        pending.map((operation) => operation.taskId)
      ),
    [pending]
  )
  const presenceByTask = useMemo(() => {
    const entriesByTask = new Map<string, typeof presence>()

    presence.forEach((entry) => {
      entriesByTask.set(entry.taskId, [
        ...(entriesByTask.get(entry.taskId) ?? []),
        entry,
      ])
    })

    return entriesByTask
  }, [presence])
  const lockedByTask = useMemo(() => {
    const locks = new Map<string, string>()

    presence.forEach((entry) => {
      if (
        entry.mode === "editing" &&
        entry.user !== activeUser
      ) {
        locks.set(entry.taskId, entry.user)
      }
    })

    return locks
  }, [activeUser, presence])

  const moveTask = useCallback(
    (task: Task, status: TaskStatus, overTask?: Task) => {
      const lockedBy = lockedByTask.get(task.id)
      if (lockedBy) {
        toast.warning(`Task is locked by ${lockedBy}`)
        return
      }
      if (task.status === status && overTask?.id === task.id) {
        return
      }

      const destinationTasks = tasks
        .filter(
          (item) =>
            item.status === status && item.id !== task.id
        )
        .sort((a, b) => a.position - b.position)
      let destinationIndex = overTask
        ? destinationTasks.findIndex(
            (item) => item.id === overTask.id
          )
        : destinationTasks.length

      if (destinationIndex < 0) {
        destinationIndex = destinationTasks.length
      }

      const previous = destinationTasks[destinationIndex - 1]
      const next = destinationTasks[destinationIndex]

      // Fractional positions avoid renumbering the whole column on each drag.
      const position =
        previous && next
          ? (previous.position + next.position) / 2
          : previous
            ? previous.position + 1_000
            : next
              ? next.position - 1_000
              : 0
      const label =
        status === task.status
          ? `Reorder “${task.title}”`
          : `Move “${task.title}” to ${status}`

      execute(
        task,
        { ...task, status, position },
        label,
        { kind: "update" }
      )
    },
    [execute, lockedByTask, tasks]
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.canceled) {
      return
    }

    const { source, target } = event.operation
    if (!source || !target) {
      return
    }

    const task = tasks.find((item) => item.id === source.id)
    if (!task) {
      return
    }

    const overTask = tasks.find(
      (item) => item.id === target.id
    )
    const status = (
      overTask?.status ??
      target.data.status ??
      String(target.id).replace("column-", "")
    ) as TaskStatus

    if (STATUSES.includes(status)) {
      moveTask(task, status, overTask)
    }
  }

  return (
    <div className={styles.boardShell}>
      <BoardHeader
        undo={undo}
        redo={redo}
        undoLabel={past.at(-1)?.label}
        redoLabel={future.at(-1)?.label}
        onCreate={() => setCreateOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
      />
      <NetworkStatus />
      <DeveloperTools />

      <main className={styles.main}>
        <div>
          <h1 className={styles.title}>
            Thomson Reuters Board
          </h1>
          <p className={styles.subtitle}>
            Optimistic, collaborative, and designed to stay fast
            at 1,000+ tasks.
          </p>
        </div>
        <BoardFilters
          resultCount={filteredTasks.length}
          totalCount={tasks.length}
        />

        {isLoading ? (
          <LoadingBoard />
        ) : (
          <DragDropProvider
            sensors={(defaults) => [
              ...defaults.filter(
                (sensor) => sensor !== PointerSensor
              ),
              PointerSensor.configure({
                activationConstraints: [
                  new PointerActivationConstraints.Distance({
                    value: 6,
                  }),
                ],
              }),
            ]}
            plugins={(defaults) =>
              defaults.map((plugin) => {
                if (plugin === Accessibility) {
                  return Accessibility.configure({
                    id: "task-board-dnd",
                    announcements: {
                      dragstart: ({
                        operation,
                      }: DragStartEvent) =>
                        `Picked up ${
                          (
                            operation.source?.data.task as
                              | Task
                              | undefined
                          )?.title ?? "task"
                        }`,
                      dragover: ({
                        operation,
                      }: DragOverEvent) =>
                        operation.target
                          ? `Over ${operation.target.id}`
                          : undefined,
                      dragend: ({
                        canceled,
                      }: DragEndEvent) =>
                        canceled
                          ? "Drag cancelled"
                          : "Task dropped",
                    },
                  })
                }

                return plugin === Feedback
                  ? Feedback.configure({
                      dropAnimation: { duration: 0 },
                    })
                  : plugin
              })
            }
            onDragStart={(_event, manager) => {
              const feedback = manager.plugins.find(
                (plugin) => plugin instanceof Feedback
              )
              if (feedback) {
                feedback.dropAnimation = { duration: 0 }
              }
            }}
            onDragEnd={handleDragEnd}
          >
            <div className={styles.columns}>
              {STATUSES.map((status) => (
                <div key={status} className={styles.column}>
                  <TaskColumn
                    status={status}
                    tasks={tasksByStatus[status]}
                    pendingIds={pendingTaskIds}
                    onStatusChange={moveTask}
                    presenceByTask={presenceByTask}
                    lockedByTask={lockedByTask}
                  />
                </div>
              ))}
            </div>
            <DragOverlay dropAnimation={null}>
              {(source) => {
                const task = source.data.task as
                  | Task
                  | undefined

                return task ? (
                  <div className={styles.dragPreview}>
                    <TaskDragPreview
                      task={task}
                      pending={pendingTaskIds.has(task.id)}
                    />
                  </div>
                ) : null
              }}
            </DragOverlay>
          </DragDropProvider>
        )}
      </main>

      <BoardFooter />
      <CreateTaskDialog />
      <TaskDetailsSheet />
      <ShortcutsDialog />
    </div>
  )
}
