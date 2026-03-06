import type { HttpClient } from "./http"
import type {
  AcceptInviteResponse,
  AddTeamMemberRequest,
  AddTeamMemberResponse,
  CreateTeamRequest,
  DeletedResponse,
  PultResponse,
  Team,
  TeamInvite,
  TeamMember,
  UpdateMemberRoleResponse,
  UpdateTeamRequest,
} from "./types"

export class TeamsClient {
  private http: HttpClient

  constructor(http: HttpClient) {
    this.http = http
  }

  async create(req: CreateTeamRequest): Promise<PultResponse<Team>> {
    return this.http.post<Team>("/teams", req)
  }

  async list(): Promise<PultResponse<Team[]>> {
    return this.http.get<Team[]>("/teams")
  }

  async update(teamId: string, req: UpdateTeamRequest): Promise<PultResponse<Team>> {
    return this.http.put<Team>(`/teams/${teamId}`, req)
  }

  async delete(teamId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/teams/${teamId}`)
  }

  async listMembers(teamId: string): Promise<PultResponse<TeamMember[]>> {
    return this.http.get<TeamMember[]>(`/teams/${teamId}/members`)
  }

  async addMember(teamId: string, req: AddTeamMemberRequest): Promise<PultResponse<AddTeamMemberResponse>> {
    return this.http.post<AddTeamMemberResponse>(`/teams/${teamId}/members`, req)
  }

  async removeMember(teamId: string, userId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/teams/${teamId}/members/${userId}`)
  }

  async updateMemberRole(teamId: string, userId: string, role: "admin" | "member"): Promise<PultResponse<UpdateMemberRoleResponse>> {
    return this.http.put<UpdateMemberRoleResponse>(`/teams/${teamId}/members/${userId}`, { role })
  }

  async listInvites(teamId: string): Promise<PultResponse<TeamInvite[]>> {
    return this.http.get<TeamInvite[]>(`/teams/${teamId}/invites`)
  }

  async deleteInvite(teamId: string, inviteId: string): Promise<PultResponse<DeletedResponse>> {
    return this.http.del<DeletedResponse>(`/teams/${teamId}/invites/${inviteId}`)
  }

  async acceptInvite(token: string): Promise<PultResponse<AcceptInviteResponse>> {
    return this.http.post<AcceptInviteResponse>(`/auth/invites/${token}/accept`)
  }
}
