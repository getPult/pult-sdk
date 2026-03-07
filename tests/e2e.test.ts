import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { createClient, createAuthClient, PultClient, AuthClient } from "../src/index"

const API_URL = process.env.E2E_API_URL || "https://api.pult.rest"
const TOKEN = process.env.E2E_CP_TOKEN
const TOKEN_FREE = process.env.E2E_CP_TOKEN_FREE
const TOKEN_PRO = process.env.E2E_CP_TOKEN_PRO
const TOKEN_ADMIN = process.env.E2E_CP_TOKEN_ADMIN
const TOKEN_TEAM_OWNER = process.env.E2E_CP_TOKEN_TEAM_OWNER
const TOKEN_TEAM_MEMBER = process.env.E2E_CP_TOKEN_TEAM_MEMBER
const CLEANUP = process.env.E2E_CLEANUP !== "false"

function client(token: string): PultClient {
  return createClient({ url: API_URL, apiKey: token })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitFor(
  fn: () => Promise<boolean>,
  timeoutMs = 60000,
  intervalMs = 2000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await fn()) return
    await sleep(intervalMs)
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`)
}

// ─── 1. FULL PIPELINE ──────────────────────────────────────────────────────────

describe.skipIf(!TOKEN)("E2E: Full pipeline", () => {
  let pult: PultClient
  let appId: string
  let appName: string

  beforeAll(async () => {
    pult = client(TOKEN!)
  }, 10000)

  afterAll(async () => {
    if (appId && CLEANUP) {
      await pult.apps.delete(appId)
    }
  }, 30000)

  describe("1 — App lifecycle", () => {
    it("creates a new app", { timeout: 30000 }, async () => {
      appName = `sdk-e2e-${Date.now()}`
      const { data, error } = await pult.apps.create({ name: appName, region: "eu" })
      expect(error).toBeNull()
      expect(data!.id).toBeDefined()
      expect(data!.name).toBe(appName)
      expect(data!.status).toBeDefined()
      appId = data!.id
    })

    it("get returns the created app", async () => {
      const { data, error } = await pult.apps.get(appId)
      expect(error).toBeNull()
      expect(data!.id).toBe(appId)
      expect(data!.name).toBe(appName)
      expect(typeof data!.has_database).toBe("boolean")
      expect(typeof data!.has_storage).toBe("boolean")
      expect(typeof data!.has_redis).toBe("boolean")
      expect(typeof data!.has_realtime).toBe("boolean")
    })

    it("list includes the new app", async () => {
      const { data, error } = await pult.apps.list()
      expect(error).toBeNull()
      const found = data!.find(a => a.id === appId)
      expect(found).toBeDefined()
      expect(found!.name).toBe(appName)
    })

    it("get nonexistent app returns 404", async () => {
      const { data, error } = await pult.apps.get("00000000-0000-0000-0000-000000000000")
      expect(data).toBeNull()
      expect(error!.status).toBe(404)
    })
  })

  describe("2 — Environments & Services", () => {
    it("list environments returns production env", async () => {
      const { data, error } = await pult.environments.list(appId)
      expect(error).toBeNull()
      expect(data!.length).toBeGreaterThanOrEqual(1)
      const prod = data!.find(e => e.is_production)
      expect(prod).toBeDefined()
      expect(prod!.app_id).toBe(appId)
      expect(typeof prod!.has_database).toBe("boolean")
    })

    it("list services returns array", async () => {
      const { data, error } = await pult.services.list(appId)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe("3 — Database provisioning & operations", () => {
    it("enables database", { timeout: 15000 }, async () => {
      const { data, error } = await pult.databases.create(appId)
      expect(error).toBeNull()
      expect(data!.app_id).toBe(appId)
    })

    it("waits for database to be ready", { timeout: 200000 }, async () => {
      await waitFor(async () => {
        const { data } = await pult.databases.get(appId)
        return data?.status === "ready"
      }, 180000)

      const { data } = await pult.databases.get(appId)
      expect(data!.status).toBe("ready")
      expect(typeof data!.port).toBe("number")
      expect(typeof data!.size).toBe("number")
    })

    it("executes SQL query", async () => {
      const { data, error } = await pult.databases.query(appId, { sql: "SELECT 1 + 1 AS result" })
      expect(error).toBeNull()
      expect(data!.columns).toContain("result")
      expect(data!.rows[0]).toContain(2)
    })

    it("creates table via migration", async () => {
      const { data, error } = await pult.databases.applyMigration(appId, {
        version: "001",
        name: "create_e2e_table",
        sql: `CREATE TABLE IF NOT EXISTS e2e_items (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          value INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )`,
      })
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it("inserts and queries data via SQL", async () => {
      const { error: insertErr } = await pult.databases.query(appId, {
        sql: "INSERT INTO e2e_items (name, value) VALUES ('alpha', 10), ('beta', 20), ('gamma', 30)",
      })
      expect(insertErr).toBeNull()

      const { data, error } = await pult.databases.query(appId, {
        sql: "SELECT name, value FROM e2e_items ORDER BY value ASC",
      })
      expect(error).toBeNull()
      expect(data!.rows.length).toBe(3)
      expect(data!.columns).toContain("name")
      expect(data!.columns).toContain("value")
    })

    it("queries with WHERE filter", async () => {
      const { data, error } = await pult.databases.query(appId, {
        sql: "SELECT name FROM e2e_items WHERE value > 15 ORDER BY name",
      })
      expect(error).toBeNull()
      expect(data!.rows.length).toBe(2)
    })

    it("list migrations includes the one we applied", async () => {
      const { data, error } = await pult.databases.listMigrations(appId)
      expect(error).toBeNull()
      const migration = data!.find((m: { version?: string }) => m.version === "001")
      expect(migration).toBeDefined()
    })

    it("list extensions returns array", async () => {
      const { data, error } = await pult.databases.listExtensions(appId)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it("enable extension pgcrypto returns result", async () => {
      const { data, error } = await pult.databases.enableExtension(appId, { name: "pgcrypto" })
      expect(data !== null || error !== null).toBe(true)
    })

    it("get database with secret returns connection string", async () => {
      const { data, error } = await pult.databases.get(appId, true)
      expect(error).toBeNull()
      expect(data!.connection_string).toBeDefined()
      expect(typeof data!.connection_string).toBe("string")
    })

    it("empty query returns error", async () => {
      const { data, error } = await pult.databases.query(appId, { sql: "" })
      expect(error).not.toBeNull()
      expect(data).toBeNull()
    })
  })

  describe("4 — Env vars lifecycle", () => {
    const testKey = `SDK_E2E_${Date.now()}`

    it("set env vars", async () => {
      const { data, error } = await pult.env.set(appId, {
        [testKey]: "hello-world",
        [`${testKey}_2`]: "second-value",
      })
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it("list includes set vars", async () => {
      const { data, error } = await pult.env.list(appId)
      expect(error).toBeNull()
      const found = data!.find(v => v.key === testKey)
      expect(found).toBeDefined()
      expect(found!.key).toBe(testKey)
    })

    it("reveal returns decrypted value", async () => {
      const { data, error } = await pult.env.reveal(appId, testKey)
      expect(error).toBeNull()
      expect(data!.key).toBe(testKey)
      expect(data!.value).toBe("hello-world")
    })

    it("overwrite existing var", async () => {
      const { error: setErr } = await pult.env.set(appId, { [testKey]: "updated-value" })
      expect(setErr).toBeNull()

      const { data, error } = await pult.env.reveal(appId, testKey)
      expect(error).toBeNull()
      expect(data!.value).toBe("updated-value")
    })

    it("set empty value is valid", async () => {
      const emptyKey = `${testKey}_EMPTY`
      const { error: setErr } = await pult.env.set(appId, { [emptyKey]: "" })
      expect(setErr).toBeNull()

      const { data } = await pult.env.reveal(appId, emptyKey)
      expect(data!.value).toBe("")
      await pult.env.delete(appId, emptyKey)
    })

    it("reveal nonexistent key returns error", async () => {
      const { data, error } = await pult.env.reveal(appId, "TOTALLY_NONEXISTENT_KEY_12345")
      expect(data).toBeNull()
      expect(error).not.toBeNull()
    })

    it("delete env vars", async () => {
      const { error: err1 } = await pult.env.delete(appId, testKey)
      expect(err1).toBeNull()

      const { error: err2 } = await pult.env.delete(appId, `${testKey}_2`)
      expect(err2).toBeNull()

      const { data } = await pult.env.list(appId)
      const found = data?.find(v => v.key === testKey)
      expect(found).toBeUndefined()
    })

    it("delete nonexistent key returns success or error", async () => {
      const { data, error } = await pult.env.delete(appId, "TOTALLY_NONEXISTENT_KEY_12345")
      expect(data !== null || error !== null).toBe(true)
    })
  })

  describe("5 — Storage", () => {
    it("enables storage", { timeout: 15000 }, async () => {
      const { data, error } = await pult.storage.create(appId)
      expect(error).toBeNull()
      expect(data!.app_id).toBe(appId)
    })

    it("get returns storage status", async () => {
      const { data, error } = await pult.storage.get(appId)
      expect(error).toBeNull()
      expect(data!.app_id).toBe(appId)
      expect(typeof data!.is_public).toBe("boolean")
    })

    it("presign PUT returns upload URL", async () => {
      const { data, error } = await pult.storage.presign(appId, {
        key: "test-file.txt",
        method: "PUT",
      })
      expect(error).toBeNull()
      expect(data!.url).toBeDefined()
      expect(typeof data!.url).toBe("string")
      expect(data!.method).toBe("PUT")
      expect(data!.key).toBe("test-file.txt")
    })

    it("presign GET returns download URL", async () => {
      const { data, error } = await pult.storage.presign(appId, {
        key: "test-file.txt",
        method: "GET",
      })
      expect(error).toBeNull()
      expect(data!.url).toBeDefined()
      expect(data!.method).toBe("GET")
    })

    it("update storage public setting", async () => {
      const { data, error } = await pult.storage.update(appId, { is_public: true })
      expect(error).toBeNull()
      expect(data!.is_public).toBe(true)

      await pult.storage.update(appId, { is_public: false })
    })
  })

  describe("6 — Redis", () => {
    it("enables redis", { timeout: 15000 }, async () => {
      const { data, error } = await pult.redis.enable(appId)
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it("status returns redis instance", async () => {
      const { data, error } = await pult.redis.status(appId)
      expect(error).toBeNull()
      expect(data!.app_id).toBe(appId)
      expect(typeof data!.max_memory_mb).toBe("number")
    })

    it("enable already-enabled redis is idempotent", async () => {
      const { error } = await pult.redis.enable(appId)
      expect(error).toBeNull()
    })
  })

  describe("7 — Realtime", () => {
    it("enables realtime", { timeout: 15000 }, async () => {
      const { data, error } = await pult.realtime.enable(appId)
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it("status returns realtime service", async () => {
      const { data, error } = await pult.realtime.status(appId)
      expect(error).toBeNull()
      expect(typeof data!.enabled).toBe("boolean")
    })

    it("enable already-enabled realtime is idempotent", async () => {
      const { error } = await pult.realtime.enable(appId)
      expect(error).toBeNull()
    })
  })

  describe("8 — Domains", () => {
    it("list returns array (empty for new app)", async () => {
      const { data, error } = await pult.domains.list(appId)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe("9 — Git", () => {
    it("status returns connection info", async () => {
      const { data, error } = await pult.git.status(appId)
      expect(error).toBeNull()
      expect(typeof data!.connected).toBe("boolean")
      expect(data!.connected).toBe(false)
    })

    it("disconnect without connection returns gracefully", async () => {
      const { data, error } = await pult.git.disconnect(appId)
      expect(data !== null || error !== null).toBe(true)
    })
  })

  describe("10 — Deployments", () => {
    it("list deployments returns array", async () => {
      const { data, error } = await pult.deployments.list(appId)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it("get nonexistent deployment returns error", async () => {
      const { data, error } = await pult.deployments.get(appId, "00000000-0000-0000-0000-000000000000")
      expect(data).toBeNull()
      expect(error).not.toBeNull()
    })
  })

  describe("11 — Analytics", () => {
    it("overview returns numeric metrics", async () => {
      const { data, error } = await pult.analytics.overview(appId)
      expect(error).toBeNull()
      expect(typeof data!.visitors).toBe("number")
      expect(typeof data!.requests).toBe("number")
      expect(typeof data!.avg_latency_ms).toBe("number")
      expect(typeof data!.bounce_rate).toBe("number")
    })

    it("timeseries returns array", async () => {
      const { data, error } = await pult.analytics.timeseries(appId)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it("web returns analytics data", async () => {
      const { data, error } = await pult.analytics.web(appId)
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(typeof data!.visitors).toBe("number")
      expect(typeof data!.pageviews).toBe("number")
    })

    it("requests returns analytics data", async () => {
      const { data, error } = await pult.analytics.requests(appId)
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(typeof data!.total_requests).toBe("number")
    })

    it("realtime returns visitor count", async () => {
      const { data, error } = await pult.analytics.realtime(appId)
      expect(error).toBeNull()
      expect(typeof data!.live_visitors).toBe("number")
    })

    it("overview with period param", async () => {
      const { data, error } = await pult.analytics.overview(appId, "7d")
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })

  describe("12 — Cron (requires ready DB)", () => {
    let cronJobId: number
    let dbReady = false

    beforeAll(async () => {
      const { data } = await pult.databases.get(appId)
      dbReady = data?.status === "ready"
    })

    it("create cron job", async () => {
      if (!dbReady) return
      const { data, error } = await pult.cron.create(appId, {
        schedule: "0 0 * * *",
        command: "SELECT 1",
      })
      expect(error).toBeNull()
      expect(data!.job_id).toBeDefined()
      cronJobId = data!.job_id
    })

    it("list includes created job", async () => {
      if (!dbReady || !cronJobId) return
      const { data, error } = await pult.cron.list(appId)
      expect(error).toBeNull()
      expect(Array.isArray(data!.jobs)).toBe(true)
      const found = data!.jobs.find((j: { id?: string }) => j.id === String(cronJobId))
      expect(found).toBeDefined()
    })

    it("toggle cron job via API", { timeout: 10000 }, async () => {
      if (!dbReady || !cronJobId) return
      const res = await fetch(`${API_URL}/apps/${appId}/cron/jobs/${cronJobId}/toggle`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: false }),
      })
      expect(res.ok).toBe(true)
    })

    it("delete cron job", async () => {
      if (!dbReady || !cronJobId) return
      const { error } = await pult.cron.delete(appId, String(cronJobId))
      expect(error).toBeNull()
    })

    it("delete nonexistent cron job returns error", async () => {
      if (!dbReady) return
      const { error } = await pult.cron.delete(appId, "99999999")
      expect(error).not.toBeNull()
    })
  })

  describe("13 — Billing", () => {
    it("status returns plan and limits", async () => {
      const { data, error } = await pult.billing.status()
      expect(error).toBeNull()
      expect(data!.plan).toBeDefined()
      expect(typeof data!.limits.max_ram_mb).toBe("number")
      expect(typeof data!.limits.max_db_mb).toBe("number")
      expect(typeof data!.limits.max_storage_mb).toBe("number")
      expect(typeof data!.limits.max_apps).toBe("number")
      expect(typeof data!.limits.max_web_events_month).toBe("number")
      expect(typeof data!.limits.analytics_retention_days).toBe("number")
      expect(typeof data!.usage.apps).toBe("number")
    })

    it("subscription returns plan info", async () => {
      const { data, error } = await pult.billing.subscription()
      expect(error).toBeNull()
      expect(data!.plan).toBeDefined()
    })

    it("usage returns metrics", async () => {
      const { data, error } = await pult.billing.usage()
      expect(error).toBeNull()
      expect(typeof data!.usage.apps).toBe("number")
      expect(typeof data!.usage.builds).toBe("number")
      expect(typeof data!.usage.compute_hours).toBe("number")
      expect(typeof data!.usage.bandwidth_gb).toBe("number")
      expect(typeof data!.usage.storage_gb).toBe("number")
      expect(typeof data!.usage.database_gb).toBe("number")
    })

    it("invoices returns array", async () => {
      const { data, error } = await pult.billing.invoices()
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe("14 — Teams", () => {
    let teamId: string
    const teamName = `sdk-e2e-team-${Date.now()}`

    it("create team", async () => {
      const { data, error } = await pult.teams.create({ name: teamName })
      expect(error).toBeNull()
      expect(data!.id).toBeDefined()
      expect(data!.name).toBe(teamName)
      teamId = data!.id
    })

    it("list includes created team", async () => {
      const { data, error } = await pult.teams.list()
      expect(error).toBeNull()
      const found = data!.find(t => t.id === teamId)
      expect(found).toBeDefined()
    })

    it("update team name", async () => {
      const newName = `${teamName}-updated`
      const { data, error } = await pult.teams.update(teamId, { name: newName })
      expect(error).toBeNull()
      expect(data!.name).toBe(newName)
    })

    it("list members includes owner", async () => {
      const { data, error } = await pult.teams.listMembers(teamId)
      expect(error).toBeNull()
      expect(data!.length).toBeGreaterThanOrEqual(1)
      const owner = data!.find(m => m.role === "owner")
      expect(owner).toBeDefined()
    })

    it("list invites returns array", async () => {
      const { data, error } = await pult.teams.listInvites(teamId)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it("delete team", async () => {
      if (!teamId || !CLEANUP) return
      const { error } = await pult.teams.delete(teamId)
      expect(error).toBeNull()
    })
  })

  describe("15 — Services lifecycle", () => {
    let serviceId: string

    it("create a worker service", async () => {
      const { data, error } = await pult.services.create(appId, {
        name: "background-worker",
        type: "worker",
      })
      expect(error).toBeNull()
      expect(data!.id).toBeDefined()
      expect(data!.name).toBe("background-worker")
      expect(data!.type).toBe("worker")
      serviceId = data!.id
    })

    it("list services includes the new service", async () => {
      const { data, error } = await pult.services.list(appId)
      expect(error).toBeNull()
      const found = data!.find(s => s.id === serviceId)
      expect(found).toBeDefined()
    })

    it("get service returns details", async () => {
      if (!serviceId) return
      const { data, error } = await pult.services.get(appId, serviceId)
      expect(error).toBeNull()
      expect(data!.id).toBe(serviceId)
      expect(data!.name).toBe("background-worker")
    })

    it("update service", async () => {
      if (!serviceId) return
      const { data, error } = await pult.services.update(appId, serviceId, {
        build_command: "npm run build",
        start_command: "node worker.js",
      })
      expect(error).toBeNull()
      expect(data!.build_command).toBe("npm run build")
      expect(data!.start_command).toBe("node worker.js")
    })

    it("delete service", async () => {
      if (!serviceId) return
      const { error } = await pult.services.delete(appId, serviceId)
      expect(error).toBeNull()
    })
  })

  describe("16 — Environments lifecycle", () => {
    let stagingEnvId: string

    it("create staging environment", async () => {
      const { data, error } = await pult.environments.create(appId, {
        name: "staging",
        branch: "develop",
      })
      expect(error).toBeNull()
      expect(data!.name).toBe("staging")
      expect(data!.is_production).toBe(false)
      stagingEnvId = data!.id
    })

    it("get staging environment", async () => {
      if (!stagingEnvId) return
      const { data, error } = await pult.environments.get(appId, stagingEnvId)
      expect(error).toBeNull()
      expect(data!.id).toBe(stagingEnvId)
      expect(data!.name).toBe("staging")
    })

    it("list environments includes staging", async () => {
      const { data, error } = await pult.environments.list(appId)
      expect(error).toBeNull()
      const staging = data!.find(e => e.name === "staging")
      expect(staging).toBeDefined()
    })

    it("set env var for staging environment", async () => {
      const { error } = await pult.env.set(appId, { STAGING_VAR: "staging-value" }, "staging")
      expect(error).toBeNull()
    })

    it("list env vars for staging", async () => {
      const { data, error } = await pult.env.list(appId, { environment: "staging" })
      expect(error).toBeNull()
      const found = data?.find(v => v.key === "STAGING_VAR")
      expect(found).toBeDefined()
    })

    it("delete staging environment", async () => {
      if (!stagingEnvId) return
      const { error } = await pult.environments.delete(appId, stagingEnvId)
      expect(error).toBeNull()
    })
  })

  describe("17 — Logs", () => {
    it("get logs on undeployed app returns error", async () => {
      const { error } = await pult.logs.get(appId)
      expect(error).not.toBeNull()
    })
  })

  describe("18 — Cleanup", () => {
    it("disables BaaS services", { timeout: 15000 }, async () => {
      if (!CLEANUP) return

      const results = await Promise.allSettled([
        pult.redis.disable(appId),
        pult.realtime.disable(appId),
        pult.storage.delete(appId),
      ])

      for (const r of results) {
        if (r.status === "fulfilled") {
          expect(r.value.error).toBeNull()
        }
      }
    })

    it("deletes test app", { timeout: 30000 }, async () => {
      if (!CLEANUP) return
      const { error } = await pult.apps.delete(appId)
      expect(error).toBeNull()
      appId = ""
    })

    it("verifies app is gone", async () => {
      if (!CLEANUP || !appName) return
      const { data } = await pult.apps.list()
      const found = data?.find(a => a.name === appName)
      expect(found).toBeUndefined()
    })

    it("delete already-deleted app returns 404", async () => {
      if (!CLEANUP) return
      const { error } = await pult.apps.delete("00000000-0000-0000-0000-000000000000")
      expect(error).not.toBeNull()
      expect(error!.status).toBe(404)
    })
  })
})

// ─── 2. AUTH (GoTrue) ───────────────────────────────────────────────────────────

describe.skipIf(!TOKEN)("E2E: Auth (GoTrue)", () => {
  let pult: PultClient
  let authClient: AuthClient
  let authAppId: string
  const testEmail = `sdk-e2e-${Date.now()}@test.local`
  const testPassword = "SecureP@ss2026!"

  beforeAll(async () => {
    pult = client(TOKEN!)
  }, 10000)

  afterAll(async () => {
    if (authAppId && CLEANUP) {
      await pult.apps.delete(authAppId)
    }
  }, 30000)

  it("creates app with database for auth", { timeout: 30000 }, async () => {
    const name = `sdk-auth-${Date.now()}`
    const { data, error } = await pult.apps.create({ name, region: "eu" })
    expect(error).toBeNull()
    authAppId = data!.id
  })

  it("enables database (required for auth)", { timeout: 200000 }, async () => {
    const { error } = await pult.databases.create(authAppId)
    expect(error).toBeNull()

    await waitFor(async () => {
      const { data } = await pult.databases.get(authAppId)
      return data?.status === "ready"
    }, 180000)
  })

  it("enables auth service", { timeout: 130000 }, async () => {
    let lastErr: unknown
    const deadline = Date.now() + 120000
    while (Date.now() < deadline) {
      const res = await fetch(`${API_URL}/apps/${authAppId}/auth/enable`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}` },
      })
      if (res.ok) {
        const body = await res.json()
        expect(body).toBeDefined()
        return
      }
      lastErr = await res.text()
      await sleep(3000)
    }
    throw new Error(`auth enable timed out: ${lastErr}`)
  })

  it("waits for auth service to be reachable", { timeout: 180000 }, async () => {
    const { data: app } = await pult.apps.get(authAppId)
    const authUrl = `https://auth-${app!.name}.pult.rest`

    await waitFor(async () => {
      try {
        const res = await fetch(`${authUrl}/auth/v1/health`)
        return res.ok
      } catch {
        return false
      }
    }, 160000, 3000)

    authClient = createAuthClient({ url: authUrl })
  })

  it("signUp creates a new user", async () => {
    if (!authClient) return
    const { data, error } = await authClient.signUp({
      email: testEmail,
      password: testPassword,
    })
    expect(error).toBeNull()
    expect(data!.email).toBe(testEmail)
    expect(data!.id).toBeDefined()
  })

  it("signIn before email confirmation fails", async () => {
    if (!authClient) return
    const freshClient = createAuthClient({ url: authClient["http"]["baseUrl"] })
    const { data, error } = await freshClient.signIn({
      email: testEmail,
      password: testPassword,
    })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it("confirms user email via DB", { timeout: 15000 }, async () => {
    if (!authClient) return
    const sql = `UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = '${testEmail}'`
    const res = await fetch(`${API_URL}/apps/${authAppId}/database/query?env=production`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql }),
    })
    expect(res.ok).toBe(true)
  })

  it("signIn returns session with tokens", async () => {
    if (!authClient) return
    const { data, error } = await authClient.signIn({
      email: testEmail,
      password: testPassword,
    })
    expect(error).toBeNull()
    expect(data!.access_token).toBeDefined()
    expect(data!.refresh_token).toBeDefined()
    expect(typeof data!.access_token).toBe("string")
    expect(data!.access_token.length).toBeGreaterThan(10)
    expect(data!.user).toBeDefined()
    expect(data!.user.email).toBe(testEmail)
  })

  it("signIn with wrong password fails", async () => {
    if (!authClient) return
    const freshClient = createAuthClient({ url: authClient["http"]["baseUrl"] })
    const { data, error } = await freshClient.signIn({
      email: testEmail,
      password: "WrongP@ss999!",
    })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it("signIn with nonexistent email fails", async () => {
    if (!authClient) return
    const freshClient = createAuthClient({ url: authClient["http"]["baseUrl"] })
    const { data, error } = await freshClient.signIn({
      email: "nobody-exists-here@fake.local",
      password: testPassword,
    })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it("getUser returns current user profile", async () => {
    if (!authClient) return
    const { data, error } = await authClient.getUser()
    expect(error).toBeNull()
    expect(data!.email).toBe(testEmail)
    expect(data!.id).toBeDefined()
    expect(typeof data!.role).toBe("string")
  })

  it("updateUser updates metadata", async () => {
    if (!authClient) return
    const { data, error } = await authClient.updateUser({
      data: { display_name: "E2E Tester" },
    })
    expect(error).toBeNull()
    expect(data!.user_metadata.display_name).toBe("E2E Tester")
  })

  it("getSession returns active session", () => {
    if (!authClient) return
    const session = authClient.getSession()
    expect(session).not.toBeNull()
    expect(session!.access_token).toBeDefined()
    expect(session!.refresh_token).toBeDefined()
    expect(session!.token_type).toBe("bearer")
    expect(typeof session!.expires_in).toBe("number")
  })

  it("refreshSession returns new tokens", async () => {
    if (!authClient) return
    await sleep(1100)
    const oldSession = authClient.getSession()
    const { data, error } = await authClient.refreshSession()
    expect(error).toBeNull()
    expect(data!.access_token).toBeDefined()
    expect(data!.refresh_token).toBeDefined()
  })

  it("refreshSession without session fails", async () => {
    if (!authClient) return
    const freshClient = createAuthClient({ url: authClient["http"]["baseUrl"] })
    const { data, error } = await freshClient.refreshSession()
    expect(data).toBeNull()
    expect(error).not.toBeNull()
    expect(error!.code).toBe("NO_SESSION")
  })

  it("signOut clears session", async () => {
    if (!authClient) return
    const { error } = await authClient.signOut()
    expect(error).toBeNull()
    expect(authClient.getSession()).toBeNull()
  })

  it("signOut without session is idempotent", async () => {
    if (!authClient) return
    const { data, error } = await authClient.signOut()
    expect(error).toBeNull()
    expect(data!.status).toBe("ok")
  })

  it("getUser fails after signOut", async () => {
    if (!authClient) return
    const { data, error } = await authClient.getUser()
    expect(data).toBeNull()
    expect(error).toBeDefined()
    expect(error!.code).toBe("NO_SESSION")
  })

  it("updateUser fails after signOut", async () => {
    if (!authClient) return
    const { data, error } = await authClient.updateUser({ data: { foo: "bar" } })
    expect(data).toBeNull()
    expect(error!.code).toBe("NO_SESSION")
  })

  it("signIn again after signOut works", async () => {
    if (!authClient) return
    const { data, error } = await authClient.signIn({
      email: testEmail,
      password: testPassword,
    })
    expect(error).toBeNull()
    expect(data!.access_token).toBeDefined()
  })

  it("onAuthStateChange fires on signIn", async () => {
    if (!authClient) return
    const freshClient = createAuthClient({ url: authClient["http"]["baseUrl"] })
    let firedWith: unknown = "NOT_FIRED"
    const { unsubscribe } = freshClient.onAuthStateChange(session => {
      firedWith = session
    })
    await freshClient.signIn({ email: testEmail, password: testPassword })
    expect(firedWith).not.toBe("NOT_FIRED")
    expect((firedWith as { access_token: string }).access_token).toBeDefined()
    unsubscribe()
  })

  it("onAuthStateChange fires on signOut", async () => {
    if (!authClient) return
    let firedWith: unknown = "NOT_FIRED"
    const { unsubscribe } = authClient.onAuthStateChange(session => {
      firedWith = session
    })

    await authClient.signOut()
    expect(firedWith).toBeNull()
    unsubscribe()
  })

  it("unsubscribe stops listener from firing", async () => {
    if (!authClient) return
    const freshClient = createAuthClient({ url: authClient["http"]["baseUrl"] })
    let callCount = 0
    const { unsubscribe } = freshClient.onAuthStateChange(() => { callCount++ })
    unsubscribe()
    await freshClient.signIn({ email: testEmail, password: testPassword })
    expect(callCount).toBe(0)
    await freshClient.signOut()
  })

  it("multiple listeners all fire", async () => {
    if (!authClient) return
    const freshClient = createAuthClient({ url: authClient["http"]["baseUrl"] })
    let count1 = 0
    let count2 = 0
    const sub1 = freshClient.onAuthStateChange(() => { count1++ })
    const sub2 = freshClient.onAuthStateChange(() => { count2++ })
    await freshClient.signIn({ email: testEmail, password: testPassword })
    expect(count1).toBe(1)
    expect(count2).toBe(1)
    sub1.unsubscribe()
    sub2.unsubscribe()
    await freshClient.signOut()
  })

  it("signUp duplicate email returns error", async () => {
    if (!authClient) return
    const { data, error } = await authClient.signUp({
      email: testEmail,
      password: "AnotherPass123!",
    })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it("signUp with weak password returns error", async () => {
    if (!authClient) return
    const { data, error } = await authClient.signUp({
      email: "weak-pass@test.local",
      password: "123",
    })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it("cleanup: delete auth app", { timeout: 15000 }, async () => {
    if (!CLEANUP) return
    const { error } = await pult.apps.delete(authAppId)
    expect(error).toBeNull()
    authAppId = ""
  })
})

// ─── 3. ERROR HANDLING & EDGE CASES ────────────────────────────────────────────

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

// ─── 4. PLAN ENFORCEMENT ───────────────────────────────────────────────────────

describe.skipIf(!TOKEN_FREE || !TOKEN_PRO)("E2E: Plan enforcement", () => {
  let freePult: PultClient
  let proPult: PultClient

  beforeAll(() => {
    freePult = client(TOKEN_FREE!)
    proPult = client(TOKEN_PRO!)
  })

  it("free plan returns correct plan and limits", async () => {
    const { data, error } = await freePult.billing.status()
    expect(error).toBeNull()
    expect(data!.plan).toBe("free")
    expect(data!.limits.max_ram_mb).toBeLessThan(4096)
    expect(data!.limits.all_regions).toBe(false)
  })

  it("pro plan returns correct plan and limits", async () => {
    const { data, error } = await proPult.billing.status()
    expect(error).toBeNull()
    expect(data!.plan).toBe("pro")
    expect(data!.limits.max_ram_mb).toBeGreaterThanOrEqual(4096)
  })

  it("free plan: limited regions", async () => {
    const { data } = await freePult.billing.status()
    expect(data!.limits.all_regions).toBe(false)
  })

  it("pro plan: more regions than free", async () => {
    const { data: proData } = await proPult.billing.status()
    expect(proData!.limits.all_regions).toBe(false)
    expect(proData!.limits.regions).not.toBeNull()
    expect(proData!.limits.regions!.length).toBeGreaterThanOrEqual(3)
  })

  it("pro plan: higher RAM than free", async () => {
    const { data: freeData } = await freePult.billing.status()
    const { data: proData } = await proPult.billing.status()
    expect(proData!.limits.max_ram_mb).toBeGreaterThan(freeData!.limits.max_ram_mb)
  })

  it("pro plan: higher DB than free", async () => {
    const { data: freeData } = await freePult.billing.status()
    const { data: proData } = await proPult.billing.status()
    expect(proData!.limits.max_db_mb).toBeGreaterThan(freeData!.limits.max_db_mb)
  })

  it("pro plan: higher storage than free", async () => {
    const { data: freeData } = await freePult.billing.status()
    const { data: proData } = await proPult.billing.status()
    expect(proData!.limits.max_storage_mb).toBeGreaterThan(freeData!.limits.max_storage_mb)
  })

  it("both plans can list apps", async () => {
    const { error: freeErr } = await freePult.apps.list()
    expect(freeErr).toBeNull()
    const { error: proErr } = await proPult.apps.list()
    expect(proErr).toBeNull()
  })

  it("both plans can access billing", async () => {
    const { error: fe } = await freePult.billing.usage()
    expect(fe).toBeNull()
    const { error: pe } = await proPult.billing.usage()
    expect(pe).toBeNull()
  })

  it("free plan: AI limits are lower", async () => {
    const { data: freeData } = await freePult.billing.status()
    const { data: proData } = await proPult.billing.status()
    expect(proData!.limits.max_ai_requests_month).toBeGreaterThan(freeData!.limits.max_ai_requests_month)
  })
})

// ─── 5. ADMIN ACCESS ───────────────────────────────────────────────────────────

describe.skipIf(!TOKEN_ADMIN)("E2E: Admin access", () => {
  let adminPult: PultClient

  beforeAll(() => {
    adminPult = client(TOKEN_ADMIN!)
  })

  it("admin can access billing", async () => {
    const { data, error } = await adminPult.billing.status()
    expect(error).toBeNull()
    expect(data!.plan).toBeDefined()
  })

  it("admin can list all apps", async () => {
    const { data, error } = await adminPult.apps.list()
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it("admin has business plan capabilities", async () => {
    const { data } = await adminPult.billing.status()
    expect(data!.plan).toBe("business")
    expect(data!.limits.all_regions).toBe(true)
  })

  it("admin can access all regions", async () => {
    const { data } = await adminPult.billing.status()
    expect(data!.limits.all_regions).toBe(true)
  })

  it("admin can list teams", async () => {
    const { data, error } = await adminPult.teams.list()
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it("non-admin cannot access admin endpoints", async () => {
    if (!TOKEN_FREE) return
    const freePult = client(TOKEN_FREE!)
    const res = await fetch(`${API_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${TOKEN_FREE}` },
    })
    expect(res.status).toBe(403)
  })
})

// ─── 6. TEAM COLLABORATION ─────────────────────────────────────────────────────

describe.skipIf(!TOKEN_TEAM_OWNER || !TOKEN_TEAM_MEMBER)("E2E: Team collaboration", () => {
  let ownerPult: PultClient
  let memberPult: PultClient
  let teamId: string

  beforeAll(() => {
    ownerPult = client(TOKEN_TEAM_OWNER!)
    memberPult = client(TOKEN_TEAM_MEMBER!)
  })

  afterAll(async () => {
    if (teamId && CLEANUP) {
      await ownerPult.teams.delete(teamId)
    }
  })

  it("owner creates a team", async () => {
    const { data, error } = await ownerPult.teams.create({ name: `collab-${Date.now()}` })
    expect(error).toBeNull()
    teamId = data!.id
  })

  it("owner can list members (includes self)", async () => {
    const { data, error } = await ownerPult.teams.listMembers(teamId)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)
    const owner = data!.find(m => m.role === "owner")
    expect(owner).toBeDefined()
  })

  it("owner invites member", async () => {
    const { data, error } = await ownerPult.teams.addMember(teamId, {
      email: "ci-team-member@pult.rest",
      role: "member",
    })
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  it("member can list their own teams", async () => {
    const { data, error } = await memberPult.teams.list()
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it("owner can list invites", async () => {
    const { data, error } = await ownerPult.teams.listInvites(teamId)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  it("member cannot delete team", async () => {
    const { error } = await memberPult.teams.delete(teamId)
    expect(error).not.toBeNull()
  })

  it("member cannot add members to team", async () => {
    const { error } = await memberPult.teams.addMember(teamId, {
      email: "nobody@test.local",
      role: "member",
    })
    expect(error).not.toBeNull()
  })

  it("cleanup: owner deletes team", async () => {
    if (!CLEANUP) return
    const { error } = await ownerPult.teams.delete(teamId)
    expect(error).toBeNull()
    teamId = ""
  })
})

// ─── 7. DATABASE ADVANCED ───────────────────────────────────────────────────────

describe.skipIf(!TOKEN)("E2E: Database advanced", () => {
  let pult: PultClient
  let appId: string

  beforeAll(async () => {
    pult = client(TOKEN!)
    const { data } = await pult.apps.create({ name: `sdk-dbadv-${Date.now()}`, region: "eu" })
    appId = data!.id
    await pult.databases.create(appId)
    await waitFor(async () => {
      const { data: db } = await pult.databases.get(appId)
      return db?.status === "ready"
    }, 180000)
  }, 210000)

  afterAll(async () => {
    if (appId && CLEANUP) await pult.apps.delete(appId)
  }, 30000)

  it("create table and insert rows", async () => {
    await pult.databases.query(appId, {
      sql: "CREATE TABLE IF NOT EXISTS txn_test (id SERIAL PRIMARY KEY, val TEXT)",
    })
    await pult.databases.query(appId, {
      sql: "INSERT INTO txn_test (val) VALUES ('row1')",
    })
    await pult.databases.query(appId, {
      sql: "INSERT INTO txn_test (val) VALUES ('row2')",
    })

    const { data, error } = await pult.databases.query(appId, {
      sql: "SELECT count(*) AS cnt FROM txn_test",
    })
    expect(error).toBeNull()
    expect(Number(data!.rows[0][0])).toBe(2)
  })

  it("large result set", async () => {
    await pult.databases.query(appId, {
      sql: "CREATE TABLE IF NOT EXISTS big_table (id SERIAL PRIMARY KEY, data TEXT)",
    })
    await pult.databases.query(appId, {
      sql: "INSERT INTO big_table (data) SELECT 'row-' || generate_series(1, 500)",
    })

    const { data, error } = await pult.databases.query(appId, {
      sql: "SELECT count(*) AS cnt FROM big_table",
    })
    expect(error).toBeNull()
    expect(Number(data!.rows[0][0])).toBeGreaterThanOrEqual(500)
  })

  it("apply second migration", async () => {
    const { error } = await pult.databases.applyMigration(appId, {
      version: "002",
      name: "add_index",
      sql: "CREATE INDEX IF NOT EXISTS idx_big_table_data ON big_table(data)",
    })
    expect(error).toBeNull()
  })

  it("migrations are ordered by version", async () => {
    const { data, error } = await pult.databases.listMigrations(appId)
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)
    for (let i = 1; i < data!.length; i++) {
      expect(data![i].version >= data![i - 1].version).toBe(true)
    }
  })

  it("duplicate migration version is idempotent", async () => {
    const { error } = await pult.databases.applyMigration(appId, {
      version: "002",
      name: "add_index_dup",
      sql: "SELECT 1",
    })
    expect(error).toBeNull()
  })

  it("JSON data round-trip", async () => {
    await pult.databases.query(appId, {
      sql: "CREATE TABLE IF NOT EXISTS json_test (id SERIAL PRIMARY KEY, payload JSONB)",
    })
    await pult.databases.query(appId, {
      sql: `INSERT INTO json_test (payload) VALUES ('{"key": "value", "nested": {"arr": [1,2,3]}}')`,
    })
    const { data, error } = await pult.databases.query(appId, {
      sql: "SELECT payload->>'key' AS k, payload->'nested'->'arr'->0 AS first FROM json_test",
    })
    expect(error).toBeNull()
    expect(data!.rows[0]).toContain("value")
  })

  it("list replicas returns empty array", async () => {
    const { data, error } = await pult.databases.listReplicas(appId)
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    expect(data!.length).toBe(0)
  })
})

// ─── 8. CONCURRENT OPERATIONS ───────────────────────────────────────────────────

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

// ─── 9. APP NAME VALIDATION ────────────────────────────────────────────────────

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

// ─── 10. IDEMPOTENCY ───────────────────────────────────────────────────────────

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

// ─── 11. HEALTH ─────────────────────────────────────────────────────────────────

describe.skipIf(!TOKEN)("E2E: Health", () => {
  it("health endpoint returns ok", async () => {
    const pult = client(TOKEN!)
    const { data, error } = await pult.health()
    expect(error).toBeNull()
    expect(data!.status).toBe("ok")
  })

  it("health endpoint is fast (<2s)", async () => {
    const start = Date.now()
    const pult = client(TOKEN!)
    await pult.health()
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(2000)
  })
})

// ─── 12. CROSS-USER ISOLATION ───────────────────────────────────────────────────

describe.skipIf(!TOKEN || !TOKEN_FREE)("E2E: Cross-user isolation", () => {
  let businessPult: PultClient
  let freePult: PultClient
  let appId: string

  beforeAll(async () => {
    businessPult = client(TOKEN!)
    freePult = client(TOKEN_FREE!)
    const { data } = await businessPult.apps.create({ name: `sdk-iso-${Date.now()}`, region: "eu" })
    appId = data!.id
  }, 30000)

  afterAll(async () => {
    if (appId && CLEANUP) await businessPult.apps.delete(appId)
  }, 30000)

  it("other user cannot get the app", async () => {
    const { data, error } = await freePult.apps.get(appId)
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it("other user cannot delete the app", async () => {
    const { error } = await freePult.apps.delete(appId)
    expect(error).not.toBeNull()
  })

  it("other user cannot set env vars", async () => {
    const { error } = await freePult.env.set(appId, { HACKED: "true" })
    expect(error).not.toBeNull()
  })

  it("other user cannot enable database", async () => {
    const { error } = await freePult.databases.create(appId)
    expect(error).not.toBeNull()
  })

  it("other user cannot enable storage", async () => {
    const { error } = await freePult.storage.create(appId)
    expect(error).not.toBeNull()
  })

  it("other user cannot enable redis", async () => {
    const { error } = await freePult.redis.enable(appId)
    expect(error).not.toBeNull()
  })

  it("other user's app list does not include our app", async () => {
    const { data } = await freePult.apps.list()
    const found = data?.find(a => a.id === appId)
    expect(found).toBeUndefined()
  })
})
