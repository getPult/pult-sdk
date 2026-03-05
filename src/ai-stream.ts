export interface ChatChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: { role?: string; content?: string; tool_calls?: Array<{ index: number; id?: string; type?: string; function?: { name?: string; arguments?: string } }> }
    finish_reason: string | null
  }>
}

export async function* parseSSEStream(response: Response): AsyncGenerator<ChatChunk> {
  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        const data = line.slice(6).trim()
        if (data === "[DONE]") return
        try {
          yield JSON.parse(data) as ChatChunk
        } catch {
          // skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function streamToAsyncIterable(response: Response): AsyncIterable<ChatChunk> {
  return { [Symbol.asyncIterator]: () => parseSSEStream(response) }
}
