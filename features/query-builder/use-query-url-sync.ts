"use client"

import { useEffect, useState } from "react"
import { useBoardStore } from "@/stores/board-store"
import { createEmptyQuery } from "./types"
import { decodeQuery, readQueryParams, writeQueryParams } from "./query-engine"
import { PEOPLE, PRIORITIES } from "@/features/tasks/types"

export function useQueryUrlSync() {
  const hydrated = useBoardStore((state) => state.hydrated)
  const query = useBoardStore((state) => state.advancedQuery)
  const setQuery = useBoardStore((state) => state.setAdvancedQuery)
  const search = useBoardStore((state) => state.search)
  const assignee = useBoardStore((state) => state.assignee)
  const priority = useBoardStore((state) => state.priority)
  const setFilter = useBoardStore((state) => state.setFilter)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!hydrated) return
    const url = new URL(window.location.href)
    const encoded = url.searchParams.get("q")
    const fromUrl = readQueryParams(url.searchParams) ?? decodeQuery(encoded)
    if (fromUrl) setQuery(fromUrl)
    else if (encoded) {
      url.searchParams.delete("q")
      window.history.replaceState(null, "", url)
    }
    if (url.searchParams.has("search")) setFilter("search", url.searchParams.get("search") ?? "")
    const urlAssignee = url.searchParams.get("assignee")
    if (urlAssignee && PEOPLE.includes(urlAssignee as (typeof PEOPLE)[number])) setFilter("assignee", urlAssignee)
    const urlPriority = url.searchParams.get("priority")
    if (urlPriority && PRIORITIES.includes(urlPriority as (typeof PRIORITIES)[number])) setFilter("priority", urlPriority)
    // Defer the local readiness flag so the URL-derived Zustand update settles
    // before the outbound synchronization effect is allowed to run.
    let active = true
    queueMicrotask(() => { if (active) setReady(true) })

    const onPopState = () => {
      const params = new URL(window.location.href).searchParams
      const value = readQueryParams(params) ?? decodeQuery(params.get("q"))
      setQuery(value ?? createEmptyQuery())
      setFilter("search", params.get("search") ?? "")
      setFilter("assignee", params.get("assignee") ?? "all")
      setFilter("priority", params.get("priority") ?? "all")
    }
    window.addEventListener("popstate", onPopState)
    return () => { active = false; window.removeEventListener("popstate", onPopState) }
  }, [hydrated, setFilter, setQuery])

  useEffect(() => {
    if (!ready) return
    const url = new URL(window.location.href)
    writeQueryParams(query, url.searchParams)
    if (search.trim()) url.searchParams.set("search", search.trim())
    else url.searchParams.delete("search")
    if (assignee !== "all") url.searchParams.set("assignee", assignee)
    else url.searchParams.delete("assignee")
    if (priority !== "all") url.searchParams.set("priority", priority)
    else url.searchParams.delete("priority")
    window.history.replaceState(null, "", url)
  }, [assignee, priority, query, ready, search])
}
