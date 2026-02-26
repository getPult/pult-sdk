import type { HttpClient } from "./http"
import type {
  AuthSession,
  AuthStateCallback,
  AuthStateEvent,
  AuthUser,
  OAuthSignInOptions,
  PultResponse,
  SignInCredentials,
  SignUpCredentials,
} from "./types"

export class AuthClient {
  private http: HttpClient
  private session: AuthSession | null = null
  private listeners: Set<AuthStateCallback> = new Set()
  private refreshTimer: ReturnType<typeof setTimeout> | null = null

  constructor(http: HttpClient) {
    this.http = http
  }

  async signUp(credentials: SignUpCredentials): Promise<PultResponse<AuthSession>> {
    const result = await this.http.post<AuthSession>("/auth/v1/signup", credentials)
    if (result.data) this.setSession(result.data, "SIGNED_IN")
    return result
  }

  async signIn(credentials: SignInCredentials): Promise<PultResponse<AuthSession>> {
    const result = await this.http.post<AuthSession>("/auth/v1/token?grant_type=password", credentials)
    if (result.data) this.setSession(result.data, "SIGNED_IN")
    return result
  }

  async signInWithOAuth(options: OAuthSignInOptions): Promise<PultResponse<{ url: string }>> {
    const params: Record<string, string> = { provider: options.provider }
    if (options.redirectTo) params["redirect_to"] = options.redirectTo
    if (options.scopes) params["scopes"] = options.scopes
    return this.http.get<{ url: string }>("/auth/v1/authorize", params)
  }

  async signOut(): Promise<PultResponse<null>> {
    const result = await this.http.post<null>("/auth/v1/logout")
    this.clearSession()
    return result
  }

  async getUser(): Promise<PultResponse<AuthUser>> {
    return this.http.get<AuthUser>("/auth/v1/user")
  }

  getSession(): AuthSession | null {
    return this.session
  }

  onAuthStateChange(callback: AuthStateCallback): { unsubscribe: () => void } {
    this.listeners.add(callback)
    return {
      unsubscribe: () => this.listeners.delete(callback),
    }
  }

  async refreshSession(): Promise<PultResponse<AuthSession>> {
    if (!this.session?.refreshToken) {
      return {
        data: null,
        error: { message: "No refresh token", code: "NO_SESSION", status: 0 },
      }
    }

    const result = await this.http.post<AuthSession>("/auth/v1/token?grant_type=refresh_token", {
      refreshToken: this.session.refreshToken,
    })

    if (result.data) this.setSession(result.data, "TOKEN_REFRESHED")
    return result
  }

  private setSession(session: AuthSession, event: AuthStateEvent): void {
    this.session = session
    this.http.setHeader("Authorization", `Bearer ${session.accessToken}`)
    this.scheduleRefresh(session)
    this.notify(event, session)
  }

  private clearSession(): void {
    this.session = null
    this.http.removeHeader("Authorization")
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    this.refreshTimer = null
    this.notify("SIGNED_OUT", null)
  }

  private scheduleRefresh(session: AuthSession): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    const expiresIn = session.expiresAt * 1000 - Date.now()
    const refreshAt = Math.max(expiresIn - 60_000, 0)
    this.refreshTimer = setTimeout(() => this.refreshSession(), refreshAt)
  }

  private notify(event: AuthStateEvent, session: AuthSession | null): void {
    for (const listener of this.listeners) {
      listener(event, session)
    }
  }
}
