"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useBoardStore } from "@/stores/board-store"
import {
  PEOPLE,
  PRIORITIES,
  STATUSES,
  type OperationKind,
  type PendingOperation,
  type SimulationField,
  type Task,
  type TaskDraft,
} from "./types"
import {
  commitOperation,
  loadConfirmedTasks,
  reconcilePending,
  resetConfirmedTasks,
  saveConfirmedTasks,
  sleepUntil,
} from "./repository"
import { makeSeedTasks } from "./seed"

const TASKS_KEY = ["tasks"] as const
const runtimeActive = new Set<string>()

interface ExecuteOptions {
  kind?: OperationKind
  recordHistory?: boolean
  outcome?: "success" | "failure"
  existing?: PendingOperation
}

interface TaskOperationsValue {
  tasks: Task[]
  isLoading: boolean
  execute: (before: Task | null, after: Task | null, label: string, options?: ExecuteOptions) => void
  undo: () => void
  redo: () => void
  triggerRemote: (source?: "manual" | "auto" | "conflict", taskId?: string) => void
  resetDataset: (count: 30 | 1000) => void
}

const TaskOperationsContext = createContext<TaskOperationsValue | null>(null)

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

function changedDraftFields(before: Task, after: Task): Array<keyof TaskDraft> {
  const keys: Array<keyof TaskDraft> = ["title", "description", "status", "priority", "assignee", "tags"]
  return keys.filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
}

function toDraft(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignee: task.assignee,
    tags: task.tags,
  }
}

function waitForConnection() {
  const current = useBoardStore.getState()
  if (current.networkOnline && !current.forcedOffline) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const unsubscribe = useBoardStore.subscribe((state) => {
      if (state.networkOnline && !state.forcedOffline) {
        unsubscribe()
        resolve()
      }
    })
  })
}

