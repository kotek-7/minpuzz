"use client";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Difficulty = "beginner" | "intermediate" | "advanced";

interface DifficultyOption {
  id: Difficulty;
  name: string;
  description: string;
  pieceCount: string;
  timeLimit: string;
  color: string;
  hoverColor: string;
}

const difficultyOptions: DifficultyOption[] = [
  {
    id: "beginner",
    name: "初級",
    description: "パズル初心者にオススメ",
    pieceCount: "30ピース程度",
    timeLimit: "10分",
    color: "bg-green-500",
    hoverColor: "hover:bg-green-600",
  },
  {
    id: "intermediate",
    name: "中級",
    description: "適度な難しさを楽しみたい方に",
    pieceCount: "100ピース程度",
    timeLimit: "20分",
    color: "bg-yellow-500",
    hoverColor: "hover:bg-yellow-600",
  },
  {
    id: "advanced",
    name: "上級",
    description: "パズル上級者向けの高難易度",
    pieceCount: "300ピース程度",
    timeLimit: "30分",
    color: "bg-red-500",
    hoverColor: "hover:bg-red-600",
  },
];

// import React, { useState } from "react";
// import { useRouter } from 'next/navigation';
// // 難易度の種類と詳細を定数として定義します。
// const difficulties = [
//   { level: "初級", description: "5ピースのパズル。初心者用。", value: "easy" },
//   { level: "中級", description: "20ピースのパズル。慣れたらココ。", value: "normal" },
//   { level: "上級", description: "30ピースのパズル。ピースの形も変化。", value: "hard" },
//   { level: "エクストラ", description: "50ピースのパズル。挑戦してみよう。", value: "extra" },
// ];
//
// //難易度の型を定義します。これにより、型安全性が向上します。
// type Difficulty = "easy" | "normal" | "hard" | "extra";

