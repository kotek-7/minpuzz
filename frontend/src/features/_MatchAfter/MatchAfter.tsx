"use client";

import React from "react";

export const MatchAfter = () => {
  const membersUs = ["player1", "player2", "player3"];
  const membersEn = ["player4", "player5", "player6", "player7"];

  return (
    <div
      className="flex flex-col justify-center items-center min-h-screen bg-white px-5"
      style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
    >
      <button className="flex absolute top-3 left-3 w-11 h-11 bg-[#2EAFB9] rounded-full justify-center items-center text-white font-bold shadow-[0_2px_4px_gray] active:shadow-none active:translate-y-1">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z"/></svg>
      </button>
      <h2 className="text-[23px] text-black font-bold  mb-2 text-[#007f9e] text-center">マッチング完了！</h2>        

      <div className="w-full bg-white border-2 border-[#00bcd4] rounded-xl p-6 text-center shadow-xl">
        
      <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center mb-6">
        {/* 左側：membersUs */}
        <div className="bg-[#f9f9f9] border border-[#00bcd4] rounded-xl p-4 shadow-md">
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-[#007f9e]">メンバー（味方）</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 4 }).map((_, i) => {
              const isFilled = !!membersUs[i];
              return (
                <div
                  key={`us-${i}`}
                  className={`flex items-center justify-center h-11 rounded-lg font-bold ${
                    isFilled
                      ? "bg-[#fff7e6] border border-[#e0c090]"
                      : ""
                  }`}
                >
                  {membersUs[i] || ""}
                </div>
              );
            })}
          </div>
        </div>

        <div>VS</div>

        {/* 右側：membersEn */}
        <div className="bg-[#f9f9f9] border border-[#00bcd4] rounded-xl p-4 shadow-md">
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold text-[#007f9e]">メンバー（相手）</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 4 }).map((_, i) => {
              const isFilled = !!membersEn[i];
              return (
                <div
                  key={`en-${i}`}
                  className={`flex items-center justify-center h-11 rounded-lg font-bold ${
                    isFilled
                      ? "bg-[#fff7e6] border border-[#e0c090]"
                      : ""
                  }`}
                >
                  {membersEn[i] || ""}
                </div>
              );
            })}
          </div>
        </div>
      </div>
        

        
      </div>

      <svg viewBox="0 0 393 73" preserveAspectRatio="none" className="fixed bottom-0 w-screen h-17" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="paint0_linear_12_62" x1="196.5" y1="0" x2="196.5" y2="73" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2EAFB9" />              <stop offset="1" stopColor="#27A2AA" />
          </linearGradient>
        </defs>
        <path
          d="M19.65 7.665C13.1 12.775 6.55 15.33 0 15.33L0 73H393V15.33C386.45 15.33 379.9 12.775 373.35 7.665C360.25 -2.555 347.15 -2.555 334.05 7.665C327.5 12.775 320.95 15.33 314.4 15.33C307.85 15.33 301.3 12.775 294.75 7.665C281.65 -2.555 268.55 -2.555 255.45 7.665C248.9 12.775 242.35 15.33 235.8 15.33C229.25 15.33 222.7 12.775 216.15 7.665C203.05 -2.555 189.95 -2.555 176.85 7.665C170.3 12.775 163.75 15.33 157.2 15.33C150.65 15.33 144.1 12.775 137.55 7.665C124.45 -2.555 111.35 -2.555 98.25 7.665C91.7 12.775 85.15 15.33 78.6 15.33C72.05 15.33 65.5 12.775 58.95 7.665C45.85 -2.555 32.75 -2.555 19.65 7.665Z"
          fill="url(#paint0_linear_12_62)" 
         />
      </svg>
    </div>
  );
};