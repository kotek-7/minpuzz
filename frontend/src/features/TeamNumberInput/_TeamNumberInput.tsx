"use client";

import { useState } from "react";
import React from "react";
import { useRouter } from "next/navigation";

export const TeamNumberInput = () => {
  const [joinNumber, setJoinNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleJoinTeam = async () => {
    if (!joinNumber) return;
    setLoading(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const userId = sessionStorage.getItem("userId");
      const nickname = sessionStorage.getItem("nickname");

      // Step 1: チーム番号でチームを検索
      const searchResponse = await fetch(`${apiUrl}/v1/teams/by-number/${joinNumber.trim()}`);

      if (searchResponse.status === 404) {
        setError("チーム番号が見つかりません。");
        return;
      }

      if (!searchResponse.ok) {
        throw new Error("チームの検索中にエラーが発生しました。");
      }

      const searchResult = await searchResponse.json();
      if (!searchResult.success || !searchResult.data) {
        setError(searchResult.message || "チームの検索に失敗しました。");
        return;
      }
      const team = searchResult.data;

      // Step 2: チームにメンバーとして追加
      const addMemberResponse = await fetch(`${apiUrl}/v1/teams/${team.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, nickname }),
      });

      const addMemberResult = await addMemberResponse.json();
      if (!addMemberResponse.ok || !addMemberResult.success) {
        const errorMessage =
          addMemberResult.message === "team is full" ? "このチームは満員です。" : "チームへの参加に失敗しました。";
        setError(errorMessage);
        return;
      }

      router.push(
        `/team-waiting?teamId=${team.id}&teamNumber=${team.teamNumber}&difficulty=${team.difficulty}&memberId=${addMemberResult.data.id}`,
      );
    } catch (err) {
      console.error("チーム参加エラー:", err);
      setError(err instanceof Error ? err.message : "予期せぬエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col justify-center items-center min-h-screen bg-white px-5"
      style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
    >
      <button
        className="flex absolute top-3 left-3 w-11 h-11 bg-[#2EAFB9] rounded-full justify-center items-center text-white font-bold shadow-[0_2px_4px_gray] active:shadow-none active:translate-y-1"
        //押された時に戻る
        onClick={() => router.push("/")}
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">
          <path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z" />
        </svg>
      </button>

      {error && (
        <div className="mb-4 w-full max-w-md rounded-lg border border-red-400 bg-red-100 p-4 text-center text-red-700">
          {error}
        </div>
      )}

      <div className="w-full max-w-md bg-white border-2 border-[#00bcd4] rounded-xl p-6 text-center shadow-xl">
        <h1 className="text-[22px] font-bold mt-4 mb-2">チーム番号を入力</h1>
        <div className="w-20 h-1 bg-gradient-to-r from-[#007f9e] to-[#00c8ff] mx-auto mt-5 mb-6" />
        <p className="mb-1">チームを作成した人の画面に映っている番号を入力してください。</p>
        <p className="mb-6">(例: XDG3048)</p>

        <div className="flex items-center gap-x-2 max-w-75 mx-auto my-7">
          <label htmlFor="joinNumber" className="font-bold min-w-25 text-left">
            チーム番号:
          </label>
          <input
            type="text"
            id="joinNumber"
            placeholder="チーム番号を入力"
            value={joinNumber}
            onChange={(e) => setJoinNumber(e.target.value)}
            className="w-full p-2 rounded-lg border-2 border-[#007f9e]"
          />
        </div>

        <button
          onClick={handleJoinTeam}
          disabled={!joinNumber || loading}
          className={`mt-4 px-8 py-3 font-bold rounded-xl border-2 transition-all duration-150
            ${
              joinNumber
                ? "text-[#4a2c00] bg-[#ffba39] border-[#8a5a00] shadow-[0_4px_8px_#ffba39] active:shadow-[0_2px_4px_#ffba39] active:translate-y-1"
                : "text-gray-500 bg-gray-300 border-gray-400"
            }`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
              参加中...
            </div>
          ) : (
            "チームに参加！"
          )}
        </button>
      </div>

      <svg
        viewBox="0 0 393 73"
        preserveAspectRatio="none"
        className="fixed bottom-0 w-screen h-17"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="paint0_linear_12_62" x1="196.5" y1="0" x2="196.5" y2="73" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2EAFB9" /> <stop offset="1" stopColor="#27A2AA" />
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
