"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type {
  EditConflict,
  FailureMode,
  HistoryEntry,
  PendingOperation,
  Priority,
  SimulationEvent,
  SimulationField,
  TaskDraft,
} from "@/features/tasks/types"
import { createEmptyQuery, type FavoriteQuery, type QueryGroup } from "@/features/query-builder/types"

interface BoardState {
  hydrated: boolean
  search: string
  assignee: string
  priority: Priority | "all"
  advancedQuery: QueryGroup
  queryBuilderOpen: boolean
  favoriteQueries: FavoriteQuery[]
  selectedTaskId: string | null
  createOpen: boolean
  shortcutsOpen: boolean
  devOpen: boolean
  activeUser: string
  remoteUser: string | "random"
  targetTaskId: string | "random"
  simulationField: SimulationField
  autoSimulation: boolean
  nextSimulationAt: number | null
  failureMode: FailureMode
  datasetSize: 30 | 1000
  draft: TaskDraft | null
  draftBaseVersion: number | null
  draftDirty: boolean
  conflict: EditConflict | null
  past: HistoryEntry[]
  future: HistoryEntry[]
  pending: PendingOperation[]
  events: SimulationEvent[]
  setHydrated: (value: boolean) => void
  setFilter: (key: "search" | "assignee" | "priority", value: string) => void
  clearFilters: () => void
  setAdvancedQuery: (query: QueryGroup) => void
  setQueryBuilderOpen: (open: boolean) => void
  saveFavoriteQuery: (name: string) => void
  applyFavoriteQuery: (id: string) => void
  deleteFavoriteQuery: (id: string) => void
  setSelectedTaskId: (id: string | null) => void
  setCreateOpen: (open: boolean) => void
  setShortcutsOpen: (open: boolean) => void
  toggleDev: () => void
  setDevOption: (key: string, value: string | boolean | number | null) => void
  setDraft: (draft: TaskDraft | null, version?: number | null, dirty?: boolean) => void
  updateDraft: (patch: Partial<TaskDraft>) => void
  setConflict: (conflict: EditConflict | null) => void
  addHistory: (entry: HistoryEntry) => void
  removeHistory: (operationId: string) => void
  takeUndo: () => HistoryEntry | null
  takeRedo: () => HistoryEntry | null
  addPending: (operation: PendingOperation) => void
  removePending: (id: string) => void
  addEvent: (event: SimulationEvent) => void
  clearEvents: () => void
  consumeOutcome: () => "success" | "failure"
  resetClient: () => void
}

const initial = {
  hydrated: false,
  search: "",
  assignee: "all",
  priority: "all" as const,
  advancedQuery: createEmptyQuery(),
  queryBuilderOpen: false,
  favoriteQueries: [] as FavoriteQuery[],
  selectedTaskId: null,
  createOpen: false,
  shortcutsOpen: false,
  devOpen: false,
  activeUser: "You",
  remoteUser: "random",
  targetTaskId: "random",
  simulationField: "random" as const,
  autoSimulation: false,
  nextSimulationAt: null,
  failureMode: "random" as const,
  datasetSize: 30 as const,
  draft: null,
  draftBaseVersion: null,
  draftDirty: false,
  conflict: null,
  past: [] as HistoryEntry[],
  future: [] as HistoryEntry[],
  pending: [] as PendingOperation[],
  events: [] as SimulationEvent[],
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      ...initial,
      setHydrated: (hydrated) => set({ hydrated }),
      setFilter: (key, value) => set({ [key]: value }),
      clearFilters: () => set({ search: "", assignee: "all", priority: "all", advancedQuery: createEmptyQuery() }),
      setAdvancedQuery: (advancedQuery) => set({ advancedQuery }),
      setQueryBuilderOpen: (queryBuilderOpen) => set({ queryBuilderOpen }),
      saveFavoriteQuery: (rawName) => {
        const name = rawName.trim().slice(0, 60)
        if (!name) return
        const favorite: FavoriteQuery = {
          id: crypto.randomUUID(), name, query: get().advancedQuery, createdAt: new Date().toISOString(),
        }
        set((state) => ({ favoriteQueries: [...state.favoriteQueries, favorite].slice(-20) }))
      },
      applyFavoriteQuery: (id) => {
        const favorite = get().favoriteQueries.find((item) => item.id === id)
        if (favorite) set({ advancedQuery: favorite.query, queryBuilderOpen: true })
      },
      deleteFavoriteQuery: (id) => set((state) => ({ favoriteQueries: state.favoriteQueries.filter((item) => item.id !== id) })),
      setSelectedTaskId: (selectedTaskId) => set({ selectedTaskId }),
      setCreateOpen: (createOpen) => set({ createOpen }),
      setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
      toggleDev: () => set((state) => ({ devOpen: !state.devOpen })),
      setDevOption: (key, value) => set({ [key]: value } as Partial<BoardState>),
      setDraft: (draft, version = null, dirty = false) =>
        set({ draft, draftBaseVersion: version, draftDirty: dirty }),
      updateDraft: (patch) =>
        set((state) => ({ draft: state.draft ? { ...state.draft, ...patch } : null, draftDirty: true })),
      setConflict: (conflict) => set({ conflict }),
      addHistory: (entry) =>
        set((state) => ({ past: [...state.past, entry].slice(-50), future: [] })),
      removeHistory: (operationId) =>
        set((state) => ({ past: state.past.filter((entry) => entry.operationId !== operationId) })),
      takeUndo: () => {
        const state = get()
        const entry = state.past.at(-1) ?? null
        if (entry) set({ past: state.past.slice(0, -1), future: [...state.future, entry] })
        return entry
      },
      takeRedo: () => {
        const state = get()
        const entry = state.future.at(-1) ?? null
        if (entry) set({ future: state.future.slice(0, -1), past: [...state.past, entry].slice(-50) })
        return entry
      },
      addPending: (operation) =>
        set((state) => ({ pending: [...state.pending.filter((item) => item.id !== operation.id), operation] })),
      removePending: (id) => set((state) => ({ pending: state.pending.filter((item) => item.id !== id) })),
      addEvent: (event) => set((state) => ({ events: [event, ...state.events].slice(0, 30) })),
      clearEvents: () => set({ events: [] }),
      consumeOutcome: () => {
        const mode = get().failureMode
        if (mode !== "random") set({ failureMode: "random" })
        if (mode === "success") return "success"
        if (mode === "failure") return "failure"
        return Math.random() < 0.1 ? "failure" : "success"
      },
      resetClient: () => set({ ...initial, hydrated: true }),
    }),
    {
      name: "task-board:client:v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        search: state.search,
        assignee: state.assignee,
        priority: state.priority,
        advancedQuery: state.advancedQuery,
        queryBuilderOpen: state.queryBuilderOpen,
        favoriteQueries: state.favoriteQueries,
        selectedTaskId: state.selectedTaskId,
        devOpen: state.devOpen,
        activeUser: state.activeUser,
        remoteUser: state.remoteUser,
        targetTaskId: state.targetTaskId,
        simulationField: state.simulationField,
        autoSimulation: state.autoSimulation,
        nextSimulationAt: state.nextSimulationAt,
        failureMode: state.failureMode,
        datasetSize: state.datasetSize,
        draft: state.draft,
        draftBaseVersion: state.draftBaseVersion,
        draftDirty: state.draftDirty,
        conflict: state.conflict,
        past: state.past,
        future: state.future,
        pending: state.pending,
        events: state.events,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
)
