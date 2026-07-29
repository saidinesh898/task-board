"use client"

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import { useQuery } from "@tanstack/react-query"
import { makeSeedTasks } from "./seed"
import { loadConfirmedTasks } from "./repository"
import type { Task } from "./types"
import { TASKS_QUERY_KEY } from "./operations/offline-queue"
import { useRemoteSimulation } from "./operations/use-remote-simulation"
import { useTaskOperationEngine } from "./operations/use-task-operation-engine"
import type {
  ExecuteOptions,
  TaskOperationEngine,
} from "./operations/types"

interface TaskOperationsValue extends TaskOperationEngine {
  tasks: Task[]
  isLoading: boolean
  triggerRemote: (
    source?: "manual" | "auto" | "conflict",
    taskId?: string
  ) => void
  resetDataset: (count: 30 | 1000) => void
}

const TaskOperationsContext =
  createContext<TaskOperationsValue | null>(null)

/**
 * Public feature façade used by board components. The provider composes task
 * querying, local/offline commands, and remote simulation without exposing
 * their persistence or reconciliation details to the UI.
 */
export function TaskOperationsProvider({
  children,
}: {
  children: ReactNode
}) {
  const query = useQuery({
    queryKey: TASKS_QUERY_KEY,
    queryFn: loadConfirmedTasks,
    initialData: () => makeSeedTasks(),
    refetchOnMount: "always",
  })
  const tasks = useMemo(() => query.data ?? [], [query.data])
  const { execute, undo, redo } = useTaskOperationEngine(
    query.isLoading
  )
  const { triggerRemote, resetDataset } = useRemoteSimulation()

  const value = useMemo<TaskOperationsValue>(
    () => ({
      tasks,
      isLoading: query.isLoading,
      execute,
      undo,
      redo,
      triggerRemote,
      resetDataset,
    }),
    [
      execute,
      query.isLoading,
      redo,
      resetDataset,
      tasks,
      triggerRemote,
      undo,
    ]
  )

  return (
    <TaskOperationsContext.Provider value={value}>
      {children}
    </TaskOperationsContext.Provider>
  )
}

export function useTaskOperations(): TaskOperationsValue {
  const context = useContext(TaskOperationsContext)
  if (!context) {
    throw new Error(
      "useTaskOperations must be used inside TaskOperationsProvider"
    )
  }
  return context
}

export type { ExecuteOptions }
