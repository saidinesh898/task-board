import type { PendingOperation, Task } from "./types"

/**
 * Applies one operation snapshot to a task collection without mutating the
 * input. This is shared by the confirmed repository and the optimistic view.
 */
export function applyOperationToTasks(
  tasks: Task[],
  operation: Pick<PendingOperation, "taskId" | "after">
): Task[] {
  if (!operation.after) {
    return tasks.filter((task) => task.id !== operation.taskId)
  }

  const taskExists = tasks.some((task) => task.id === operation.taskId)
  if (!taskExists) {
    return [...tasks, operation.after]
  }

  return tasks.map((task) =>
    task.id === operation.taskId ? operation.after! : task
  )
}

/**
 * Builds the only task list the UI should render:
 *
 *   confirmed storage + pending operation 1 + pending operation 2 + ...
 *
 * Rebuilding the projection after every success or failure means rolling back
 * one request cannot accidentally erase a newer optimistic change.
 */
export function reconcilePending(
  confirmed: Task[],
  operations: PendingOperation[]
): Task[] {
  return operations.reduce(applyOperationToTasks, confirmed)
}
