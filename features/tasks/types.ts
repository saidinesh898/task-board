import { z } from "zod"

export const taskStatusSchema = z.enum(["todo", "in-progress", "done"])
export const prioritySchema = z.enum(["low", "medium", "high"])

export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  status: taskStatusSchema,
  priority: prioritySchema,
  assignee: z.string().min(1),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
  version: z.number().int().nonnegative(),
  position: z.number(),
})

export type Task = z.infer<typeof taskSchema>
export type TaskStatus = z.infer<typeof taskStatusSchema>
export type Priority = z.infer<typeof prioritySchema>
export type TaskPatch = Partial<Omit<Task, "id" | "createdAt">>

export type TaskDraft = Pick<
  Task,
  "title" | "description" | "status" | "priority" | "assignee" | "tags"
>

export interface HistoryEntry {
  id: string
  operationId: string
  taskId: string
  label: string
  actor: string
  before: Task | null
  after: Task | null
  createdAt: string
}

export type OperationOutcome = "success" | "failure"
export type OperationKind = "create" | "update" | "undo" | "redo" | "resolve"

export interface PendingOperation {
  id: string
  taskId: string
  kind: OperationKind
  label: string
  actor: string
  before: Task | null
  after: Task | null
  outcome: OperationOutcome
  dueAt: number
  recordHistory: boolean
  historyEntryId?: string
}

export type FailureMode = "random" | "success" | "failure"
export type SimulationField =
  | "random"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "assignee"
  | "tags"

export interface SimulationEvent {
  id: string
  actor: string
  taskId: string
  taskTitle: string
  field: string
  source: "manual" | "auto" | "conflict" | "operation"
  result: "updated" | "queued" | "success" | "failed" | "cancelled" | "resumed"
  timestamp: string
}

export interface EditConflict {
  taskId: string
  baseVersion: number
  incoming: Task
  changedFields: Array<keyof TaskDraft>
}

export const PEOPLE = ["You", "Alex Morgan", "Priya Shah", "Jordan Lee"] as const
export const STATUSES: TaskStatus[] = ["todo", "in-progress", "done"]
export const PRIORITIES: Priority[] = ["low", "medium", "high"]

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Todo",
  "in-progress": "In progress",
  done: "Done",
}

