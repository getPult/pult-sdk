import { describe, it, expect } from "vitest"
import { createClient, createDbClient, createAuthClient, PultClient, DbClient, AuthClient } from "../src/index"

describe("createClient", () => {
  it("returns a PultClient instance", () => {
    const client = createClient({ url: "https://api.pult.rest", apiKey: "test" })
    expect(client).toBeInstanceOf(PultClient)
  })

  it("exposes all sub-clients", () => {
    const client = createClient({ url: "https://api.pult.rest" })
    expect(client.apps).toBeDefined()
    expect(client.deployments).toBeDefined()
    expect(client.logs).toBeDefined()
    expect(client.env).toBeDefined()
    expect(client.domains).toBeDefined()
    expect(client.databases).toBeDefined()
    expect(client.git).toBeDefined()
  })
})

describe("createDbClient", () => {
  it("returns a DbClient instance", () => {
    const db = createDbClient({ url: "https://db-myapp.pult.rest", apiKey: "jwt" })
    expect(db).toBeInstanceOf(DbClient)
  })
})

describe("createAuthClient", () => {
  it("returns an AuthClient instance", () => {
    const auth = createAuthClient({ url: "https://auth-myapp.pult.rest" })
    expect(auth).toBeInstanceOf(AuthClient)
  })
})
