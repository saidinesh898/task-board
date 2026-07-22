"use client"

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PEOPLE, PRIORITIES } from "@/features/tasks/types"
import { useBoardStore } from "@/stores/board-store"

export function BoardFilters({ resultCount, totalCount }: { resultCount: number; totalCount: number }) {
  const search = useBoardStore((state) => state.search)
  const assignee = useBoardStore((state) => state.assignee)
  const priority = useBoardStore((state) => state.priority)
  const setFilter = useBoardStore((state) => state.setFilter)
  const clearFilters = useBoardStore((state) => state.clearFilters)
  const filtered = search || assignee !== "all" || priority !== "all"
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm md:flex-row md:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input data-task-search="true" value={search} onChange={(event) => setFilter("search", event.target.value)} placeholder="Search title or description…  /" className="pl-9" />
      </div>
      <div className="flex gap-2">
        <Select value={assignee} onValueChange={(value) => setFilter("assignee", value ?? "all")}>
          <SelectTrigger className="min-w-32 flex-1"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All assignees</SelectItem>{PEOPLE.map((person) => <SelectItem key={person} value={person}>{person}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={priority} onValueChange={(value) => setFilter("priority", value ?? "all")}>
          <SelectTrigger className="min-w-28 flex-1"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All priorities</SelectItem>{PRIORITIES.map((item) => <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{resultCount.toLocaleString()} of {totalCount.toLocaleString()}</span>
      {filtered && <Button variant="ghost" size="sm" onClick={clearFilters}><X />Clear</Button>}
    </div>
  )
}

