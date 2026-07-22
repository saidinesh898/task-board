"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, History } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useBoardStore } from "@/stores/board-store"
import { useTaskOperations } from "@/features/tasks/task-operations"
import type { Task, TaskDraft } from "@/features/tasks/types"
import { TaskForm } from "./task-form"
import { formatTaskDate } from "@/features/tasks/format"

const draftKeys: Array<keyof TaskDraft> = ["title", "description", "status", "priority", "assignee", "tags"]

function toDraft(task: Task): TaskDraft {
  return Object.fromEntries(draftKeys.map((key) => [key, task[key]])) as TaskDraft
}

export function TaskDetailsSheet() {
  const selectedTaskId = useBoardStore((state) => state.selectedTaskId)
  const setSelectedTaskId = useBoardStore((state) => state.setSelectedTaskId)
  const draft = useBoardStore((state) => state.draft)
  const draftDirty = useBoardStore((state) => state.draftDirty)
  const conflict = useBoardStore((state) => state.conflict)
  const setDraft = useBoardStore((state) => state.setDraft)
  const updateDraft = useBoardStore((state) => state.updateDraft)
  const setConflict = useBoardStore((state) => state.setConflict)
  const { tasks, execute } = useTaskOperations()
  const task = tasks.find((item) => item.id === selectedTaskId) ?? null
  const [resolveOpen, setResolveOpen] = useState(false)
  const [choices, setChoices] = useState<Partial<Record<keyof TaskDraft, "mine" | "theirs">>>({})

  useEffect(() => {
    if (task && (!draft || !draftDirty)) setDraft(toDraft(task), task.version, false)
    // Draft initialization intentionally keys to the selected task rather than each live task update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskId])

  const save = () => {
    if (!task || !draft) return
    if (conflict?.taskId === task.id) {
      setChoices(Object.fromEntries(conflict.changedFields.map((key) => [key, "mine"])))
      setResolveOpen(true)
      return
    }
    submit(task, draft, "Edit")
  }
  const submit = (before: Task, nextDraft: TaskDraft, prefix: string) => {
    const after = { ...before, ...nextDraft }
    execute(before, after, `${prefix} “${before.title}”`, { kind: prefix === "Resolve" ? "resolve" : "update" })
    setDraft(nextDraft, before.version + 1, false)
    setConflict(null)
    setResolveOpen(false)
  }
  const reviewedDraft = useMemo(() => {
    if (!draft || !conflict) return draft
    return Object.fromEntries(draftKeys.map((key) => [key, choices[key] === "theirs" ? conflict.incoming[key] : draft[key]])) as TaskDraft
  }, [choices, conflict, draft])

  return (
    <>
      <Sheet open={!!selectedTaskId} onOpenChange={(open) => {
        if (!open) { setSelectedTaskId(null); setDraft(null); setConflict(null) }
      }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="border-b">
            <div className="flex items-center gap-2"><SheetTitle>{task?.title ?? "Task"}</SheetTitle>{task && <Badge variant="outline">v{task.version}</Badge>}</div>
            <SheetDescription>{task ? `Created ${formatTaskDate(task.createdAt, true)} · last changed by ${task.updatedBy}` : "Loading task"}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-8">
            {conflict && <Alert variant="destructive"><AlertTriangle /><AlertTitle>Newer remote version</AlertTitle><AlertDescription>{conflict.incoming.updatedBy} changed this task while you were editing. Saving will open a comparison.</AlertDescription></Alert>}
            {task && draft && <TaskForm value={draft} onChange={updateDraft} onSubmit={save} submitLabel={conflict ? "Review and save" : "Save changes"} />}
            {task && <div className="flex items-center gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground"><History className="size-4" />Version {task.version} · Updated {formatTaskDate(task.updatedAt, true)} UTC</div>}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Resolve task conflict</DialogTitle><DialogDescription>Choose which version to keep. This saves as one undoable optimistic action.</DialogDescription></DialogHeader>
          {conflict && draft && <div className="space-y-3">
            {conflict.changedFields.map((field) => (
              <div key={field} className="rounded-xl border p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{field}</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Choice active={choices[field] !== "theirs"} label="Mine" value={draft[field]} onClick={() => setChoices((value) => ({ ...value, [field]: "mine" }))} />
                  <Choice active={choices[field] === "theirs"} label={`Theirs · ${conflict.incoming.updatedBy}`} value={conflict.incoming[field]} onClick={() => setChoices((value) => ({ ...value, [field]: "theirs" }))} />
                </div>
              </div>
            ))}
          </div>}
          <DialogFooter className="flex-wrap">
            <Button variant="outline" onClick={() => {
              if (!conflict) return
              setDraft(toDraft(conflict.incoming), conflict.incoming.version, false)
              setConflict(null); setResolveOpen(false)
            }}>Take theirs</Button>
            <Button variant="secondary" onClick={() => conflict && draft && submit(conflict.incoming, draft, "Resolve")}>Keep mine</Button>
            <Button onClick={() => conflict && reviewedDraft && submit(conflict.incoming, reviewedDraft, "Resolve")}>Save reviewed fields</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Choice({ active, label, value, onClick }: { active: boolean; label: string; value: unknown; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-lg border p-2 text-left text-xs ${active ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-muted/40"}`}><span className="mb-1 block font-semibold">{label}</span><span className="line-clamp-3 text-muted-foreground">{Array.isArray(value) ? value.join(", ") : String(value)}</span></button>
}
