"use client";

import type React from "react";
import { useGameActions, useGameState } from "@/features/Game/store";
import { getSocket } from "@/lib/socket/client";
import { GAME_EVENTS } from "@/features/Game/events";
import { getOrCreateUserId, getTeamId } from "@/lib/session/session";
import Puzzle from "@/features/Game/Puzzle";
import { useEffect } from "react";

export default function Game() {
  const { hydrateFromInit, applyStateSync, markStarted } = useGameActions();
  const game = useGameState();
  const teamId = getTeamId();
  const userId = getOrCreateUserId();

  useEffect(() => {
    const s = getSocket();
    const onInit = (p: any) => hydrateFromInit(p);
    const onSync = (p: any) => applyStateSync(p);
    const onStart = (_: any) => markStarted();
    s.on(GAME_EVENTS.GAME_INIT, onInit);
    s.on(GAME_EVENTS.STATE_SYNC, onSync);
    s.on(GAME_EVENTS.GAME_START, onStart);
    if (game.matchId && teamId && userId) {
      s.emit(GAME_EVENTS.JOIN_GAME, { matchId: game.matchId, teamId, userId });
    }
    return () => {
      s.off(GAME_EVENTS.GAME_INIT, onInit);
      s.off(GAME_EVENTS.STATE_SYNC, onSync);
      s.off(GAME_EVENTS.GAME_START, onStart);
    };
  }, [hydrateFromInit, applyStateSync, markStarted, game.matchId, teamId, userId]);

  return (
      <div>
        {/* 接続バナー */}
        <div className="mb-3 text-sm text-gray-600">
          <span className="mr-3">matchId: {game.matchId ?? "-"}</span>
          <span className="mr-3">status: {game.started ? "IN_GAME" : game.board ? "READY" : "CONNECTING"}</span>
        </div>
        <Puzzle />
      </div>
  );
}
