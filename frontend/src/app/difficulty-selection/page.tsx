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

export default function DifficultySelection() {
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
        `/team-waiting?teamId=${teamCreationData.data.id}&teamNumber=${teamCreationData.data.teamNumber}`,
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
