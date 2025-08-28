"use client";

import React from "react";

interface GameTimerProps {
  remainingTimeMs: number | null;
  isStarted: boolean;
  matchStatus: "PREPARING" | "READY" | "IN_GAME" | "COMPLETED" | "UNKNOWN";
}

export default function GameTimer({ remainingTimeMs, isStarted, matchStatus }: GameTimerProps) {
  // 時間をフォーマット（分:秒）
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 時間切れ警告の判定（残り30秒以下）
  const isTimeRunningOut = remainingTimeMs !== null && remainingTimeMs < 30000;
  
  // 時間切れ直前（残り10秒以下）
  const isCritical = remainingTimeMs !== null && remainingTimeMs < 10000;

  // ゲーム状態による表示の決定
  if (!isStarted) {
    return (
      <div className="text-center p-4 bg-gray-100 rounded-lg border">
        <div className="text-4xl mb-2">⏳</div>
        <div className="text-lg font-semibold text-gray-600">
          {matchStatus === "PREPARING" && "準備中"}
          {matchStatus === "READY" && "開始待ち"}
          {matchStatus === "UNKNOWN" && "接続中"}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          ゲーム開始をお待ちください
        </div>
      </div>
    );
  }

  // ゲーム終了
  if (matchStatus === "COMPLETED") {
    return (
      <div className="text-center p-4 bg-gray-800 rounded-lg border">
        <div className="text-4xl mb-2">🏁</div>
        <div className="text-lg font-semibold text-white">
          ゲーム終了
        </div>
        <div className="text-sm text-gray-300 mt-1">
          お疲れさまでした
        </div>
      </div>
    );
  }

  // 時間情報がない場合
  if (remainingTimeMs === null) {
    return (
      <div className="text-center p-4 bg-yellow-100 rounded-lg border border-yellow-300">
        <div className="text-4xl mb-2">⏱️</div>
        <div className="text-lg font-semibold text-yellow-700">
          時間取得中
        </div>
        <div className="text-sm text-yellow-600 mt-1">
          サーバーと同期中...
        </div>
      </div>
    );
  }

  // メインタイマー表示
  return (
    <div className={`text-center p-6 rounded-lg border-2 transition-all duration-300 ${
      isCritical 
        ? "bg-red-100 border-red-500 animate-pulse" 
        : isTimeRunningOut 
          ? "bg-orange-100 border-orange-400" 
          : "bg-blue-50 border-blue-300"
    }`}>
      {/* タイマーアイコン */}
      <div className={`text-6xl mb-3 ${
        isCritical ? "animate-bounce" : ""
      }`}>
        {isCritical ? "🚨" : isTimeRunningOut ? "⚠️" : "⏰"}
      </div>
      
      {/* 残り時間表示 */}
      <div className={`text-5xl font-bold mb-2 font-mono tracking-wider ${
        isCritical 
          ? "text-red-600" 
          : isTimeRunningOut 
            ? "text-orange-600" 
            : "text-blue-600"
      }`}>
        {formatTime(remainingTimeMs)}
      </div>
      
      {/* 状態表示 */}
      <div className={`text-sm font-semibold ${
        isCritical 
          ? "text-red-700" 
          : isTimeRunningOut 
            ? "text-orange-700" 
            : "text-blue-700"
      }`}>
        {isCritical && "🔥 ラストスパート！"}
        {!isCritical && isTimeRunningOut && "⚡ 残りわずか"}
        {!isTimeRunningOut && "⏳ 残り時間"}
      </div>
      
      {/* プログレスバー */}
      {remainingTimeMs > 0 && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-1000 ${
                isCritical 
                  ? "bg-red-500" 
                  : isTimeRunningOut 
                    ? "bg-orange-500" 
                    : "bg-blue-500"
              }`}
              style={{ 
                width: `${Math.max(0, Math.min(100, (remainingTimeMs / 120000) * 100))}%` 
              }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            進行状況: {Math.round((remainingTimeMs / 120000) * 100)}%
          </div>
        </div>
      )}
      
      {/* 時間切れ表示 */}
      {remainingTimeMs <= 0 && (
        <div className="mt-2 text-red-600 font-bold animate-pulse">
          ⏰ TIME UP!
        </div>
      )}
    </div>
  );
}