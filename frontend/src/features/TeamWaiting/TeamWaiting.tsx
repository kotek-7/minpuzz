"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateUserId, getTeamId, getTeamNumber } from "@/lib/session/session";
import { useMountTeamHandlers } from "@/features/team/handlers";
import { useTeamState } from "@/features/team/store";
import { startMatching } from "@/lib/api/teams";
import { getSocket } from "@/lib/socket/client";
import { MATCHING_EVENTS } from "@/features/matching/events";

export const TeamWaiting = () => {
  const router = useRouter();
  const teamId = getTeamId();
  const teamNumber = getTeamNumber();
  const userId = getOrCreateUserId();
  const { members, memberCount } = useTeamState();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (!teamId || !userId) {
      router.push("/");
    }
  }, [teamId, userId, router]);

  useMountTeamHandlers({ teamId: teamId || "", userId });

  // マッチング画面への遷移をサーバ通知で受け取る
  useEffect(() => {
    if (!teamId) return;
    const s = getSocket();
    const onNavigate = (p: { teamId: string }) => {
      if (p.teamId !== teamId) return;
      router.push("/matching");
    };
    s.on(MATCHING_EVENTS.NAVIGATE_TO_MATCHING, onNavigate);
    return () => {
      s.off(MATCHING_EVENTS.NAVIGATE_TO_MATCHING, onNavigate);
    };
  }, [router, teamId]);

  const memberNames = members.map((m) => m.userId.slice(0, 6));

  return (
    <div
      className="flex flex-col justify-center items-center min-h-screen bg-white px-5"
      style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
      <button onClick={() => router.push('/')} className="flex absolute top-3 left-3 w-11 h-11 bg-[#2EAFB9] rounded-full justify-center items-center text-white font-bold shadow-[0_2px_4px_gray] active:shadow-none active:translate-y-1">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z"/></svg>
      </button>
        <h2 className="text-[23px] text-black font-bold  mb-2 text-[#007f9e] text-center">メンバーを待機中…</h2>        
        <p className="text-center mb-5">メンバーの参加を待っています</p>
        <div className="w-full bg-white border-2 border-[#00bcd4] rounded-xl p-6 text-center shadow-xl">
        
        <div className="flex justify-center mb-3 bg-[#e0f7fa] rounded-[8px] px-4 py-2 flex items-center">
          チーム番号：
          <span className="text-[22px] font-bold">{teamNumber || "-"}</span>
        </div>

        <div className="flex justify-between items-center mb-2">
          <p className="text-[20px] font-bold">メンバー</p>
          <p>{memberCount}人</p>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 4 }).map((_, i) => {
            const name = memberNames[i];
            const isFilled = !!name;
            return (
              <div
                key={i}
                className={`p-2 rounded-lg font-bold ${
                  isFilled
                    ? "bg-[#fff7e6] border border-[#e0c090]"
                    : "bg-gray-200 border border-dashed border-gray-500 text-gray-500"
                }`}
              >
                {name || "待機中…"}
              </div>
            );
          })}
        </div>

        <button
          className="mt-5 px-8 py-3 bg-[#ffba39] font-bold rounded-xl shadow-[0_4px_8px_#ffba39] active:shadow-[0_2px_4px_#ffba39] active:translate-y-1 border-2 border-[#8a5a00] disabled:bg-gray-300"
          disabled={!teamId || !userId || loading}
          onClick={async () => {
            if (!teamId || !userId) return;
            try {
              setLoading(true);
              await startMatching(teamId);
              const s = getSocket();
              s.emit(MATCHING_EVENTS.JOIN_MATCHING_QUEUE, { teamId, userId });
            } catch (e: any) {
              console.error(e);
              alert(e?.message || "マッチング開始に失敗しました");
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "開始中…" : "マッチング開始！"}
        </button>
      </div>
      <p className="leading-relaxed text-center mt-5">
          他のプレイヤーにチーム番号を共有してメンバーを集めましょう<br />
          3人 or 4人でゲーム開始可能です
      </p>

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
