import type {
  ChannelSubscription,
  PostgresChangeFilter,
  PresenceState,
  RealtimeClientOptions,
  RealtimeMessage,
} from "./types"

type EventCallback = (payload: unknown) => void

class Channel implements ChannelSubscription {
  readonly channel: string
  private client: RealtimeClient
  private listeners: Map<string, EventCallback[]> = new Map()

  constructor(channel: string, client: RealtimeClient) {
    this.channel = channel
    this.client = client
  }

  on(event: string, callback: EventCallback): ChannelSubscription {
    const existing = this.listeners.get(event) || []
    existing.push(callback)
    this.listeners.set(event, existing)
    return this
  }

  subscribe(): void {
    this.client.sendMessage({
      type: "subscribe",
      channel: this.channel,
    })
  }

  unsubscribe(): void {
    this.client.sendMessage({
      type: "unsubscribe",
      channel: this.channel,
    })
    this.client.removeChannel(this.channel)
  }

  dispatch(event: string, payload: unknown): void {
    const callbacks = this.listeners.get(event) || []
    for (const cb of callbacks) {
      cb(payload)
    }
    const wildcardCallbacks = this.listeners.get("*") || []
    for (const cb of wildcardCallbacks) {
      cb(payload)
    }
  }
}

export class RealtimeClient {
  private url: string
  private token: string
  private ws: WebSocket | null = null
  private channels: Map<string, Channel> = new Map()
  private heartbeatRef = 0
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private onOpenCallbacks: (() => void)[] = []
  private onCloseCallbacks: (() => void)[] = []
  private onErrorCallbacks: ((error: Event) => void)[] = []

  constructor(options: RealtimeClientOptions) {
    this.url = options.url.replace(/^http/, "ws")
    this.token = options.token
  }

  connect(): void {
    const wsUrl = `${this.url}/websocket?token=${encodeURIComponent(this.token)}`
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      this.startHeartbeat()
      for (const cb of this.onOpenCallbacks) cb()
    }

    this.ws.onmessage = (event: MessageEvent) => {
      const msg: RealtimeMessage = JSON.parse(String(event.data))
      this.handleMessage(msg)
    }

    this.ws.onclose = () => {
      this.stopHeartbeat()
      for (const cb of this.onCloseCallbacks) cb()
      this.scheduleReconnect()
    }

    this.ws.onerror = (event: Event) => {
      for (const cb of this.onErrorCallbacks) cb(event)
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }

  channel(name: string): ChannelSubscription {
    let ch = this.channels.get(name)
    if (!ch) {
      ch = new Channel(name, this)
      this.channels.set(name, ch)
    }
    return ch
  }

  onOpen(callback: () => void): void {
    this.onOpenCallbacks.push(callback)
  }

  onClose(callback: () => void): void {
    this.onCloseCallbacks.push(callback)
  }

  onError(callback: (error: Event) => void): void {
    this.onErrorCallbacks.push(callback)
  }

  broadcast(channel: string, event: string, payload: unknown): void {
    this.sendMessage({
      type: "broadcast",
      channel,
      event,
      payload,
    })
  }

  trackPresence(channel: string, metadata: Record<string, unknown>): void {
    this.sendMessage({
      type: "presence",
      channel,
      event: "track",
      payload: metadata,
    })
  }

  subscribePostgresChanges(
    channel: string,
    filter: PostgresChangeFilter,
    callback: (payload: unknown) => void,
  ): ChannelSubscription {
    const ch = this.channel(channel)
    ch.on("db_change", callback)
    this.sendMessage({
      type: "subscribe",
      channel,
      payload: {
        postgres_changes: [filter],
      },
    })
    return ch
  }

  sendMessage(msg: RealtimeMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  removeChannel(name: string): void {
    this.channels.delete(name)
  }

  private handleMessage(msg: RealtimeMessage): void {
    if (msg.type === "heartbeat_reply") {
      return
    }

    if (msg.channel) {
      const ch = this.channels.get(msg.channel)
      if (ch) {
        ch.dispatch(msg.event || msg.type, msg.payload)
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.heartbeatRef++
      this.sendMessage({
        type: "heartbeat",
        ref: String(this.heartbeatRef),
      })
    }, 30000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.connect()
      for (const [, ch] of this.channels) {
        ch.subscribe()
      }
    }, 3000)
  }
}

export function createRealtimeClient(options: RealtimeClientOptions): RealtimeClient {
  return new RealtimeClient(options)
}
