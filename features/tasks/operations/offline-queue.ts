import { useBoardStore } from "@/stores/board-store"
import type {
  OperationKind,
  OperationOutcome,
  PendingOperation,
  Task,
} from "../types"

export const TASKS_QUERY_KEY = ["tasks"] as const
export const SIMULATED_NETWORK_DELAY_MS = 2_000

// This set is intentionally runtime-only. The persisted queue is the source of
// truth after a reload; this guard only prevents duplicate work in one tab.
const activeOperationIds = new Set<string>()

interface CreatePendingOperationInput {
  before: Task | null
  after: Task | null
  label: string
  kind: OperationKind
  actor: string
  outcome: OperationOutcome
  recordHistory: boolean
  connected: boolean
  id?: string
  now?: number
}

export function createPendingOperation({
  before,
  after,
  label,
  kind,
  actor,
  outcome,
  recordHistory,
  connected,
  id = crypto.randomUUID(),
  now = Date.now(),
}: CreatePendingOperationInput): PendingOperation {
  const optimisticAfter = after
    ? {
        ...after,
        updatedAt: new Date(now).toISOString(),
        updatedBy: actor,
      }
    : null

  return {
    id,
    taskId: optimisticAfter?.id ?? before!.id,
    kind,
    label,
    actor,
    before,
    after: optimisticAfter,
    outcome,
    dueAt: now + SIMULATED_NETWORK_DELAY_MS,
    recordHistory,
    waitForConnection: !connected,
  }
}

export function isOperationActive(id: string): boolean {
  return activeOperationIds.has(id)
}

export function markOperationActive(id: string): void {
  activeOperationIds.add(id)
}

export function releaseOperation(id: string): void {
  activeOperationIds.delete(id)
}

export function isStoreConnected(): boolean {
  const { networkOnline, forcedOffline } = useBoardStore.getState()
  return networkOnline && !forcedOffline
}

/**
 * Suspends an in-flight simulated request without polling. The Zustand
 * subscription resolves as soon as browser connectivity and the developer
 * offline switch both report connected.
 */
export function waitForConnection(): Promise<void> {
  if (isStoreConnected()) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const unsubscribe = useBoardStore.subscribe(() => {
      if (isStoreConnected()) {
        unsubscribe()
        resolve()
      }
    })
  })
}

/**
 * Operations created while offline get a fresh delay after reconnect, so the
 * saving state is observable and behaves like a real request leaving a queue.
 */
export function prepareForReconnect(
  operation: PendingOperation,
  now = Date.now()
): PendingOperation {
  if (!operation.waitForConnection) {
    return operation
  }

  return {
    ...operation,
    dueAt: now + SIMULATED_NETWORK_DELAY_MS,
    waitForConnection: false,
  }
}
