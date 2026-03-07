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

    it("waits for database to be ready", { timeout: 90000 }, async () => {
      await waitFor(async () => {
        const { data } = await pult.databases.get(appId)
        return data?.status === "ready"
      }, 80000)

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

    it("delete env vars", async () => {
      const { error: err1 } = await pult.env.delete(appId, testKey)
      expect(err1).toBeNull()

      const { error: err2 } = await pult.env.delete(appId, `${testKey}_2`)
      expect(err2).toBeNull()

      const { data } = await pult.env.list(appId)
      const found = data?.find(v => v.key === testKey)
      expect(found).toBeUndefined()
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

    it("presign returns upload URL", async () => {
      const { data, error } = await pult.storage.presign(appId, {
        key: "test-file.txt",
        method: "PUT",
      })
      expect(error).toBeNull()
      expect(data!.url).toBeDefined()
      expect(typeof data!.url).toBe("string")
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
  })

  describe("10 — Analytics", () => {
    it("overview returns numeric metrics", async () => {
      const { data, error } = await pult.analytics.overview(appId)
      expect(error).toBeNull()
      expect(typeof data!.visitors).toBe("number")
      expect(typeof data!.requests).toBe("number")
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
    })

    it("realtime returns visitor count", async () => {
      const { data, error } = await pult.analytics.realtime(appId)
      expect(error).toBeNull()
      expect(typeof data!.live_visitors).toBe("number")
    })
  })

  describe("11 — Cron (requires ready DB)", () => {
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

    it("delete cron job", async () => {
      if (!dbReady || !cronJobId) return
      const { error } = await pult.cron.delete(appId, String(cronJobId))
      expect(error).toBeNull()
    })
  })

  describe("12 — Billing", () => {
    it("status returns plan and limits", async () => {
      const { data, error } = await pult.billing.status()
      expect(error).toBeNull()
      expect(data!.plan).toBeDefined()
      expect(typeof data!.limits.max_ram_mb).toBe("number")
      expect(typeof data!.limits.max_db_mb).toBe("number")
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
    })

    it("invoices returns array", async () => {
      const { data, error } = await pult.billing.invoices()
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe("13 — Teams", () => {
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

  describe("14 — Cleanup", () => {
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
  })
})

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

  it("enables database (required for auth)", { timeout: 150000 }, async () => {
    const { error } = await pult.databases.create(authAppId)
    expect(error).toBeNull()

    await waitFor(async () => {
      const { data } = await pult.databases.get(authAppId)
      return data?.status === "ready"
    }, 140000)
  })

  it("enables auth service", { timeout: 90000 }, async () => {
    let lastErr: unknown
    const deadline = Date.now() + 80000
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

  it("waits for auth service to be reachable", { timeout: 120000 }, async () => {
    const { data: app } = await pult.apps.get(authAppId)
    const authUrl = `https://auth-${app!.name}.pult.rest`

    await waitFor(async () => {
      try {
        const res = await fetch(`${authUrl}/auth/v1/health`)
        return res.ok
      } catch {
        return false
      }
    }, 110000, 3000)

    authClient = createAuthClient({ url: authUrl })
  })

  it("signUp creates a new user", async () => {
    const { data, error } = await authClient.signUp({
      email: testEmail,
      password: testPassword,
    })
    expect(error).toBeNull()
    expect(data!.email).toBe(testEmail)
    expect(data!.id).toBeDefined()
  })

  it("confirms user email via DB", { timeout: 15000 }, async () => {
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
    const { data, error } = await authClient.signIn({
      email: testEmail,
      password: testPassword,
    })
    expect(error).toBeNull()
    expect(data!.access_token).toBeDefined()
    expect(data!.refresh_token).toBeDefined()
    expect(typeof data!.access_token).toBe("string")
    expect(data!.access_token.length).toBeGreaterThan(10)
  })

  it("getUser returns current user profile", async () => {
    const { data, error } = await authClient.getUser()
    expect(error).toBeNull()
    expect(data!.email).toBe(testEmail)
  })

  it("getSession returns active session", () => {
    const session = authClient.getSession()
    expect(session).not.toBeNull()
    expect(session!.access_token).toBeDefined()
    expect(session!.refresh_token).toBeDefined()
  })

  it("refreshSession returns new tokens", async () => {
    const oldSession = authClient.getSession()
    const { data, error } = await authClient.refreshSession()
    expect(error).toBeNull()
    expect(data!.access_token).toBeDefined()
    expect(data!.access_token).not.toBe(oldSession!.access_token)
  })

  it("signOut clears session", async () => {
    const { error } = await authClient.signOut()
    expect(error).toBeNull()
    expect(authClient.getSession()).toBeNull()
  })

  it("getUser fails after signOut", async () => {
    const { data, error } = await authClient.getUser()
    expect(data).toBeNull()
    expect(error).toBeDefined()
    expect(error!.code).toBe("NO_SESSION")
  })

  it("signIn again after signOut works", async () => {
    const { data, error } = await authClient.signIn({
      email: testEmail,
      password: testPassword,
    })
    expect(error).toBeNull()
    expect(data!.access_token).toBeDefined()
  })

  it("onAuthStateChange fires on signOut", async () => {
    let firedWith: unknown = "NOT_FIRED"
    const { unsubscribe } = authClient.onAuthStateChange(session => {
      firedWith = session
    })

    await authClient.signOut()
    expect(firedWith).toBeNull()
    unsubscribe()
  })

  it("cleanup: delete auth app", { timeout: 15000 }, async () => {
    if (!CLEANUP) return
    const { error } = await pult.apps.delete(authAppId)
    expect(error).toBeNull()
    authAppId = ""
  })
})

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

  it("pro plan: higher RAM than free", async () => {
    const { data: freeData } = await freePult.billing.status()
    const { data: proData } = await proPult.billing.status()
    expect(proData!.limits.max_ram_mb).toBeGreaterThan(freeData!.limits.max_ram_mb)
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
})

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
})

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

  it("cleanup: owner deletes team", async () => {
    if (!CLEANUP) return
    const { error } = await ownerPult.teams.delete(teamId)
    expect(error).toBeNull()
    teamId = ""
  })
})

describe.skipIf(!TOKEN)("E2E: Health", () => {
  it("health endpoint returns ok", async () => {
    const pult = client(TOKEN!)
    const { data, error } = await pult.health()
    expect(error).toBeNull()
    expect(data!.status).toBe("ok")
  })
})
