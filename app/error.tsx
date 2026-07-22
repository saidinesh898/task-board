"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ErrorPage({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => console.error(error), [error])
  return <main className="grid min-h-screen place-items-center p-6"><div className="max-w-md space-y-4 text-center"><AlertTriangle className="mx-auto size-10 text-destructive" /><h1 className="text-2xl font-semibold">The board hit an unexpected error</h1><p className="text-sm text-muted-foreground">Your confirmed data is still stored locally. Retry rendering the board.</p><Button onClick={unstable_retry}>Try again</Button></div></main>
}
