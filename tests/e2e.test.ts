import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { createClient, PultClient } from "../src/index"

const API_URL = process.env.E2E_API_URL || "https://api.pult.rest"
const TOKEN = process.env.E2E_CP_TOKEN
const TOKEN_FREE = process.env.E2E_CP_TOKEN_FREE
const TOKEN_PRO = process.env.E2E_CP_TOKEN_PRO
const TOKEN_ADMIN = process.env.E2E_CP_TOKEN_ADMIN
const APP_ID = process.env.E2E_APP_ID || "7e81848b-3689-4619-a2e6-26f131630654"
const CLEANUP = process.env.E2E_CLEANUP !== "false"

function client(token: string): PultClient {
  return createClient({ url: API_URL, apiKey: token })
}

describe.skipIf(!TOKEN)("E2E: SDK against real API", () => {
  let pult: PultClient

  beforeAll(() => {
    pult = client(TOKEN!)
  })

  describe("health", () => {
    it("returns ok", async () => {
      const { data, error } = await pult.health()
      expect(error).toBeNull()
      expect(data?.status).toBe("ok")
    })
  })

  describe("apps", () => {
    it("list returns array with expected fields", async () => {
      const { data, error } = await pult.apps.list()
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      if (data && data.length > 0) {
        const app = data[0]
        expect(app.id).toBeDefined()
        expect(app.name).toBeDefined()
        expect(app.owner_id).toBeDefined()
        expect(app.status).toBeDefined()
        expect(app.created_at).toBeDefined()
      }
    })

    it("get returns app with regions and BaaS flags", async () => {
      const { data, error } = await pult.apps.get(APP_ID)
      expect(error).toBeNull()
      expect(data!.id).toBe(APP_ID)
      expect(data!.primary_region).toBeDefined()
      expect(Array.isArray(data!.regions)).toBe(true)
      expect(typeof data!.has_database).toBe("boolean")
      expect(typeof data!.has_storage).toBe("boolean")
      expect(typeof data!.has_redis).toBe("boolean")
      expect(typeof data!.has_realtime).toBe("boolean")
    })

    it("get nonexistent app returns 404", async () => {
      const { data, error } = await pult.apps.get("00000000-0000-0000-0000-000000000000")
      expect(data).toBeNull()
      expect(error).toBeDefined()
      expect(error!.status).toBe(404)
    })
  })

  describe("deployments", () => {
    it("list returns array with environment fields", async () => {
      const { data, error } = await pult.deployments.list(APP_ID)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      if (data && data.length > 0) {
        const d = data[0]
        expect(d.id).toBeDefined()
        expect(d.app_id).toBe(APP_ID)
        expect(d.status).toBeDefined()
        expect(typeof d.app_name).toBe("string")
        expect(typeof d.environment_id).toBe("string")
        expect(typeof d.environment_name).toBe("string")
      }
    })
  })

  describe("env", () => {
    const testKey = `SDK_E2E_${Date.now()}`

    it("list returns array with expected fields", async () => {
      const { data, error } = await pult.env.list(APP_ID)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      if (data && data.length > 0) {
        const v = data[0]
        expect(v.id).toBeDefined()
        expect(v.key).toBeDefined()
        expect(v.value).toBeDefined()
        expect(v.environment).toBeDefined()
      }
    })

    it("set, reveal, and delete lifecycle", async () => {
      const { data: setResult, error: setErr } = await pult.env.set(APP_ID, { [testKey]: "e2e-test-value" })
      expect(setErr).toBeNull()
      expect(Array.isArray(setResult)).toBe(true)

      const { data: revealed, error: revealErr } = await pult.env.reveal(APP_ID, testKey)
      expect(revealErr).toBeNull()
      expect(revealed!.key).toBe(testKey)
      expect(revealed!.value).toBe("e2e-test-value")

      if (CLEANUP) {
        const { error: delErr } = await pult.env.delete(APP_ID, testKey)
        expect(delErr).toBeNull()
      }
    })
  })

  describe("domains", () => {
    it("list returns array", async () => {
      const { data, error } = await pult.domains.list(APP_ID)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe("databases", () => {
    it("get returns unwrapped ManagedDatabase with correct types", async () => {
      const { data, error } = await pult.databases.get(APP_ID)
      expect(error).toBeNull()
      expect(data!.id).toBeDefined()
      expect(data!.app_id).toBe(APP_ID)
      expect(data!.status).toBe("ready")
      expect(typeof data!.port).toBe("number")
      expect(typeof data!.size).toBe("number")
      expect(data!.version).toBeDefined()
      expect(typeof data!.connections).toBe("number")
      expect(typeof data!.max_connections).toBe("number")
    })

    it("query executes SQL and returns results", async () => {
      const { data, error } = await pult.databases.query(APP_ID, { sql: "SELECT 1 as n" })
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.columns).toContain("n")
      expect(data!.rows.length).toBe(1)
    })

    it("listExtensions returns array", async () => {
      const { data, error } = await pult.databases.listExtensions(APP_ID)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it("listMigrations returns array", async () => {
      const { data, error } = await pult.databases.listMigrations(APP_ID)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe("environments", () => {
    it("list returns array with BaaS flags", async () => {
      const { data, error } = await pult.environments.list(APP_ID)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      if (data && data.length > 0) {
        const env = data[0]
        expect(env.id).toBeDefined()
        expect(env.app_id).toBe(APP_ID)
        expect(typeof env.is_production).toBe("boolean")
        expect(typeof env.has_database).toBe("boolean")
      }
    })
  })

  describe("services", () => {
    it("list returns array with expected fields", async () => {
      const { data, error } = await pult.services.list(APP_ID)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      if (data && data.length > 0) {
        const svc = data[0]
        expect(svc.id).toBeDefined()
        expect(svc.app_id).toBe(APP_ID)
        expect(svc.name).toBeDefined()
        expect(typeof svc.port).toBe("number")
      }
    })
  })

  describe("git", () => {
    it("status returns connection info", async () => {
      const { data, error } = await pult.git.status(APP_ID)
      expect(error).toBeNull()
      expect(typeof data!.connected).toBe("boolean")
    })
  })

  describe("billing", () => {
    it("status returns plan, limits, usage", async () => {
      const { data, error } = await pult.billing.status()
      expect(error).toBeNull()
      expect(data!.plan).toBeDefined()
      expect(data!.limits).toBeDefined()
      expect(typeof data!.limits.max_ram_mb).toBe("number")
      expect(typeof data!.usage.apps).toBe("number")
    })

    it("subscription returns plan info", async () => {
      const { data, error } = await pult.billing.subscription()
      expect(error).toBeNull()
      expect(data!.plan).toBeDefined()
    })

    it("usage returns usage metrics", async () => {
      const { data, error } = await pult.billing.usage()
      expect(error).toBeNull()
      expect(typeof data!.usage.apps).toBe("number")
      expect(typeof data!.usage.builds).toBe("number")
    })

    it("invoices returns array", async () => {
      const { data, error } = await pult.billing.invoices()
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe("teams", () => {
    let teamId: string

    it("list returns array", async () => {
      const { data, error } = await pult.teams.list()
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it("full lifecycle: create, update, members, delete", async () => {
      const name = `sdk-e2e-${Date.now()}`

      const { data: created, error: createErr } = await pult.teams.create({ name })
      expect(createErr).toBeNull()
      expect(created!.id).toBeDefined()
      expect(created!.name).toBe(name)
      teamId = created!.id

      const { data: updated, error: updateErr } = await pult.teams.update(teamId, { name: `${name}-v2` })
      expect(updateErr).toBeNull()
      expect(updated!.name).toBe(`${name}-v2`)

      const { data: members, error: membersErr } = await pult.teams.listMembers(teamId)
      expect(membersErr).toBeNull()
      expect(Array.isArray(members)).toBe(true)
      expect(members!.length).toBeGreaterThanOrEqual(1)

      const { data: invites, error: invitesErr } = await pult.teams.listInvites(teamId)
      expect(invitesErr).toBeNull()
      expect(Array.isArray(invites)).toBe(true)

      if (CLEANUP) {
        const { error: delErr } = await pult.teams.delete(teamId)
        expect(delErr).toBeNull()
      }
    })
  })

  describe("storage", () => {
    it("get returns unwrapped StorageBucket", async () => {
      const { data, error } = await pult.storage.get(APP_ID)
      expect(error).toBeNull()
      expect(data!.id).toBeDefined()
      expect(data!.app_id).toBe(APP_ID)
      expect(data!.status).toBe("ready")
      expect(typeof data!.is_public).toBe("boolean")
    })
  })

  describe("redis", () => {
    it("status returns RedisInstance", async () => {
      const { data, error } = await pult.redis.status(APP_ID)
      expect(error).toBeNull()
      expect(data!.id).toBeDefined()
      expect(data!.app_id).toBe(APP_ID)
      expect(data!.status).toBe("ready")
      expect(typeof data!.max_memory_mb).toBe("number")
    })
  })

  describe("realtime", () => {
    it("status returns unwrapped RealtimeService", async () => {
      const { data, error } = await pult.realtime.status(APP_ID)
      expect(error).toBeNull()
      expect(data!.status).toBe("ready")
      expect(typeof data!.enabled).toBe("boolean")
    })
  })

  describe("analytics", () => {
    it("overview returns numeric metrics", async () => {
      const { data, error } = await pult.analytics.overview(APP_ID)
      expect(error).toBeNull()
      expect(typeof data!.visitors).toBe("number")
      expect(typeof data!.requests).toBe("number")
      expect(typeof data!.bounce_rate).toBe("number")
    })

    it("timeseries returns array", async () => {
      const { data, error } = await pult.analytics.timeseries(APP_ID)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it("web returns top pages and referrers", async () => {
      const { data, error } = await pult.analytics.web(APP_ID)
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data!.top_pages)).toBe(true)
    })

    it("realtime returns visitor count", async () => {
      const { data, error } = await pult.analytics.realtime(APP_ID)
      expect(error).toBeNull()
      expect(typeof data!.live_visitors).toBe("number")
    })
  })

  describe("cron", () => {
    it("list returns jobs wrapper", async () => {
      const { data, error } = await pult.cron.list(APP_ID)
      expect(error).toBeNull()
      expect(Array.isArray(data!.jobs)).toBe(true)
    })
  })
})

describe.skipIf(!TOKEN)("E2E: App lifecycle (create + delete)", () => {
  let pult: PultClient
  let testAppId: string

  beforeAll(() => {
    pult = client(TOKEN!)
  })

  afterAll(async () => {
    if (testAppId && CLEANUP) {
      await pult.apps.delete(testAppId)
    }
  })

  it("creates app, verifies, then deletes", { timeout: 30000 }, async () => {
    const name = `sdk-e2e-${Date.now()}`
    const { data: created, error: createErr } = await pult.apps.create({ name, region: "eu" })
    expect(createErr).toBeNull()
    expect(created!.id).toBeDefined()
    expect(created!.name).toBe(name)
    testAppId = created!.id

    const { data: fetched, error: getErr } = await pult.apps.get(testAppId)
    expect(getErr).toBeNull()
    expect(fetched!.id).toBe(testAppId)
    expect(fetched!.status).toBe("active")

    const { data: envs, error: envsErr } = await pult.environments.list(testAppId)
    expect(envsErr).toBeNull()
    expect(Array.isArray(envs)).toBe(true)
    expect(envs!.length).toBeGreaterThanOrEqual(1)

    const { data: services, error: svcErr } = await pult.services.list(testAppId)
    expect(svcErr).toBeNull()
    expect(Array.isArray(services)).toBe(true)

    if (CLEANUP) {
      const { error: delErr } = await pult.apps.delete(testAppId)
      expect(delErr).toBeNull()
      testAppId = ""
    }
  })
})

describe.skipIf(!TOKEN_FREE || !TOKEN_PRO)("E2E: Plan-based access control", () => {
  let freePult: PultClient
  let proPult: PultClient

  beforeAll(() => {
    freePult = client(TOKEN_FREE!)
    proPult = client(TOKEN_PRO!)
  })

  it("free plan returns correct plan in billing", async () => {
    const { data, error } = await freePult.billing.status()
    expect(error).toBeNull()
    expect(data!.plan).toBe("free")
    expect(data!.limits.max_ram_mb).toBeLessThan(4096)
  })

  it("pro plan returns correct plan in billing", async () => {
    const { data, error } = await proPult.billing.status()
    expect(error).toBeNull()
    expect(data!.plan).toBe("pro")
    expect(data!.limits.max_ram_mb).toBeGreaterThanOrEqual(4096)
  })

  it("free plan has limited regions", async () => {
    const { data } = await freePult.billing.status()
    expect(data!.limits.all_regions).toBe(false)
  })

  it("both plans can list their own apps", async () => {
    const { error: freeErr } = await freePult.apps.list()
    expect(freeErr).toBeNull()

    const { error: proErr } = await proPult.apps.list()
    expect(proErr).toBeNull()
  })
})

describe.skipIf(!TOKEN_ADMIN)("E2E: Admin access", () => {
  let adminPult: PultClient

  beforeAll(() => {
    adminPult = client(TOKEN_ADMIN!)
  })

  it("admin can access billing status", async () => {
    const { data, error } = await adminPult.billing.status()
    expect(error).toBeNull()
    expect(data!.plan).toBeDefined()
  })

  it("admin can list all apps", async () => {
    const { data, error } = await adminPult.apps.list()
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})
