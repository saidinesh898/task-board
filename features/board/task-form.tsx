"use client"

import { useId, useState, type FormEvent } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PEOPLE, PRIORITIES, STATUSES, STATUS_LABELS, type TaskDraft } from "@/features/tasks/types"

export const emptyDraft: TaskDraft = {
  title: "", description: "", status: "todo", priority: "medium", assignee: "", tags: [],
}

export function TaskForm({
  value,
  onChange,
  onSubmit,
  submitLabel = "Save task",
  showStatus = true,
  disabled = false,
}: {
  value: TaskDraft
  onChange: (patch: Partial<TaskDraft>) => void
  onSubmit: () => void
  submitLabel?: string
  showStatus?: boolean
  disabled?: boolean
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const prefix = useId()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!value.title.trim()) next.title = "Title is required"
    if (!value.description.trim()) next.description = "Description is required"
    if (!value.assignee.trim()) next.assignee = "Assignee is required"
    setErrors(next)
    if (!Object.keys(next).length) onSubmit()
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={disabled} className="space-y-4 disabled:opacity-70">
      <Field label="Title" htmlFor={`${prefix}-title`} error={errors.title}>
        <Input id={`${prefix}-title`} value={value.title} onChange={(event) => onChange({ title: event.target.value })} aria-invalid={!!errors.title} />
      </Field>
      <Field label="Description" htmlFor={`${prefix}-description`} error={errors.description}>
        <Textarea id={`${prefix}-description`} rows={5} value={value.description} onChange={(event) => onChange({ description: event.target.value })} aria-invalid={!!errors.description} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Assignee" htmlFor={`${prefix}-assignee`} error={errors.assignee}>
          <Select value={value.assignee || null} onValueChange={(assignee) => onChange({ assignee: assignee ?? "" })}>
            <SelectTrigger id={`${prefix}-assignee`} className="w-full"><SelectValue placeholder="Choose a person" /></SelectTrigger>
            <SelectContent>{PEOPLE.map((person) => <SelectItem key={person} value={person}>{person}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Priority" htmlFor={`${prefix}-priority`}>
          <Select value={value.priority} onValueChange={(priority) => priority && onChange({ priority })}>
            <SelectTrigger id={`${prefix}-priority`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORITIES.map((priority) => <SelectItem key={priority} value={priority} className="capitalize">{priority}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      {showStatus && <Field label="Status" htmlFor={`${prefix}-status`}>
        <Select items={STATUS_LABELS} value={value.status} onValueChange={(status) => status && onChange({ status })}>
          <SelectTrigger id={`${prefix}-status`} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>)}</SelectContent>
        </Select>
      </Field>}
      <Field label="Tags" htmlFor={`${prefix}-tags`} hint="Comma-separated">
        <Input id={`${prefix}-tags`} value={value.tags.join(", ")} onChange={(event) => onChange({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
      </Field>
      <Button type="submit" className="w-full">{submitLabel}</Button>
      </fieldset>
    </form>
  )
}

function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><div className="flex justify-between"><Label htmlFor={htmlFor}>{label}</Label>{hint && <span className="text-xs text-muted-foreground">{hint}</span>}</div>{children}{error && <p className="text-xs text-destructive" role="alert">{error}</p>}</div>
}
