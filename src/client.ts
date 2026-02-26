import { AuthClient } from "./auth"
import { DatabaseClient } from "./db"
import { HttpClient } from "./http"
import { QueueClient } from "./queue"
import { RealtimeClient } from "./realtime"
import { RedisClient } from "./redis"
import { StorageClient } from "./storage"
import type { PultClientOptions } from "./types"

export class PultClient {
  readonly db: DatabaseClient
  readonly auth: AuthClient
  readonly storage: StorageClient
  readonly realtime: RealtimeClient
  readonly redis: RedisClient
  readonly queue: QueueClient

  private http: HttpClient

  constructor(options: PultClientOptions) {
    const headers: Record<string, string> = { ...options.headers }
    if (options.apiKey) {
      headers["apikey"] = options.apiKey
    }

    this.http = new HttpClient(options.url, headers)
    this.db = new DatabaseClient(this.http)
    this.auth = new AuthClient(this.http)
    this.storage = new StorageClient(this.http)
    this.realtime = new RealtimeClient(options.url, headers)
    this.redis = new RedisClient(this.http)
    this.queue = new QueueClient(this.http)
  }
}
