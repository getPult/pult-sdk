import type {
  RedisClientOptions,
  RedisCommandResponse,
} from "./types"

interface SetOptions {
  ex?: number
  px?: number
  nx?: boolean
  xx?: boolean
}

export class RedisClient {
  private url: string
  private headers: Record<string, string>

  constructor(options: RedisClientOptions) {
    this.url = options.url.replace(/\/+$/, "")
    this.headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${options.token}`,
    }
  }

  async get(key: string): Promise<unknown> {
    const resp = await this.command(["GET", key])
    return resp.result
  }

  async set(key: string, value: string, opts?: SetOptions): Promise<unknown> {
    const cmd = ["SET", key, value]
    if (opts?.ex !== undefined) cmd.push("EX", String(opts.ex))
    if (opts?.px !== undefined) cmd.push("PX", String(opts.px))
    if (opts?.nx) cmd.push("NX")
    if (opts?.xx) cmd.push("XX")
    const resp = await this.command(cmd)
    return resp.result
  }

  async del(key: string): Promise<number> {
    const resp = await this.command(["DEL", key])
    return resp.result as number
  }

  async incr(key: string): Promise<number> {
    const resp = await this.command(["INCR", key])
    return resp.result as number
  }

  async decr(key: string): Promise<number> {
    const resp = await this.command(["DECR", key])
    return resp.result as number
  }

  async expire(key: string, seconds: number): Promise<number> {
    const resp = await this.command(["EXPIRE", key, String(seconds)])
    return resp.result as number
  }

  async ttl(key: string): Promise<number> {
    const resp = await this.command(["TTL", key])
    return resp.result as number
  }

  async keys(pattern: string): Promise<string[]> {
    const resp = await this.command(["KEYS", pattern])
    return (resp.result ?? []) as string[]
  }

  async exists(key: string): Promise<boolean> {
    const resp = await this.command(["EXISTS", key])
    return (resp.result as number) > 0
  }

  async command(cmd: string[]): Promise<RedisCommandResponse> {
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

  async pipeline(cmds: string[][]): Promise<RedisCommandResponse[]> {
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

export function createRedisClient(options: RedisClientOptions): RedisClient {
  return new RedisClient(options)
}
