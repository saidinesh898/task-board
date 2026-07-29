import type {
  PendingOperation,
  SimulationEvent,
} from "../types"

type OperationEventResult = Extract<
  SimulationEvent["result"],
  "queued" | "success" | "failed" | "resumed"
>

export function createOperationEvent(
  operation: PendingOperation,
  result: OperationEventResult
): SimulationEvent {
  return {
    id: crypto.randomUUID(),
    actor: operation.actor,
    taskId: operation.taskId,
    taskTitle:
      operation.after?.title ?? operation.before?.title ?? "Task",
    field: operation.label,
    source: "operation",
    result,
    timestamp: new Date().toISOString(),
  }
}
