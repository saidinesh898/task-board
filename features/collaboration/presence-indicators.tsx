"use client"

import { Pencil } from "lucide-react"
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import type { PresenceEntry } from "@/features/tasks/types"

function initials(user: string) {
  return user.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

export function PresenceIndicators({ entries }: { entries: PresenceEntry[] }) {
  if (!entries.length) return null
  const summary = entries.map((entry) => `${entry.mode === "editing" ? "Editing" : "Viewing"}: ${entry.user}`).join("; ")
  return (
    <div aria-label={summary} title={summary} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <AvatarGroup>
        {entries.slice(0, 3).map((entry) => (
          <Avatar key={entry.user} size="sm">
            <AvatarFallback className={entry.mode === "editing" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-primary/10 text-primary"}>{initials(entry.user)}</AvatarFallback>
            <AvatarBadge className={entry.mode === "editing" ? "bg-amber-500" : "bg-emerald-500"}>{entry.mode === "editing" && <Pencil />}</AvatarBadge>
          </Avatar>
        ))}
        {entries.length > 3 && <AvatarGroupCount className="size-6 text-[10px]">+{entries.length - 3}</AvatarGroupCount>}
      </AvatarGroup>
      <span className="sr-only">{summary}</span>
    </div>
  )
}
