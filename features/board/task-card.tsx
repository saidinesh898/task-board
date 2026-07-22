"use client"

import { memo } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CalendarDays, CircleUserRound, GripVertical, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { STATUS_LABELS, STATUSES, type Task } from "@/features/tasks/types"
import { useBoardStore } from "@/stores/board-store"
import { formatTaskDate } from "@/features/tasks/format"

const priorityStyle = {
  high: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
  medium: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  low: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
}

export const TaskCard = memo(function TaskCard({ task, pending, onStatusChange }: {
  task: Task
  pending: boolean
  onStatusChange: (task: Task, status: Task["status"]) => void
}) {
  const setSelected = useBoardStore((state) => state.setSelectedTaskId)
  const sortable = useSortable({ id: task.id, data: { task } })
  const style = { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }
  return (
    <div ref={sortable.setNodeRef} style={style} className={cn(sortable.isDragging && "opacity-30")}>
      <Card
        aria-busy={pending}
        className="group gap-0 overflow-hidden border-border/70 py-0 shadow-sm transition-[box-shadow,border-color] hover:border-foreground/20 hover:shadow-md"
      >
        <CardContent className="p-3.5">
          <div className="flex items-start gap-2">
            <Button
              ref={sortable.setActivatorNodeRef}
              {...sortable.attributes}
              {...sortable.listeners}
              variant="ghost"
              size="icon-sm"
              className="-ml-2 mt-[-3px] shrink-0 touch-none text-muted-foreground opacity-60 group-hover:opacity-100"
              aria-label={`Drag ${task.title}`}
            ><GripVertical /></Button>
            <button className="min-w-0 flex-1 text-left" onClick={() => setSelected(task.id)}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 text-sm font-semibold leading-5">{task.title}</h3>
                {pending && <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-primary" aria-label="Saving" />}
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">{task.description}</p>
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="outline" className={cn("capitalize", priorityStyle[task.priority])}>{task.priority}</Badge>
            {task.tags.slice(0, 2).map((tag) => <Badge variant="secondary" key={tag}>{tag}</Badge>)}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5 text-[11px] text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1"><CircleUserRound className="size-3.5" /><span className="truncate">{task.assignee}</span></span>
            <span className="flex shrink-0 items-center gap-1" title={formatTaskDate(task.createdAt, true)}><CalendarDays className="size-3.5" />{formatTaskDate(task.createdAt)}</span>
          </div>
          <div className="mt-2">
            <Select value={task.status} onValueChange={(status) => status && onStatusChange(task, status)}>
              <SelectTrigger className="h-7 w-full text-xs" aria-label={`Change status for ${task.title}`}><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
