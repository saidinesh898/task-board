import { z } from "zod"
import { makeSeedTasks } from "./seed"
import { applyOperationToTasks } from "./optimistic"
import { taskSchema, type PendingOperation, type Task } from "./types"

const DB_KEY = "task-board:db:v1"
const dbSchema = z.object({ version: z.literal(1), tasks: z.array(taskSchema) })

// Repository functions are safe during Server Component rendering: they fall
// back to deterministic seeds until a browser localStorage instance exists.
function browserStorage() {
  return typeof window === "undefined" ? null : window.localStorage
}

export function loadConfirmedTasks(): Task[] {
  const storage = browserStorage()
  if (!storage) return makeSeedTasks()
  const raw = storage.getItem(DB_KEY)
  if (!raw) {
    const tasks = makeSeedTasks()
    saveConfirmedTasks(tasks)
    return tasks
  }
  try {
    return dbSchema.parse(JSON.parse(raw)).tasks
  } catch {
    // Invalid or stale mock data is reset as one unit. There is no partial
    // migration path for this versioned demo repository.
    const tasks = makeSeedTasks()
    saveConfirmedTasks(tasks)
    return tasks
  }
}

export function saveConfirmedTasks(tasks: Task[]) {
  browserStorage()?.setItem(DB_KEY, JSON.stringify({ version: 1, tasks }))
}

export function resetConfirmedTasks(count: 30 | 1000) {
  const tasks = makeSeedTasks(count)
  saveConfirmedTasks(tasks)
  return tasks
}

export function commitOperation(operation: PendingOperation): Task[] {
  const current = loadConfirmedTasks()
  const previous = current.find((task) => task.id === operation.taskId)
  const after = operation.after
    ? {
        ...operation.after,
        updatedAt: new Date().toISOString(),
        updatedBy: operation.actor,
        version: (previous?.version ?? 0) + 1,
      }
    : null
  const tasks = applyOperationToTasks(current, { ...operation, after })
  saveConfirmedTasks(tasks)
  return tasks
}

export function sleepUntil(dueAt: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, Math.max(0, dueAt - Date.now())))
}

