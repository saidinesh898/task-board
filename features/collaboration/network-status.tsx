"use client"

import { useEffect, useRef } from "react"
import { CloudOff, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useBoardStore } from "@/stores/board-store"

export function NetworkStatus() {
  const forcedOffline = useBoardStore((state) => state.forcedOffline)
  const online = useBoardStore((state) => state.networkOnline)
  const pendingCount = useBoardStore((state) => state.pending.length)
  const setNetworkOnline = useBoardStore((state) => state.setNetworkOnline)
  const previous = useRef<boolean | null>(null)

  useEffect(() => {
    const sync = () => setNetworkOnline(navigator.onLine && !forcedOffline)
    sync()
    window.addEventListener("online", sync)
    window.addEventListener("offline", sync)
    return () => {
      window.removeEventListener("online", sync)
      window.removeEventListener("offline", sync)
    }
  }, [forcedOffline, setNetworkOnline])

  useEffect(() => {
    if (previous.current === false && online) {
      toast.success("Connection restored", { description: pendingCount ? "Queued changes are syncing now." : "The board is up to date." })
    }
    previous.current = online
  }, [online, pendingCount])

  if (online) return null
  return (
    <div role="status" aria-live="polite" className="border-b border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-2 text-sm sm:px-6">
        <CloudOff className="size-4" />
        <span className="font-medium">You are offline.</span>
        <span className="text-xs opacity-80">Changes stay optimistic and sync after reconnection.</span>
        {pendingCount > 0 && <span className="ml-auto inline-flex items-center gap-1 text-xs"><RefreshCw className="size-3 animate-spin" />{pendingCount} queued</span>}
      </div>
    </div>
  )
}
