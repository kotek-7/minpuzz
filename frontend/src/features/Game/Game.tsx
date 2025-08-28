"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import GameUI, { GameUIProps } from "./components/GameUI";
import { useGameState, useGameActions } from "./store";
import { getOrCreateUserId, getTeamId } from "@/lib/session/session";
import { getSocket } from "@/lib/socket/client";

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
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [toasts, setToasts] = useState<Array<{id: string; message: string; type: 'error' | 'success' | 'info'}>>([]);
  
  // Toast表示関数
  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  }, []);
  
  // 計算済みデータ
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
    
    // 残り時間計算
    let remainingTimeMs: number | null = null;
    if (gameState.timer && gameState.started) {
      const now = Date.now();
      const startedTime = new Date(gameState.timer.startedAt).getTime();
      const elapsed = now - startedTime;
      remainingTimeMs = Math.max(0, gameState.timer.durationMs - elapsed);
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
  }, [gameState]);
  
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
    
    // game-init イベントハンドラ（game-init後に即座にstate-syncも受信）
    const handleGameInit = (payload: {
      matchId?: string;
      board: { rows: number; cols: number };
      pieces: Array<{ id: string; placed?: boolean; row?: number; col?: number }>;
      startedAt?: string | null;
      durationMs?: number | null;
    }) => {
      console.log('[Game] Received game-init:', payload);
      gameActions.hydrateFromInit(payload);
      // 初期化完了後、接続中状態を解除
      setIsConnecting(false);
      showToast('ゲームに接続しました', 'success');
    };
    
    // state-sync イベントハンドラ（最新全量の状態同期）
    const handleStateSync = (payload: {
      board: { rows: number; cols: number };
      pieces: Array<{ id: string; placed?: boolean; row?: number; col?: number }>;
      score: { placedByTeam: Record<string, number> };
      timer?: { startedAt: string; durationMs: number } | null;
      matchStatus?: string;
    }) => {
      console.log('[Game] Received state-sync:', payload);
      gameActions.applyStateSync(payload);
    };
    
    // game-start イベントハンドラ（全プレイヤー接続完了後）
    const handleGameStart = (payload: { matchId: string }) => {
      console.log('[Game] Received game-start:', payload);
      gameActions.markStarted();
      showToast('ゲーム開始！', 'success');
    };
    
    // timer-sync イベントハンドラ（5秒周期の時間同期）
    const handleTimerSync = (payload: { remainingMs: number } | { startedAt: string; durationMs: number }) => {
      console.log('[Game] Received timer-sync:', payload);
      gameActions.applyTimer(payload);
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
  }, [matchId, teamId, userId, gameActions, router, showToast]);
  
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