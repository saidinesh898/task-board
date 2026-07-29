"use client"

import { useState, type ReactNode } from "react"
import { QueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

// The root layout can render on the server, so the persister needs a Storage
// object whose methods defer localStorage access until they run in a browser.
const lazyBrowserStorage: Storage = {
  get length() { return typeof window === "undefined" ? 0 : window.localStorage.length },
  clear() { if (typeof window !== "undefined") window.localStorage.clear() },
  getItem(key) { return typeof window === "undefined" ? null : window.localStorage.getItem(key) },
  key(index) { return typeof window === "undefined" ? null : window.localStorage.key(index) },
  removeItem(key) { if (typeof window !== "undefined") window.localStorage.removeItem(key) },
  setItem(key, value) { if (typeof window !== "undefined") window.localStorage.setItem(key, value) },
}

export function Providers({ children }: { children: ReactNode }) {
  // One client and persister per mounted application. Recreating either during
  // render would discard cache observers and restart persistence.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5_000, gcTime: 1000 * 60 * 60 * 24 },
          mutations: { retry: false },
        },
      })
  )
  const [persister] = useState(() =>
    createSyncStoragePersister({
      storage: lazyBrowserStorage,
      key: "task-board:query-cache:v1",
    })
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, buster: "v1" }}>
        <TooltipProvider>
          {children}
          <Toaster position="bottom-right" richColors />
        </TooltipProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  )
}
