"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import GameUI, { GameUIProps } from "./components/GameUI";
import { useGameState, useGameActions } from "./store";
import { getOrCreateUserId, getTeamId } from "@/lib/session/session";
import { getSocket } from "@/lib/socket/client";

// timer-sync 受信payload（docs準拠）
type TimerSyncPayload = {
  nowIso?: string;
  startedAt?: string | null;
  durationMs?: number | null;
  remainingMs?: number;
};

// 統一化されたタイマー状態管理
class TimerManager {
  private serverRemainingMs: number | null = null;
  private serverSyncTime: number | null = null;
  private gameStartTime: number | null = null;
  private gameDuration: number | null = null;
  
  // サーバー同期情報を更新
  updateFromSync(remainingMs: number) {
    this.serverRemainingMs = remainingMs;
    this.serverSyncTime = Date.now();
  }
  
  // ゲーム開始情報を更新
  updateGameInfo(startedAt: string, durationMs: number) {
    this.gameStartTime = new Date(startedAt).getTime();
    this.gameDuration = durationMs;
  }
  
  // リセット
  reset() {
    this.serverRemainingMs = null;
    this.serverSyncTime = null;
    this.gameStartTime = null;
    this.gameDuration = null;
  }
  
  // 現在の残り時間を計算
  calculateRemainingMs(currentTime: number): number | null {
    // 優先度1: サーバー同期情報があれば使用（最も正確）
    if (this.serverRemainingMs !== null && this.serverSyncTime !== null) {
      const elapsedSinceSync = currentTime - this.serverSyncTime;
      const remaining = this.serverRemainingMs - elapsedSinceSync;
      return Math.max(0, remaining);
    }
    
    // 優先度2: ゲーム開始情報から計算（フォールバック）
    if (this.gameStartTime !== null && this.gameDuration !== null) {
      const elapsed = currentTime - this.gameStartTime;
      const remaining = this.gameDuration - elapsed;
      return Math.max(0, remaining);
    }
    
    // 情報なし
    return null;
  }
}

