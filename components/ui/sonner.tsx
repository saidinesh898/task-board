"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import styles from "./sonner.module.css"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className={styles.style1}
      icons={{
        success: (
          <CircleCheckIcon className={styles.style2} />
        ),
        info: (
          <InfoIcon className={styles.style2} />
        ),
        warning: (
          <TriangleAlertIcon className={styles.style2} />
        ),
        error: (
          <OctagonXIcon className={styles.style2} />
        ),
        loading: (
          <Loader2Icon className={styles.style3} />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
