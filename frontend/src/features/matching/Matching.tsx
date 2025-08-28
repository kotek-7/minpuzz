"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket/client";
import { MATCHING_EVENTS } from "./events";
import { useGameActions } from "@/features/Game/store";

const MatchingScreen: React.FC = () => {
  const keyframes = `
    @keyframes wave {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-15px);
      }
    }

    @keyframes waveBackground {
      0% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0% 50%;
      }
    }
  `;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative p-4"
      style={{
        background: "linear-gradient(-45deg, #2EAFB9, #27A2AA, #3BD4D4, #5FF2E8)",
        backgroundSize: "400% 400%",
        animation: "waveBackground 10s ease infinite",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: keyframes }} />

      <h1 className="text-4xl font-bold text-white mb-8 drop-shadow-md" style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
        マッチング中…
      </h1>

      <div className="flex space-x-3">
        {/* 波のように上下するドット */}
        <div className="w-5 h-5 bg-white rounded-full shadow-md animate-[wave_1.5s_ease-in-out_infinite] [animation-delay:0s]"></div>
        <div className="w-5 h-5 bg-white rounded-full shadow-md animate-[wave_1.5s_ease-in-out_infinite] [animation-delay:0.2s]"></div>
        <div className="w-5 h-5 bg-white rounded-full shadow-md animate-[wave_1.5s_ease-in-out_infinite] [animation-delay:0.4s]"></div>
        <div className="w-5 h-5 bg-white rounded-full shadow-md animate-[wave_1.5s_ease-in-out_infinite] [animation-delay:0.6s]"></div>
        <div className="w-5 h-5 bg-white rounded-full shadow-md animate-[wave_1.5s_ease-in-out_infinite] [animation-delay:0.8s]"></div>
      </div>
    </div>
  );
};

export default function Matching() {
  const router = useRouter();
  const { setMatch } = useGameActions();

  useEffect(() => {
    const s = getSocket();
    const onMatchFound = (p: any) => {
      if (p && typeof p.matchId === 'string') {
        setMatch(p.matchId, p.self, p.partner);
      }
      router.push("/game");
    };
    s.on(MATCHING_EVENTS.MATCH_FOUND, onMatchFound);
    return () => {
      s.off(MATCHING_EVENTS.MATCH_FOUND, onMatchFound);
    };
  }, [router]);
  return <MatchingScreen />;
};

