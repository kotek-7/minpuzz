"use client";

import React from "react";
import { Trophy, Handshake, Frown } from "lucide-react";

interface GameStatusProps {
  myScore: number;
  opponentScore: number;
  totalPieces: number;
}

export default function GameStatus({ myScore, opponentScore, totalPieces }: GameStatusProps) {
  const myRate = Math.round((myScore / totalPieces) * 100);
  const opponentRate = Math.round((opponentScore / totalPieces) * 100);

  let resultText = "";
  let icon = null;
  let color = "";

  if (myScore > opponentScore) {
    resultText = "あなたの勝ち！ 🎉";
    icon = <Trophy className="w-5 h-5" />;
    color = "text-green-600";
  } else if (myScore < opponentScore) {
    resultText = "相手の勝ち…";
    icon = <Frown className="w-5 h-5" />;
    color = "text-red-600";
  } else {
    resultText = "引き分け！";
    icon = <Handshake className="w-5 h-5" />;
    color = "text-gray-600";
  }

  return (
    <div className={`flex items-center gap-2 font-semibold ${color}`}>
      {icon}
      <span>{resultText}</span>
      <span className="ml-2 text-sm text-gray-500">
        あなた {myRate}% / 相手 {opponentRate}%
      </span>
    </div>
  );
}