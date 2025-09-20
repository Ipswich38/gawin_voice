"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type VoiceState = "idle" | "listening" | "processing" | "speaking"

interface AIVoiceSphereProps {
  state: VoiceState
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeClasses = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
  xl: "w-48 h-48",
}

const stateColors = {
  idle: "bg-gradient-to-br from-slate-400 to-slate-500",
  listening: "bg-gradient-to-br from-indigo-500 to-purple-600",
  processing: "bg-gradient-to-br from-amber-500 to-orange-600",
  speaking: "bg-gradient-to-br from-slate-600 to-slate-700",
}

const stateGlows = {
  idle: "shadow-lg shadow-slate-400/30",
  listening: "shadow-2xl shadow-indigo-500/50",
  processing: "shadow-2xl shadow-amber-500/50",
  speaking: "shadow-2xl shadow-slate-500/50",
}

export function AIVoiceSphere({ state, size = "lg", className }: AIVoiceSphereProps) {
  const [ripples, setRipples] = useState<number[]>([])

  useEffect(() => {
    if (state === "listening") {
      const interval = setInterval(() => {
        setRipples((prev) => [...prev, Date.now()])
      }, 800)

      return () => clearInterval(interval)
    } else {
      setRipples([])
    }
  }, [state])

  useEffect(() => {
    if (ripples.length > 0) {
      const timeout = setTimeout(() => {
        setRipples((prev) => prev.slice(1))
      }, 1500)

      return () => clearTimeout(timeout)
    }
  }, [ripples])

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Ripple effects for listening state */}
      {ripples.map((ripple) => (
        <div
          key={ripple}
          className={cn("absolute rounded-full border-2 border-indigo-400/30 animate-ripple", sizeClasses[size])}
        />
      ))}

      {/* Main sphere */}
      <div
        className={cn(
          "relative rounded-full transition-all duration-500 ease-in-out",
          sizeClasses[size],
          stateColors[state],
          stateGlows[state],
          {
            "animate-pulse-glow": state === "listening",
            "animate-rotate": state === "processing",
            "animate-pulse": state === "speaking",
          },
        )}
      >
        {/* Inner glow */}
        <div
          className={cn(
            "absolute inset-2 rounded-full opacity-60 blur-sm transition-all duration-500",
            stateColors[state],
          )}
        />

        {/* Core highlight */}
        <div className="absolute inset-4 rounded-full bg-white/20 blur-xs" />

        {/* Processing indicator */}
        {state === "processing" && (
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white/40 animate-spin" />
        )}
      </div>
    </div>
  )
}
