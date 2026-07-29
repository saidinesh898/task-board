"use client"

import { useRef } from "react"
import { useDragOperation, useDroppable } from "@dnd-kit/react"
import { closestCenter } from "@dnd-kit/collision"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ArrowDownToLine } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { STATUS_LABELS, type PresenceEntry, type Task, type TaskStatus } from "@/features/tasks/types"
import { TaskCard } from "./task-card"
import styles from "./task-column.module.css"

const dotStyle: Record<TaskStatus, string> = {
  todo: styles.dotTodo,
  "in-progress": styles.dotInProgress,
  done: styles.dotDone,
}

export function TaskColumn({ status, tasks, pendingIds, onStatusChange, presenceByTask, lockedByTask }: {
  status: TaskStatus
  tasks: Task[]
  pendingIds: Set<string>
  onStatusChange: (task: Task, status: TaskStatus) => void
  presenceByTask: Map<string, PresenceEntry[]>
  lockedByTask: Map<string, string>
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const droppable = useDroppable({
    id: `column-${status}`,
    type: "column",
    accept: "task",
    data: { status },
    collisionDetector: closestCenter,
    collisionPriority: 0,
  })
  const { target } = useDragOperation()
  const targetTask = target?.data.task as Task | undefined
  const targetStatus = target?.data.status
    ?? targetTask?.status
    ?? String(target?.id ?? "").replace("column-", "")
  const isDropTarget = targetStatus === status
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 190,
    overscan: 8,
    getItemKey: (index) => tasks[index]?.id ?? index,
    initialRect: { width: 400, height: 600 },
    useFlushSync: false,
  })

  return (
    <section
      className={cn(styles.column, isDropTarget && styles.columnActive)}
      data-drop-active={isDropTarget || undefined}
    >
      <header className={styles.header}>
        <div className={styles.titleGroup}><span className={cn(styles.statusDot, dotStyle[status])} /><h2 className={styles.title}>{STATUS_LABELS[status]}</h2></div>
        <Badge variant="secondary">{tasks.length}</Badge>
      </header>
      <div
        className={cn(styles.dropPrompt, isDropTarget && styles.dropPromptVisible)}
        aria-hidden={!isDropTarget}
      >
        <ArrowDownToLine className={styles.dropPromptIcon} />
        Release to move into {STATUS_LABELS[status]}
      </div>
      <div ref={(node) => { parentRef.current = node; droppable.ref(node) }} className={cn(styles.scrollArea, isDropTarget && styles.dropTarget)}>
        {!tasks.length && (
          <div className={cn(styles.empty, isDropTarget && styles.emptyActive)}>
            <ArrowDownToLine className={styles.emptyIcon} />
            <strong>{isDropTarget ? "Release to add task" : "Drop tasks here"}</strong>
            <span>Drag a card into this column</span>
          </div>
        )}
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((row) => {
            const task = tasks[row.index]!
            return (
              <div
                key={task.id}
                data-index={row.index}
                ref={virtualizer.measureElement}
                className={styles.virtualItem}
                style={{ transform: `translateY(${row.start}px)` }}
              >
                <TaskCard task={task} index={row.index} group={status} pending={pendingIds.has(task.id)} onStatusChange={onStatusChange} presence={presenceByTask.get(task.id)} lockedBy={lockedByTask.get(task.id)} />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
