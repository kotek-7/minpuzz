"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function TeamNumberInput() {
  const [teamNumber, setTeamNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamNumber.trim()) {
      setError("チーム番号を入力してください");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const userId = sessionStorage.getItem("userId");

      // Step 1: チーム番号でチームを検索
      const searchResponse = await fetch(`${apiUrl}/v1/teams/${teamNumber.trim()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamNumber: teamNumber.trim(),
        }),
      });

      const searchResult = await searchResponse.json();

      if (!searchResponse.ok || !searchResult.success || !searchResult.data) {
        setError(
          searchResult.error === "Team not found with the provided team number"
            ? "チーム番号が見つかりません"
            : "チームの検索に失敗しました",
        );
        return;
      }

      // Step 2: チームにメンバーとして追加
      const teamId = searchResult.data.id;
      const addMemberResponse = await fetch(`${apiUrl}/v1/teams/${teamId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
        }),
      });

      const addMemberResult = await addMemberResponse.json();

      if (!addMemberResponse.ok || !addMemberResult.success) {
        const errorMessage =
          addMemberResult.message === "team is full" ? "チームは満員です" : "チームへの参加に失敗しました";
        setError(errorMessage);
      }
      router.push(`/team-waiting?teamId=${teamId}&teamNumber=${teamNumber.trim()}&memberId=${addMemberResult.data.id}`);
    } catch (error) {
      console.error("チーム参加エラー:", error);
      setError("チーム参加中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">チームに参加</h1>
          <p className="text-gray-600">チーム番号を入力してチームに参加しましょう</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="teamNumber" className="block text-sm font-medium text-gray-700 mb-2">
              チーム番号
            </label>
            <input
              type="text"
              id="teamNumber"
              value={teamNumber}
              onChange={(e) => setTeamNumber(e.target.value)}
              placeholder="例: 12345"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg text-center"
              maxLength={10}
              disabled={loading}
            />
            <p className="mt-2 text-sm text-gray-500">チーム作成者から共有されたチーム番号を入力してください</p>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={!teamNumber.trim() || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  参加中...
                </div>
              ) : (
                "チームに参加"
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              戻る
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>チーム番号がわからない場合は、チーム作成者にお尋ねください</p>
        </div>
      </div>
    </div>
  );
}
