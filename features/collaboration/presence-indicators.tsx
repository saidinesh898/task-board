"use client"

import { Pencil } from "lucide-react"
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import type { PresenceEntry } from "@/features/tasks/types"
import styles from "./presence-indicators.module.css"

function initials(user: string) {
  return user.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

export function PresenceIndicators({ entries }: { entries: PresenceEntry[] }) {
  if (!entries.length) return null
  const summary = entries.map((entry) => `${entry.mode === "editing" ? "Editing" : "Viewing"}: ${entry.user}`).join("; ")
  return (
    <div aria-label={summary} title={summary} className={styles.style1}>
      <AvatarGroup>
        {entries.slice(0, 3).map((entry) => (
          <Avatar key={entry.user} size="sm">
            <AvatarFallback className={entry.mode === "editing" ? styles.style2 : styles.style3}>{initials(entry.user)}</AvatarFallback>
            <AvatarBadge className={entry.mode === "editing" ? styles.style4 : styles.style5}>{entry.mode === "editing" && <Pencil />}</AvatarBadge>
          </Avatar>
        ))}
        {entries.length > 3 && <AvatarGroupCount className={styles.style6}>+{entries.length - 3}</AvatarGroupCount>}
      </AvatarGroup>
      <span className={styles.style7}>{summary}</span>
    </div>
  )
}
