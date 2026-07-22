"use client"

import { useEffect } from "react"
import { useBoardStore } from "@/stores/board-store"

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]'
    )
  )
}

export function useKeyboardShortcuts({ undo, redo }: { undo: () => void; redo: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isEditable(event.target)) return
      const store = useBoardStore.getState()
      const modifier = event.metaKey || event.ctrlKey

      if (event.key === "?" && !modifier && !event.altKey) {
        event.preventDefault()
        store.setShortcutsOpen(true)
      } else if (event.key === "/" && !modifier && !event.altKey) {
        event.preventDefault()
        document.querySelector<HTMLInputElement>('[data-task-search="true"]')?.focus()
      } else if (event.key.toLowerCase() === "n" && !modifier && !event.altKey) {
        event.preventDefault()
        store.setCreateOpen(true)
      } else if (event.key.toLowerCase() === "d" && !modifier && !event.altKey) {
        event.preventDefault()
        store.toggleDev()
      } else if (event.key.toLowerCase() === "z" && modifier) {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [redo, undo])
}

