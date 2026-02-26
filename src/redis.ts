import type { HttpClient } from "./http"
import type { PultResponse, RedisSetOptions } from "./types"

export class RedisClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async get<T = string>(key: string): Promise<PultResponse<T>> {
    return this.http.get<T>(`/redis/v1/get/${encodeURIComponent(key)}`)
  }

  async set(key: string, value: string, options?: RedisSetOptions): Promise<PultResponse<null>> {
    return this.http.post<null>("/redis/v1/set", { key, value, ...options })
  }

  async del(...keys: string[]): Promise<PultResponse<number>> {
    return this.http.post<number>("/redis/v1/del", { keys })
  }

  async exists(...keys: string[]): Promise<PultResponse<number>> {
    return this.http.post<number>("/redis/v1/exists", { keys })
  }

  async incr(key: string): Promise<PultResponse<number>> {
    return this.http.post<number>(`/redis/v1/incr/${encodeURIComponent(key)}`)
  }

  async expire(key: string, seconds: number): Promise<PultResponse<boolean>> {
    return this.http.post<boolean>("/redis/v1/expire", { key, seconds })
  }

  async ttl(key: string): Promise<PultResponse<number>> {
    return this.http.get<number>(`/redis/v1/ttl/${encodeURIComponent(key)}`)
  }

  async publish(channel: string, message: string): Promise<PultResponse<number>> {
    return this.http.post<number>("/redis/v1/publish", { channel, message })
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<{ unsubscribe: () => void }> {
    const url = `/redis/v1/subscribe/${encodeURIComponent(channel)}`
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      callback(event.data)
    }

    return {
      unsubscribe: () => eventSource.close(),
    }
  }
}
