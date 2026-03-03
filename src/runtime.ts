function readEnv(key: string): string | undefined {
  if (typeof globalThis !== "undefined" && "process" in globalThis) {
    const proc = (globalThis as Record<string, unknown>)["process"] as
      | { env?: Record<string, string | undefined> }
      | undefined
    return proc?.env?.[key]
  }
  return undefined
}

function requireEnv(key: string): string {
  const value = readEnv(key)
  if (value !== undefined) return value
  throw new Error(
    `Missing environment variable: ${key}. Pass the url explicitly or deploy on Pult.`,
  )
}

export { readEnv, requireEnv }
