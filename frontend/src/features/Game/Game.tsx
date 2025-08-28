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

  constructor() {
    console.log('[TimerManager] Instantiated');
  }

  // サーバー同期情報を更新
  updateFromSync(remainingMs: number) {
    console.log(`[TimerManager] updateFromSync called with remainingMs: ${remainingMs}`);
    this.serverRemainingMs = remainingMs;
    this.serverSyncTime = Date.now();
    this.logState('after updateFromSync');
  }

  // ゲーム開始情報を更新
  updateGameInfo(startedAt: string, durationMs: number) {
    console.log(`[TimerManager] updateGameInfo called with startedAt: ${startedAt}, durationMs: ${durationMs}`);
    this.gameStartTime = new Date(startedAt).getTime();
    this.gameDuration = durationMs;
    this.logState('after updateGameInfo');
  }

  // リセット
  reset() {
    console.log('[TimerManager] reset called');
    this.serverRemainingMs = null;
    this.serverSyncTime = null;
    this.gameStartTime = null;
    this.gameDuration = null;
    this.logState('after reset');
  }

  logState(context: string) {
    console.log(`[TimerManager] State ${context}:`, {
      serverRemainingMs: this.serverRemainingMs,
      serverSyncTime: this.serverSyncTime,
      gameStartTime: this.gameStartTime,
      gameDuration: this.gameDuration,
    });
  }

  // 現在の残り時間を計算
  calculateRemainingMs(currentTime: number): number | null {
    // 優先度1: サーバー同期情報があれば使用（最も正確）
    if (this.serverRemainingMs !== null && this.serverSyncTime !== null) {
      const elapsedSinceSync = currentTime - this.serverSyncTime;
      const remaining = this.serverRemainingMs - elapsedSinceSync;
      const result = Math.max(0, remaining);
      console.log(`[TimerManager] Calculated with sync info: ${result}ms remaining`);
      return result;
    }

    // 優先度2: ゲーム開始情報から計算（フォールバック）
    if (this.gameStartTime !== null && this.gameDuration !== null) {
      const elapsed = currentTime - this.gameStartTime;
      const remaining = this.gameDuration - elapsed;
      const result = Math.max(0, remaining);
      console.log(`[TimerManager] Calculated with game info: ${result}ms remaining`);
      return result;
    }

    // 情報なし
    console.log('[TimerManager] No timer info available, returning null');
    return null;
  }
}

