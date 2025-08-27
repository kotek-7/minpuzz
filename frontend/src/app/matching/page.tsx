"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { mountMatchingHandlers } from "@/features/matching/flow";

export default function MatchingPage() {
  const router = useRouter();

  useEffect(() => {
    // サーバの navigate-to-matching / match-found を購読
    const off = mountMatchingHandlers(router.push);
    return () => off();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8 text-center">
        <div className="mb-8">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">マッチング中</h1>
          <p className="text-gray-600">対戦相手を探しています...</p>
        </div>

        <div className="text-sm text-gray-500">
          <p>しばらくお待ちください</p>
          <p className="mt-1">最適な対戦相手を探しています</p>
        </div>
      </div>
    </div>
  );
}
