import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { readEnv, requireEnv } from "../src/runtime"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("readEnv", () => {
  it("reads existing env var", () => {
    process.env.TEST_READ_ENV = "hello"
    expect(readEnv("TEST_READ_ENV")).toBe("hello")
    delete process.env.TEST_READ_ENV
  })

  it("returns undefined for missing env var", () => {
    delete process.env.NONEXISTENT_VAR
    expect(readEnv("NONEXISTENT_VAR")).toBeUndefined()
  })
})

describe("requireEnv", () => {
  it("returns value when env var exists", () => {
    process.env.TEST_REQUIRE_ENV = "world"
    expect(requireEnv("TEST_REQUIRE_ENV")).toBe("world")
    delete process.env.TEST_REQUIRE_ENV
  })

  it("throws when env var is missing", () => {
    delete process.env.MISSING_VAR
    expect(() => requireEnv("MISSING_VAR")).toThrow("Missing environment variable: MISSING_VAR")
  })
})

describe("auto-env integration", () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("DbClient auto-reads PULT_DB_URL", async () => {
    process.env.PULT_DB_URL = "https://db-test.pult.rest"
    const { DbClient } = await import("../src/db")
    const db = new DbClient()
    expect(db).toBeDefined()
  })

  it("DbClient throws without PULT_DB_URL", async () => {
    delete process.env.PULT_DB_URL
    const { DbClient } = await import("../src/db")
    expect(() => new DbClient()).toThrow("PULT_DB_URL")
  })

  it("DbClient uses explicit url over env var", async () => {
    process.env.PULT_DB_URL = "https://env.pult.rest"
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    const { DbClient } = await import("../src/db")
    const db = new DbClient({ url: "https://explicit.pult.rest" })
    await db.from("test").select("*")
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("explicit.pult.rest")
  })

  it("AuthClient auto-reads PULT_AUTH_URL", async () => {
    process.env.PULT_AUTH_URL = "https://auth-test.pult.rest"
    const { AuthClient } = await import("../src/auth")
    const auth = new AuthClient()
    expect(auth).toBeDefined()
  })

  it("AuthClient throws without PULT_AUTH_URL", async () => {
    delete process.env.PULT_AUTH_URL
    const { AuthClient } = await import("../src/auth")
    expect(() => new AuthClient()).toThrow("PULT_AUTH_URL")
  })

  it("RedisClient auto-reads PULT_REDIS_URL", async () => {
    process.env.PULT_REDIS_URL = "https://redis-test.pult.rest"
    const { RedisClient } = await import("../src/redis")
    const redis = new RedisClient()
    expect(redis).toBeDefined()
  })

  it("RedisClient throws without PULT_REDIS_URL", async () => {
    delete process.env.PULT_REDIS_URL
    const { RedisClient } = await import("../src/redis")
    expect(() => new RedisClient()).toThrow("PULT_REDIS_URL")
  })

  it("QueueClient auto-reads PULT_REDIS_URL", async () => {
    process.env.PULT_REDIS_URL = "https://redis-test.pult.rest"
    const { QueueClient } = await import("../src/queue")
    const queue = new QueueClient()
    expect(queue).toBeDefined()
  })

  it("RealtimeClient auto-reads PULT_REALTIME_URL", async () => {
    process.env.PULT_REALTIME_URL = "https://realtime-test.pult.rest"
    const { RealtimeClient } = await import("../src/realtime")
    const rt = new RealtimeClient()
    expect(rt).toBeDefined()
  })

  it("RealtimeClient throws without PULT_REALTIME_URL", async () => {
    delete process.env.PULT_REALTIME_URL
    const { RealtimeClient } = await import("../src/realtime")
    expect(() => new RealtimeClient()).toThrow("PULT_REALTIME_URL")
  })
})
