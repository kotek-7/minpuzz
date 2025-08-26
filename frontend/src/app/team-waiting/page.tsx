"use client";

import React, { use } from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

export default function TeamWaitingPage() {
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const memberCount = members.length;
  const router = useRouter();
  const searchParams = useSearchParams();
  const socketRef = useRef<Socket | null>(null);

  const teamId = searchParams.get("teamId");
  const teamNumber = searchParams.get("teamNumber");

  useEffect(() => {
    const abortController = new AbortController();

    if (!teamId || !teamNumber) {
      router.push("/");
      return;
    }

    const initializeTeamWaiting = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

        // 初回データ取得
        const [teamResponse, membersResponse] = await Promise.all([
          fetch(`${apiUrl}/v1/teams/${teamId}`),
          fetch(`${apiUrl}/v1/teams/${teamId}/members`),
        ]);

        if (!teamResponse.ok) {
          throw new Error("チーム情報の取得に失敗しました");
        }

        const teamResult = await teamResponse.json();
        if (!teamResult.success || !teamResult.data) {
          throw new Error("チーム情報の取得に失敗しました");
        }
        setTeam(teamResult.data);

        if (!membersResponse.ok) {
          throw new Error("メンバー情報の取得に失敗しました");
        }

        const membersResult = await membersResponse.json();
        if (!membersResult.success || !membersResult.data) {
          throw new Error("メンバー情報の取得に失敗しました");
        }
        setMembers(membersResult.data);

        // Socket.io接続とイベントリスナー設定
        const socket = io(apiUrl);
        socketRef.current = socket;

        // 新しいメンバーが参加した時
        socket.on("member-joined", (payload: any) => {
          console.log("Member joined:", payload);
          fetchMembers();
        });

        // メンバーが離脱した時
        socket.on("member-left", (payload: any) => {
          console.log("Member left:", payload);
          // メンバーリストを再取得
          fetchMembers();
        });

        // チーム情報が更新された時（メンバー数変更等）
        socket.on("team-updated", (payload: any) => {
          console.log("Team updated:", payload);
          fetchMembers();
        });

        socket.on("error", (error: any) => {
          console.error("Socket error:", error);
          setError(error.message || "接続エラーが発生しました");
        });

        socket.on("connect", () => {
          console.log("Socket connected:", socket.id);

          // チームに参加
          socket.emit("join-team", {
            teamId: teamId,
            userId: sessionStorage.getItem("userId"),
          });
        });

        socket.on("disconnect", () => {
          console.log("Socket disconnected");
        });

        // ポーリングを開始（5秒間隔）
        const pollingInterval = setInterval(() => {
          if (!abortController.signal.aborted) {
            fetchMembers();
          }
        }, 5000);

        // abortコントローラーでクリーンアップ時にポーリングを停止
        abortController.signal.addEventListener('abort', () => {
          clearInterval(pollingInterval);
        });

        setLoading(false);
      } catch (error) {
        console.error("初期化エラー:", error);
        setError(error instanceof Error ? error.message : "初期化に失敗しました");
        setLoading(false);
      }
    };

    const fetchMembers = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${apiUrl}/v1/teams/${teamId}/members`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            console.log("Before setMembers - current members:", members);
            console.log("About to set members to:", result.data);
            setMembers(result.data);
            console.log("setMembers called");
          }
        }
      } catch (error) {
        console.error("メンバー取得エラー:", error);
      }
    };

    initializeTeamWaiting().then(() => {
      const cleanUp = () => {
        if (socketRef.current) {
          // チームから離脱
          socketRef.current.emit("leave-team", {
            teamId: teamId,
            userId: sessionStorage.getItem("userId"),
          });
          socketRef.current.disconnect();
          socketRef.current = null;

          fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/v1/teams/${teamId}/members/${sessionStorage.getItem("userId")}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }
      };

      if (abortController.signal.aborted) {
        cleanUp();
      } else {
        abortController.signal.addEventListener("abort", cleanUp);
      }
    });

    // クリーンアップ関数
    return () => {
      abortController.abort();
    };
  }, [teamId, teamNumber]);

  const copyTeamNumber = () => {
    if (teamNumber) {
      navigator.clipboard.writeText(teamNumber);
      alert("チーム番号をコピーしました！");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">チーム情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-white flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-center">{error}</div>
          <button
            onClick={() => router.push("/")}
            className="w-full mt-4 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">チーム待機室</h1>
          <p className="text-gray-600">メンバーの参加を待っています</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center bg-indigo-100 px-4 py-2 rounded-lg mb-4">
              <span className="text-sm font-medium text-indigo-800 mr-2">チーム番号:</span>
              <span className="text-xl font-bold text-indigo-900">{teamNumber}</span>
              <button
                onClick={copyTeamNumber}
                className="ml-2 text-indigo-600 hover:text-indigo-800 p-1"
                title="コピー"
              >
                📋
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">メンバー</h3>
              <span className="text-sm text-gray-600">
                {memberCount}/{team?.maxMembers || 4}人
              </span>
            </div>

            <div className="space-y-2">
              {Array.from({ length: team?.maxMembers || 4 }).map((_, index) => {
                const member = members[index];
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-2 ${
                      member ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200 border-dashed"
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${member ? "bg-green-400" : "bg-gray-300"}`}></div>
                      <span className={member ? "text-gray-800" : "text-gray-500"}>
                        {member ? `プレイヤー ${index + 1}` : "待機中..."}
                      </span>
                      {member?.role === "LEADER" && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">リーダー</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {memberCount >= 2 && (
            <div className="mb-4">
              <button
                onClick={() => router.push(`/matching?teamId=${teamId}&teamNumber=${teamNumber}`)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                マッチング開始
              </button>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-gray-500 mb-4">
          <p>他のプレイヤーにチーム番号を共有してメンバーを集めましょう</p>
          <p className="mt-2">最小2人からゲーム開始可能です</p>
        </div>

        <button
          onClick={() => router.push("/")}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          ホームに戻る
        </button>
      </div>
    </div>
  );
}
