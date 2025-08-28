"use client";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setNickname, getNickname } from "@/lib/session/session";
import { Logo } from "./Logo";


export const Top = () => {
  const router = useRouter();
  const [nickname, setNick] = useState(getNickname() || "");

  return (
    <div className="h-screen w-full mx-auto p-[80px_10px_10px] bg-gradient-to-b from-[#00ffff] to-[#007f9e]" style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
      <div className="bg-[#e0f8fb] p-2.5 min-h-[650px] text-center">
        <div className="flex justify-center">
          <Logo style={{ width: "340px", height: "auto", marginTop: "70px" }} />
        </div>
        <p className="text-[18px] mt-5 mb-5 text-black text-center">
          力を合わせてパズルを完成させよう!
        </p>

        <div className="flex items-center gap-x-2 max-w-[300px] mx-auto my-[30px]">
          <label htmlFor="nickname" className="font-bold text-[20px] min-w-[60px]">
            名前 :
          </label>
          <input
            type="text"
            id="nickname"
            placeholder="ニックネームを入力"
            value={nickname}
            onChange={(e) => setNick(e.target.value)}
            className="w-full p-[10px] text-[15px] rounded-[8px] border-2 border-[#007f9e]"
          />
        </div>


        <div className="flex justify-center gap-[20px]">
          <button
            onClick={() => {
              if (!nickname.trim()) return alert("名前を入力してください");
              setNickname(nickname.trim());
              router.push("/difficulty-selection");
            }}
            className="flex flex-col items-center min-w-[150px] p-[10px] text-[15px] font-bold rounded-[12px] text-[#4a2c00] bg-[#ffba39] border-2 border-[#8a5a00] shadow-[0_4px_8px_#ffba39] active:shadow-[0_2px_4px_#ffba39] active:translate-y-[5px]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="70px"
              viewBox="0 -960 960 960"
              width="70px"
              fill="rgb(74, 44, 0)"
            >
              <path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-455-80h311q-10-20-55.5-35T480-370q-55 0-100.5 15T325-320ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm1 240Zm-1-280Z" />
            </svg>
            <span>チームを作る</span>
          </button>

          <button
            onClick={() => {
              if (!nickname.trim()) return alert("名前を入力してください");
              setNickname(nickname.trim());
              router.push("/team-number-input");
            }}
            className="flex flex-col items-center min-w-[150px] p-[10px] text-[15px] font-bold rounded-[12px] text-[#4a2c00] bg-[#ffba39] border-2 border-[#8a5a00] shadow-[0_4px_8px_#ffba39] active:shadow-[0_2px_4px_#ffba39] active:translate-y-[5px]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="70px"
              viewBox="0 -960 960 960"
              width="70px"
              fill="rgb(74, 44, 0)"
            >
              <path d="M360-80v-529q-91-24-145.5-100.5T160-880h80q0 83 53.5 141.5T430-680h100q30 0 56 11t47 32l181 181-56 56-158-158v478h-80v-240h-80v240h-80Zm120-640q-33 0-56.5-23.5T400-800q0-33 23.5-56.5T480-880q33 0 56.5 23.5T560-800q0 33-23.5 56.5T480-720Z" />
            </svg>
            <span>チームに参加</span>
          </button>
        </div>
      </div>
    </div>
  );
};
