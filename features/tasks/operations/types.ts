import type {
  OperationKind,
  PendingOperation,
  Task,
} from "../types"

export interface ExecuteOptions {
  kind?: OperationKind
  recordHistory?: boolean
  outcome?: "success" | "failure"
  /**
   * A persisted operation being resumed after hydration or reconnect.
   * Existing operations must not be queued or added to history a second time.
   */
  existing?: PendingOperation
}

export interface TaskOperationEngine {
  execute: (
    before: Task | null,
    after: Task | null,
    label: string,
    options?: ExecuteOptions
  ) => void
  undo: () => void
  redo: () => void
}