// ゲーム接続フェーズの実装（sequence-game-connection.mmd）
export default function Game() {
  const router = useRouter();
  const gameState = useGameState();
  const gameActions = useGameActions();
  
  // セッション管理から取得
  const userId = getOrCreateUserId();
  const teamId = getTeamId();
  const matchId = gameState.matchId; // GameStoreから取得（マッチング画面で設定済み）
  
  // ローカル状態
  const [selectedPieceId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [toasts, setToasts] = useState<Array<{id: string; message: string; type: 'error' | 'success' | 'info'}>>([]);
  
  // 統一タイマー管理
  const timerManager = useRef(new TimerManager()).current;
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  
  // Toast表示関数
  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  }, []);
  
  // 計算済みデータ - 簡素化されたタイマー計算
  const computedData = React.useMemo(() => {
    const pieceToDisplayIndexMap: Record<string, number> = {};
    const occupiedCells = new Set<string>();
    
    // _idToDisplayIndex からマッピング構築
    if (gameState._idToDisplayIndex) {
      Object.entries(gameState._idToDisplayIndex).forEach(([pieceId, displayIndex]) => {
        pieceToDisplayIndexMap[pieceId] = displayIndex;
      });
    }
    
    // 配置済みセル計算
    Object.values(gameState.pieces).forEach(piece => {
      if (piece.placed && piece.row !== undefined && piece.col !== undefined) {
        occupiedCells.add(`${piece.row}-${piece.col}`);
      }
    });
    
    // 残り時間計算 - 統一化されたロジック
    let remainingTimeMs: number | null = null;
    if (gameState.started && !gameState.ended) {
      remainingTimeMs = timerManager.calculateRemainingMs(currentTime);
    }
    
    // スコア計算
    const myScore = gameState.self?.teamId ? (gameState.score?.placedByTeam[gameState.self.teamId] || 0) : 0;
    const opponentScore = gameState.partner?.teamId ? (gameState.score?.placedByTeam[gameState.partner.teamId] || 0) : 0;
    
    return {
      pieceToDisplayIndexMap,
      occupiedCells,
      remainingTimeMs,
      myScore,
      opponentScore
    };
  }, [gameState, currentTime, timerManager]);

  // 単一のタイマーループ - 条件を簡素化
  useEffect(() => {
    if (!gameState.started || gameState.ended) {
      return; // タイマー停止
    }
    
    console.log('[Timer] Starting timer loop');
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 250);
    
    return () => {
      console.log('[Timer] Stopping timer loop');
      clearInterval(intervalId);
    };
  }, [gameState.started, gameState.ended]); // timerは除外
  
  // Socket接続とゲーム接続フェーズ（sequence-game-connection.mmd）
  useEffect(() => {
    if (!matchId || !teamId || !userId) {
      showToast('ゲーム接続に必要な情報が不足しています', 'error');
      router.push('/');
      return;
    }
    
    console.log('[Game] Starting game connection with:', { matchId, teamId, userId });
    
    const socket = getSocket();
    
    // Socket接続状態確認
    if (!socket.connected) {
      socket.connect();
    }
    
    // game-init イベントハンドラ
    const handleGameInit = (payload: {
      matchId?: string;
      board: { rows: number; cols: number };
      pieces: Array<{ id: string; placed?: boolean; row?: number; col?: number }>;
      startedAt?: string | null;
      durationMs?: number | null;
    }) => {
      console.log('[Game] Received game-init:', payload);
      gameActions.hydrateFromInit(payload);
      
      // タイマー管理初期化
      timerManager.reset();
      if (payload.startedAt && payload.durationMs) {
        timerManager.updateGameInfo(payload.startedAt, payload.durationMs);
      }
      
      setIsConnecting(false);
      showToast('ゲームに接続しました', 'success');
    };
    
    // state-sync イベントハンドラ
    const handleStateSync = (payload: {
      board: { rows: number; cols: number };
      pieces: Array<{ id: string; placed?: boolean; row?: number; col?: number }>;
      score: { placedByTeam: Record<string, number> };
      timer?: { startedAt: string; durationMs: number } | null;
      matchStatus?: string;
    }) => {
      console.log('[Game] Received state-sync:', payload);
      gameActions.applyStateSync(payload);
      
      // タイマー情報更新
      if (payload.timer) {
        timerManager.updateGameInfo(payload.timer.startedAt, payload.timer.durationMs);
      }
    };
    
    // game-start イベントハンドラ
    const handleGameStart = (payload: { matchId: string }) => {
      console.log('[Game] Received game-start:', payload);
      gameActions.markStarted();
      showToast('ゲーム開始！', 'success');
    };
    
    // timer-sync イベントハンドラ - 簡素化
    const handleTimerSync = (payload: TimerSyncPayload) => {
      console.log('[Game] Received timer-sync:', payload);
      
      // サーバー同期情報を保存
      if (typeof payload.remainingMs === 'number') {
        timerManager.updateFromSync(payload.remainingMs);
      }
      
      // ストア側にも通知（既存APIとの互換性）
      const normalized = typeof payload.remainingMs === 'number'
        ? { remainingMs: payload.remainingMs }
        : { startedAt: payload.startedAt ?? null, durationMs: payload.durationMs ?? null };
      gameActions.applyTimer(normalized);
    };
    
    // エラーハンドラ
    const handleGameError = (error: { message: string }) => {
      console.error('[Game] Game error:', error);
      showToast(`ゲームエラー: ${error.message}`, 'error');
    };
    
    // イベントリスナー登録
    socket.on('game-init', handleGameInit);
    socket.on('state-sync', handleStateSync);
    socket.on('game-start', handleGameStart);
    socket.on('timer-sync', handleTimerSync);
    socket.on('game-error', handleGameError);
    
    // join-game イベント送信（ゲームルームに接続登録）
    console.log('[Game] Emitting join-game:', { matchId, teamId, userId });
    socket.emit('join-game', { matchId, teamId, userId });
    
    // クリーンアップ
    return () => {
      socket.off('game-init', handleGameInit);
      socket.off('state-sync', handleStateSync);
      socket.off('game-start', handleGameStart);
      socket.off('timer-sync', handleTimerSync);
      socket.off('game-error', handleGameError);
      console.log('[Game] Socket event handlers cleaned up');
    };
  }, [matchId, teamId, userId, gameActions, router, showToast, timerManager]);
  
  // セッション情報
  const sessionInfo = React.useMemo(() => {
    if (!matchId || !teamId || !userId) return null;
    return { matchId, teamId, userId };
  }, [matchId, teamId, userId]);
  
  // UIステート
  const uiState = React.useMemo(() => ({
    selectedPieceId,
    isConnecting,
    toasts
  }), [selectedPieceId, isConnecting, toasts]);
  
  // GameUIProps
  const gameUIProps: GameUIProps = {
    gameState: {
      matchId: gameState.matchId || '',
      board: gameState.board,
      pieces: gameState.pieces,
      score: gameState.score,
      matchStatus: gameState.matchStatus,
      started: gameState.started,
      ended: gameState.ended || false,
      self: gameState.self,
      partner: gameState.partner
    },
    sessionInfo,
    uiState,
    computedData
  };
  
  return <GameUI {...gameUIProps} />;
}