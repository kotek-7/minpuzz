"use client";

import React from "react";
import GameUI, { GameUIProps } from "./components/GameUI";

// TODO: 実際のロジックは別のLLMが実装する予定
// 現在はダミーデータで表示のみ

export default function Game() {
  // ダミーデータ - 実際のロジック実装時に置き換える
  const dummyProps: GameUIProps = {
    gameState: {
      matchId: "dummy-match-id",
      board: { rows: 5, cols: 5 },
      pieces: {},
      score: { placedByTeam: {} },
      matchStatus: "PREPARING",
      started: false,
      ended: false,
      self: { teamId: "dummy-team-1", memberCount: 3 },
      partner: { teamId: "dummy-team-2", memberCount: 4 },
    },
    sessionInfo: {
      matchId: "dummy-match-id",
      teamId: "dummy-team-1", 
      userId: "dummy-user-id"
    },
    uiState: {
      selectedPieceId: null,
      isConnecting: false, // 接続中画面を表示
      toasts: []
    },
    computedData: {
      pieceToDisplayIndexMap: {},
      occupiedCells: new Set(),
      remainingTimeMs: null,
      myScore: 0,
      opponentScore: 0
    }
  };

  return <GameUI {...dummyProps} />;
}