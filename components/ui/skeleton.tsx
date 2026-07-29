import { cn } from "@/lib/utils"
import styles from "./skeleton.module.css"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(styles.style1, className)}
      {...props}
    />
  )
}

export { Skeleton }
