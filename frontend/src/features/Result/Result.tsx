"use client";

import React, { useState } from "react";

export default function Result() {
  const membersUs = ["player1", "player2", "player3", "player8"];
  const membersEn = ["player4", "player5", "player6", "player7"];

  const [showUsImage, setShowUsImage] = useState(true);
  const [showEnImage, setShowEnImage] = useState(true);


  return (
    <div
      className="flex flex-col justify-start items-center min-h-screen bg-gradient-to-b from-[#00ffff] to-[#007f9e] px-5"
      style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
    >

      <h2 className="text-[50px] font-extrabold text-center mb-4 mt-4 tracking-wide">
        <span className="bg-black bg-clip-text text-transparent">
          結果発表！
        </span>
      </h2>
      <div className="grid grid-cols-1 grid-rows-2 gap-6 w-full max-w-4xl min-h-[400px]">
        <div className="row-start-1 col-start-1">
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-row justify-between items-center">
            {/* 左：チーム情報（そのまま） */}
            <div className="flex-1 max-w-75 bg-gradient-to-br from-white to-[#c2e9f7] border border-[#00bcd4] rounded-lg p-4">
              <p className="font-bold text-[#007f9e] mb-2 text-lg">あなたのチーム</p>
              {showUsImage ? (
                <div className="flex justify-center items-center h-[176px] bg-gray-100 rounded-lg text-gray-500 font-bold">
                  絵の表示（仮）
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {membersUs.map((name, i) => (
                    <div
                      key={`us-${i}`}
                      className="flex items-center justify-center h-8 rounded-lg font-bold bg-white border border-[#00bcd4] text-sm"
                    >
                      {name}：5ピース
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center items-center text-center w-[150px] h-full shrink-0">
              <p className="text-[50px] font-extrabold text-blue-500 leading-none">負け</p>
              <p className="text-gray-700 mt-2 text-md">完成ピース：20/40</p>
            </div>
          </div>
        </div>

        <div className="row-start-2 col-start-1">
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-row justify-between items-center gap-4">
            {/* 左：チーム情報 */}
            <div className="flex-1 max-w-75 bg-gradient-to-br from-white to-[#ffe3e3] border border-[#ff4c4c] rounded-lg p-4">
              <p className="font-bold text-[#ff4c4c] mb-2 text-lg">相手のチーム</p>
              {showEnImage ? (
                <div className="flex justify-center items-center h-[176px] bg-gray-100 rounded-lg text-gray-500 font-bold">
                  絵の表示（仮）
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {membersEn.map((name, i) => (
                    <div
                      key={`en-${i}`}
                      className="flex items-center justify-center h-8 rounded-lg font-bold bg-white border border-[#ff4c4c] text-sm"
                    >
                      {name}：5ピース
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center items-center text-center w-[150px] h-full shrink-0">
              <p className="text-[50px] font-extrabold text-red-500 leading-none">勝ち</p>
              <p className="text-gray-700 mt-2 text-md">完成ピース：20/40</p>
            </div>
          </div>
        </div>

      </div>
      <div className="relative">
        <button onClick={() => setShowEnImage((prev) => !prev)} className="absolute bottom-[16px] left-[65px] px-2 py-3 bg-[#ffe3e3] rounded-xl shadow-[0_4px_8px_#ffcccc] hover:brightness-95 active:shadow-[0_2px_4px_#ffcccc] active:translate-y-1 border-1 border-[#ff4c4c] text-sm font-bold whitespace-nowrap transition-all duration-150">
          {showEnImage ? "結果を表示する" : "絵を見る"}
        </button>
      </div>
      <div className="relative">
        <button onClick={() => setShowUsImage((prev) => !prev)} className="absolute bottom-[318px] left-[65px] px-2 py-3 bg-[#c2e9f7] rounded-xl shadow-[0_6px_12px_#a0d8ef] hover:brightness-95 active:shadow-[0_2px_4px_#a0d8ef] active:translate-y-1 border-1 border-[#00bcd4] text-sm font-bold whitespace-nowrap transition-all duration-150">
          {showUsImage ? "結果を表示する" : "絵を見る"}
        </button>
      </div>


      <button className="fixed bottom-2 right-3 px-4 py-2 mt-10 mb-3 bg-[#ffba39] rounded-xl shadow-[0_2px_4px_#ffba39] active:shadow-[0_2px_4px_#ffba39] active:translate-y-1 border-1 border-[#8a5a00]">
        ホームに戻る
      </button>
    </div>
  );
}
