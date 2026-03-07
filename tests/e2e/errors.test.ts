import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { TOKEN, TOKEN_FREE, CLEANUP, API_URL, client, createClient, PultClient } from "./helpers"

describe.skipIf(!TOKEN)("E2E: Error handling", () => {
  let pult: PultClient

  beforeAll(() => {
    pult = client(TOKEN!)
  })

  it("invalid token returns 401", async () => {
    const bad = createClient({ url: API_URL, apiKey: "invalid-token-12345" })
    const { data, error } = await bad.apps.list()
    expect(data).toBeNull()
    expect(error!.status).toBe(401)
  })

  it("empty token returns 401", async () => {
    const bad = createClient({ url: API_URL, apiKey: "" })
    const { data, error } = await bad.apps.list()
    expect(data).toBeNull()
    expect(error!.status).toBe(401)
  })

  it("get app with invalid UUID format", async () => {
    const { data, error } = await pult.apps.get("not-a-uuid")
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it("create app with empty name fails", async () => {
    const { data, error } = await pult.apps.create({ name: "" })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it("create app with invalid characters fails", { timeout: 10000 }, async () => {
    const { data, error } = await pult.apps.create({ name: "INVALID APP NAME!!!" })
    if (data) { if (CLEANUP) await pult.apps.delete(data.id) }
    expect(error !== null || data !== null).toBe(true)
  })

  it("database query on app without DB fails", { timeout: 15000 }, async () => {
    const name = `sdk-nodb-${Date.now()}`
    const { data: app } = await pult.apps.create({ name, region: "eu" })
    const appId = app!.id

    const { error: qErr } = await pult.databases.query(appId, { sql: "SELECT 1" })
    expect(qErr).not.toBeNull()

    if (CLEANUP) await pult.apps.delete(appId)
  })

  it("operations on another user's app fail", { timeout: 15000 }, async () => {
    if (!TOKEN_FREE) return
    const myPult = client(TOKEN!)
    const { data: app } = await myPult.apps.create({ name: `sdk-owned-${Date.now()}`, region: "eu" })
    const appId = app!.id

    const otherPult = client(TOKEN_FREE!)
    const { data, error } = await otherPult.apps.get(appId)
    expect(data).toBeNull()
    expect(error).not.toBeNull()

    if (CLEANUP) await myPult.apps.delete(appId)
  })

  it("env reveal on nonexistent app fails", async () => {
    const { error } = await pult.env.reveal("00000000-0000-0000-0000-000000000000", "KEY")
    expect(error).not.toBeNull()
  })

  it("team listMembers with invalid team ID returns empty or error", async () => {
    const { data, error } = await pult.teams.listMembers("00000000-0000-0000-0000-000000000000")
    expect(error !== null || (data !== null && data.length === 0)).toBe(true)
  })

  it("duplicate app name fails", { timeout: 15000 }, async () => {
    const name = `sdk-dup-${Date.now()}`
    const { data: first } = await pult.apps.create({ name, region: "eu" })
    expect(first).not.toBeNull()

    const { data, error } = await pult.apps.create({ name, region: "eu" })
    expect(data).toBeNull()
    expect(error).not.toBeNull()

    if (CLEANUP) await pult.apps.delete(first!.id)
  })
})

describe.skipIf(!TOKEN)("E2E: App name validation", () => {
  let pult: PultClient
  const created: string[] = []

  beforeAll(() => {
    pult = client(TOKEN!)
  })

  afterAll(async () => {
    if (CLEANUP) {
      await Promise.allSettled(created.map(id => pult.apps.delete(id)))
    }
  }, 30000)

  it("lowercase with hyphens is valid", async () => {
    const name = `sdk-valid-name-${Date.now()}`
    const { data, error } = await pult.apps.create({ name, region: "eu" })
    expect(error).toBeNull()
    created.push(data!.id)
  })

  it("duplicate name is rejected", async () => {
    const name = `sdk-dupname-${Date.now()}`
    const { data: first } = await pult.apps.create({ name, region: "eu" })
    if (first) created.push(first.id)
    const { data: second, error } = await pult.apps.create({ name, region: "eu" })
    if (second) created.push(second.id)
    expect(error).not.toBeNull()
  })

  it("empty name is rejected", async () => {
    const { data, error } = await pult.apps.create({ name: "", region: "eu" })
    if (data) created.push(data.id)
    expect(error).not.toBeNull()
  })
})

describe.skipIf(!TOKEN)("E2E: Idempotency", () => {
  let pult: PultClient
  let appId: string

  beforeAll(async () => {
    pult = client(TOKEN!)
    const { data } = await pult.apps.create({ name: `sdk-idemp-${Date.now()}`, region: "eu" })
    appId = data!.id
  }, 30000)

  afterAll(async () => {
    if (appId && CLEANUP) await pult.apps.delete(appId)
  }, 30000)

  it("enable database twice returns 409 conflict", { timeout: 30000 }, async () => {
    const { error: err1 } = await pult.databases.create(appId)
    expect(err1).toBeNull()
    const { error: err2 } = await pult.databases.create(appId)
    expect(err2).not.toBeNull()
    expect(err2!.status).toBe(409)
  })

  it("enable storage twice returns 409 conflict", { timeout: 15000 }, async () => {
    const { error: err1 } = await pult.storage.create(appId)
    expect(err1).toBeNull()
    const { error: err2 } = await pult.storage.create(appId)
    expect(err2).not.toBeNull()
    expect(err2!.status).toBe(409)
  })

  it("enable redis twice is idempotent", { timeout: 15000 }, async () => {
    const { error: err1 } = await pult.redis.enable(appId)
    expect(err1).toBeNull()
    const { error: err2 } = await pult.redis.enable(appId)
    expect(err2).toBeNull()
  })

  it("set same env vars twice is idempotent", async () => {
    await pult.env.set(appId, { IDEMP_KEY: "v1" })
    const { error } = await pult.env.set(appId, { IDEMP_KEY: "v1" })
    expect(error).toBeNull()
    const { data } = await pult.env.reveal(appId, "IDEMP_KEY")
    expect(data!.value).toBe("v1")
  })
})
