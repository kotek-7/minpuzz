"use client";

import type React from "react";
import { useGameActions, useGameState } from "@/features/Game/store";
import { getSocket } from "@/lib/socket/client";
import { GAME_EVENTS } from "@/features/Game/events";
import { getOrCreateUserId, getTeamId } from "@/lib/session/session";
import Puzzle from "@/features/Game/Puzzle";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Game() {
  const { hydrateFromInit, applyStateSync, markStarted, markPlaced, setScore, applyTimer, finish } = useGameActions();
  const game = useGameState();
  const teamId = getTeamId();
  const userId = getOrCreateUserId();
  const router = useRouter();

  useEffect(() => {
    const s = getSocket();
    const onInit = (p: any) => hydrateFromInit(p);
    const onSync = (p: any) => applyStateSync(p);
    const onStart = (_: any) => markStarted();
    const onPlaced = (p: any) => {
      if (!p || typeof p.pieceId !== "string") return;
      markPlaced(p.pieceId, p.row, p.col);
    };
    const onDenied = (p: any) => {
      const reason = p?.reason || "invalidCell";
      const msg =
        reason === "invalidCell"
          ? "その位置には置けません"
          : reason === "placed"
            ? "配置済みです"
            : "ピースが見つかりません";
      // 最小: alert。必要ならToasterへ差し替え
      try {
        window.alert(msg);
      } catch {}
    };
    const onProgress = (p: any) => {
      if (!p || !p.placedByTeam) return;
      setScore({ placedByTeam: p.placedByTeam });
    };
    const onTimer = (p: any) => {
      applyTimer(p);
    };
    const onEnd = (p: any) => {
      // 冪等: 既に終了なら無視
      if ((game as any).ended) return;
      finish({
        reason: p?.reason || "completed",
        winnerTeamId: p?.winnerTeamId ?? null,
        scores: p?.scores || {},
        finishedAt: p?.finishedAt || new Date().toISOString(),
      });
      router.push("/result");
    };
    s.on(GAME_EVENTS.GAME_INIT, onInit);
    s.on(GAME_EVENTS.STATE_SYNC, onSync);
    s.on(GAME_EVENTS.GAME_START, onStart);
    s.on(GAME_EVENTS.PIECE_PLACED, onPlaced);
    s.on(GAME_EVENTS.PIECE_PLACE_DENIED, onDenied);
    s.on(GAME_EVENTS.PROGRESS_UPDATE, onProgress);
    s.on(GAME_EVENTS.TIMER_SYNC, onTimer as any);
    s.on(GAME_EVENTS.GAME_END, onEnd as any);
    if (game.matchId && teamId && userId) {
      s.emit(GAME_EVENTS.JOIN_GAME, { matchId: game.matchId, teamId, userId });
    }
    return () => {
      s.off(GAME_EVENTS.GAME_INIT, onInit);
      s.off(GAME_EVENTS.STATE_SYNC, onSync);
      s.off(GAME_EVENTS.GAME_START, onStart);
      s.off(GAME_EVENTS.PIECE_PLACED, onPlaced);
      s.off(GAME_EVENTS.PIECE_PLACE_DENIED, onDenied);
      s.off(GAME_EVENTS.PROGRESS_UPDATE, onProgress);
      s.off(GAME_EVENTS.TIMER_SYNC, onTimer as any);
      s.off(GAME_EVENTS.GAME_END, onEnd as any);
    };
  }, [
    hydrateFromInit,
    applyStateSync,
    markStarted,
    markPlaced,
    setScore,
    applyTimer,
    finish,
    router,
    game.matchId,
    teamId,
    userId,
    (game as any).ended,
  ]);

  // 再同期: 画面復帰や明示操作でサーバから最新の state を取得
  useEffect(() => {
    const s = getSocket();
    let t: any = null;
    const req = () => {
      if (!game.matchId || !teamId || !userId) return;
      s.emit(GAME_EVENTS.REQUEST_GAME_INIT as any, { matchId: game.matchId, teamId, userId });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(t);
        t = setTimeout(req, 500);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }
    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      if (t) clearTimeout(t);
    };
  }, [game.matchId, teamId, userId]);

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
