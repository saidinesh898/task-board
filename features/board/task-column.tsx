"use client"

import { useRef } from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { STATUS_LABELS, type Task, type TaskStatus } from "@/features/tasks/types"
import { TaskCard } from "./task-card"

const dotStyle: Record<TaskStatus, string> = {
  todo: "bg-slate-400",
  "in-progress": "bg-amber-500",
  done: "bg-emerald-500",
}

export function TaskColumn({ status, tasks, pendingIds, onStatusChange }: {
  status: TaskStatus
  tasks: Task[]
  pendingIds: Set<string>
  onStatusChange: (task: Task, status: TaskStatus) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)
  const droppable = useDroppable({ id: `column-${status}`, data: { status } })
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
    <section className="flex h-[calc(100vh-17.5rem)] min-h-[420px] w-[88vw] shrink-0 flex-col rounded-2xl border bg-muted/35 sm:w-[420px] lg:w-auto lg:min-w-0">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2"><span className={cn("size-2 rounded-full", dotStyle[status])} /><h2 className="text-sm font-semibold">{STATUS_LABELS[status]}</h2></div>
        <Badge variant="secondary">{tasks.length}</Badge>
      </header>
      <div ref={(node) => { parentRef.current = node; droppable.setNodeRef(node) }} className={cn("relative flex-1 overflow-y-auto p-3", droppable.isOver && "bg-primary/5")}>
        {!tasks.length && <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Drop tasks here</div>}
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((row) => {
              const task = tasks[row.index]!
              return (
                <div
                  key={task.id}
                  data-index={row.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 top-0 w-full pb-3"
                  style={{ transform: `translateY(${row.start}px)` }}
                >
                  <TaskCard task={task} pending={pendingIds.has(task.id)} onStatusChange={onStatusChange} />
                </div>
              )
            })}
          </div>
        </SortableContext>
      </div>
    </section>
  )
}
