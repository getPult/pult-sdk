import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { TOKEN, CLEANUP, client, waitFor, PultClient } from "./helpers"

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
    }, 300000, 5000)
  }, 330000)

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
