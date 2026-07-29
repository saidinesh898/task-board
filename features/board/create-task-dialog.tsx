"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useBoardStore } from "@/stores/board-store"
import { useTaskOperations } from "@/features/tasks/task-operations"
import type { TaskDraft } from "@/features/tasks/types"
import { emptyDraft, TaskForm } from "./task-form"
import styles from "./create-task-dialog.module.css"

export function CreateTaskDialog() {
  const open = useBoardStore((state) => state.createOpen)
  const setOpen = useBoardStore((state) => state.setCreateOpen)
  const activeUser = useBoardStore((state) => state.activeUser)
  const { execute, tasks } = useTaskOperations()
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft)
  const create = () => {
    const now = new Date().toISOString()
    const task = {
      ...draft, id: crypto.randomUUID(), createdAt: now, updatedAt: now, updatedBy: activeUser,
      // Put new work at the top so the optimistic card is visible immediately,
      // even when the destination column is virtualized.
      version: 0, position: Math.min(1000, ...tasks.filter((item) => item.status === draft.status).map((item) => item.position)) - 1000,
    }
    execute(null, task, `Create “${draft.title}”`, { kind: "create" })
    setDraft(emptyDraft)
    setOpen(false)
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={styles.dialog}>
        <DialogHeader><DialogTitle>Create a task</DialogTitle><DialogDescription>Add it now; the simulated API confirms it in two seconds.</DialogDescription></DialogHeader>
        <TaskForm value={draft} onChange={(patch) => setDraft((value) => ({ ...value, ...patch }))} onSubmit={create} submitLabel="Create task" />
      </DialogContent>
    </Dialog>
  )
}
