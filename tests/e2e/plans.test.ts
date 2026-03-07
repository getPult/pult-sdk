import { describe, it, expect, beforeAll } from "vitest"
import { TOKEN, TOKEN_FREE, TOKEN_PRO, TOKEN_ADMIN, API_URL, client, PultClient } from "./helpers"

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
    const res = await fetch(`${API_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${TOKEN_FREE}` },
    })
    expect(res.status).toBe(403)
  })
})

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