// DifficultySelection コンポーネントを定義します。
export default function DifficultySelection() {
// <<<<<<< HEAD
//   //選択された難易度を管理する state を作成します。
//   //初期値は null で、何も選択されていない状態を表します。
//   const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
//   const router = useRouter();
//   return (
//     <div className="flex min-h-screen flex-col items-center bg-[#FFFFFF]"  style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
//       {/* 戻るボタンのコンポーネントです。 */}
//       <button className="self-start m-4 w-12 h-12 rounded-full bg-[#44C7D0] text-white flex items-center justify-center"
//       style={{ boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.25)' }}
//       //押された時に戻る
//       onClick={() => router.push('/')}
//       >
//       <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
//       <path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z"/>
//       </svg>
//       </button>
//
//       {/* 画面のタイトルです。 */}
//       <h1 className="my-8 text-4xl font-bold text-black">難易度を選択！</h1>
//
//       {/* 難易度ボタンのコンテナです。 */}
//       <div className="flex w-full max-w-sm flex-col space-y-4 px-4">
//         {/* difficulties 配列を map でループし、各難易度のボタンを動的に生成します。 */}
//         {difficulties.map((difficulty) => (
//           <button
//             key={difficulty.value}
//             //ボタンがクリックされたときに、state を更新します。
//             onClick={() => setSelectedDifficulty(difficulty.value as Difficulty)}
//             className={`
//               w-full rounded-2xl p-4 text-center border-2 border-[#32acb4] 
//               ${selectedDifficulty === difficulty.value
//                 ? "bg-[#cdedef]" //選択時
//                 : "bg-white"} // 非選択時
//             `}
//            style={{boxShadow:'0px 2px 4px 0px rgba(0, 0, 0, 0.25)'}}  
//           >
//             <h2 className="text-2xl font-semibold text-black">{difficulty.level}</h2>
//             <p className="mt-1 text-base text-black">{difficulty.description}</p>
//           </button>
//         ))}
//       </div>
//
//       {/* 「これでチームを作る！」ボタンです。 */}
//       <button
//         className={`
//           mt-6 mb-3 w-2/3 max-w-sm rounded-2xl p-4 text-xl text-black border-2 border-[#9C7931]
//           ${selectedDifficulty
//             ? "bg-[#f5b12a]" //選択時
//             :"bg-gray-400"} //非選択時
//         `}
//           style={{boxShadow: selectedDifficulty 
//             ? '0px 8px 12px 0px rgba(245, 177, 42, 0.5)' // 選択時の影
//             : '0px 2px 4px 0px rgba(0, 0, 0, 0.25)' // 非選択時の影
//   }}
//         //難易度が選択されるまでボタンを無効化します。
//         disabled={!selectedDifficulty}
//         //チーム作成ボタンが押された時
//          onClick={() => {
//           console.log(`チーム作成ボタンが押されました。選択された難易度は: ${selectedDifficulty}`);
//          }}
//       >
//         これでチームを作る！
//       </button>
//
//       {/* 下部の波型デザインのコンポーネントです。 */}
//       <svg  className="mt-auto mt-10 w-full h-[73px]" fill="none" viewBox="0 0 393 73" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
//       <path d="M19.65 7.665C13.1 12.775 6.55 15.33 0 15.33L0 73H393V15.33C386.45 15.33 379.9 12.775 373.35 7.665C360.25 -2.555 347.15 -2.555 334.05 7.665C327.5 12.775 320.95 15.33 314.4 15.33C307.85 15.33 301.3 12.775 294.75 7.665C281.65 -2.555 268.55 -2.555 255.45 7.665C248.9 12.775 242.35 15.33 235.8 15.33C229.25 15.33 222.7 12.775 216.15 7.665C203.05 -2.555 189.95 -2.555 176.85 7.665C170.3 12.775 163.75 15.33 157.2 15.33C150.65 15.33 144.1 12.775 137.55 7.665C124.45 -2.555 111.35 -2.555 98.25 7.665C91.7 12.775 85.15 15.33 78.6 15.33C72.05 15.33 65.5 12.775 58.95 7.665C45.85 -2.555 32.75 -2.555 19.65 7.665Z" fill="url(#paint0_linear_12_62)"/>
//       <defs>
//       <linearGradient id="paint0_linear_12_62" x1="196.5" y1="0" x2="196.5" y2="73" gradientUnits="userSpaceOnUse">
//       <stop stopColor="#2EAFB9"/>
//       <stop offset="1" stopColor="#27A2AA"/>
//       </linearGradient>
//       </defs>
//       </svg>
// =======
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleDifficultySelect = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
  };

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
        console.error("APIエラー:", teamCreationResponse.statusText);
      }

      const teamCreationData = await teamCreationResponse.json();

      if (!teamCreationData.success || !teamCreationData.data) {
        console.error("チーム作成失敗: \nerror:", teamCreationData.error, "\nmessage:", teamCreationData.message);
        throw new Error("チームの作成に失敗しました");
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
        console.error("メンバー追加失敗:", addMemberResponse.statusText);
        throw new Error("チームへの参加に失敗しました");
      }

      const addMemberData = await addMemberResponse.json();

      if (!addMemberData.success || !addMemberData.data) {
        console.error("メンバー追加失敗:", addMemberData.error);
        throw new Error("チームへの参加に失敗しました");
      }

      router.push(
        `/team-waiting?teamId=${teamCreationData.data.id}&teamNumber=${teamCreationData.data.teamNumber}&difficulty=${selectedDifficulty}&memberId=${addMemberData.data.id}`,
      );
    } catch (error) {
      console.error("チーム作成エラー:", error);
      setError(error instanceof Error ? error.message : "チーム作成中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-white flex items-center justify-center">
      <div className="max-w-2xl w-full mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">難易度を選択</h1>
          <p className="text-gray-600">チームで挑戦するパズルの難易度を選んでください</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>}

        <div className="grid gap-4 mb-8">
          {difficultyOptions.map((option) => (
            <div
              key={option.id}
              onClick={() => handleDifficultySelect(option.id)}
              className={`
                p-6 rounded-lg border-2 cursor-pointer transition-all duration-200
                ${
                  selectedDifficulty === option.id
                    ? "border-indigo-500 bg-indigo-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm"
                }
              `}
            >
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-4 ${option.color}`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-gray-800">{option.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{option.pieceCount}</span>
                      <span>制限時間: {option.timeLimit}</span>
                    </div>
                  </div>
                  <p className="text-gray-600">{option.description}</p>
                </div>
                <div className="ml-4">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedDifficulty === option.id ? "border-indigo-500 bg-indigo-500" : "border-gray-300"
                    }`}
                  >
                    {selectedDifficulty === option.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <button
            onClick={handleCreateTeam}
            disabled={!selectedDifficulty || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                チーム作成中...
              </div>
            ) : (
              "決定"
            )}
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  );
}
