import { isMockMode, request } from "./http";
import { z } from "zod";

export type Difficulty = "easy" | "normal" | "hard" | "extra";

export type CreateTeamInput = { nickname: string; difficulty: Difficulty };
export type CreateTeamResponse = { teamId: string; teamNumber: string };

export type ResolveTeamNumberResponse = { teamId: string; teamNumber: string };

export type AddTeamMemberInput = { teamId: string; userId: string; nickname: string };
export type AddTeamMemberResponse = { ok: true };

const CreateTeamRespSchema = z.object({ teamId: z.string().min(1), teamNumber: z.string().min(1) });
const ResolveRespSchema = CreateTeamRespSchema;
const AddMemberRespSchema = z.object({ ok: z.literal(true) });

// モック実装
function randomId(prefix: string) {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
}

async function createTeamMock(_: CreateTeamInput): Promise<CreateTeamResponse> {
  const teamId = randomId("team");
  const teamNumber = randomId("TN").toUpperCase();
  return { teamId, teamNumber };
}

async function resolveTeamNumberMock(teamNumber: string): Promise<ResolveTeamNumberResponse> {
  // ざっくり: 6文字以上を有効とみなす（開発時用）
  if (!teamNumber || teamNumber.length < 4) {
    throw new Error("チーム番号が見つかりません");
  }
  return { teamId: randomId("team"), teamNumber };
}

async function addTeamMemberMock(_: AddTeamMemberInput): Promise<AddTeamMemberResponse> {
  return { ok: true };
}

// 実API
export async function createTeam(input: CreateTeamInput): Promise<CreateTeamResponse> {
  if (isMockMode()) {
    return await createTeamMock(input);
  }
  const res = await request<CreateTeamResponse>(`/teams`, { method: "POST", body: input });
  return CreateTeamRespSchema.parse(res);
}

export async function resolveTeamNumber(teamNumber: string): Promise<ResolveTeamNumberResponse> {
  if (isMockMode()) {
    return await resolveTeamNumberMock(teamNumber);
  }
  const res = await request<ResolveTeamNumberResponse>(`/teams/${encodeURIComponent(teamNumber)}`, { method: "POST" });
  return ResolveRespSchema.parse(res);
}

export async function addTeamMember(input: AddTeamMemberInput): Promise<AddTeamMemberResponse> {
  if (isMockMode()) {
    return await addTeamMemberMock(input);
  }
  const res = await request<AddTeamMemberResponse>(`/teams/${encodeURIComponent(input.teamId)}/members`, {
    method: "POST",
    body: input,
  });
  return AddMemberRespSchema.parse(res);
}
