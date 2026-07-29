"use client"

import { useCallback, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useBoardStore } from "@/stores/board-store"
import { reconcilePending } from "../optimistic"
import {
  commitOperation,
  loadConfirmedTasks,
  sleepUntil,
} from "../repository"
import type { PendingOperation, Task } from "../types"
import {
  createPendingOperation,
  isOperationActive,
  isStoreConnected,
  markOperationActive,
  prepareForReconnect,
  releaseOperation,
  SIMULATED_NETWORK_DELAY_MS,
  TASKS_QUERY_KEY,
  waitForConnection,
} from "./offline-queue"
import { createOperationEvent } from "./operation-events"
import type { ExecuteOptions, TaskOperationEngine } from "./types"

/**
 * Owns local task commands from enqueue through confirmation or rollback.
 *
 * UI components deliberately receive only execute/undo/redo. Queue storage,
 * optimistic projection, reconnect replay, and mutation callbacks stay behind
 * this feature boundary.
 */
export function useTaskOperationEngine(
  queryIsLoading: boolean
): TaskOperationEngine {
  const queryClient = useQueryClient()
  const hydrated = useBoardStore((state) => state.hydrated)
  const networkOnline = useBoardStore((state) => state.networkOnline)
  const forcedOffline = useBoardStore((state) => state.forcedOffline)
  const connected = networkOnline && !forcedOffline

  const projectPendingOperations = useCallback(
    (confirmed = loadConfirmedTasks()) => {
      const pending = useBoardStore.getState().pending
      queryClient.setQueryData(
        TASKS_QUERY_KEY,
        reconcilePending(confirmed, pending)
      )
    },
    [queryClient]
  )

  const { mutate } = useMutation({
    mutationFn: async (operation: PendingOperation) => {
      markOperationActive(operation.id)
      await sleepUntil(operation.dueAt)

      // A request that loses connectivity while "in flight" pauses here. A
      // fresh delay after reconnect makes the resumed network trip observable.
      if (!isStoreConnected()) {
        await waitForConnection()
        await sleepUntil(Date.now() + SIMULATED_NETWORK_DELAY_MS)
      }

      if (operation.outcome === "failure") {
        throw new Error("The simulated request failed")
      }

      return commitOperation(operation)
    },
    onSuccess: (confirmed, operation) => {
      releaseOperation(operation.id)

      const store = useBoardStore.getState()
      store.removePending(operation.id)
      projectPendingOperations(confirmed)
      store.addEvent(createOperationEvent(operation, "success"))
    },
    onError: (_error, operation) => {
      releaseOperation(operation.id)

      const store = useBoardStore.getState()
      store.removePending(operation.id)
      if (operation.recordHistory) {
        store.removeHistory(operation.id)
      }

      // Rollback is a clean re-projection, not restoration of an old cache
      // snapshot. Other pending and confirmed work therefore remains visible.
      projectPendingOperations()
      store.addEvent(createOperationEvent(operation, "failed"))
      toast.error("Update failed and was rolled back", {
        description: operation.label,
      })
    },
  })

  const execute = useCallback(
    (
      before: Task | null,
      after: Task | null,
      label: string,
      options: ExecuteOptions = {}
    ) => {
      const store = useBoardStore.getState()
      const operation =
        options.existing ??
        createPendingOperation({
          before,
          after,
          label,
          kind: options.kind ?? "update",
          actor: store.activeUser,
          outcome: options.outcome ?? store.consumeOutcome(),
          recordHistory: options.recordHistory ?? true,
          connected: isStoreConnected(),
        })

      if (!options.existing) {
        store.addPending(operation)

        if (operation.recordHistory) {
          store.addHistory({
            id: crypto.randomUUID(),
            operationId: operation.id,
            taskId: operation.taskId,
            label,
            actor: operation.actor,
            before,
            after: operation.after,
            createdAt: new Date().toISOString(),
          })
        }

        store.addEvent(createOperationEvent(operation, "queued"))
      }

      // This synchronous cache projection is what makes the UI optimistic.
      projectPendingOperations()

      if (isStoreConnected()) {
        mutate(operation)
      } else {
        toast.warning("Change queued while offline", { description: label })
      }
    },
    [mutate, projectPendingOperations]
  )

  const undo = useCallback(() => {
    const entry = useBoardStore.getState().takeUndo()
    if (!entry) {
      return
    }

    const current =
      (
        queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) ?? []
      ).find((task) => task.id === entry.taskId) ?? null

    execute(current, entry.before, `Undo: ${entry.label}`, {
      kind: "undo",
      recordHistory: false,
    })
  }, [execute, queryClient])

  const redo = useCallback(() => {
    const entry = useBoardStore.getState().takeRedo()
    if (!entry) {
      return
    }

    const current =
      (
        queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) ?? []
      ).find((task) => task.id === entry.taskId) ?? null

    execute(current, entry.after, `Redo: ${entry.label}`, {
      kind: "redo",
      recordHistory: false,
    })
  }, [execute, queryClient])

  useEffect(() => {
    if (!hydrated || queryIsLoading || !connected) {
      return
    }

    // Hydration/reconnect always starts from durable confirmed data and then
    // replays the durable queue before any request is resumed.
    projectPendingOperations()

    useBoardStore.getState().pending.forEach((storedOperation) => {
      const operation = prepareForReconnect(storedOperation)

      if (operation !== storedOperation) {
        useBoardStore
          .getState()
          .updatePending(operation.id, operation)
      }

      if (!isOperationActive(operation.id)) {
        useBoardStore
          .getState()
          .addEvent(createOperationEvent(operation, "resumed"))
        execute(operation.before, operation.after, operation.label, {
          existing: operation,
        })
      }
    })
  }, [
    connected,
    execute,
    hydrated,
    projectPendingOperations,
    queryIsLoading,
  ])

  return { execute, undo, redo }
}
