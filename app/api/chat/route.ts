import { openai } from "@ai-sdk/openai"
import { convertToModelMessages, streamText, type UIMessage } from "ai"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    const prompt = convertToModelMessages(messages)

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages: prompt,
      abortSignal: req.signal,
      maxTokens: 150,
      temperature: 0.7,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)
    return Response.json({ error: "Failed to process chat request" }, { status: 500 })
  }
}
