"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
// 難易度の種類と詳細を定数として定義します。
const difficulties = [
  { level: "初級", description: "5ピースのパズル。初心者用。", value: "easy" },
  { level: "中級", description: "20ピースのパズル。慣れたらココ。", value: "normal" },
  { level: "上級", description: "30ピースのパズル。ピースの形も変化。", value: "hard" },
  { level: "エクストラ", description: "50ピースのパズル。挑戦してみよう。", value: "extra" },
];

//難易度の型を定義します。これにより、型安全性が向上します。
type Difficulty = "easy" | "normal" | "hard" | "extra";

// DifficultySelection コンポーネントを定義します。
export default function DifficultySelection() {
  //選択された難易度を管理する state を作成します。
  //初期値は null で、何も選択されていない状態を表します。
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCreateTeam = async () => {
    if (!selectedDifficulty) return;

    setLoading(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const teamCreationResponse = await fetch(`${apiUrl}/v1/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          createdBy: sessionStorage.getItem("userId"),
          maxMembers: 4,
        }),
      });

      if (!teamCreationResponse.ok) {
        throw new Error(`APIエラー: ${teamCreationResponse.statusText}`);
      }

      const teamCreationData = await teamCreationResponse.json();

      if (!teamCreationData.success || !teamCreationData.data) {
        throw new Error(teamCreationData.message || "チームの作成に失敗しました");
      }

      const addMemberResponse = await fetch(`${apiUrl}/v1/teams/${teamCreationData.data.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: sessionStorage.getItem("userId"),
        }),
      });

      if (!addMemberResponse.ok) {
        throw new Error(`メンバー追加失敗: ${addMemberResponse.statusText}`);
      }

      const addMemberData = await addMemberResponse.json();

      if (!addMemberData.success || !addMemberData.data) {
        throw new Error(addMemberData.message || "チームへの参加に失敗しました");
      }

      router.push(
        `/team-waiting?teamId=${teamCreationData.data.id}&teamNumber=${teamCreationData.data.teamNumber}&difficulty=${selectedDifficulty}&memberId=${addMemberData.data.id}`,
      );
    } catch (err) {
      console.error("チーム作成エラー:", err);
      setError(err instanceof Error ? err.message : "チーム作成中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center bg-[#FFFFFF]"
      style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
    >
      {/* 戻るボタンのコンポーネントです。 */}
      <button
        className="flex absolute top-3 left-3 w-11 h-11 bg-[#2EAFB9] rounded-full justify-center items-center text-white font-bold shadow-[0_2px_4px_gray] active:shadow-none active:translate-y-1"
        //押された時に戻る
        onClick={() => router.push("/")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
          <path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z" />
        </svg>
      </button>

      {/* 画面のタイトルです。 */}
      <h1 className="my-8 text-4xl font-bold text-black">難易度を選択！</h1>

      {error && (
        <div className="mb-4 w-full max-w-sm rounded-lg border border-red-400 bg-red-100 p-4 text-center text-red-700">
          {error}
        </div>
      )}

      {/* 難易度ボタンのコンテナです。 */}
      <div className="flex w-full max-w-sm flex-col space-y-4 px-4">
        {/* difficulties 配列を map でループし、各難易度のボタンを動的に生成します。 */}
        {difficulties.map((difficulty) => (
          <button
            key={difficulty.value}
            //ボタンがクリックされたときに、state を更新します。
            onClick={() => setSelectedDifficulty(difficulty.value as Difficulty)}
            className={`w-full rounded-2xl border-2 border-[#32acb4] p-4 text-center shadow-[0_2px_4px_0px_rgba(0,0,0,0.25)]
              ${
                selectedDifficulty === difficulty.value
                  ? "bg-[#cdedef]" //選択時
                  : "bg-white" // 非選択時
              } 
            `}
          >
            <h2 className="text-2xl font-semibold text-black">{difficulty.level}</h2>
            <p className="mt-1 text-base text-black">{difficulty.description}</p>
          </button>
        ))}
      </div>

      {/* 「これでチームを作る！」ボタンです。 */}
      <button
        onClick={handleCreateTeam}
        disabled={!selectedDifficulty || loading}
        className={`mt-6 mb-3 w-2/3 max-w-sm rounded-2xl p-4 text-xl font-bold transition-all duration-150
          ${
            selectedDifficulty
              ? "text-[#4a2c00] bg-[#ffba39] border-2 border-[#8a5a00] shadow-[0_8px_12px_0px_rgba(245,177,42,0.5)] active:shadow-[0_2px_4px_#ffba39] active:translate-y-[5px]"
              : "text-gray-500 bg-gray-300 border-2 border-gray-400"
          }
        `}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
            チーム作成中...
          </div>
        ) : (
          "これでチームを作る！"
        )}
      </button>

      {/* 下部の波型デザインのコンポーネントです。 */}
      <svg
        className="mt-auto mt-10 w-full h-[73px]"
        fill="none"
        viewBox="0 0 393 73"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19.65 7.665C13.1 12.775 6.55 15.33 0 15.33L0 73H393V15.33C386.45 15.33 379.9 12.775 373.35 7.665C360.25 -2.555 347.15 -2.555 334.05 7.665C327.5 12.775 320.95 15.33 314.4 15.33C307.85 15.33 301.3 12.775 294.75 7.665C281.65 -2.555 268.55 -2.555 255.45 7.665C248.9 12.775 242.35 15.33 235.8 15.33C229.25 15.33 222.7 12.775 216.15 7.665C203.05 -2.555 189.95 -2.555 176.85 7.665C170.3 12.775 163.75 15.33 157.2 15.33C150.65 15.33 144.1 12.775 137.55 7.665C124.45 -2.555 111.35 -2.555 98.25 7.665C91.7 12.775 85.15 15.33 78.6 15.33C72.05 15.33 65.5 12.775 58.95 7.665C45.85 -2.555 32.75 -2.555 19.65 7.665Z"
          fill="url(#paint0_linear_12_62)"
        />
        <defs>
          <linearGradient id="paint0_linear_12_62" x1="196.5" y1="0" x2="196.5" y2="73" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2EAFB9" />
            <stop offset="1" stopColor="#27A2AA" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
