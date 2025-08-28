"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket/client";
import { MATCHING_EVENTS } from "./events";
import { useGameActions } from "@/features/game/store";

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-white" style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#007f9e] mb-3">対戦相手を探しています…</h1>
        <p>しばらくお待ちください</p>
      </div>
    </div>
  );
}
