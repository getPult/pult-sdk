import type { HttpClient } from "./http"
import type { PultResponse, QueueHandler, QueueJob, QueueJobOptions } from "./types"

export class QueueClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async add<T = unknown>(name: string, data: T, options?: QueueJobOptions): Promise<PultResponse<QueueJob<T>>> {
    return this.http.post<QueueJob<T>>("/queue/v1/jobs", {
      name,
      data,
      ...options,
    })
  }

  async getJob<T = unknown>(id: string): Promise<PultResponse<QueueJob<T>>> {
    return this.http.get<QueueJob<T>>(`/queue/v1/jobs/${encodeURIComponent(id)}`)
  }

  async process<T = unknown>(name: string, handler: QueueHandler<T>): Promise<{ stop: () => void }> {
    let running = true

    const poll = async () => {
      while (running) {
        const result = await this.http.post<QueueJob<T> | null>("/queue/v1/dequeue", { name })

        if (result.data) {
          try {
            await handler(result.data)
            await this.http.post("/queue/v1/ack", { jobId: result.data.id })
          } catch {
            await this.http.post("/queue/v1/nack", { jobId: result.data.id })
          }
        } else {
          await this.sleep(1000)
        }
      }
    }

    poll()

    return {
      stop: () => { running = false },
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
