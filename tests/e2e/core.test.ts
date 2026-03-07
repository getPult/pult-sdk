import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { TOKEN, CLEANUP, API_URL, client, waitFor, PultClient } from "./helpers"

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

    it("waits for database to be ready", { timeout: 320000 }, async () => {
      await waitFor(async () => {
        const { data } = await pult.databases.get(appId)
        return data?.status === "ready"
      }, 300000, 5000)

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
