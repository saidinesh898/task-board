"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useBoardStore } from "@/stores/board-store"
import styles from "./shortcuts-dialog.module.css"

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
      <DialogContent className={styles.style1}>
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
    <section className={styles.style2}>
      <h3 className={styles.style3}>{title}</h3>
      <div className={styles.style4}>
        {rows.map(([keys, description]) => (
          <div key={`${keys}-${description}`} className={styles.style5}>
            <span className={styles.style6}>{description}</span>
            <Badge variant="secondary" className={styles.style7}>{keys}</Badge>
          </div>
        ))}
      </div>
    </section>
  )
}
