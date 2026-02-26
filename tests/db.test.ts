import { describe, it, expect, vi, beforeEach } from "vitest"
import { DbClient, QueryBuilder } from "../src/db"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("DbClient", () => {
  let db: DbClient

  beforeEach(() => {
    mockFetch.mockReset()
    db = new DbClient({ url: "https://db-myapp.pult.rest", apiKey: "test-jwt" })
  })

  it("creates a query builder from table name", () => {
    const builder = db.from("posts")
    expect(builder).toBeInstanceOf(QueryBuilder)
  })

  describe("graphql", () => {
    it("sends GraphQL query to /rpc/graphql", async () => {
      const graphqlResponse = { data: { postsCollection: { edges: [] } }, errors: undefined }
      mockFetch.mockResolvedValue(new Response(JSON.stringify(graphqlResponse), { status: 200 }))

      const result = await db.graphql("{ postsCollection { edges { node { id } } } }")

      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain("/rpc/graphql")
      expect(init.method).toBe("POST")
      expect(JSON.parse(init.body)).toEqual({
        query: "{ postsCollection { edges { node { id } } } }",
        variables: undefined,
        operationName: undefined,
      })
      expect(init.headers["Content-Profile"]).toBe("graphql_public")
      expect(result.data?.data?.postsCollection.edges).toEqual([])
    })

    it("passes variables and operationName", async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ data: null }), { status: 200 }))

      await db.graphql("query GetPost($id: Int!) { post(id: $id) { title } }", { id: 1 }, "GetPost")

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.variables).toEqual({ id: 1 })
      expect(body.operationName).toBe("GetPost")
    })
  })
})

describe("QueryBuilder", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  function createBuilder(table: string): QueryBuilder<Record<string, unknown>> {
    const db = new DbClient({ url: "https://db-test.pult.rest", apiKey: "jwt" })
    return db.from(table)
  }

  it("builds a simple select query", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([{ id: 1 }]), { status: 200 }))

    const { data } = await createBuilder("posts").select("*")

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("/posts")
    expect(mockFetch.mock.calls[0][1].method).toBe("GET")
    expect(data).toEqual([{ id: 1 }])
  })

  it("applies eq filter", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

    await createBuilder("posts").select("*").eq("published", true)

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("published=eq.true")
  })

  it("chains multiple filters", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

    await createBuilder("posts").select("id,title").gt("views", 100).eq("published", true).order("created_at", { ascending: false }).limit(10)

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("select=id%2Ctitle")
    expect(url).toContain("views=gt.100")
    expect(url).toContain("published=eq.true")
    expect(url).toContain("order=created_at.desc")
    expect(url).toContain("limit=10")
  })

  it("sends insert as POST", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([{ id: 1 }]), { status: 201 }))

    await createBuilder("posts").insert({ title: "Hello", body: "World" })

    const [, init] = mockFetch.mock.calls[0]
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({ title: "Hello", body: "World" })
  })

  it("sends update as PATCH with filters", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

    await createBuilder("posts").update({ title: "Updated" }).eq("id", 1)

    const [url, init] = mockFetch.mock.calls[0]
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(init.body)).toEqual({ title: "Updated" })
    expect(url).toContain("id=eq.1")
  })

  it("sends delete as DELETE", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

    await createBuilder("posts").delete().eq("id", 1)

    const [url, init] = mockFetch.mock.calls[0]
    expect(init.method).toBe("DELETE")
    expect(url).toContain("id=eq.1")
  })

  it("applies range for pagination", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

    await createBuilder("posts").select("*").range(10, 19)

    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("offset=10")
    expect(url).toContain("limit=10")
  })

  it("is thenable for await syntax", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify([{ id: 1 }]), { status: 200 }))

    const result = await createBuilder("posts").select("*")

    expect(result.data).toEqual([{ id: 1 }])
    expect(result.error).toBeNull()
  })
})
