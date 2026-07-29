"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, History } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useBoardStore } from "@/stores/board-store"
import { useTaskOperations } from "@/features/tasks/task-operations"
import type { Task, TaskDraft } from "@/features/tasks/types"
import { TaskForm } from "./task-form"
import { formatTaskDate } from "@/features/tasks/format"
import { mergeDescription } from "@/features/collaboration/description-crdt"
import styles from "./task-details-sheet.module.css"

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
  const presence = useBoardStore((state) => state.presence)
  const activeUser = useBoardStore((state) => state.activeUser)
  const upsertPresence = useBoardStore((state) => state.upsertPresence)
  const removePresence = useBoardStore((state) => state.removePresence)
  const devOpen = useBoardStore((state) => state.devOpen)
  const { tasks, execute, triggerRemote } = useTaskOperations()
  const task = tasks.find((item) => item.id === selectedTaskId) ?? null
  const [resolveOpen, setResolveOpen] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualDescription, setManualDescription] = useState("")
  const [choices, setChoices] = useState<Partial<Record<keyof TaskDraft, "mine" | "theirs">>>({})
  const lockedBy = presence.find((entry) => entry.taskId === selectedTaskId && entry.mode === "editing" && entry.user !== activeUser)?.user

  useEffect(() => {
    if (task && (!draft || !draftDirty)) setDraft(toDraft(task), task, false)
    // Draft initialization intentionally keys to the selected task rather than each live task update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTaskId])

  useEffect(() => {
    if (!selectedTaskId) {
      removePresence(activeUser)
      return
    }
    upsertPresence({
      user: activeUser,
      taskId: selectedTaskId,
      mode: draftDirty ? "editing" : "viewing",
      remote: false,
      updatedAt: new Date().toISOString(),
    })
    return () => removePresence(activeUser)
  }, [activeUser, draftDirty, removePresence, selectedTaskId, upsertPresence])

  const save = () => {
    if (!task || !draft) return
    if (conflict?.taskId === task.id) {
      setChoices(Object.fromEntries(conflict.changedFields.map((key) => [key, "mine"])))
      setManualMode(false)
      setResolveOpen(true)
      return
    }
    submit(task, draft, "Edit")
  }
  const submit = (before: Task, nextDraft: TaskDraft, prefix: string) => {
    const after = { ...before, ...nextDraft }
    execute(before, after, `${prefix} “${before.title}”`, { kind: prefix === "Resolve" ? "resolve" : "update" })
    setDraft(nextDraft, { ...before, ...nextDraft }, false)
    setConflict(null)
    setResolveOpen(false)
  }
  const reviewedDraft = useMemo(() => {
    if (!draft || !conflict) return draft
    return Object.fromEntries(draftKeys.map((key) => [key, choices[key] === "theirs" ? conflict.incoming[key] : draft[key]])) as TaskDraft
  }, [choices, conflict, draft])

  const openManualMerge = () => {
    if (!conflict || !draft) return
    setManualDescription(mergeDescription({
      // Older persisted v1 conflicts stored only a base version. Fall back to
      // the live task so those drafts can still open the new merge workflow.
      base: conflict.base?.description ?? task?.description ?? conflict.incoming.description,
      mine: draft.description,
      theirs: conflict.incoming.description,
      mineActor: activeUser,
      theirsActor: conflict.incoming.updatedBy,
    }))
    setManualMode(true)
  }

  const takeTheirs = () => {
    if (!conflict) return
    setDraft(toDraft(conflict.incoming), conflict.incoming, false)
    setConflict(null)
    setResolveOpen(false)
    setManualMode(false)
  }

  return (
    <>
      <Sheet open={!!selectedTaskId} onOpenChange={(open) => {
        if (!open) { setSelectedTaskId(null); setDraft(null); setConflict(null) }
      }}>
        <SheetContent className={styles.sheet}>
          <SheetHeader className={styles.sheetHeader}>
            <div className={styles.titleRow}><SheetTitle>{task?.title ?? "Task"}</SheetTitle>{task && <Badge variant="outline">v{task.version}</Badge>}</div>
            <SheetDescription>{task ? `Created ${formatTaskDate(task.createdAt, true)} · last changed by ${task.updatedBy}` : "Loading task"}</SheetDescription>
          </SheetHeader>
          <div className={styles.sheetBody}>
            {conflict && <Alert variant="destructive"><AlertTriangle /><AlertTitle>Newer remote version</AlertTitle><AlertDescription>{conflict.incoming.updatedBy} changed this task while you were editing. Saving will open a comparison.</AlertDescription></Alert>}
            {lockedBy && <Alert><AlertTriangle /><AlertTitle>Editing locked by {lockedBy}</AlertTitle><AlertDescription>You can view this task, but editing controls will unlock only after they leave or stop editing.</AlertDescription></Alert>}
            {task && draft && <TaskForm disabled={Boolean(lockedBy)} value={draft} onChange={updateDraft} onSubmit={save} submitLabel={conflict ? "Review and save" : "Save changes"} />}
            {devOpen && task && draftDirty && !conflict && <Button variant="outline" className={styles.conflictButton} onClick={() => triggerRemote("conflict", task.id)}><AlertTriangle />Simulate remote conflict</Button>}
            {task && <div className={styles.version}><History className={styles.versionIcon} />Version {task.version} · Updated {formatTaskDate(task.updatedAt, true)} UTC</div>}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className={styles.dialog}>
          <DialogHeader><DialogTitle>Resolve task conflict</DialogTitle><DialogDescription>Choose which version to keep. This saves as one undoable optimistic action.</DialogDescription></DialogHeader>
          {manualMode && conflict && draft && <div className={styles.conflictList}>
            {conflict.changedFields.map((field) => (
              <div key={field} className={styles.conflictField}>
                <div className={styles.fieldName}>{field}</div>
                {field === "description" ? <div className={styles.descriptionMerge}>
                  <Label htmlFor="merged-description">Merged description</Label>
                  <Textarea id="merged-description" aria-label="Merged description" rows={7} value={manualDescription} onChange={(event) => setManualDescription(event.target.value)} />
                  <p className={styles.hint}>Concurrent sentence blocks were reconciled deterministically. Review or edit the result before saving.</p>
                </div> : <div className={styles.choices}>
                  <Choice active={choices[field] !== "theirs"} label="Mine" value={draft[field]} onClick={() => setChoices((value) => ({ ...value, [field]: "mine" }))} />
                  <Choice active={choices[field] === "theirs"} label={`Theirs · ${conflict.incoming.updatedBy}`} value={conflict.incoming[field]} onClick={() => setChoices((value) => ({ ...value, [field]: "theirs" }))} />
                </div>}
              </div>
            ))}
          </div>}
          <DialogFooter className={styles.actions}>
            {!manualMode ? <>
              <Button variant="outline" onClick={takeTheirs}>Take theirs</Button>
              <Button variant="secondary" onClick={() => conflict && draft && submit(conflict.incoming, draft, "Resolve")}>Keep mine</Button>
              <Button onClick={openManualMerge}>Merge manually</Button>
            </> : <>
              <Button variant="outline" onClick={() => setManualMode(false)}>Back</Button>
              <Button onClick={() => conflict && reviewedDraft && submit(conflict.incoming, { ...reviewedDraft, description: manualDescription }, "Resolve")}>Save manual merge</Button>
            </>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Choice({ active, label, value, onClick }: { active: boolean; label: string; value: unknown; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`${styles.choice} ${active ? styles.choiceActive : styles.choiceInactive}`}><span className={styles.choiceLabel}>{label}</span><span className={styles.choiceValue}>{Array.isArray(value) ? value.join(", ") : String(value)}</span></button>
}
