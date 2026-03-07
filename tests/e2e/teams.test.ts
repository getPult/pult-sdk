import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { TOKEN, TOKEN_FREE, TOKEN_TEAM_OWNER, TOKEN_TEAM_MEMBER, CLEANUP, client, PultClient } from "./helpers"

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
    const owner = data!.find(m => m.role === "owner")
    expect(owner).toBeDefined()
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

  it("member cannot delete team", async () => {
    const { error } = await memberPult.teams.delete(teamId)
    expect(error).not.toBeNull()
  })

  it("member cannot add members to team", async () => {
    const { error } = await memberPult.teams.addMember(teamId, {
      email: "nobody@test.local",
      role: "member",
    })
    expect(error).not.toBeNull()
  })

  it("cleanup: owner deletes team", async () => {
    if (!CLEANUP) return
    const { error } = await ownerPult.teams.delete(teamId)
    expect(error).toBeNull()
    teamId = ""
  })
})

describe.skipIf(!TOKEN || !TOKEN_FREE)("E2E: Cross-user isolation", () => {
  let businessPult: PultClient
  let freePult: PultClient
  let appId: string

  beforeAll(async () => {
    businessPult = client(TOKEN!)
    freePult = client(TOKEN_FREE!)
    const { data } = await businessPult.apps.create({ name: `sdk-iso-${Date.now()}`, region: "eu" })
    appId = data!.id
  }, 30000)

  afterAll(async () => {
    if (appId && CLEANUP) await businessPult.apps.delete(appId)
  }, 30000)

  it("other user cannot get the app", async () => {
    const { data, error } = await freePult.apps.get(appId)
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it("other user cannot delete the app", async () => {
    const { error } = await freePult.apps.delete(appId)
    expect(error).not.toBeNull()
  })

  it("other user cannot set env vars", async () => {
    const { error } = await freePult.env.set(appId, { HACKED: "true" })
    expect(error).not.toBeNull()
  })

  it("other user cannot enable database", async () => {
    const { error } = await freePult.databases.create(appId)
    expect(error).not.toBeNull()
  })

  it("other user cannot enable storage", async () => {
    const { error } = await freePult.storage.create(appId)
    expect(error).not.toBeNull()
  })

  it("other user cannot enable redis", async () => {
    const { error } = await freePult.redis.enable(appId)
    expect(error).not.toBeNull()
  })

  it("other user's app list does not include our app", async () => {
    const { data } = await freePult.apps.list()
    const found = data?.find(a => a.id === appId)
    expect(found).toBeUndefined()
  })
})
