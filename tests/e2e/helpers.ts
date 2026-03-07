import { createClient, createAuthClient, PultClient, AuthClient } from "../../src/index"

export const API_URL = process.env.E2E_API_URL || "https://api.pult.rest"
export const TOKEN = process.env.E2E_CP_TOKEN
export const TOKEN_FREE = process.env.E2E_CP_TOKEN_FREE
export const TOKEN_PRO = process.env.E2E_CP_TOKEN_PRO
export const TOKEN_ADMIN = process.env.E2E_CP_TOKEN_ADMIN
export const TOKEN_TEAM_OWNER = process.env.E2E_CP_TOKEN_TEAM_OWNER
export const TOKEN_TEAM_MEMBER = process.env.E2E_CP_TOKEN_TEAM_MEMBER
export const CLEANUP = process.env.E2E_CLEANUP !== "false"

export { createClient, createAuthClient, PultClient, AuthClient }

export function client(token: string): PultClient {
  return createClient({ url: API_URL, apiKey: token })
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function waitFor(
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
