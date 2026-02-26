import { describe, it, expect, vi, beforeEach } from "vitest"
import { HttpClient } from "../src/http"

const mockFetch = vi.fn()
global.fetch = mockFetch

describe("HttpClient", () => {
  let http: HttpClient

  beforeEach(() => {
    mockFetch.mockReset()
    http = new HttpClient("https://api.example.com", { Authorization: "Bearer test" })
  })

  describe("get", () => {
    it("sends GET request to correct URL", async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ id: "1" }), { status: 200 }))

      const result = await http.get("/apps")

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/apps",
        expect.objectContaining({ method: "GET" }),
      )
      expect(result.data).toEqual({ id: "1" })
      expect(result.error).toBeNull()
    })

    it("appends query params", async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

      await http.get("/apps", { limit: "10", offset: "0" })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("limit=10")
      expect(url).toContain("offset=0")
    })

    it("returns error on non-ok response", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: "not found" }), { status: 404 }),
      )

      const result = await http.get("/apps/missing")

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        message: "not found",
        code: "HTTP_404",
        status: 404,
      })
    })

    it("handles network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Failed to fetch"))

      const result = await http.get("/apps")

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("NETWORK_ERROR")
      expect(result.error?.message).toBe("Failed to fetch")
    })
  })

  describe("post", () => {
    it("sends POST with JSON body", async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ id: "new" }), { status: 201 }))

      const result = await http.post("/apps", { name: "test-app" })

      const [, init] = mockFetch.mock.calls[0]
      expect(init.method).toBe("POST")
      expect(init.body).toBe(JSON.stringify({ name: "test-app" }))
      expect(result.data).toEqual({ id: "new" })
    })

    it("merges extra headers", async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))

      await http.post("/rpc/graphql", { query: "{}" }, { "Content-Profile": "graphql_public" })

      const [, init] = mockFetch.mock.calls[0]
      expect(init.headers["Content-Profile"]).toBe("graphql_public")
      expect(init.headers["Authorization"]).toBe("Bearer test")
    })
  })

  describe("patch", () => {
    it("sends PATCH with body", async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))

      await http.patch("/apps/1", { name: "updated" })

      const [, init] = mockFetch.mock.calls[0]
      expect(init.method).toBe("PATCH")
      expect(init.body).toBe(JSON.stringify({ name: "updated" }))
    })
  })

  describe("del", () => {
    it("sends DELETE request", async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 204, headers: { "content-length": "0" } }))

      const result = await http.del("/apps/1")

      const [, init] = mockFetch.mock.calls[0]
      expect(init.method).toBe("DELETE")
      expect(result.error).toBeNull()
    })
  })

  describe("base URL handling", () => {
    it("strips trailing slashes from base URL", async () => {
      const client = new HttpClient("https://api.example.com///")
      mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))

      await client.get("/health")

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toBe("https://api.example.com/health")
    })
  })
})
