"use client";
import React from 'react';

export default function ConnectionPlaceholder() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8 text-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-500 rounded-full mx-auto mb-6"></div>
          <h1 className="text-3xl font-bold text-purple-900 mb-2">ゲーム接続中</h1>
          <p className="text-gray-600">まもなくゲームが始まります...</p>
        </div>
      </div>
    </div>
  );
}

