"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function Top() {
  useEffect(() => {
    if (sessionStorage.getItem("userId") === null) {
      sessionStorage.setItem("userId", crypto.randomUUID());
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">みんパズ</h1>
          <p className="text-gray-600">みんなでパズル - チーム対戦型リアルタイムパズルゲーム</p>
        </div>
        
        <div className="space-y-4">
          <Link 
            href="/difficulty-selection" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center text-lg"
          >
            チームを作る
          </Link>
          
          <Link 
            href="/team-number-input" 
            className="w-full bg-white hover:bg-gray-50 text-indigo-600 font-semibold py-4 px-6 rounded-lg border-2 border-indigo-600 transition-colors duration-200 flex items-center justify-center text-lg"
          >
            チームに参加する
          </Link>
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>最大4人まで参加可能</p>
        </div>
      </div>
    </div>
  );
}
