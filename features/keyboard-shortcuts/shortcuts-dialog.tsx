"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useBoardStore } from "@/stores/board-store"

const groups = [
  ["General", [["?", "Open keyboard shortcuts"], ["/", "Focus task search"], ["N", "Create a task"], ["Esc", "Close or cancel"]]],
  ["Drag and drop", [["Tab", "Focus a drag handle"], ["Space / Enter", "Pick up or drop"], ["Arrow keys", "Move the active card"], ["Esc", "Cancel drag"]]],
  ["Developer tools", [["D", "Expand or collapse Developer Tools"]]],
] as const

export function ShortcutsDialog() {
  const open = useBoardStore((state) => state.shortcutsOpen)
  const setOpen = useBoardStore((state) => state.setShortcutsOpen)
  const past = useBoardStore((state) => state.past)
  const future = useBoardStore((state) => state.future)
  const [modifier, setModifier] = useState("Ctrl/⌘")
  useEffect(() => {
    const timer = window.setTimeout(() => setModifier(/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const history: Array<readonly [string, string]> = [
    [`${modifier} Z`, past.at(-1) ? `Undo: ${past.at(-1)!.label}` : "Undo (nothing to undo)"],
    [`${modifier} ⇧ Z`, future.at(-1) ? `Redo: ${future.at(-1)!.label}` : "Redo (nothing to redo)"],
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Move quickly without leaving the board.</DialogDescription>
        </DialogHeader>
        <ShortcutGroup title="History" rows={history} />
        {groups.map(([title, rows]) => <ShortcutGroup key={title} title={title} rows={rows} />)}
      </DialogContent>
    </Dialog>
  )
}

function ShortcutGroup({ title, rows }: { title: string; rows: readonly (readonly [string, string])[] }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="divide-y rounded-xl border bg-card">
        {rows.map(([keys, description]) => (
          <div key={`${keys}-${description}`} className="flex items-center justify-between gap-4 px-3 py-2.5">
            <span className="text-sm">{description}</span>
            <Badge variant="secondary" className="shrink-0 font-mono">{keys}</Badge>
          </div>
        ))}
      </div>
    </section>
  )
}
