"use client";

import React from "react";
import PuzzleBoard from "./PuzzleBoard";
import PieceSelector from "./PieceSelector";
import GameStatus from "./GameStatus";
import OpponentProgress from "./OpponentProgress";
import GameTimer from "./GameTimer";

// Toast表示コンポーネント
const ToastContainer = ({ toasts }: { toasts: Array<{id: string; message: string; type: 'error' | 'success' | 'info'}> }) => {
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => {
        const colors = {
          error: 'bg-red-500 text-white',
          success: 'bg-green-500 text-white',
          info: 'bg-blue-500 text-white'
        };
        
        return (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-lg shadow-lg ${colors[toast.type]} animate-in slide-in-from-right duration-300`}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
};

export interface GameUIProps {
  // ゲーム状態
  gameState: {
    matchId: string;
    board: { rows: number; cols: number } | null;
    pieces: Record<string, { id: string; placed?: boolean; row?: number; col?: number }>;
    score: { placedByTeam: Record<string, number> } | null;
    matchStatus: "PREPARING" | "READY" | "IN_GAME" | "COMPLETED" | "UNKNOWN";
    started: boolean;
    ended: boolean;
    self?: { teamId: string; memberCount?: number } | null;
    partner?: { teamId: string; memberCount?: number } | null;
  };
  
  // セッション情報
  sessionInfo: {
    matchId: string;
    teamId: string;
    userId: string;
  } | null;
  
  // UI状態
  uiState: {
    selectedPieceId: string | null;
    isConnecting: boolean;
    toasts: Array<{id: string; message: string; type: 'error' | 'success' | 'info'}>;
  };
  
  // アクションハンドラー
  actions: {
    onPieceSelect: (pieceId: string) => void;
    onCellClick: (row: number, col: number) => void;
    onPlacedPieceClick: (pieceId: string) => void;
  };
  
  // 計算済みデータ
  computedData: {
    pieceToDisplayIndexMap: Record<string, number>;
    occupiedCells: Set<string>;
    remainingTimeMs: number | null;
    myScore: number;
    opponentScore: number;
  };
}

export default function GameUI({ gameState, sessionInfo, uiState, computedData, actions }: GameUIProps) {
  
  // 必要なパラメータチェック
  if (!sessionInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-2">エラー</div>
          <div className="text-gray-600">
            ゲーム接続に必要な情報が不足しています。
            <br />
            マッチング画面からやり直してください。
          </div>
          <div className="mt-2 text-sm text-gray-500">
            sessionInfo: null
          </div>
        </div>
      </div>
    );
  }
  
  const { matchId, teamId, userId } = sessionInfo;
  
  // 接続中
  if (uiState.isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🧩</div>
          <div className="text-xl font-semibold text-gray-700">ゲームに接続中...</div>
          <div className="text-sm text-gray-500 mt-2">サーバーからデータを取得しています</div>
        </div>
        <ToastContainer toasts={uiState.toasts} />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">
              🧩 みんなでパズル
            </h1>
            
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 text-sm bg-gray-200 rounded-lg">
                🔄 再同期
              </div>
              
              <div className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg">
                🏠 ホーム
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 mt-2">
            Match: {matchId || 'N/A'} | Team: {teamId || 'N/A'} | User: {userId || 'N/A'}
          </div>
        </div>
        
        {/* メインゲーム領域 */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* 左カラム: タイマー */}
          <div className="xl:col-span-1">
            <GameTimer
              remainingTimeMs={computedData.remainingTimeMs}
              isStarted={gameState.started}
              matchStatus={gameState.matchStatus}
            />
          </div>
          
          {/* 中央左: ゲーム状態と相手進捗 */}
          <div className="xl:col-span-1 space-y-4">
            <GameStatus
              score={gameState.score}
              remainingTimeMs={computedData.remainingTimeMs}
              matchStatus={gameState.matchStatus}
              started={gameState.started}
              self={gameState.self}
              partner={gameState.partner}
            />
            
            <OpponentProgress
              opponentScore={computedData.opponentScore}
              partner={gameState.partner}
            />
          </div>
          
          {/* 中央: パズル盤面 */}
          <div className="xl:col-span-1 flex flex-col items-center">
            <PuzzleBoard
              board={gameState.board}
              pieces={gameState.pieces}
              selectedPieceId={uiState.selectedPieceId}
              pieceToDisplayIndexMap={computedData.pieceToDisplayIndexMap}
              occupiedCells={computedData.occupiedCells}
              onCellClick={actions.onCellClick}
              onPlacedPieceClick={actions.onPlacedPieceClick}
            />
          </div>
          
          {/* 右カラム: ピース選択 */}
          <div className="xl:col-span-1">
            <PieceSelector
              pieces={gameState.pieces}
              selectedPieceId={uiState.selectedPieceId}
              pieceToDisplayIndexMap={computedData.pieceToDisplayIndexMap}
              season="spring"
              onPieceSelect={actions.onPieceSelect}
            />
          </div>
        </div>
        
        {/* デバッグ情報 (開発用) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-800 text-white rounded-lg text-sm">
            <details>
              <summary className="cursor-pointer font-semibold mb-2">🐛 デバッグ情報</summary>
              <pre className="overflow-auto text-xs">
                {JSON.stringify({
                  matchId,
                  teamId,
                  userId,
                  selectedPieceId: uiState.selectedPieceId,
                  gameState: {
                    matchStatus: gameState.matchStatus,
                    started: gameState.started,
                    ended: gameState.ended,
                    piecesCount: Object.keys(gameState.pieces).length,
                    placedCount: Object.values(gameState.pieces).filter(p => p.placed).length
                  }
                }, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
      
      {/* Toast通知 */}
      <ToastContainer toasts={uiState.toasts} />
    </div>
  );
}