// TimerManagerのインスタンスをシングルトンとしてコンポーネントの外で作成
const timerManager = new TimerManager();

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
  
  // 統一タイマー管理
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
    console.log('[computedData] Calculating remaining time...', { started: gameState.started, ended: gameState.ended, currentTime });
    let remainingTimeMs: number | null = null;
    if (gameState.started && !gameState.ended) {
      remainingTimeMs = timerManager.calculateRemainingMs(currentTime);
      console.log(`[computedData] Result: ${remainingTimeMs}`);
    } else {
      console.log('[computedData] Timer not active.');
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
  }, [gameState, currentTime]);

  // アクションハンドラー群
  const handlePieceSelect = useCallback((pieceId: string) => {
    if (selectedPieceId === pieceId) {
      // 既に選択済みのピースをクリック → 選択解除
      setSelectedPieceId(null);
      showToast('ピース選択を解除しました', 'info');
    } else {
      // 新しいピースを選択
      setSelectedPieceId(pieceId);
      const piece = gameState.pieces[pieceId];
      const displayIndex = computedData.pieceToDisplayIndexMap[pieceId] || '?';
      
      if (piece?.placed) {
        showToast(`ピース ${displayIndex} を選択しました（移動可能）`, 'info');
      } else {
        showToast(`ピース ${displayIndex} を選択しました（配置可能）`, 'info');
      }
    }
  }, [selectedPieceId, gameState.pieces, computedData.pieceToDisplayIndexMap, showToast]);

  const handleCellClick = useCallback(async (row: number, col: number) => {
    if (!selectedPieceId || !matchId || !teamId || !userId) {
      showToast('ピースを選択するか、セッション情報を確認してください', 'error');
      return;
    }

    const selectedPiece = gameState.pieces[selectedPieceId];
    if (!selectedPiece) {
      showToast('選択されたピースが見つかりません', 'error');
      return;
    }

    // 配置先セルの占有チェック
    const cellKey = `${row}-${col}`;
    if (computedData.occupiedCells.has(cellKey)) {
      showToast('その位置には既に他のピースが配置されています', 'error');
      return;
    }

    try {
      const socket = getSocket();
      
      if (selectedPiece.placed) {
        // 配置済みピースの移動
        console.log(`[Game] Moving piece ${selectedPieceId} from (${selectedPiece.row}, ${selectedPiece.col}) to (${row}, ${col})`);
        
        // piece-place イベントを送信（移動も配置として扱う）
        socket.emit('piece-place', {
          matchId,
          teamId,
          userId,
          pieceId: selectedPieceId,
          row,
          col
        });

        const displayIndex = computedData.pieceToDisplayIndexMap[selectedPieceId] || '?';
        showToast(`ピース ${displayIndex} を (${row + 1}, ${col + 1}) に移動中...`, 'info');
      } else {
        // 未配置ピースの配置
        console.log(`[Game] Placing piece ${selectedPieceId} at (${row}, ${col})`);
        
        socket.emit('piece-place', {
          matchId,
          teamId,
          userId,
          pieceId: selectedPieceId,
          row,
          col
        });

        const displayIndex = computedData.pieceToDisplayIndexMap[selectedPieceId] || '?';
        showToast(`ピース ${displayIndex} を (${row + 1}, ${col + 1}) に配置中...`, 'info');
      }

      // 配置/移動後は選択解除
      setSelectedPieceId(null);
      
    } catch (error) {
      console.error('[Game] Error in handleCellClick:', error);
      showToast('ピース配置中にエラーが発生しました', 'error');
    }
  }, [selectedPieceId, matchId, teamId, userId, gameState.pieces, computedData.occupiedCells, computedData.pieceToDisplayIndexMap, showToast]);

  const handlePlacedPieceClick = useCallback((pieceId: string) => {
    // 配置済みピースクリック = 選択処理（handlePieceSelectと同じ）
    handlePieceSelect(pieceId);
  }, [handlePieceSelect]);

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
      
      // game-start時点でのデフォルトタイマー設定（フォールバック）
      const gameStartTime = Date.now();
      const defaultDuration = 120000; // 2分
      timerManager.updateGameInfo(new Date(gameStartTime).toISOString(), defaultDuration);
      console.log('[Game] Set fallback timer on game-start:', gameStartTime, defaultDuration);

      // タイマー情報を更新した直後にUIを再計算させる
      setCurrentTime(gameStartTime);
      
      showToast('ゲーム開始！', 'success');
    };
    
    // timer-sync イベントハンドラ - 簡素化
    const handleTimerSync = (payload: TimerSyncPayload) => {
      console.log('[Game] Received timer-sync:', payload);
      
      // サーバー同期情報を保存（優先度1）
      if (typeof payload.remainingMs === 'number') {
        timerManager.updateFromSync(payload.remainingMs);
        console.log('[Game] Updated timer from sync:', payload.remainingMs);
      }
      
      // ゲーム開始情報も更新（フォールバック用）
      if (payload.startedAt && payload.durationMs) {
        timerManager.updateGameInfo(payload.startedAt, payload.durationMs);
        console.log('[Game] Updated timer game info:', payload.startedAt, payload.durationMs);
      }
      
      // ストア側にも通知（既存APIとの互換性）
      const normalized = typeof payload.remainingMs === 'number'
        ? { remainingMs: payload.remainingMs }
        : { startedAt: payload.startedAt ?? null, durationMs: payload.durationMs ?? null };
      gameActions.applyTimer(normalized);
    };
    
    // piece-placed イベントハンドラ（配置成功通知）
    const handlePiecePlaced = (payload: {
      pieceId: string;
      row: number;
      col: number;
      byUserId: string;
    }) => {
      console.log('[Game] Received piece-placed:', payload);
      
      // ローカル状態を即座に更新（楽観的更新）
      gameActions.markPlaced(payload.pieceId, payload.row, payload.col);
      
      // displayIndex をpieceId から推定（番号順と仮定）
      const displayIndex = payload.pieceId.split('-').pop() || '?';
      if (payload.byUserId === userId) {
        showToast(`ピース ${displayIndex} を配置しました！`, 'success');
      } else {
        showToast(`チームメンバーがピース ${displayIndex} を配置しました`, 'info');
      }
    };

    // piece-place-denied イベントハンドラ（配置拒否通知）
    const handlePiecePlaceDenied = (payload: {
      pieceId: string;
      reason: string;
    }) => {
      console.log('[Game] Received piece-place-denied:', payload);
      
      // displayIndex をpieceId から推定
      const displayIndex = payload.pieceId.split('-').pop() || '?';
      showToast(`ピース ${displayIndex} の配置が拒否されました: ${payload.reason}`, 'error');
      
      // 選択解除
      setSelectedPieceId(null);
    };

    // progress-update イベントハンドラ（スコア更新通知）
    const handleProgressUpdate = (payload: {
      placedByTeam: Record<string, number>;
    }) => {
      console.log('[Game] Received progress-update:', payload);
      gameActions.setScore({ placedByTeam: payload.placedByTeam });
    };

    // game-end イベントハンドラ（ゲーム終了通知）
    const handleGameEnd = (payload: {
      reason: string;
      winnerTeamId: string | null;
      scores: Record<string, number>;
      finishedAt: string;
    }) => {
      console.log('[Game] Received game-end:', payload);
      gameActions.finish(payload);
      
      const isWinner = payload.winnerTeamId === teamId;
      const isDraw = payload.winnerTeamId === null;
      
      if (isDraw) {
        showToast('引き分けです！', 'info');
      } else if (isWinner) {
        showToast('勝利しました！🎉', 'success');
      } else {
        showToast('敗北しました...', 'error');
      }
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
    socket.on('piece-placed', handlePiecePlaced);
    socket.on('piece-place-denied', handlePiecePlaceDenied);
    socket.on('progress-update', handleProgressUpdate);
    socket.on('game-end', handleGameEnd);
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
      socket.off('piece-placed', handlePiecePlaced);
      socket.off('piece-place-denied', handlePiecePlaceDenied);
      socket.off('progress-update', handleProgressUpdate);
      socket.off('game-end', handleGameEnd);
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
  
  // アクションオブジェクト
  const actions = React.useMemo(() => ({
    onPieceSelect: handlePieceSelect,
    onCellClick: handleCellClick,
    onPlacedPieceClick: handlePlacedPieceClick
  }), [handlePieceSelect, handleCellClick, handlePlacedPieceClick]);

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
    computedData,
    actions
  };
  
  return <GameUI {...gameUIProps} />;
}