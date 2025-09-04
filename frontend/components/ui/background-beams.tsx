"use client"
import { cn } from "@/lib/utils"

export const BackgroundBeams = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "absolute inset-0 h-screen w-full bg-neutral-950 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-red-500/10 to-transparent blur-xl" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    </div>
  )
}
