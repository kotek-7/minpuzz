"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MatchingPage() {
  const [matchingStatus, setMatchingStatus] = useState<"searching" | "found" | "failed">("searching");
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const teamId = searchParams.get("teamId");
  const teamNumber = searchParams.get("teamNumber");
  const difficulty = searchParams.get("difficulty");

  useEffect(() => {
    if (!teamId || !teamNumber) {
      router.push("/");
      return;
    }

    // マッチング処理のシミュレーション
    const matchingTimer = setTimeout(
      () => {
        // 70%の確率でマッチング成功
        const success = Math.random() > 0.3;

        if (success) {
          setMatchingStatus("found");

          // カウントダウン開始
          const countdownTimer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownTimer);
                // ゲーム画面に遷移
                router.push(`/game?teamId=${teamId}&teamNumber=${teamNumber}&difficulty=${difficulty}`);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setMatchingStatus("failed");
          setError("対戦相手が見つかりませんでした。もう一度お試しください。");
        }
      },
      3000 + Math.random() * 5000,
    ); // 3-8秒でマッチング結果

    return () => clearTimeout(matchingTimer);
  }, [teamId, teamNumber, difficulty, router]);

  const handleRetry = () => {
    setMatchingStatus("searching");
    setError("");
    setCountdown(3);

    // 再マッチング処理
    const retryTimer = setTimeout(
      () => {
        const success = Math.random() > 0.2; // 再試行時は成功率を上げる

        if (success) {
          setMatchingStatus("found");

          const countdownTimer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownTimer);
                router.push(`/game?teamId=${teamId}&teamNumber=${teamNumber}&difficulty=${difficulty}`);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setMatchingStatus("failed");
          setError("対戦相手が見つかりませんでした。しばらくしてからお試しください。");
        }
      },
      2000 + Math.random() * 3000,
    );

    return () => clearTimeout(retryTimer);
  };

  if (matchingStatus === "searching") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8 text-center">
          <div className="mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
            <h1 className="text-3xl font-bold text-blue-900 mb-2">マッチング中</h1>
            <p className="text-gray-600">対戦相手を探しています...</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">チーム番号:</span>
              <span className="font-bold text-blue-900">{teamNumber}</span>
            </div>
            {difficulty && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">難易度:</span>
                <span className="font-semibold">
                  {difficulty === "beginner" ? "初級" : difficulty === "intermediate" ? "中級" : "上級"}
                </span>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-500">
            <p>しばらくお待ちください</p>
            <p className="mt-1">最適な対戦相手を探しています</p>
          </div>

          <button
            onClick={() =>
              router.push(`/team-waiting?teamId=${teamId}&teamNumber=${teamNumber}&difficulty=${difficulty}`)
            }
            className="mt-6 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            待機室に戻る
          </button>
        </div>
      </div>
    );
  }

  if (matchingStatus === "found") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 to-white flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8 text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-green-900 mb-2">マッチング成功！</h1>
            <p className="text-gray-600">対戦相手が見つかりました</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">{countdown}</div>
              <p className="text-gray-600">秒後にゲーム開始</p>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p>まもなくゲームが始まります</p>
            <p className="mt-1">準備はいいですか？</p>
          </div>
        </div>
      </div>
    );
  }

  if (matchingStatus === "failed") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-100 to-white flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8 text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-red-900 mb-2">マッチング失敗</h1>
            <p className="text-gray-600 mb-4">{error}</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200"
            >
              再度マッチングする
            </button>

            <button
              onClick={() =>
                router.push(`/team-waiting?teamId=${teamId}&teamNumber=${teamNumber}&difficulty=${difficulty}`)
              }
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              待機室に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
