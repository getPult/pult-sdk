import { HttpClient } from "./http"
import type {
  AuthClientOptions,
  AuthSession,
  AuthUser,
  PultResponse,
  SignInRequest,
  SignUpRequest,
  StatusResponse,
  UpdateUserRequest,
} from "./types"

type AuthStateListener = (session: AuthSession | null) => void

export class AuthClient {
  private http: HttpClient
  private session: AuthSession | null = null
  private listeners: Set<AuthStateListener> = new Set()

  constructor(options: AuthClientOptions) {
    const headers: Record<string, string> = { ...options.headers }
    this.http = new HttpClient(options.url, headers)
  }

  async signUp(req: SignUpRequest): Promise<PultResponse<AuthUser>> {
    const result = await this.http.post<AuthUser>("/auth/v1/signup", {
      email: req.email,
      password: req.password,
      data: req.data,
    })
    return result
  }

  async signIn(req: SignInRequest): Promise<PultResponse<AuthSession>> {
    const result = await this.http.post<AuthSession>("/auth/v1/token", {
      email: req.email,
      password: req.password,
      grant_type: "password",
    })

    if (result.data) {
      this.setSession(result.data)
    }

    return result
  }

  async signInWithMagicLink(email: string): Promise<PultResponse<StatusResponse>> {
    return this.http.post<StatusResponse>("/auth/v1/magiclink", { email })
  }

  async signOut(): Promise<PultResponse<StatusResponse>> {
    const headers = this.authHeaders()
    if (!headers) {
      this.setSession(null)
      return { data: { status: "ok" }, error: null }
    }

    const result = await this.http.post<StatusResponse>("/auth/v1/logout")
    this.setSession(null)
    return result
  }

  async getUser(): Promise<PultResponse<AuthUser>> {
    if (!this.session) {
      return {
        data: null,
        error: { message: "No active session", code: "NO_SESSION", status: 0 },
      }
    }

    return new HttpClient(
      this.http["baseUrl"],
      { ...this.http["headers"], Authorization: `Bearer ${this.session.access_token}` },
    ).get<AuthUser>("/auth/v1/user")
  }

  async updateUser(req: UpdateUserRequest): Promise<PultResponse<AuthUser>> {
    if (!this.session) {
      return {
        data: null,
        error: { message: "No active session", code: "NO_SESSION", status: 0 },
      }
    }

    return new HttpClient(
      this.http["baseUrl"],
      { ...this.http["headers"], Authorization: `Bearer ${this.session.access_token}` },
    ).post<AuthUser>("/auth/v1/user", req)
  }

  async refreshSession(): Promise<PultResponse<AuthSession>> {
    if (!this.session?.refresh_token) {
      return {
        data: null,
        error: { message: "No refresh token", code: "NO_SESSION", status: 0 },
      }
    }

    const result = await this.http.post<AuthSession>("/auth/v1/token", {
      refresh_token: this.session.refresh_token,
      grant_type: "refresh_token",
    })

    if (result.data) {
      this.setSession(result.data)
    }

    return result
  }

  async resetPassword(email: string): Promise<PultResponse<StatusResponse>> {
    return this.http.post<StatusResponse>("/auth/v1/recover", { email })
  }

  getSession(): AuthSession | null {
    return this.session
  }

  onAuthStateChange(listener: AuthStateListener): { unsubscribe: () => void } {
    this.listeners.add(listener)
    return {
      unsubscribe: () => { this.listeners.delete(listener) },
    }
  }

  private setSession(session: AuthSession | null): void {
    this.session = session
    for (const listener of this.listeners) {
      listener(session)
    }
  }

  private authHeaders(): Record<string, string> | null {
    if (!this.session) return null
    return { Authorization: `Bearer ${this.session.access_token}` }
  }
}
