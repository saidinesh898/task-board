"use client"

import { useEffect, useRef } from "react"
import { CloudOff, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useBoardStore } from "@/stores/board-store"
import styles from "./network-status.module.css"

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
    <div role="status" aria-live="polite" className={styles.style1}>
      <div className={styles.style2}>
        <CloudOff className={styles.style3} />
        <span className={styles.style4}>You are offline.</span>
        <span className={styles.style5}>Changes stay optimistic and sync after reconnection.</span>
        {pendingCount > 0 && <span className={styles.style6}><RefreshCw className={styles.style7} />{pendingCount} queued</span>}
      </div>
    </div>
  )
}
