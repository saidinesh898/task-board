"use client"

import { memo } from "react"
import { useSortable } from "@dnd-kit/react/sortable"
import { Feedback } from "@dnd-kit/dom"
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable"
import { closestCenter, type CollisionDetector } from "@dnd-kit/collision"
import { CalendarDays, CircleUserRound, GripVertical, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { STATUS_LABELS, STATUSES, type PresenceEntry, type Task } from "@/features/tasks/types"
import { useBoardStore } from "@/stores/board-store"
import { formatTaskDate } from "@/features/tasks/format"
import { PresenceIndicators } from "@/features/collaboration/presence-indicators"
import styles from "./task-card.module.css"

const priorityStyle = {
  high: styles.priorityHigh,
  medium: styles.priorityMedium,
  low: styles.priorityLow,
}

const closestCenterExceptSource: CollisionDetector = (input) =>
  input.droppable.id === input.dragOperation.source?.id ? null : closestCenter(input)

export const TaskCard = memo(function TaskCard({ task, index, group, pending, onStatusChange, presence = [], lockedBy }: {
  task: Task
  index: number
  group: Task["status"]
  pending: boolean
  onStatusChange: (task: Task, status: Task["status"]) => void
  presence?: PresenceEntry[]
  lockedBy?: string
}) {
  const setSelected = useBoardStore((state) => state.setSelectedTaskId)
  const { ref, handleRef, isDragging } = useSortable({
    id: task.id,
    index,
    group,
    type: "task",
    accept: "task",
    data: { task },
    disabled: Boolean(lockedBy),
    collisionDetector: closestCenterExceptSource,
    transition: { duration: 0 },
    plugins: [SortableKeyboardPlugin, Feedback.configure({ dropAnimation: { duration: 0 } })],
  })
  return (
    <div ref={ref} className={cn(isDragging && styles.dragging)}>
      <Card
        aria-busy={pending}
        className={styles.style1}
      >
        <CardContent className={styles.style2}>
          <div className={styles.style3}>
            <Button
              ref={handleRef}
              variant="ghost"
              size="icon-sm"
              className={cn(styles.style4, styles.dragHandle)}
              aria-label={lockedBy ? `${task.title} is locked by ${lockedBy}` : `Drag ${task.title}`}
              disabled={Boolean(lockedBy)}
            ><GripVertical /></Button>
            <button className={styles.style5} onClick={() => setSelected(task.id)}>
              <div className={styles.style6}>
                <h3 className={styles.style7}>{task.title}</h3>
                {pending && <Loader2 className={styles.style8} aria-label="Saving" />}
              </div>
              <p className={styles.style9}>{task.description}</p>
            </button>
          </div>
          <div className={styles.style10}>
            <Badge variant="outline" className={cn(styles.style11, priorityStyle[task.priority])}>{task.priority}</Badge>
            {task.tags.slice(0, 2).map((tag) => <Badge variant="secondary" key={tag}>{tag}</Badge>)}
          </div>
          <div className={styles.style12}>
            <PresenceIndicators entries={presence} />
            {lockedBy && <span className={styles.style13}>Locked by {lockedBy}</span>}
          </div>
          <div className={styles.style14}>
            <span className={styles.style15}><CircleUserRound className={styles.style16} /><span className={styles.style17}>{task.assignee}</span></span>
            <span className={styles.style18} title={formatTaskDate(task.createdAt, true)}><CalendarDays className={styles.style16} />{formatTaskDate(task.createdAt)}</span>
          </div>
          <div className={styles.style19}>
            <Select items={STATUS_LABELS} disabled={Boolean(lockedBy)} value={task.status} onValueChange={(status) => status && onStatusChange(task, status)}>
              <SelectTrigger className={styles.style20} aria-label={`Change status for ${task.title}`}><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

export function TaskDragPreview({ task, pending }: { task: Task; pending: boolean }) {
  return (
    <Card aria-busy={pending} className={styles.style21}>
      <CardContent className={styles.style2}>
        <div className={styles.style3}>
          <div className={styles.style22}>
            <GripVertical className={styles.style23} />
          </div>
          <div className={styles.style24}>
            <div className={styles.style6}>
              <h3 className={styles.style7}>{task.title}</h3>
              {pending && <Loader2 className={styles.style8} aria-label="Saving" />}
            </div>
            <p className={styles.style9}>{task.description}</p>
          </div>
        </div>
        <div className={styles.style10}>
          <Badge variant="outline" className={cn(styles.style11, priorityStyle[task.priority])}>{task.priority}</Badge>
          {task.tags.slice(0, 2).map((tag) => <Badge variant="secondary" key={tag}>{tag}</Badge>)}
        </div>
      </CardContent>
    </Card>
  )
}
