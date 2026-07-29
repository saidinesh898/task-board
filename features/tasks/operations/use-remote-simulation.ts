"use client"

import { useCallback, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useBoardStore } from "@/stores/board-store"
import { reconcilePending } from "../optimistic"
import {
  loadConfirmedTasks,
  resetConfirmedTasks,
  saveConfirmedTasks,
} from "../repository"
import {
  PEOPLE,
  PRIORITIES,
  STATUSES,
  type SimulationField,
  type Task,
  type TaskDraft,
} from "../types"
import { TASKS_QUERY_KEY } from "./offline-queue"

type RemoteSource = "manual" | "auto" | "conflict"

interface RemoteSimulation {
  triggerRemote: (source?: RemoteSource, taskId?: string) => void
  resetDataset: (count: 30 | 1000) => void
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

function changedDraftFields(
  before: Task,
  after: Task
): Array<keyof TaskDraft> {
  const keys: Array<keyof TaskDraft> = [
    "title",
    "description",
    "status",
    "priority",
    "assignee",
    "tags",
  ]

  return keys.filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])
  )
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

/**
 * Keeps collaboration simulation out of the local operation engine. Remote
 * updates write directly to confirmed storage, then the local pending queue is
 * projected back over that new base.
 */
export function useRemoteSimulation(): RemoteSimulation {
  const queryClient = useQueryClient()
  const hydrated = useBoardStore((state) => state.hydrated)
  const autoSimulation = useBoardStore((state) => state.autoSimulation)
  const nextSimulationAt = useBoardStore(
    (state) => state.nextSimulationAt
  )
  const networkOnline = useBoardStore((state) => state.networkOnline)
  const forcedOffline = useBoardStore((state) => state.forcedOffline)
  const connected = networkOnline && !forcedOffline

  const triggerRemote = useCallback(
    (
      source: RemoteSource = "manual",
      forcedTaskId?: string
    ) => {
      const store = useBoardStore.getState()
      if (!store.networkOnline || store.forcedOffline) {
        toast.warning("Remote activity is unavailable while offline")
        return
      }

      const confirmed = loadConfirmedTasks()
      if (!confirmed.length) {
        return
      }

      const configuredId =
        forcedTaskId ??
        (source === "conflict"
          ? store.selectedTaskId
          : store.targetTaskId)
      const original =
        confirmed.find((task) => task.id === configuredId) ??
        randomItem(confirmed)
      const remotePeople = PEOPLE.filter(
        (person) => person !== store.activeUser
      )
      const actor =
        store.remoteUser !== "random" &&
        store.remoteUser !== store.activeUser
          ? store.remoteUser
          : randomItem(remotePeople)
      const requested = store.simulationField
      const field = (
        requested === "random"
          ? randomItem(
              [
                "title",
                "description",
                "status",
                "priority",
                "assignee",
                "tags",
              ] as const
            )
          : requested
      ) as Exclude<SimulationField, "random">
      const next: Task = {
        ...original,
        version: original.version + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
      }

      if (field === "title") {
        next.title = `${original.title.replace(/ · updated$/, "")} · updated`
      }
      if (field === "description") {
        next.description =
          `${original.description} ${actor.split(" ")[0]} added a note.`
      }
      if (field === "status") {
        next.status =
          STATUSES[
            (STATUSES.indexOf(original.status) + 1) % STATUSES.length
          ]!
      }
      if (field === "priority") {
        next.priority =
          PRIORITIES[
            (PRIORITIES.indexOf(original.priority) + 1) %
              PRIORITIES.length
          ]!
      }
      if (field === "assignee") {
        next.assignee = randomItem(remotePeople)
      }
      if (field === "tags") {
        next.tags = [
          ...new Set([...original.tags, "collaboration"]),
        ]
      }

      saveConfirmedTasks(
        confirmed.map((task) => (task.id === next.id ? next : task))
      )

      // Local optimistic work always wins visually until its own operation is
      // confirmed or rejected.
      queryClient.setQueryData(
        TASKS_QUERY_KEY,
        reconcilePending(
          loadConfirmedTasks(),
          useBoardStore.getState().pending
        )
      )

      store.upsertPresence({
        user: actor,
        taskId: next.id,
        mode: "viewing",
        remote: true,
        updatedAt: new Date().toISOString(),
      })

      if (
        store.selectedTaskId === next.id &&
        store.draftDirty &&
        store.draftBaseTask
      ) {
        const changedFields = [
          ...new Set([
            ...(store.conflict?.taskId === next.id
              ? store.conflict.changedFields
              : []),
            ...changedDraftFields(original, next),
          ]),
        ]
        store.setConflict({
          taskId: next.id,
          base: store.conflict?.base ?? store.draftBaseTask,
          incoming: next,
          changedFields,
        })
      } else if (
        store.selectedTaskId === next.id &&
        !store.draftDirty
      ) {
        store.setDraft(toDraft(next), next, false)
      }

      store.addEvent({
        id: crypto.randomUUID(),
        actor,
        taskId: next.id,
        taskTitle: next.title,
        field,
        source,
        result: "updated",
        timestamp: new Date().toISOString(),
      })
      toast.info(`${actor} updated “${original.title}” recently`, {
        action: {
          label: "View",
          onClick: () => store.setSelectedTaskId(next.id),
        },
      })
    },
    [queryClient]
  )

  const resetDataset = useCallback(
    (count: 30 | 1000) => {
      const tasks = resetConfirmedTasks(count)
      const store = useBoardStore.getState()

      store.setDevOption("datasetSize", count)
      store.setDevOption("autoSimulation", false)
      store.setSelectedTaskId(null)
      queryClient.setQueryData(TASKS_QUERY_KEY, tasks)
      toast.success(
        `Loaded ${count.toLocaleString()} deterministic tasks`
      )
    },
    [queryClient]
  )

  useEffect(() => {
    if (!hydrated || !autoSimulation || !connected) {
      return
    }

    const store = useBoardStore.getState()
    const scheduled =
      nextSimulationAt && nextSimulationAt > Date.now()
        ? nextSimulationAt
        : Date.now() + 10_000 + Math.floor(Math.random() * 5_001)

    if (scheduled !== nextSimulationAt) {
      store.setDevOption("nextSimulationAt", scheduled)
    }

    const timer = window.setTimeout(() => {
      triggerRemote("auto")
      store.setDevOption(
        "nextSimulationAt",
        Date.now() + 10_000 + Math.floor(Math.random() * 5_001)
      )
    }, Math.max(0, scheduled - Date.now()))

    return () => window.clearTimeout(timer)
  }, [
    autoSimulation,
    connected,
    hydrated,
    nextSimulationAt,
    triggerRemote,
  ])

  return { triggerRemote, resetDataset }
}
