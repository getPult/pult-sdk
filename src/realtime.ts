import type { RealtimeCallback, RealtimeChannelOptions, RealtimeEvent, RealtimeMessage } from "./types"

export class RealtimeClient {
  private url: string
  private headers: Record<string, string>
  private ws: WebSocket | null = null
  private channels: Map<string, RealtimeChannel> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10

  constructor(url: string, headers: Record<string, string> = {}) {
    this.url = url.replace(/^http/, "ws") + "/realtime/v1/websocket"
    this.headers = headers
  }

  channel(name: string, options?: RealtimeChannelOptions): RealtimeChannel {
    const existing = this.channels.get(name)
    if (existing) return existing

    const channel = new RealtimeChannel(this, name, options)
    this.channels.set(name, channel)
    return channel
  }

  removeChannel(name: string): void {
    this.channels.delete(name)
    if (this.channels.size === 0) this.disconnect()
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(this.url)
    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      for (const channel of this.channels.values()) {
        channel.rejoin()
      }
    }
    this.ws.onmessage = (event) => this.handleMessage(event)
    this.ws.onclose = () => this.reconnect()
    this.ws.onerror = () => this.ws?.close()
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts
    this.ws?.close()
    this.ws = null
  }

  send(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private handleMessage(event: MessageEvent): void {
    const data = JSON.parse(String(event.data)) as {
      topic?: string
      event?: string
      payload?: Record<string, unknown>
    }
    const channel = data.topic ? this.channels.get(data.topic) : undefined
    if (channel && data.event && data.payload) {
      channel.handleEvent(data.event, data.payload)
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return
    this.reconnectAttempts++
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000)
    setTimeout(() => this.connect(), delay)
  }
}

export class RealtimeChannel {
  private client: RealtimeClient
  private name: string
  private options: RealtimeChannelOptions
  private bindings: Map<string, RealtimeCallback[]> = new Map()
  private joined = false

  constructor(client: RealtimeClient, name: string, options?: RealtimeChannelOptions) {
    this.client = client
    this.name = name
    this.options = options ?? {}
  }

  on(event: RealtimeEvent, table: string, callback: RealtimeCallback): this {
    const key = `${event}:${table}`
    const existing = this.bindings.get(key) ?? []
    existing.push(callback)
    this.bindings.set(key, existing)
    return this
  }

  onBroadcast(event: string, callback: RealtimeCallback): this {
    const key = `broadcast:${event}`
    const existing = this.bindings.get(key) ?? []
    existing.push(callback)
    this.bindings.set(key, existing)
    return this
  }

  onPresence(event: "sync" | "join" | "leave", callback: RealtimeCallback): this {
    const key = `presence:${event}`
    const existing = this.bindings.get(key) ?? []
    existing.push(callback)
    this.bindings.set(key, existing)
    return this
  }

  send(message: RealtimeMessage): void {
    this.client.send({
      topic: this.name,
      event: message.event,
      payload: {
        type: message.type,
        ...message.payload,
      },
    })
  }

  subscribe(): this {
    this.client.connect()
    this.join()
    return this
  }

  unsubscribe(): void {
    this.client.send({ topic: this.name, event: "phx_leave", payload: {} })
    this.joined = false
    this.client.removeChannel(this.name)
  }

  rejoin(): void {
    if (this.bindings.size > 0) this.join()
  }

  handleEvent(event: string, payload: Record<string, unknown>): void {
    const table = typeof payload["table"] === "string" ? payload["table"] : ""
    const keys = [
      `${event}:${table}`,
      `*:${table}`,
      `broadcast:${event}`,
      `presence:${event}`,
    ]
    for (const key of keys) {
      const callbacks = this.bindings.get(key)
      if (callbacks) {
        for (const cb of callbacks) cb(payload)
      }
    }
  }

  private join(): void {
    if (this.joined) return
    this.client.send({
      topic: this.name,
      event: "phx_join",
      payload: { config: this.options },
    })
    this.joined = true
  }
}
