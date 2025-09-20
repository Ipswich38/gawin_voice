"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AIVoiceSphere } from "./ai-voice-sphere"
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

type VoiceState = "idle" | "listening" | "processing" | "speaking"

interface AIVoiceInterfaceProps {
  onVoiceInput?: (text: string) => void
  onStateChange?: (state: VoiceState) => void
  className?: string
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export function AIVoiceInterface({ onVoiceInput, onStateChange, className }: AIVoiceInterfaceProps) {
  const [state, setState] = useState<VoiceState>("idle")
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [response, setResponse] = useState("")
  const [isMuted, setIsMuted] = useState(false)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-US"

        recognitionRef.current.onstart = () => {
          setState("listening")
          setIsListening(true)
        }

        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex
          const transcript = event.results[current][0].transcript
          setTranscript(transcript)

          if (event.results[current].isFinal) {
            handleVoiceInput(transcript)
          }
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
          if (state === "listening") {
            setState("idle")
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error)
          setIsListening(false)
          setState("idle")
        }
      }

      // Initialize speech synthesis
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

  useEffect(() => {
    onStateChange?.(state)
  }, [state, onStateChange])

  const handleVoiceInput = async (text: string) => {
    setState("processing")
    onVoiceInput?.(text)

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
        setResponse(finalResponse)

        if (!isMuted && synthRef.current) {
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
      const fallbackResponse = "I'm having trouble processing that right now. Please try again."
      setResponse(fallbackResponse)

      if (!isMuted && synthRef.current) {
        setState("speaking")
        const utterance = new SpeechSynthesisUtterance(fallbackResponse)
        utterance.onend = () => setState("idle")
        synthRef.current.speak(utterance)
      } else {
        setState("idle")
      }
    }
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript("")
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel()
      setState("idle")
    }
  }

  const getStateMessage = () => {
    switch (state) {
      case "listening":
        return "Listening..."
      case "processing":
        return "Processing..."
      case "speaking":
        return "Speaking..."
      default:
        return "Ready to listen"
    }
  }

  return (
    <Card className={cn("p-8 bg-gray-900/80 backdrop-blur-sm border-gray-700/50 shadow-2xl", className)}>
      <div className="flex flex-col items-center space-y-8">
        {/* AI Voice Sphere */}
        <div className="relative">
          <AIVoiceSphere state={state} size="xl" />
        </div>

        {/* State Message */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">AI Voice Assistant</h2>
          <p className="text-gray-300 text-lg">{getStateMessage()}</p>
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="w-full max-w-md">
            <p className="text-sm text-gray-400 mb-1">You said:</p>
            <div className="p-3 bg-gray-800/70 rounded-lg border border-gray-600">
              <p className="text-white">{transcript}</p>
            </div>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="w-full max-w-md">
            <p className="text-sm text-gray-400 mb-1">AI Response:</p>
            <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
              <p className="text-white">{response}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center space-x-4">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={state === "processing" || state === "speaking"}
            size="lg"
            className={cn(
              "rounded-full w-16 h-16 transition-all duration-200",
              isListening ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white",
            )}
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          <Button
            onClick={toggleMute}
            variant="outline"
            size="lg"
            className="rounded-full w-16 h-16 bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700/50"
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-gray-400 max-w-md">
          <p>
            Click the microphone to start voice interaction. The sphere will change colors to indicate different states:
            purple for listening, orange for processing, and gray for speaking.
          </p>
        </div>
      </div>
    </Card>
  )
}
