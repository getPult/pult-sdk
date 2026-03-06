import { describe, it, expect } from "vitest"

describe("subpath imports", () => {
  it("db module exports DbClient and QueryBuilder", async () => {
    const mod = await import("../src/db")
    expect(mod.DbClient).toBeDefined()
    expect(typeof mod.DbClient).toBe("function")
    expect(mod.QueryBuilder).toBeDefined()
    expect(typeof mod.QueryBuilder).toBe("function")
  })

  it("auth module exports AuthClient", async () => {
    const mod = await import("../src/auth")
    expect(mod.AuthClient).toBeDefined()
    expect(typeof mod.AuthClient).toBe("function")
  })

  it("realtime module exports RealtimeClient and createRealtimeClient", async () => {
    const mod = await import("../src/realtime")
    expect(mod.RealtimeClient).toBeDefined()
    expect(typeof mod.RealtimeClient).toBe("function")
    expect(mod.createRealtimeClient).toBeDefined()
    expect(typeof mod.createRealtimeClient).toBe("function")
  })

  it("redis module exports RedisClient and createRedisClient", async () => {
    const mod = await import("../src/redis")
    expect(mod.RedisClient).toBeDefined()
    expect(typeof mod.RedisClient).toBe("function")
    expect(mod.createRedisClient).toBeDefined()
    expect(typeof mod.createRedisClient).toBe("function")
  })

  it("queue module exports QueueClient and createQueueClient", async () => {
    const mod = await import("../src/queue")
    expect(mod.QueueClient).toBeDefined()
    expect(typeof mod.QueueClient).toBe("function")
    expect(mod.createQueueClient).toBeDefined()
    expect(typeof mod.createQueueClient).toBe("function")
  })

  it("storage module exports StorageClient", async () => {
    const mod = await import("../src/storage")
    expect(mod.StorageClient).toBeDefined()
    expect(typeof mod.StorageClient).toBe("function")
  })

  it("runtime module exports readEnv and requireEnv", async () => {
    const mod = await import("../src/runtime")
    expect(mod.readEnv).toBeDefined()
    expect(typeof mod.readEnv).toBe("function")
    expect(mod.requireEnv).toBeDefined()
    expect(typeof mod.requireEnv).toBe("function")
  })
})

describe("index re-exports", () => {
  it("re-exports all client classes", async () => {
    const mod = await import("../src/index")
    const expectedClasses = [
      "PultClient",
      "DbClient",
      "QueryBuilder",
      "AuthClient",
      "AppsClient",
      "DeploymentsClient",
      "LogsClient",
      "EnvClient",
      "DomainsClient",
      "DatabasesClient",
      "GitClient",
      "StorageClient",
      "RealtimeClient",
      "RedisClient",
      "QueueClient",
    ]
    for (const name of expectedClasses) {
      expect(mod).toHaveProperty(name)
      expect(typeof (mod as Record<string, unknown>)[name]).toBe("function")
    }
  })

  it("re-exports factory functions", async () => {
    const mod = await import("../src/index")
    const expectedFunctions = [
      "createClient",
      "createDbClient",
      "createAuthClient",
      "createRealtimeClient",
      "createRedisClient",
      "createQueueClient",
    ]
    for (const name of expectedFunctions) {
      expect(mod).toHaveProperty(name)
      expect(typeof (mod as Record<string, unknown>)[name]).toBe("function")
    }
  })
})

describe("dist file existence", () => {
  it("all subpath entry points have .js and .cjs files", async () => {
    const { existsSync } = await import("fs")
    const { resolve } = await import("path")
    const distDir = resolve(__dirname, "../dist")

    if (!existsSync(distDir)) return

    const entryPoints = ["index", "db", "auth", "realtime", "redis", "queue"]
    for (const entry of entryPoints) {
      expect(existsSync(resolve(distDir, `${entry}.js`))).toBe(true)
      expect(existsSync(resolve(distDir, `${entry}.cjs`))).toBe(true)
      expect(existsSync(resolve(distDir, `${entry}.d.ts`))).toBe(true)
    }
  })
})
