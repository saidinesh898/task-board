"use client"

import { useRef } from "react"
import { useDroppable } from "@dnd-kit/react"
import { closestCenter } from "@dnd-kit/collision"
import { useVirtualizer } from "@tanstack/react-virtual"
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
    <section className={styles.style1}>
      <header className={styles.style2}>
        <div className={styles.style3}><span className={cn(styles.style4, dotStyle[status])} /><h2 className={styles.style5}>{STATUS_LABELS[status]}</h2></div>
        <Badge variant="secondary">{tasks.length}</Badge>
      </header>
      <div ref={(node) => { parentRef.current = node; droppable.ref(node) }} className={cn(styles.style6, droppable.isDropTarget && styles.style7)}>
        {!tasks.length && <div className={styles.style8}>Drop tasks here</div>}
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((row) => {
            const task = tasks[row.index]!
            return (
              <div
                key={task.id}
                data-index={row.index}
                ref={virtualizer.measureElement}
                className={styles.style9}
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
