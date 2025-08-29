"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { playSound } from "@/features/sound";
import { createTeam, addTeamMember, type Difficulty } from "@/lib/api/teams";
import { getNickname, getOrCreateUserId, setTeamId, setTeamNumber } from "@/lib/session/session";
// 難易度の種類と詳細を定数として定義します。
const difficulties = [
  { level: "初級", description: "5ピースのパズル。初心者用。", value: "easy", disabled: true },
  { level: "中級", description: "20ピースのパズル。慣れたらココ。", value: "normal", disabled: true },
  { level: "上級", description: "30ピースのパズル。ピースの形も変化。", value: "hard", disabled: false },
  { level: "エクストラ", description: "50ピースのパズル。挑戦してみよう。", value: "extra", disabled: true },
];

// 難易度型は API の型を利用

// DifficultySelection コンポーネントを定義します。
export default function DifficultySelection() {
  //選択された難易度を管理する state を作成します。
  //初期値は null で、何も選択されていない状態を表します。
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <div
      className="flex min-h-dvh flex-col items-center bg-white isolate"
      style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
    >
      {/* 戻るボタンのコンポーネントです。 */}
      <button
        className="flex absolute top-3 left-3 w-11 h-11 bg-[#2EAFB9] rounded-full justify-center items-center text-white font-bold shadow-[0_2px_4px_gray] active:shadow-none active:translate-y-1"
        style={{ boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.25)" }}
        onClick={() => {
          playSound("/sounds/select_back.mp3");
          router.push("/");
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
          <path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z" />
        </svg>
      </button>

      {/* 画面のタイトルです。 */}
      <h1 className="my-8 text-4xl font-bold text-black">難易度を選択！</h1>

      {/* 難易度ボタンのコンテナです。 */}
      <div className="flex w-full max-w-sm flex-col space-y-4 px-4">
        {/* お知らせエリア */}
        <div className="bg-yellow-50 border border-yellow-300 text-gray-700 text-sm rounded-lg p-3 text-center">
          💡 現在は <strong>上級</strong> のみ選択可能です。
        </div>

        {/* difficulties 配列を map でループし、各難易度のボタンを動的に生成します。 */}
        {difficulties.map((difficulty) => (
          <button
            key={difficulty.value}
            onClick={() => {
              if (difficulty.disabled) return;
              playSound("/sounds/select.mp3");
              setSelectedDifficulty(difficulty.value as Difficulty);
            }}
            disabled={difficulty.disabled || loading}
            className={`
              w-full rounded-2xl p-4 text-center border-2 group transition-all duration-150
              ${
                selectedDifficulty === difficulty.value
                  ? "border-[#32acb4] bg-[#cdedef]" // 選択時
                  : "border-[#32acb4] bg-white"    // 非選択時
              }
              disabled:bg-gray-200 disabled:border-gray-300 disabled:cursor-not-allowed
            `}
            style={{ boxShadow: "0px 2px 4px 0px rgba(0, 0, 0, 0.25)" }}
          >
            <h2 className="text-2xl font-semibold text-black group-disabled:text-gray-500">{difficulty.level}</h2>
            <p className="mt-1 text-base text-black group-disabled:text-gray-500">{difficulty.description}</p>
          </button>
        ))}
      </div>

      {/* 「これでチームを作る！」ボタンです。 */}
      <button
        className={`
          mt-6 mb-3 w-2/3 max-w-sm rounded-2xl p-4 text-xl font-bold transition-all duration-150
          ${
            selectedDifficulty
              ? "text-[#4a2c00] bg-[#ffba39] border-2 border-[#8a5a00] shadow-[0_8px_12px_0px_rgba(245,177,42,0.5)] active:shadow-[0_2px_4px_#ffba39] active:translate-y-[5px]"
              : "text-gray-500 bg-gray-300 border-2 border-gray-400"
          }   
        `}
        style={{
          boxShadow: selectedDifficulty
            ? "0px 8px 12px 0px rgba(245, 177, 42, 0.5)" // 選択時の影
            : "0px 2px 4px 0px rgba(0, 0, 0, 0.25)", // 非選択時の影
        }}
        //難易度が選択されるまでボタンを無効化します。
        disabled={!selectedDifficulty || loading}
        // チーム作成ボタン
        onClick={async () => {
          playSound("/sounds/select.mp3");
          if (!selectedDifficulty) return;
          const nickname = getNickname() || "";
          if (!nickname.trim()) {
            alert("トップで名前を入力してください");
            router.push("/");
            return;
          }


          try {
            setLoading(true);
            const userId = getOrCreateUserId();
            // 難易度は現状APIに影響しないため、maxMembers等に反映しない
            const res = await createTeam({ createdBy: userId });
            // 作成者自身もメンバーとして登録（他クライアントの初期フェッチで見えるように）
            try {
              await addTeamMember({ teamId: res.teamId, userId });
            } catch (e) {
              // 参加失敗は重大なので通知して中断
              throw e;
            }
            setTeamId(res.teamId);
            setTeamNumber(res.teamNumber);
            // userIdは初期化しておく（副作用なく）
            getOrCreateUserId();
            router.push("/team-waiting");
          } catch (e: any) {
            console.error(e);
            alert(e?.message || "チーム作成に失敗しました");
            setLoading(false);
          }
        }}
      >
        {loading ? "作成中..." : "これでチームを作る！"}
      </button>

      {/* 下部の波型デザインのコンポーネントです。 */}
      <svg
        className="fixed bottom-0 w-screen h-17 -z-1"
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
