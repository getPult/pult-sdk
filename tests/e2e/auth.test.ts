import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { TOKEN, CLEANUP, API_URL, client, sleep, waitFor, createAuthClient, PultClient, AuthClient } from "./helpers"

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

  it("enables database (required for auth)", { timeout: 320000 }, async () => {
    const { error } = await pult.databases.create(authAppId)
    expect(error).toBeNull()

    await waitFor(async () => {
      const { data } = await pult.databases.get(authAppId)
      return data?.status === "ready"
    }, 300000, 5000)
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
    const { data, error } = await authClient.signUp({
      email: testEmail,
      password: testPassword,
    })
    expect(error).toBeNull()
    expect(data!.email).toBe(testEmail)
    expect(data!.id).toBeDefined()
  })

  it("signIn before email confirmation fails", async () => {
    const freshClient = createAuthClient({ url: authClient["http"]["baseUrl"] })
    const { data, error } = await freshClient.signIn({
      email: testEmail,
      password: testPassword,
    })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
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
    expect(data!.user).toBeDefined()
    expect(data!.user.email).toBe(testEmail)
  })

  it("signIn with wrong password fails", async () => {
    const freshClient = createAuthClient({ url: authClient["http"]["baseUrl"] })
    const { data, error } = await freshClient.signIn({
      email: testEmail,
      password: "WrongP@ss999!",
    })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it("signIn with nonexistent email fails", async () => {
    const freshClient = createAuthClient({ url: authClient["http"]["baseUrl"] })
    const { data, error } = await freshClient.signIn({
      email: "nobody-exists-here@fake.local",
      password: testPassword,
    })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it("getUser returns current user profile", async () => {
    const { data, error } = await authClient.getUser()
    expect(error).toBeNull()
    expect(data!.email).toBe(testEmail)
    expect(data!.id).toBeDefined()
    expect(typeof data!.role).toBe("string")
  })

  it("updateUser updates metadata", async () => {
    const { data, error } = await authClient.updateUser({
      data: { display_name: "E2E Tester" },
    })
    expect(error).toBeNull()
    expect(data!.user_metadata.display_name).toBe("E2E Tester")
  })

  it("getSession returns active session", () => {
    const session = authClient.getSession()
    expect(session).not.toBeNull()
    expect(session!.access_token).toBeDefined()
    expect(session!.refresh_token).toBeDefined()
    expect(session!.token_type).toBe("bearer")
    expect(typeof session!.expires_in).toBe("number")
  })

  it("refreshSession returns new tokens", async () => {
    await sleep(1100)
    const { data, error } = await authClient.refreshSession()
    expect(error).toBeNull()
    expect(data!.access_token).toBeDefined()
    expect(data!.refresh_token).toBeDefined()
  })

  it("refreshSession without session fails", async () => {
    const freshClient = createAuthClient({ url: authClient["http"]["baseUrl"] })
    const { data, error } = await freshClient.refreshSession()
    expect(data).toBeNull()
    expect(error).not.toBeNull()
    expect(error!.code).toBe("NO_SESSION")
  })

  it("signOut clears session", async () => {
    const { error } = await authClient.signOut()
    expect(error).toBeNull()
    expect(authClient.getSession()).toBeNull()
  })

  it("signOut without session is idempotent", async () => {
    const { data, error } = await authClient.signOut()
    expect(error).toBeNull()
    expect(data!.status).toBe("ok")
  })

  it("getUser fails after signOut", async () => {
    const { data, error } = await authClient.getUser()
    expect(data).toBeNull()
    expect(error).toBeDefined()
    expect(error!.code).toBe("NO_SESSION")
  })

  it("updateUser fails after signOut", async () => {
    const { data, error } = await authClient.updateUser({ data: { foo: "bar" } })
    expect(data).toBeNull()
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

  it("onAuthStateChange fires on signIn", async () => {
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
    let firedWith: unknown = "NOT_FIRED"
    const { unsubscribe } = authClient.onAuthStateChange(session => {
      firedWith = session
    })

    await authClient.signOut()
    expect(firedWith).toBeNull()
    unsubscribe()
  })

  it("unsubscribe stops listener from firing", async () => {
    const freshClient = createAuthClient({ url: authClient["http"]["baseUrl"] })
    let callCount = 0
    const { unsubscribe } = freshClient.onAuthStateChange(() => { callCount++ })
    unsubscribe()
    await freshClient.signIn({ email: testEmail, password: testPassword })
    expect(callCount).toBe(0)
    await freshClient.signOut()
  })

  it("multiple listeners all fire", async () => {
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
    const { data, error } = await authClient.signUp({
      email: testEmail,
      password: "AnotherPass123!",
    })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it("signUp with weak password returns error", async () => {
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
