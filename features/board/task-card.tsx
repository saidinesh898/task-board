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
        className={styles.card}
      >
        <CardContent className={styles.content}>
          <div className={styles.header}>
            <Button
              ref={handleRef}
              variant="ghost"
              size="icon-sm"
              className={cn(styles.dragButton, styles.dragHandle)}
              aria-label={lockedBy ? `${task.title} is locked by ${lockedBy}` : `Drag ${task.title}`}
              disabled={Boolean(lockedBy)}
            ><GripVertical /></Button>
            <button className={styles.detailsButton} onClick={() => setSelected(task.id)}>
              <div className={styles.titleRow}>
                <h3 className={styles.title}>{task.title}</h3>
                {pending && <Loader2 className={styles.savingIcon} aria-label="Saving" />}
              </div>
              <p className={styles.description}>{task.description}</p>
            </button>
          </div>
          <div className={styles.badges}>
            <Badge variant="outline" className={cn(styles.priorityBadge, priorityStyle[task.priority])}>{task.priority}</Badge>
            {task.tags.slice(0, 2).map((tag) => <Badge variant="secondary" key={tag}>{tag}</Badge>)}
          </div>
          <div className={styles.presenceRow}>
            <PresenceIndicators entries={presence} />
            {lockedBy && <span className={styles.lockBadge}>Locked by {lockedBy}</span>}
          </div>
          <div className={styles.metadata}>
            <span className={styles.assignee}><CircleUserRound className={styles.metaIcon} /><span className={styles.assigneeName}>{task.assignee}</span></span>
            <span className={styles.date} title={formatTaskDate(task.createdAt, true)}><CalendarDays className={styles.metaIcon} />{formatTaskDate(task.createdAt)}</span>
          </div>
          <div className={styles.status}>
            <Select items={STATUS_LABELS} disabled={Boolean(lockedBy)} value={task.status} onValueChange={(status) => status && onStatusChange(task, status)}>
              <SelectTrigger className={styles.statusSelect} aria-label={`Change status for ${task.title}`}><SelectValue /></SelectTrigger>
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
    <Card aria-busy={pending} className={styles.previewCard}>
      <CardContent className={styles.content}>
        <div className={styles.header}>
          <div className={styles.previewHandle}>
            <GripVertical className={styles.previewIcon} />
          </div>
          <div className={styles.previewDetails}>
            <div className={styles.titleRow}>
              <h3 className={styles.title}>{task.title}</h3>
              {pending && <Loader2 className={styles.savingIcon} aria-label="Saving" />}
            </div>
            <p className={styles.description}>{task.description}</p>
          </div>
        </div>
        <div className={styles.badges}>
          <Badge variant="outline" className={cn(styles.priorityBadge, priorityStyle[task.priority])}>{task.priority}</Badge>
          {task.tags.slice(0, 2).map((tag) => <Badge variant="secondary" key={tag}>{tag}</Badge>)}
        </div>
      </CardContent>
    </Card>
  )
}
