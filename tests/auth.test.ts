import { describe, it, expect, vi, beforeEach } from "vitest"
import { AuthClient } from "../src/auth"

const mockFetch = vi.fn()
global.fetch = mockFetch

function mockResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status })
}

const testUser = {
  id: "user-1",
  email: "test@example.com",
  role: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

const testSession = {
  access_token: "eyJ.access.token",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "refresh-token-123",
  user: testUser,
}

describe("AuthClient", () => {
  let auth: AuthClient

  beforeEach(() => {
    mockFetch.mockReset()
    auth = new AuthClient({ url: "https://auth-myapp.pult.rest" })
  })

  describe("signUp", () => {
    it("sends signup request with email and password", async () => {
      mockFetch.mockResolvedValue(mockResponse(testUser))

      const result = await auth.signUp({ email: "test@example.com", password: "password123" })

      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain("/auth/v1/signup")
      expect(JSON.parse(init.body)).toEqual({
        email: "test@example.com",
        password: "password123",
        data: undefined,
      })
      expect(result.data?.email).toBe("test@example.com")
    })

    it("passes user metadata", async () => {
      mockFetch.mockResolvedValue(mockResponse(testUser))

      await auth.signUp({ email: "test@example.com", password: "pw", data: { name: "Test" } })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.data).toEqual({ name: "Test" })
    })
  })

  describe("signIn", () => {
    it("sends credentials and stores session", async () => {
      mockFetch.mockResolvedValue(mockResponse(testSession))

      const result = await auth.signIn({ email: "test@example.com", password: "password123" })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.grant_type).toBe("password")
      expect(result.data?.access_token).toBe("eyJ.access.token")
      expect(auth.getSession()).toEqual(testSession)
    })

    it("does not store session on error", async () => {
      mockFetch.mockResolvedValue(mockResponse({ error: "invalid credentials" }, 401))

      await auth.signIn({ email: "test@example.com", password: "wrong" })

      expect(auth.getSession()).toBeNull()
    })
  })

  describe("signOut", () => {
    it("clears session when signed in", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(testSession))
      await auth.signIn({ email: "test@example.com", password: "pw" })

      mockFetch.mockResolvedValueOnce(mockResponse({ status: "ok" }))
      await auth.signOut()

      expect(auth.getSession()).toBeNull()
    })

    it("returns ok when already signed out", async () => {
      const result = await auth.signOut()

      expect(result.data?.status).toBe("ok")
      expect(result.error).toBeNull()
    })
  })

  describe("getUser", () => {
    it("returns error when no session", async () => {
      const result = await auth.getUser()

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe("NO_SESSION")
    })

    it("fetches user when signed in", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(testSession))
      await auth.signIn({ email: "test@example.com", password: "pw" })

      mockFetch.mockResolvedValueOnce(mockResponse(testUser))
      const result = await auth.getUser()

      expect(result.data?.email).toBe("test@example.com")
      const [, init] = mockFetch.mock.calls[1]
      expect(init.headers["Authorization"]).toBe("Bearer eyJ.access.token")
    })
  })

  describe("refreshSession", () => {
    it("returns error when no session", async () => {
      const result = await auth.refreshSession()

      expect(result.error?.code).toBe("NO_SESSION")
    })

    it("sends refresh token and updates session", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(testSession))
      await auth.signIn({ email: "test@example.com", password: "pw" })

      const newSession = { ...testSession, access_token: "new-token" }
      mockFetch.mockResolvedValueOnce(mockResponse(newSession))
      await auth.refreshSession()

      const body = JSON.parse(mockFetch.mock.calls[1][1].body)
      expect(body.grant_type).toBe("refresh_token")
      expect(body.refresh_token).toBe("refresh-token-123")
      expect(auth.getSession()?.access_token).toBe("new-token")
    })
  })

  describe("onAuthStateChange", () => {
    it("notifies listeners on sign in", async () => {
      const listener = vi.fn()
      auth.onAuthStateChange(listener)

      mockFetch.mockResolvedValue(mockResponse(testSession))
      await auth.signIn({ email: "test@example.com", password: "pw" })

      expect(listener).toHaveBeenCalledWith(testSession)
    })

    it("notifies listeners on sign out", async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(testSession))
      await auth.signIn({ email: "test@example.com", password: "pw" })

      const listener = vi.fn()
      auth.onAuthStateChange(listener)

      mockFetch.mockResolvedValueOnce(mockResponse({ status: "ok" }))
      await auth.signOut()

      expect(listener).toHaveBeenCalledWith(null)
    })

    it("unsubscribe stops notifications", async () => {
      const listener = vi.fn()
      const { unsubscribe } = auth.onAuthStateChange(listener)
      unsubscribe()

      mockFetch.mockResolvedValue(mockResponse(testSession))
      await auth.signIn({ email: "test@example.com", password: "pw" })

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe("signInWithMagicLink", () => {
    it("sends magic link request", async () => {
      mockFetch.mockResolvedValue(mockResponse({ status: "ok" }))

      const result = await auth.signInWithMagicLink("test@example.com")

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.email).toBe("test@example.com")
      expect(result.data?.status).toBe("ok")
    })
  })

  describe("resetPassword", () => {
    it("sends recovery request", async () => {
      mockFetch.mockResolvedValue(mockResponse({ status: "ok" }))

      await auth.resetPassword("test@example.com")

      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain("/auth/v1/recover")
    })
  })
})
