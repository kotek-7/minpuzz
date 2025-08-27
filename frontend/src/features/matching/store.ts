type TeamInfo = { teamId: string; memberCount: number };

type MatchInfo = {
  matchId: string | null;
  self: TeamInfo | null;
  partner: TeamInfo | null;
};

const state: MatchInfo = { matchId: null, self: null, partner: null };

export const matchStore = {
  set(matchId: string, self: TeamInfo, partner: TeamInfo) {
    state.matchId = matchId;
    state.self = self;
    state.partner = partner;
  },
  get(): MatchInfo {
    return { ...state };
  },
  clear() {
    state.matchId = null;
    state.self = null;
    state.partner = null;
  },
};

