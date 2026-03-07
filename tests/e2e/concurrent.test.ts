import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { TOKEN, CLEANUP, client, PultClient } from "./helpers"

describe.skipIf(!TOKEN)("E2E: Concurrent operations", () => {
  let pult: PultClient
  const appIds: string[] = []

  beforeAll(() => {
    pult = client(TOKEN!)
  })

  afterAll(async () => {
    if (CLEANUP) {
      await Promise.allSettled(appIds.map(id => pult.apps.delete(id)))
    }
  }, 30000)

  it("create 3 apps in parallel", { timeout: 30000 }, async () => {
    const names = [
      `sdk-par-a-${Date.now()}`,
      `sdk-par-b-${Date.now()}`,
      `sdk-par-c-${Date.now()}`,
    ]

    const results = await Promise.all(
      names.map(name => pult.apps.create({ name, region: "eu" })),
    )

    for (const { data, error } of results) {
      expect(error).toBeNull()
      expect(data!.id).toBeDefined()
      appIds.push(data!.id)
    }
  })

  it("get all 3 apps in parallel", async () => {
    const results = await Promise.all(
      appIds.map(id => pult.apps.get(id)),
    )

    for (const { data, error } of results) {
      expect(error).toBeNull()
      expect(data).not.toBeNull()
    }
  })

  it("set env vars on all 3 in parallel", async () => {
    const results = await Promise.all(
      appIds.map(id => pult.env.set(id, { PARALLEL_TEST: "true" })),
    )

    for (const { error } of results) {
      expect(error).toBeNull()
    }
  })

  it("delete all 3 in parallel", { timeout: 30000 }, async () => {
    if (!CLEANUP) return
    const results = await Promise.all(
      appIds.map(id => pult.apps.delete(id)),
    )

    for (const { error } of results) {
      expect(error).toBeNull()
    }
    appIds.length = 0
  })
})
