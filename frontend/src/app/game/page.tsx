"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GamePage() {
  const [gameStatus, setGameStatus] = useState<"loading" | "playing" | "finished">("loading");
  const [timeLeft, setTimeLeft] = useState(600); // 10分 = 600秒
  const [completedPieces, setCompletedPieces] = useState(0);
  const [totalPieces, setTotalPieces] = useState(100);
  const router = useRouter();
  const searchParams = useSearchParams();

  const teamId = searchParams.get("teamId");
  const teamNumber = searchParams.get("teamNumber");
  const difficulty = searchParams.get("difficulty");

  // 難易度に基づく設定
  useEffect(() => {
    if (difficulty === "beginner") {
      setTotalPieces(30);
      setTimeLeft(600); // 10分
    } else if (difficulty === "intermediate") {
      setTotalPieces(100);
      setTimeLeft(1200); // 20分
    } else if (difficulty === "advanced") {
      setTotalPieces(300);
      setTimeLeft(1800); // 30分
    }
  }, [difficulty]);

  useEffect(() => {
    if (!teamId || !teamNumber) {
      router.push("/");
      return;
    }

    // ゲーム初期化
    const initTimer = setTimeout(() => {
      setGameStatus("playing");
    }, 2000);

    return () => clearTimeout(initTimer);
  }, [teamId, teamNumber, router]);

  // タイマーカウントダウン
  useEffect(() => {
    if (gameStatus !== "playing") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameStatus("finished");
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStatus]);

  // 自動進行デモ
  useEffect(() => {
    if (gameStatus !== "playing") return;

    const progressTimer = setInterval(() => {
      setCompletedPieces((prev) => {
        const next = prev + Math.floor(Math.random() * 3) + 1;
        if (next >= totalPieces) {
          setGameStatus("finished");
          clearInterval(progressTimer);
          return totalPieces;
        }
        return next;
      });
    }, 2000);

    return () => clearInterval(progressTimer);
  }, [gameStatus, totalPieces]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const progress = (completedPieces / totalPieces) * 100;

  if (gameStatus === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-100 to-white flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8 text-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-purple-500 rounded-full mx-auto mb-6"></div>
            <h1 className="text-3xl font-bold text-purple-900 mb-2">ゲーム準備中</h1>
            <p className="text-gray-600">まもなくゲームが始まります...</p>
          </div>
        </div>
      </div>
    );
  }

  if (gameStatus === "finished") {
    const isWin = completedPieces >= totalPieces;
    return (
      <div
        className={`min-h-screen bg-gradient-to-b ${isWin ? "from-green-100" : "from-gray-100"} to-white flex items-center justify-center`}
      >
        <div className="max-w-md w-full mx-auto p-8 text-center">
          <div className="mb-8">
            <div
              className={`w-16 h-16 ${isWin ? "bg-green-500" : "bg-gray-500"} rounded-full flex items-center justify-center mx-auto mb-6`}
            >
              {isWin ? (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <h1 className={`text-3xl font-bold ${isWin ? "text-green-900" : "text-gray-900"} mb-2`}>
              {isWin ? "🎉 ゲームクリア！" : "⏰ 時間切れ"}
            </h1>
            <p className="text-gray-600">{isWin ? "おめでとうございます！" : "残念でした..."}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">完成度:</span>
                <span className="font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">完成ピース:</span>
                <span className="font-semibold">
                  {completedPieces} / {totalPieces}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">難易度:</span>
                <span className="font-semibold">
                  {difficulty === "beginner" ? "初級" : difficulty === "intermediate" ? "中級" : "上級"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => router.push("/")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-white">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-indigo-900">みんパズ</h1>
            <span className="text-sm text-gray-600">チーム #{teamNumber}</span>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-sm text-gray-600">残り時間</div>
              <div className={`text-lg font-bold ${timeLeft < 60 ? "text-red-600" : "text-indigo-900"}`}>
                {formatTime(timeLeft)}
              </div>
            </div>

            <div className="text-center">
              <div className="text-sm text-gray-600">進捗</div>
              <div className="text-lg font-bold text-indigo-900">{Math.round(progress)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* ゲームエリア */}
      <div className="max-w-4xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* パズルエリア（メイン） */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">パズルエリア</h2>

              {/* パズルキャンバス（デモ用） */}
              <div className="relative bg-gray-100 rounded-lg mb-4" style={{ aspectRatio: "4/3", minHeight: "400px" }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-2">🧩</div>
                    <p className="text-gray-500">パズルゲーム画面</p>
                    <p className="text-sm text-gray-400 mt-2">実際のパズル実装はここに配置されます</p>
                  </div>
                </div>

                {/* 進捗オーバーレイ */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white bg-opacity-90 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>完成度</span>
                      <span>
                        {completedPieces} / {totalPieces} ピース
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* サイドパネル */}
          <div className="space-y-6">
            {/* チーム情報 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">チーム情報</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">チーム番号:</span>
                  <span className="font-semibold">{teamNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">難易度:</span>
                  <span className="font-semibold">
                    {difficulty === "beginner" ? "初級" : difficulty === "intermediate" ? "中級" : "上級"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">総ピース数:</span>
                  <span className="font-semibold">{totalPieces}</span>
                </div>
              </div>
            </div>

            {/* メンバー状況 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">メンバー状況</h3>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${index < 2 ? "bg-green-400" : "bg-gray-300"}`}></div>
                    <span className={`text-sm ${index < 2 ? "text-gray-800" : "text-gray-500"}`}>
                      プレイヤー {index + 1}
                    </span>
                    {index === 0 && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">リーダー</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
