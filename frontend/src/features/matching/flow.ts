import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';

export type MatchFoundPayload = {
  matchId: string;
  self: { teamId: string; memberCount: number };
  partner: { teamId: string; memberCount: number };
  timestamp: string;
};

export function mountMatchingHandlers(navigate: (path: string) => void) {
  const s = getSocket();
  const onNavigate = (_p: { teamId: string; timestamp?: string }) => {
    // 冪等: 既に /matching 上でも再遷移して問題なし
    navigate('/matching');
  };
  const onMatchFound = (p: MatchFoundPayload) => {
    try {
      sessionStorage.setItem('matchId', p.matchId);
      sessionStorage.setItem('matchSelfTeamId', p.self.teamId);
      sessionStorage.setItem('matchPartnerTeamId', p.partner.teamId);
    } catch {}
    navigate(`/game/${p.matchId}`);
  };
  s.on(SOCKET_EVENTS.NAVIGATE_TO_MATCHING, onNavigate);
  s.on(SOCKET_EVENTS.MATCH_FOUND, onMatchFound);
  return () => {
    s.off(SOCKET_EVENTS.NAVIGATE_TO_MATCHING, onNavigate);
    s.off(SOCKET_EVENTS.MATCH_FOUND, onMatchFound);
  };
}

