"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import styles from "./error.module.css"

export default function ErrorPage({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => console.error(error), [error])
  return <main className={styles.style1}><div className={styles.style2}><AlertTriangle className={styles.style3} /><h1 className={styles.style4}>The board hit an unexpected error</h1><p className={styles.style5}>Your confirmed data is still stored locally. Retry rendering the board.</p><Button onClick={unstable_retry}>Try again</Button></div></main>
}
