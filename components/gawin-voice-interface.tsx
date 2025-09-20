"use client"

import { useState, useRef, useEffect } from "react"
import { GawinIceCube } from "./gawin-ice-cube"

type VoiceState = "idle" | "listening" | "processing" | "speaking"

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export function GawinVoiceInterface() {
  const [state, setState] = useState<VoiceState>("idle")
  const [isListening, setIsListening] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const initializeAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()

        // Get user media for voice isolation
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
          },
        })

        const source = audioContextRef.current.createMediaStreamSource(streamRef.current)
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 256
        analyserRef.current.smoothingTimeConstant = 0.8

        // Voice isolation filter
        const highpass = audioContextRef.current.createBiquadFilter()
        highpass.type = "highpass"
        highpass.frequency.value = 80 // Remove low-frequency noise

        const lowpass = audioContextRef.current.createBiquadFilter()
        lowpass.type = "lowpass"
        lowpass.frequency.value = 8000 // Remove high-frequency noise

        source.connect(highpass)
        highpass.connect(lowpass)
        lowpass.connect(analyserRef.current)

        startAudioAnalysis()
      } catch (error) {
        console.error("Failed to initialize audio:", error)
      }
    }

    initializeAudio()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const startAudioAnalysis = () => {
    if (!analyserRef.current) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const analyze = () => {
      analyserRef.current!.getByteFrequencyData(dataArray)

      // Calculate average audio level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength
      setAudioLevel(average / 255)

      // Detect musical patterns (simple lyrics detection)
      const lowFreq = dataArray.slice(0, 10).reduce((sum, val) => sum + val, 0) / 10
      const midFreq = dataArray.slice(10, 50).reduce((sum, val) => sum + val, 0) / 40
      const highFreq = dataArray.slice(50, 100).reduce((sum, val) => sum + val, 0) / 50

      // Simple pattern detection for music/lyrics
      const isMusic = midFreq > 100 && highFreq > 80 && lowFreq > 60
      if (isMusic && state === "listening") {
        console.log("[v0] Possible music/lyrics detected")
      }

      animationRef.current = requestAnimationFrame(analyze)
    }

    analyze()
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = "en-US"

        recognitionRef.current.onstart = () => {
          setState("listening")
          setIsListening(true)
        }

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          handleVoiceInput(transcript)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
          if (state === "listening") {
            setState("idle")
          }
        }

        recognitionRef.current.onerror = () => {
          setIsListening(false)
          setState("idle")
        }
      }

      synthRef.current = window.speechSynthesis
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  const handleVoiceInput = async (text: string) => {
    setState("processing")

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
        }),
      })

      if (response.ok) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let aiResponse = ""

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("0:")) {
                try {
                  const data = JSON.parse(line.slice(2))
                  if (data.content) {
                    aiResponse += data.content
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        }

        const finalResponse = aiResponse || "I heard you, but I'm not sure how to respond to that."

        if (synthRef.current) {
          setState("speaking")
          const utterance = new SpeechSynthesisUtterance(finalResponse)
          utterance.onend = () => setState("idle")
          synthRef.current.speak(utterance)
        } else {
          setState("idle")
        }
      } else {
        throw new Error("Failed to get AI response")
      }
    } catch (error) {
      console.error("Error processing voice input:", error)
      const fallbackResponse = "I'm having trouble processing that right now."

      if (synthRef.current) {
        setState("speaking")
        const utterance = new SpeechSynthesisUtterance(fallbackResponse)
        utterance.onend = () => setState("idle")
        synthRef.current.speak(utterance)
      } else {
        setState("idle")
      }
    }
  }

  const handleCubeClick = () => {
    if (recognitionRef.current && !isListening && state === "idle") {
      recognitionRef.current.start()
    }
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-black via-gray-900 to-black relative">
      <GawinIceCube state={state} onClick={handleCubeClick} />

      {(state === "listening" || state === "speaking") && (
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none">
          <div className="flex items-end justify-center h-full space-x-1 px-8">
            {Array.from({ length: 50 }, (_, i) => (
              <div
                key={i}
                className="bg-gradient-to-t from-blue-400/60 to-transparent rounded-t-full transition-all duration-75"
                style={{
                  width: "2px",
                  height: `${Math.max(4, (audioLevel * 100 + Math.random() * 20) * (0.5 + Math.sin(Date.now() * 0.01 + i * 0.2) * 0.5))}px`,
                  animationDelay: `${i * 20}ms`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
