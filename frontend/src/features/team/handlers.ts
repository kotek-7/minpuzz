"use client";

import { getSocket } from "@/lib/socket/client";
import { SOCKET_EVENTS } from "./events";
import { useEffect } from "react";
import { useTeamStoreActions } from "./store";

type MountArgs = {
  teamId: string;
  userId: string;
};

export function useMountTeamHandlers({ teamId, userId }: MountArgs) {
  const { upsertMember, removeMember, setMemberCount } = useTeamStoreActions();

  useEffect(() => {
    const s = getSocket();

    const onJoined = (p: { teamId: string; userId: string; socketId: string; timestamp: string }) => {
      if (p.teamId !== teamId) return;
      upsertMember({ userId: p.userId, socketId: p.socketId, joinedAt: p.timestamp });
    };
    const onLeft = (p: { teamId: string; userId: string }) => {
      if (p.teamId !== teamId) return;
      removeMember(p.userId);
    };
    const onUpdated = (p: { teamId: string; memberCount: number }) => {
      if (p.teamId !== teamId) return;
      setMemberCount(p.memberCount);
    };

    s.on(SOCKET_EVENTS.MEMBER_JOINED, onJoined);
    s.on(SOCKET_EVENTS.MEMBER_LEFT, onLeft);
    s.on(SOCKET_EVENTS.TEAM_UPDATED, onUpdated);

    // 入室通知
    s.emit(SOCKET_EVENTS.JOIN_TEAM, { teamId, userId });

    return () => {
      s.emit(SOCKET_EVENTS.LEAVE_TEAM, { teamId, userId });
      s.off(SOCKET_EVENTS.MEMBER_JOINED, onJoined);
      s.off(SOCKET_EVENTS.MEMBER_LEFT, onLeft);
      s.off(SOCKET_EVENTS.TEAM_UPDATED, onUpdated);
    };
  }, [teamId, userId, upsertMember, removeMember, setMemberCount]);
}

