import { isMockMode, request } from "./http";
import { z } from "zod";

export type Difficulty = "easy" | "normal" | "hard" | "extra";

// Backend API 契約に準拠
// POST /v1/teams { createdBy, maxMembers? } -> { success, data: Team }
// POST /v1/teams/search { teamNumber } -> { success, data: Team|null }
// POST /v1/teams/:teamId/members { userId, socketId? } -> { success, data: TeamMember }

const TeamSchema = z.object({
  id: z.string().uuid(),
  teamNumber: z.string().length(6),
  currentMembers: z.number().int(),
  maxMembers: z.number().int(),
  status: z.enum(["WAITING","READY","MATCHING","PREPARING","IN_GAME","FINISHED"]),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const TeamMemberSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  role: z.enum(["LEADER","MEMBER"]),
  joinedAt: z.string(),
  status: z.enum(["ACTIVE","DISCONNECTED"]),
  socketId: z.string().optional(),
});

const Envelope = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type CreateTeamInput = { createdBy: string; maxMembers?: number };
export type CreateTeamOk = { teamId: string; teamNumber: string };

export type ResolveTeamNumberOk = { teamId: string; teamNumber: string };

export type AddTeamMemberInput = { teamId: string; userId: string; socketId?: string };
export type AddTeamMemberOk = { memberId: string };
export type TeamMemberPublic = z.infer<typeof TeamMemberSchema>;
export type ListTeamMembersOk = { members: TeamMemberPublic[] };

const CreateTeamEnvelope = Envelope(TeamSchema);
const ResolveTeamEnvelope = Envelope(TeamSchema.nullable());
const AddMemberEnvelope = Envelope(TeamMemberSchema);
const MembersEnvelope = Envelope(z.array(TeamMemberSchema));

// モック実装
function randomId(prefix: string) {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
}

async function createTeamMock(_: CreateTeamInput): Promise<CreateTeamOk> {
  const teamId = randomId("team");
  const teamNumber = randomId("TN").toUpperCase();
  return { teamId, teamNumber };
}

async function resolveTeamNumberMock(teamNumber: string): Promise<ResolveTeamNumberOk> {
  // ざっくり: 6文字以上を有効とみなす（開発時用）
  if (!teamNumber || teamNumber.length < 4) {
    throw new Error("チーム番号が見つかりません");
  }
  return { teamId: randomId("team"), teamNumber };
}

async function addTeamMemberMock(_: AddTeamMemberInput): Promise<AddTeamMemberOk> {
  return { memberId: randomId("mem") };
}

async function listTeamMembersMock(_: string): Promise<ListTeamMembersOk> {
  // ダミーで1〜3人生成
  const n = Math.floor(Math.random() * 3) + 1;
  const now = new Date().toISOString();
  const members: TeamMemberPublic[] = Array.from({ length: n }).map(() => ({
    id: randomId("member"),
    userId: randomId("user"),
    role: "MEMBER",
    joinedAt: now,
    status: "ACTIVE",
    socketId: undefined,
  }));
  return { members };
}

// 実API
export async function createTeam(input: CreateTeamInput): Promise<CreateTeamOk> {
  if (isMockMode()) {
    return await createTeamMock(input);
  }
  const env = await request<unknown>(`/teams`, { method: "POST", body: input });
  const parsed = CreateTeamEnvelope.parse(env);
  if (!parsed.success || !parsed.data) throw new Error(parsed.message || parsed.error || "Failed to create team");
  return { teamId: parsed.data.id, teamNumber: parsed.data.teamNumber };
}

export async function resolveTeamNumber(teamNumber: string): Promise<ResolveTeamNumberOk> {
  if (isMockMode()) {
    return await resolveTeamNumberMock(teamNumber);
  }
  // backendは POST /v1/teams/:search にマウントされているため、明示的に /search を利用
  const env = await request<unknown>(`/teams/search`, { method: "POST", body: { teamNumber } });
  const parsed = ResolveTeamEnvelope.parse(env);
  if (!parsed.success || !parsed.data) throw new Error(parsed.message || parsed.error || "チーム番号が見つかりません");
  return { teamId: parsed.data.id, teamNumber: parsed.data.teamNumber };
}

export async function addTeamMember(input: AddTeamMemberInput): Promise<AddTeamMemberOk> {
  if (isMockMode()) {
    return await addTeamMemberMock(input);
  }
  const env = await request<unknown>(`/teams/${encodeURIComponent(input.teamId)}/members`, {
    method: "POST",
    body: { userId: input.userId, socketId: input.socketId },
  });
  const parsed = AddMemberEnvelope.parse(env);
  if (!parsed.success || !parsed.data) throw new Error(parsed.message || parsed.error || "参加に失敗しました");
  return { memberId: parsed.data.id };
}

export async function listTeamMembers(teamId: string): Promise<ListTeamMembersOk> {
  if (isMockMode()) {
    return await listTeamMembersMock(teamId);
  }
  const env = await request<unknown>(`/teams/${encodeURIComponent(teamId)}/members`, { method: "GET" });
  const parsed = MembersEnvelope.parse(env);
  if (!parsed.success || !parsed.data) throw new Error(parsed.message || parsed.error || "メンバー取得に失敗しました");
  return { members: parsed.data };
}
