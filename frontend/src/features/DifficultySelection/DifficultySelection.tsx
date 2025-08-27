"use client";

import React, { useState } from "react";
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#FFFFFF]"  style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
      {/* 戻るボタンのコンポーネントです。 */}
      <button className="self-start m-4 w-12 h-12 rounded-full bg-[#44C7D0] text-white flex items-center justify-center"
      style={{ boxShadow: '0px 2px 4px 0px rgba(0, 0, 0, 0.25)' }}
      //押された時に戻る
      onClick={() => router.push('/')}
      >
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
      <path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z"/>
      </svg>
      </button>

      {/* 画面のタイトルです。 */}
      <h1 className="my-8 text-4xl font-bold text-black">難易度を選択！</h1>

      {/* 難易度ボタンのコンテナです。 */}
      <div className="flex w-full max-w-sm flex-col space-y-4 px-4">
        {/* difficulties 配列を map でループし、各難易度のボタンを動的に生成します。 */}
        {difficulties.map((difficulty) => (
          <button
            key={difficulty.value}
            //ボタンがクリックされたときに、state を更新します。
            onClick={() => setSelectedDifficulty(difficulty.value as Difficulty)}
            className={`
              w-full rounded-2xl p-4 text-center border-2 border-[#32acb4] 
              ${selectedDifficulty === difficulty.value
                ? "bg-[#cdedef]" //選択時
                : "bg-white"} // 非選択時
            `}
           style={{boxShadow:'0px 2px 4px 0px rgba(0, 0, 0, 0.25)'}}  
          >
            <h2 className="text-2xl font-semibold text-black">{difficulty.level}</h2>
            <p className="mt-1 text-base text-black">{difficulty.description}</p>
          </button>
        ))}
      </div>

      {/* 「これでチームを作る！」ボタンです。 */}
      <button
        className={`
          mt-6 mb-3 w-2/3 max-w-sm rounded-2xl p-4 text-xl text-black border-2 border-[#9C7931]
          ${selectedDifficulty
            ? "bg-[#f5b12a]" //選択時
            :"bg-gray-400"} //非選択時
        `}
          style={{boxShadow: selectedDifficulty 
            ? '0px 8px 12px 0px rgba(245, 177, 42, 0.5)' // 選択時の影
            : '0px 2px 4px 0px rgba(0, 0, 0, 0.25)' // 非選択時の影
  }}
        //難易度が選択されるまでボタンを無効化します。
        disabled={!selectedDifficulty}
        //チーム作成ボタンが押された時
         onClick={() => {
          console.log(`チーム作成ボタンが押されました。選択された難易度は: ${selectedDifficulty}`);
         }}
      >
        これでチームを作る！
      </button>

      {/* 下部の波型デザインのコンポーネントです。 */}
      <svg  className="mt-auto mt-10 w-full h-[73px]" fill="none" viewBox="0 0 393 73" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.65 7.665C13.1 12.775 6.55 15.33 0 15.33L0 73H393V15.33C386.45 15.33 379.9 12.775 373.35 7.665C360.25 -2.555 347.15 -2.555 334.05 7.665C327.5 12.775 320.95 15.33 314.4 15.33C307.85 15.33 301.3 12.775 294.75 7.665C281.65 -2.555 268.55 -2.555 255.45 7.665C248.9 12.775 242.35 15.33 235.8 15.33C229.25 15.33 222.7 12.775 216.15 7.665C203.05 -2.555 189.95 -2.555 176.85 7.665C170.3 12.775 163.75 15.33 157.2 15.33C150.65 15.33 144.1 12.775 137.55 7.665C124.45 -2.555 111.35 -2.555 98.25 7.665C91.7 12.775 85.15 15.33 78.6 15.33C72.05 15.33 65.5 12.775 58.95 7.665C45.85 -2.555 32.75 -2.555 19.65 7.665Z" fill="url(#paint0_linear_12_62)"/>
      <defs>
      <linearGradient id="paint0_linear_12_62" x1="196.5" y1="0" x2="196.5" y2="73" gradientUnits="userSpaceOnUse">
      <stop stopColor="#2EAFB9"/>
      <stop offset="1" stopColor="#27A2AA"/>
      </linearGradient>
      </defs>
      </svg>
    </div>
  );
}