export function TaskOperationsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: TASKS_KEY,
    queryFn: loadConfirmedTasks,
    initialData: () => makeSeedTasks(),
    refetchOnMount: "always",
  })
  const tasks = useMemo(() => query.data ?? [], [query.data])
  const hydrated = useBoardStore((state) => state.hydrated)
  const autoSimulation = useBoardStore((state) => state.autoSimulation)
  const nextSimulationAt = useBoardStore((state) => state.nextSimulationAt)
  const networkOnline = useBoardStore((state) => state.networkOnline)
  const forcedOffline = useBoardStore((state) => state.forcedOffline)
  const connected = networkOnline && !forcedOffline

  const mutation = useMutation({
    mutationFn: async (operation: PendingOperation) => {
      runtimeActive.add(operation.id)
      await sleepUntil(operation.dueAt)
      const store = useBoardStore.getState()
      if (!store.networkOnline || store.forcedOffline) {
        await waitForConnection()
        await sleepUntil(Date.now() + 2_000)
      }
      if (operation.outcome === "failure") throw new Error("The simulated request failed")
      return commitOperation(operation)
    },
    onSuccess: (confirmed, operation) => {
      runtimeActive.delete(operation.id)
      const store = useBoardStore.getState()
      store.removePending(operation.id)
      const remaining = useBoardStore.getState().pending
      queryClient.setQueryData(TASKS_KEY, reconcilePending(confirmed, remaining))
      store.addEvent({
        id: crypto.randomUUID(), actor: operation.actor, taskId: operation.taskId,
        taskTitle: operation.after?.title ?? operation.before?.title ?? "Task",
        field: operation.label, source: "operation", result: "success", timestamp: new Date().toISOString(),
      })
    },
    onError: (_error, operation) => {
      runtimeActive.delete(operation.id)
      const store = useBoardStore.getState()
      store.removePending(operation.id)
      if (operation.recordHistory) store.removeHistory(operation.id)
      const confirmed = loadConfirmedTasks()
      queryClient.setQueryData(TASKS_KEY, reconcilePending(confirmed, useBoardStore.getState().pending))
      store.addEvent({
        id: crypto.randomUUID(), actor: operation.actor, taskId: operation.taskId,
        taskTitle: operation.after?.title ?? operation.before?.title ?? "Task",
        field: operation.label, source: "operation", result: "failed", timestamp: new Date().toISOString(),
      })
      toast.error("Update failed and was rolled back", { description: operation.label })
    },
  })

  const execute = useCallback(
    (before: Task | null, after: Task | null, label: string, options: ExecuteOptions = {}) => {
      const store = useBoardStore.getState()
      const operation = options.existing ?? {
        id: crypto.randomUUID(),
        taskId: after?.id ?? before!.id,
        kind: options.kind ?? "update",
        label,
        actor: store.activeUser,
        before,
        after: after ? { ...after, updatedAt: new Date().toISOString(), updatedBy: store.activeUser } : null,
        outcome: options.outcome ?? store.consumeOutcome(),
        dueAt: Date.now() + 2_000,
        recordHistory: options.recordHistory ?? true,
        waitForConnection: !store.networkOnline || store.forcedOffline,
      } satisfies PendingOperation

      if (!options.existing) {
        store.addPending(operation)
        if (operation.recordHistory) {
          store.addHistory({
            id: crypto.randomUUID(), operationId: operation.id, taskId: operation.taskId,
            label, actor: operation.actor, before, after: operation.after, createdAt: new Date().toISOString(),
          })
        }
        store.addEvent({
          id: crypto.randomUUID(), actor: operation.actor, taskId: operation.taskId,
          taskTitle: operation.after?.title ?? operation.before?.title ?? "Task",
          field: label, source: "operation", result: "queued", timestamp: new Date().toISOString(),
        })
      }
      const confirmed = loadConfirmedTasks()
      queryClient.setQueryData(TASKS_KEY, reconcilePending(confirmed, useBoardStore.getState().pending))
      if (store.networkOnline && !store.forcedOffline) mutation.mutate(operation)
      else toast.warning("Change queued while offline", { description: label })
    },
    [mutation, queryClient]
  )

  const undo = useCallback(() => {
    const entry = useBoardStore.getState().takeUndo()
    if (!entry) return
    const current = (queryClient.getQueryData<Task[]>(TASKS_KEY) ?? []).find((task) => task.id === entry.taskId) ?? null
    execute(current, entry.before, `Undo: ${entry.label}`, { kind: "undo", recordHistory: false })
  }, [execute, queryClient])

  const redo = useCallback(() => {
    const entry = useBoardStore.getState().takeRedo()
    if (!entry) return
    const current = (queryClient.getQueryData<Task[]>(TASKS_KEY) ?? []).find((task) => task.id === entry.taskId) ?? null
    execute(current, entry.after, `Redo: ${entry.label}`, { kind: "redo", recordHistory: false })
  }, [execute, queryClient])

  const triggerRemote = useCallback((source: "manual" | "auto" | "conflict" = "manual", forcedTaskId?: string) => {
    const store = useBoardStore.getState()
    if (!store.networkOnline || store.forcedOffline) {
      toast.warning("Remote activity is unavailable while offline")
      return
    }
    const confirmed = loadConfirmedTasks()
    if (!confirmed.length) return
    const configuredId = forcedTaskId ?? (source === "conflict" ? store.selectedTaskId : store.targetTaskId)
    const original = confirmed.find((task) => task.id === configuredId) ?? randomItem(confirmed)
    const remotePeople = PEOPLE.filter((person) => person !== store.activeUser)
    const actor = store.remoteUser !== "random" && store.remoteUser !== store.activeUser
      ? store.remoteUser
      : randomItem(remotePeople)
    const requested = store.simulationField
    const field = (requested === "random"
      ? randomItem(["title", "description", "status", "priority", "assignee", "tags"] as const)
      : requested) as Exclude<SimulationField, "random">
    const next: Task = { ...original, version: original.version + 1, updatedAt: new Date().toISOString(), updatedBy: actor }
    if (field === "title") next.title = `${original.title.replace(/ · updated$/, "")} · updated`
    if (field === "description") next.description = `${original.description} ${actor.split(" ")[0]} added a note.`
    if (field === "status") next.status = STATUSES[(STATUSES.indexOf(original.status) + 1) % STATUSES.length]!
    if (field === "priority") next.priority = PRIORITIES[(PRIORITIES.indexOf(original.priority) + 1) % PRIORITIES.length]!
    if (field === "assignee") next.assignee = randomItem(remotePeople)
    if (field === "tags") next.tags = [...new Set([...original.tags, "collaboration"])]
    saveConfirmedTasks(confirmed.map((task) => (task.id === next.id ? next : task)))
    queryClient.setQueryData(TASKS_KEY, reconcilePending(loadConfirmedTasks(), useBoardStore.getState().pending))
    store.upsertPresence({ user: actor, taskId: next.id, mode: "viewing", remote: true, updatedAt: new Date().toISOString() })
    if (store.selectedTaskId === next.id && store.draftDirty && store.draftBaseTask) {
      const changedFields = [...new Set([
        ...(store.conflict?.taskId === next.id ? store.conflict.changedFields : []),
        ...changedDraftFields(original, next),
      ])]
      store.setConflict({ taskId: next.id, base: store.conflict?.base ?? store.draftBaseTask, incoming: next, changedFields })
    } else if (store.selectedTaskId === next.id && !store.draftDirty) {
      store.setDraft(toDraft(next), next, false)
    }
    store.addEvent({
      id: crypto.randomUUID(), actor, taskId: next.id, taskTitle: next.title,
      field, source, result: "updated", timestamp: new Date().toISOString(),
    })
    toast.info(`${actor} updated “${original.title}” recently`, {
      action: { label: "View", onClick: () => store.setSelectedTaskId(next.id) },
    })
  }, [queryClient])

  const resetDataset = useCallback((count: 30 | 1000) => {
    const tasks = resetConfirmedTasks(count)
    const store = useBoardStore.getState()
    store.setDevOption("datasetSize", count)
    store.setDevOption("autoSimulation", false)
    store.setSelectedTaskId(null)
    queryClient.setQueryData(TASKS_KEY, tasks)
    toast.success(`Loaded ${count.toLocaleString()} deterministic tasks`)
  }, [queryClient])

  useEffect(() => {
    if (!hydrated || query.isLoading || !connected) return
    const store = useBoardStore.getState()
    queryClient.setQueryData(TASKS_KEY, reconcilePending(loadConfirmedTasks(), store.pending))
    store.pending.forEach((storedOperation) => {
      const operation = storedOperation.waitForConnection
        ? { ...storedOperation, dueAt: Date.now() + 2_000, waitForConnection: false }
        : storedOperation
      if (operation !== storedOperation) store.updatePending(operation.id, operation)
      if (!runtimeActive.has(operation.id)) {
        store.addEvent({
          id: crypto.randomUUID(), actor: operation.actor, taskId: operation.taskId,
          taskTitle: operation.after?.title ?? operation.before?.title ?? "Task",
          field: operation.label, source: "operation", result: "resumed", timestamp: new Date().toISOString(),
        })
        execute(operation.before, operation.after, operation.label, { existing: operation })
      }
    })
  }, [connected, execute, hydrated, query.isLoading, queryClient])

  useEffect(() => {
    if (!hydrated || !autoSimulation || !connected) return
    const store = useBoardStore.getState()
    const scheduled = nextSimulationAt && nextSimulationAt > Date.now()
      ? nextSimulationAt
      : Date.now() + 10_000 + Math.floor(Math.random() * 5_001)
    if (scheduled !== nextSimulationAt) store.setDevOption("nextSimulationAt", scheduled)
    const timer = window.setTimeout(() => {
      triggerRemote("auto")
      store.setDevOption("nextSimulationAt", Date.now() + 10_000 + Math.floor(Math.random() * 5_001))
    }, Math.max(0, scheduled - Date.now()))
    return () => window.clearTimeout(timer)
  }, [autoSimulation, connected, hydrated, nextSimulationAt, triggerRemote])

  const value = useMemo(() => ({ tasks, isLoading: query.isLoading, execute, undo, redo, triggerRemote, resetDataset }),
    [tasks, query.isLoading, execute, undo, redo, triggerRemote, resetDataset])

  return <TaskOperationsContext.Provider value={value}>{children}</TaskOperationsContext.Provider>
}

export function useTaskOperations() {
  const context = useContext(TaskOperationsContext)
  if (!context) throw new Error("useTaskOperations must be used inside TaskOperationsProvider")
  return context
}
