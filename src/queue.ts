import type {
  AddJobRequest,
  QueueClientOptions,
  QueueStats,
  RedisCommandResponse,
} from "./types"

export class QueueClient {
  private url: string
  private headers: Record<string, string>
  private queueName: string

  constructor(options: QueueClientOptions) {
    this.url = options.url.replace(/\/+$/, "")
    this.headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${options.token}`,
    }
    this.queueName = options.queueName ?? "default"
  }

  async add(req: AddJobRequest): Promise<string> {
    const id = await this.nextId()
    const job = {
      id,
      name: req.name,
      data: req.data,
      status: "waiting",
      attempts: 0,
      max_attempts: req.attempts ?? 3,
      created_at: Date.now(),
    }

    const cmds: string[][] = [
      ["HSET", this.jobKey(id), "data", JSON.stringify(job)],
      ["LPUSH", this.key("waiting"), id],
    ]

    if (req.delay && req.delay > 0) {
      const runAt = Date.now() + req.delay
      cmds[1] = ["ZADD", this.key("delayed"), String(runAt), id]
      job.status = "delayed"
      cmds[0] = ["HSET", this.jobKey(id), "data", JSON.stringify(job)]
    }

    await this.pipeline(cmds)
    return id
  }

  async getJob(id: string): Promise<Record<string, unknown> | null> {
    const resp = await this.command(["HGET", this.jobKey(id), "data"])
    if (resp.result === null || resp.result === undefined) return null
    return JSON.parse(resp.result as string) as Record<string, unknown>
  }

  async stats(): Promise<QueueStats> {
    const results = await this.pipeline([
      ["LLEN", this.key("waiting")],
      ["ZCARD", this.key("delayed")],
      ["GET", this.key("completed")],
      ["GET", this.key("failed")],
    ])

    return {
      waiting: (results[0]?.result as number) ?? 0,
      active: 0,
      delayed: (results[1]?.result as number) ?? 0,
      completed: Number(results[2]?.result ?? 0),
      failed: Number(results[3]?.result ?? 0),
    }
  }

  async getWaiting(limit = 10): Promise<string[]> {
    const resp = await this.command(["LRANGE", this.key("waiting"), "0", String(limit - 1)])
    return (resp.result ?? []) as string[]
  }

  async getDelayed(limit = 10): Promise<string[]> {
    const resp = await this.command(["ZRANGE", this.key("delayed"), "0", String(limit - 1)])
    return (resp.result ?? []) as string[]
  }

  private async nextId(): Promise<string> {
    const resp = await this.command(["INCR", this.key("id")])
    return String(resp.result)
  }

  private key(suffix: string): string {
    return `pult:queue:${this.queueName}:${suffix}`
  }

  private jobKey(id: string): string {
    return `pult:queue:${this.queueName}:jobs:${id}`
  }

  private async command(cmd: string[]): Promise<RedisCommandResponse> {
    const response = await fetch(`${this.url}/`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ cmd }),
    })
    if (!response.ok) {
      const body = await response.json() as Record<string, unknown>
      throw new Error(typeof body["error"] === "string" ? body["error"] : response.statusText)
    }
    return response.json() as Promise<RedisCommandResponse>
  }

  private async pipeline(cmds: string[][]): Promise<RedisCommandResponse[]> {
    const body = cmds.map(cmd => ({ cmd }))
    const response = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const err = await response.json() as Record<string, unknown>
      throw new Error(typeof err["error"] === "string" ? err["error"] : response.statusText)
    }
    return response.json() as Promise<RedisCommandResponse[]>
  }
}

export function createQueueClient(options: QueueClientOptions): QueueClient {
  return new QueueClient(options)
}
