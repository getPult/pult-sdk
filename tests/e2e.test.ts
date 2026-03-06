import { describe, it, expect, beforeAll } from "vitest"
import { createClient, PultClient } from "../src/index"

const API_URL = "https://api.pult.rest"
const API_KEY = process.env.PULT_E2E_TOKEN
const APP_ID = process.env.PULT_E2E_APP_ID || "7e81848b-3689-4619-a2e6-26f131630654"

describe.skipIf(!API_KEY)("E2E: SDK against real API", () => {
  let pult: PultClient

  beforeAll(() => {
    pult = createClient({ url: API_URL, apiKey: API_KEY! })
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
        expect(app.updated_at).toBeDefined()
      }
    })

    it("get returns single app with full details", async () => {
      const { data, error } = await pult.apps.get(APP_ID)
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.id).toBe(APP_ID)
      expect(data!.name).toBeDefined()
      expect(data!.primary_region).toBeDefined()
      expect(data!.regions).toBeDefined()
      expect(Array.isArray(data!.regions)).toBe(true)
      expect(typeof data!.has_database).toBe("boolean")
      expect(typeof data!.has_storage).toBe("boolean")
      expect(typeof data!.has_redis).toBe("boolean")
      expect(typeof data!.has_realtime).toBe("boolean")
    })
  })

  describe("deployments", () => {
    it("list returns array with expected fields", async () => {
      const { data, error } = await pult.deployments.list(APP_ID)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      if (data && data.length > 0) {
        const d = data[0]
        expect(d.id).toBeDefined()
        expect(d.app_id).toBe(APP_ID)
        expect(d.status).toBeDefined()
        expect(d.created_at).toBeDefined()
        expect(typeof d.app_name).toBe("string")
        expect(typeof d.environment_id).toBe("string")
        expect(typeof d.environment_name).toBe("string")
      }
    })
  })

  describe("env", () => {
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
        expect(v.created_at).toBeDefined()
      }
    })

    it("set and delete env var lifecycle", async () => {
      const key = `SDK_E2E_TEST_${Date.now()}`
      const { data: setResult, error: setErr } = await pult.env.set(APP_ID, { [key]: "test-value" })
      expect(setErr).toBeNull()
      expect(Array.isArray(setResult)).toBe(true)

      const { error: delErr } = await pult.env.delete(APP_ID, key)
      expect(delErr).toBeNull()
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
    it("get returns unwrapped ManagedDatabase", async () => {
      const { data, error } = await pult.databases.get(APP_ID)
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.id).toBeDefined()
      expect(data!.app_id).toBe(APP_ID)
      expect(data!.status).toBe("ready")
      expect(typeof data!.port).toBe("number")
      expect(typeof data!.size).toBe("number")
      expect(data!.version).toBeDefined()
      expect(typeof data!.connections).toBe("number")
      expect(typeof data!.max_connections).toBe("number")
    })
  })

  describe("environments", () => {
    it("list returns array with expected fields", async () => {
      const { data, error } = await pult.environments.list(APP_ID)
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      if (data && data.length > 0) {
        const env = data[0]
        expect(env.id).toBeDefined()
        expect(env.app_id).toBe(APP_ID)
        expect(env.name).toBeDefined()
        expect(env.slug).toBeDefined()
        expect(typeof env.is_production).toBe("boolean")
        expect(typeof env.is_ephemeral).toBe("boolean")
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
        expect(svc.type).toBeDefined()
        expect(typeof svc.port).toBe("number")
        expect(svc.status).toBeDefined()
      }
    })
  })

  describe("git", () => {
    it("status returns connection info", async () => {
      const { data, error } = await pult.git.status(APP_ID)
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(typeof data!.connected).toBe("boolean")
      if (data!.connected) {
        expect(data!.provider).toBeDefined()
        expect(data!.repo).toBeDefined()
        expect(data!.branch).toBeDefined()
      }
    })
  })

  describe("billing", () => {
    it("status returns plan and limits", async () => {
      const { data, error } = await pult.billing.status()
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.plan).toBeDefined()
      expect(data!.limits).toBeDefined()
      expect(typeof data!.limits.max_ram_mb).toBe("number")
      expect(data!.usage).toBeDefined()
      expect(typeof data!.usage.apps).toBe("number")
    })

    it("subscription returns plan info", async () => {
      const { data, error } = await pult.billing.subscription()
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.plan).toBeDefined()
    })

    it("usage returns usage metrics", async () => {
      const { data, error } = await pult.billing.usage()
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.usage).toBeDefined()
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
    it("list returns array", async () => {
      const { data, error } = await pult.teams.list()
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it("create, update, and delete team lifecycle", async () => {
      const name = `sdk-e2e-${Date.now()}`
      const { data: created, error: createErr } = await pult.teams.create({ name })
      expect(createErr).toBeNull()
      expect(created).toBeDefined()
      expect(created!.name).toBe(name)
      expect(created!.id).toBeDefined()

      const teamId = created!.id

      const { data: updated, error: updateErr } = await pult.teams.update(teamId, { name: `${name}-updated` })
      expect(updateErr).toBeNull()
      expect(updated!.name).toBe(`${name}-updated`)

      const { data: members, error: membersErr } = await pult.teams.listMembers(teamId)
      expect(membersErr).toBeNull()
      expect(Array.isArray(members)).toBe(true)
      expect(members!.length).toBeGreaterThanOrEqual(1)

      const { error: deleteErr } = await pult.teams.delete(teamId)
      expect(deleteErr).toBeNull()
    })
  })

  describe("storage", () => {
    it("get returns unwrapped StorageBucket", async () => {
      const { data, error } = await pult.storage.get(APP_ID)
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.id).toBeDefined()
      expect(data!.app_id).toBe(APP_ID)
      expect(data!.status).toBe("ready")
      expect(data!.endpoint).toBeDefined()
      expect(typeof data!.is_public).toBe("boolean")
    })
  })

  describe("redis", () => {
    it("status returns RedisInstance", async () => {
      const { data, error } = await pult.redis.status(APP_ID)
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.id).toBeDefined()
      expect(data!.app_id).toBe(APP_ID)
      expect(data!.status).toBe("ready")
      expect(data!.endpoint).toBeDefined()
      expect(typeof data!.max_memory_mb).toBe("number")
    })
  })

  describe("realtime", () => {
    it("status returns unwrapped RealtimeService", async () => {
      const { data, error } = await pult.realtime.status(APP_ID)
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.status).toBe("ready")
      expect(data!.endpoint).toBeDefined()
      expect(typeof data!.enabled).toBe("boolean")
    })
  })

  describe("analytics", () => {
    it("overview returns expected fields", async () => {
      const { data, error } = await pult.analytics.overview(APP_ID)
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(typeof data!.visitors).toBe("number")
      expect(typeof data!.pageviews).toBe("number")
      expect(typeof data!.requests).toBe("number")
      expect(typeof data!.avg_latency_ms).toBe("number")
      expect(typeof data!.bounce_rate).toBe("number")
    })
  })

  describe("cron", () => {
    it("list returns jobs wrapper", async () => {
      const { data, error } = await pult.cron.list(APP_ID)
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(Array.isArray(data!.jobs)).toBe(true)
    })
  })
})
