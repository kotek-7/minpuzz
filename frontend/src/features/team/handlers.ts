"use client";

import { getSocket } from "@/lib/socket/client";
import { SOCKET_EVENTS } from "./events";
import { useEffect } from "react";
import { useTeamStoreActions } from "./store";
import { listTeamMembers } from "@/lib/api/teams";

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

    // 既存メンバーの初期取得（サーバー側で返さないjoin通知を補う）
    listTeamMembers(teamId)
      .then((res) => {
        for (const m of res.members) {
          upsertMember({ userId: m.userId, socketId: m.socketId, joinedAt: m.joinedAt });
        }
        // 件数は team-updated が来れば上書きされる
        setMemberCount(res.members.length);
      })
      .catch(() => {
        // サイレント失敗（サーバ未実装でも致命でない）
      });

    // 入室通知
    s.emit(SOCKET_EVENTS.JOIN_TEAM, { teamId, userId });
    // 自分自身が server から member-joined を受けない場合に備えて、即時に自分を反映
    // socketId は取得可能なら付与
    upsertMember({ userId, socketId: (s as any).id, joinedAt: new Date().toISOString() });

    return () => {
      // 画面遷移では退室しない（マッチングや以降の通知に team ルームを使うため）
      s.off(SOCKET_EVENTS.MEMBER_JOINED, onJoined);
      s.off(SOCKET_EVENTS.MEMBER_LEFT, onLeft);
      s.off(SOCKET_EVENTS.TEAM_UPDATED, onUpdated);
    };
  }, [teamId, userId, upsertMember, removeMember, setMemberCount]);
}
