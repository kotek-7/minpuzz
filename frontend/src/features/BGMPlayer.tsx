"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { preloadSounds, setSfxVolume } from './sound';

// アイコンをインラインSVGで定義
const SoundOnIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M560-131v-82q104-20 172-96t68-171q0-95-68-171t-172-96v-82q137 21 228.5 125.5T880-480q0 128-91.5 232.5T560-131ZM60-390v-180h160l200-200v580L220-390H60Zm404 88 116-116q-15-18-35.5-30.5T480-462v160Z"/></svg>
);

const SoundOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="m616-324-56-56 104-104-104-104 56-56 104 104 104-104 56 56-104 104 104 104-56 56-104-104-104 104ZM60-390v-180h160l200-200v580L220-390H60Z"/></svg>
);

// アプリケーション全体で使われる主要な効果音!!!!!!!!!!
const sfxToPreload = [
  '/sounds/select.mp3',
  '/sounds/select_back.mp3',
];

export const BGMPlayer = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // ユーザーが手動で停止したかを記憶するフラグ
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const pathname = usePathname();

  // BGMを再生するページを定義！！！！！！！
  const bgmActivePages = ['/', '/difficulty-selection', '/team-number-input', '/team-waiting'];
  const isBgmActivePage = bgmActivePages.includes(pathname);

  // ユーザーの初回インタラクションを検知し、BGM再生と効果音のプリロードを開始
  useEffect(() => {
    const handleFirstInteraction = () => {
      setUserInteracted(true);
      // このタイミングで効果音をプリロードすることで、再生の信頼性を高める
      preloadSounds(sfxToPreload);

      // 一度検知したらリスナーは不要なので削除
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      // コンポーネントのアンマウント時にリスナーをクリーンアップ
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // BGMと効果音のデフォルト音量を設定します
  useEffect(() => {
    if (audioRef.current) {
      // BGM音量を60%に設定
      audioRef.current.volume = 0.6;
    }
    // 効果音の音量を60%に設定
    setSfxVolume(0.6);
  }, []); // このeffectはコンポーネントのマウント時に一度だけ実行されます

  // ページの表示状態とユーザー操作に応じてBGMを再生/停止
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isBgmActivePage && userInteracted && !isManuallyPaused) {
      audio.play().catch(error => {
        console.log("BGMの自動再生がブロックされました。ユーザーの操作が必要です。", error);
      });
    } else {
      audio.pause();
    }
  }, [isBgmActivePage, userInteracted, isManuallyPaused]);

  // audio要素のイベントに基づいて再生状態(isPlaying)を更新
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play();
      setIsManuallyPaused(false);
    } else {
      audio.pause();
      setIsManuallyPaused(true);
    }
  }, []);

  return (
    <>
      <audio ref={audioRef} src="/sounds/Future_1.mp3" loop preload="auto" />
      {isBgmActivePage && (
        <button
          onClick={togglePlayPause}
          className="fixed bottom-4 right-4 z-50 w-12 h-12 bg-[#2EAFB9] rounded-full flex justify-center items-center text-white font-bold shadow-lg transition-transform hover:scale-110 active:scale-100"
          aria-label={isPlaying ? "BGMを停止" : "BGMを再生"}
        >
          {isPlaying ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
      )}
    </>
  );
};