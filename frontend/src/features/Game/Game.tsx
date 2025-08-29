"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useGameActions, useGameState } from "@/features/Game/store";
import { getSocket } from "@/lib/socket/client";
import { GAME_EVENTS } from "@/features/Game/events";
import { getOrCreateUserId, getTeamId } from "@/lib/session/session";
import { Clock, Trophy, Users, Target } from "lucide-react";

interface Piece {
  id: string;
  x: number;
  y: number;
  placed?: boolean;
  row?: number;
  col?: number;
  holder?: string;
  imageUrl?: string; // 画像URLを追加
  season?: string; // 季節情報（spring, summer, autumn, winter）
}

interface Board {
  rows: number;
  cols: number;
}

interface Score {
  placedByTeam: Record<string, number>;
}

export default function Game() {
  const { hydrateFromInit, applyStateSync, markStarted } = useGameActions();
  const game = useGameState();
  const teamId = getTeamId();
  const userId = getOrCreateUserId();

  const [pieces, setPieces] = useState<Record<string, Piece>>({});
  const [board, setBoard] = useState<Board | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [timer, setTimer] = useState<{ startedAt: string; durationMs: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(240); // 4分 = 240秒
  const [timerStarted, setTimerStarted] = useState<boolean>(false);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(null);
  const [currentSeason, setCurrentSeason] = useState<string>("spring"); // 季節を追加
  console.log("=== INITIAL STATE DEBUG ===");
  console.log("Initial currentSeason:", "spring");
  console.log("=== END INITIAL STATE DEBUG ===");
  const [seasonSelected, setSeasonSelected] = useState<boolean>(false); // 季節選択済みフラグ
  console.log("=== SEASON SELECTED STATE DEBUG ===");
  console.log("seasonSelected initial value:", false);
  console.log("seasonSelected current value:", seasonSelected);
  console.log("=== END SEASON SELECTED STATE DEBUG ===");
  const BOARD_DISPLAY_SCALE = 3.4; // パズルボードの表示スケール
  const LIST_DISPLAY_SCALE = 1; // ピース一覧の表示スケール

  // ランダムに季節を選択（同じマッチは同じ季節を使用）
  useEffect(() => {
    console.log("=== SEASON SELECTION useEffect TRIGGERED ===");
    console.log("useEffect dependencies changed:");
    console.log("- board:", board);
    console.log("- pieces:", pieces);
    console.log("- game.matchId:", game.matchId);
    console.log("- seasonSelected:", seasonSelected);
    console.log("=== END SEASON SELECTION useEffect TRIGGERED ===");

    console.log("=== SEASON SELECTION CONDITION DEBUG ===");
    console.log("Season selection effect - matchId:", game.matchId);
    console.log("game object:", game);
    console.log("game.matchId type:", typeof game.matchId);
    console.log("board exists:", !!board);
    console.log("board value:", board);
    console.log("pieces count:", Object.keys(pieces).length);
    console.log("pieces keys:", Object.keys(pieces));
    console.log("seasonSelected:", seasonSelected);
    console.log("=== END SEASON SELECTION CONDITION DEBUG ===");

    if (board && Object.keys(pieces).length > 0 && game.matchId) {
      // 状態の不整合を検出して強制リセット
      if (prevMatchId.current && seasonSelected) {
        console.log("=== STATE INCONSISTENCY DETECTED ===");
        console.log("prevMatchId.current exists but seasonSelected is true");
        console.log("This indicates a state inconsistency, forcing reset");
        resetSeasonSelection();
        return; // リセット後は次のレンダリングで再実行
      }

      // 新しいゲームが開始されたら季節をリセット
      if (game.matchId !== prevMatchId.current) {
        console.log("=== NEW MATCH DETECTED ===");
        console.log("Previous matchId:", prevMatchId.current);
        console.log("Current matchId:", game.matchId);
        console.log("Resetting seasonSelected from:", seasonSelected, "to false");
        setSeasonSelected(false); // 新しいマッチでは季節選択をリセット
        prevMatchId.current = game.matchId;
        console.log("=== END NEW MATCH DETECTED ===");
      }

      // まだ季節が選択されていない場合のみ選択
      if (!seasonSelected) {
        const seasons = ["spring", "summer", "autumn", "winter"];
        // シンプルにランダムに季節を選択
        const randomIndex = Math.floor(Math.random() * seasons.length);
        const selectedSeason = seasons[randomIndex];
        console.log("=== SETTING CURRENT SEASON DEBUG ===");
        console.log("Setting currentSeason from:", currentSeason, "to:", selectedSeason);
        setCurrentSeason(selectedSeason);
        setSeasonSelected(true); // 季節選択済みフラグを設定
        console.log("=== END SETTING CURRENT SEASON DEBUG ===");
        console.log("=== SEASON SELECTION DEBUG ===");
        console.log("Randomly selected season:", selectedSeason);
        console.log("randomIndex:", randomIndex);
        console.log("all seasons:", seasons);
        console.log("Math.random() value:", Math.random());
        console.log("Math.floor(Math.random() * seasons.length):", Math.floor(Math.random() * seasons.length));
        console.log("=== END SEASON SELECTION DEBUG ===");
      }
    } else {
      console.log("Season selection skipped - missing:", {
        matchId: !game.matchId,
        board: !board,
        piecesCount: Object.keys(pieces).length,
      });
      console.log("Condition check:");
      console.log(
        "- board && Object.keys(pieces).length > 0 && game.matchId:",
        board && Object.keys(pieces).length > 0 && game.matchId,
      );
      console.log("- board:", !!board);
      console.log("- Object.keys(pieces).length > 0:", Object.keys(pieces).length > 0);
      console.log("- game.matchId:", !!game.matchId);
      console.log("=== END SEASON SELECTION SKIPPED DEBUG ===");
    }
  }, [board, pieces, game.matchId, seasonSelected]);

  // currentSeasonに基づいてピースマッピングを生成する関数
  const generateRandomPieceMapping = useCallback(() => {
    const seasons = ["spring", "summer", "autumn", "winter"];
    const pieceMapping: Record<number, string> = {};

    // currentSeasonを使用して季節を決定
    const selectedSeason = currentSeason || "spring";
    console.log("=== PIECE MAPPING DETAILED DEBUG ===");
    console.log("Piece mapping - using currentSeason:", selectedSeason);
    console.log("currentSeason value:", currentSeason);
    console.log("currentSeason type:", typeof currentSeason);
    console.log("currentSeason === 'spring':", currentSeason === "spring");
    console.log("currentSeason === 'summer':", currentSeason === "summer");
    console.log("currentSeason === 'autumn':", currentSeason === "autumn");
    console.log("currentSeason === 'winter':", currentSeason === "winter");
    console.log("=== END PIECE MAPPING DETAILED DEBUG ===");

    // 1から25までの各ピース番号に対して、選択された季節のピースを順番に割り当て
    for (let i = 1; i <= 25; i++) {
      pieceMapping[i] = `/pieces/${selectedSeason}/${i}.png`;
    }

    console.log(
      "Generated piece mapping for season:",
      selectedSeason,
      "mapping count:",
      Object.keys(pieceMapping).length,
    );
    return pieceMapping;
  }, [currentSeason]);

  // ピースマッピングの状態
  const [pieceMapping, setPieceMapping] = useState<Record<number, string>>({});

  // ゲーム開始時にピースマッピングを生成
  useEffect(() => {
    if (board && Object.keys(pieces).length > 0 && currentSeason) {
      // 新しいゲームが開始されたらピースマッピングをリセット
      if (Object.keys(pieceMapping).length === 0 || game.matchId !== prevMatchId.current) {
        console.log("=== PIECE MAPPING GENERATION TRIGGERED ===");
        console.log("pieceMapping.length:", Object.keys(pieceMapping).length);
        console.log("game.matchId !== prevMatchId.current:", game.matchId !== prevMatchId.current);
        console.log("currentSeason at generation time:", currentSeason);
        const mapping = generateRandomPieceMapping();
        setPieceMapping(mapping);
        prevMatchId.current = game.matchId;
        console.log("Generated piece mapping for season:", currentSeason);
        console.log("=== END PIECE MAPPING GENERATION TRIGGERED ===");
      }
    }
  }, [board, pieces, pieceMapping, generateRandomPieceMapping, game.matchId, currentSeason]);

  // 前回のマッチIDを記録
  const prevMatchId = useRef<string | null>(null);
  console.log("=== PREV MATCH ID DEBUG ===");
  console.log("prevMatchId.current:", prevMatchId.current);
  console.log("=== END PREV MATCH ID DEBUG ===");

  // 強制的に季節選択をリセットする関数
  const resetSeasonSelection = useCallback(() => {
    console.log("=== FORCE RESET SEASON SELECTION ===");
    console.log("Resetting seasonSelected from:", seasonSelected, "to false");
    console.log("Resetting prevMatchId from:", prevMatchId.current, "to null");
    setSeasonSelected(false);
    prevMatchId.current = null;
    console.log("=== END FORCE RESET SEASON SELECTION ===");
  }, []);
  // タイマー同期のデバウンス用
  const lastTimerSync = useRef<number>(0);

  // ピースに画像URLを追加する関数
  const addImageUrlToPiece = useCallback(
    (piece: Piece, pieceId: string, boardCols: number): Piece => {
      console.log(`Processing piece ${pieceId} with boardCols ${boardCols}`);

      // 新しいピースID形式: "p-{number}" から番号を抽出
      const match = pieceId.match(/p-(\d+)/);
      if (match) {
        const pieceNumber = parseInt(match[1]);
        // 1-25の範囲に制限
        const validPieceNumber = Math.min(Math.max(pieceNumber, 1), 25);

        // バックエンドから送られてくる季節情報を優先、なければフロントエンドの季節を使用
        const season = piece.season || currentSeason || "spring";
        const imageUrl = pieceMapping[validPieceNumber] || `/pieces/${season}/${validPieceNumber}.png`;
        console.log(`=== PIECE URL DETAILED DEBUG ===`);
        console.log(`Piece ${pieceId} -> number:${pieceNumber}, validNumber:${validPieceNumber}, url:${imageUrl}`);
        console.log(`pieceMapping[${validPieceNumber}]:`, pieceMapping[validPieceNumber]);
        console.log(`piece.season:`, piece.season);
        console.log(`currentSeason:`, currentSeason);
        console.log(`selected season:`, season);
        console.log(`fallback URL:`, `/pieces/${season}/${validPieceNumber}.png`);
        console.log(`=== END PIECE URL DETAILED DEBUG ===`);
        return {
          ...piece,
          imageUrl,
        };
      }

      // 古いピースID形式: "p-{row}-{col}" のフォールバック
      const oldMatch = pieceId.match(/p-(\d+)-(\d+)/);
      if (oldMatch) {
        const row = parseInt(oldMatch[1]);
        const col = parseInt(oldMatch[2]);
        const pieceNumber = row * boardCols + col + 1;
        const validPieceNumber = Math.min(Math.max(pieceNumber, 1), 25);

        // バックエンドから送られてくる季節情報を優先、なければフロントエンドの季節を使用
        const season = piece.season || currentSeason || "spring";
        const imageUrl = pieceMapping[validPieceNumber] || `/pieces/${season}/${validPieceNumber}.png`;
        console.log(
          `Piece ${pieceId} -> row:${row}, col:${col}, number:${pieceNumber}, validNumber:${validPieceNumber}, url:${imageUrl}`,
        );
        return {
          ...piece,
          imageUrl,
        };
      }

      // ピースIDが期待される形式でない場合のフォールバック
      // ピースIDから直接番号を抽出を試行
      const numberMatch = pieceId.match(/(\d+)/);
      if (numberMatch) {
        const pieceNumber = parseInt(numberMatch[1]);
        // 1-25の範囲に制限
        const validPieceNumber = Math.min(Math.max(pieceNumber, 1), 25);

        // バックエンドから送られてくる季節情報を優先、なければフロントエンドの季節を使用
        const season = piece.season || currentSeason || "spring";
        const imageUrl = pieceMapping[validPieceNumber] || `/pieces/${season}/${validPieceNumber}.png`;
        console.log(
          `Piece ${pieceId} -> fallback number:${pieceNumber}, validNumber:${validPieceNumber}, url:${imageUrl}`,
        );
        return {
          ...piece,
          imageUrl,
        };
      }

      // デフォルトの画像を設定
      const season = piece.season || currentSeason || "spring";
      const defaultUrl = pieceMapping[1] || `/pieces/${season}/1.png`;
      console.log(`Piece ${pieceId} -> default url:${defaultUrl}`);
      return {
        ...piece,
        imageUrl: defaultUrl,
      };
    },
    [currentSeason, pieceMapping],
  );

  // ソケットイベントハンドラー
  useEffect(() => {
    const socket = getSocket();

    const handleGameInit = (payload: any) => {
      console.log("=== GAME INIT DEBUG ===");
      console.log("Game init received:", payload);
      console.log("payload.matchId:", payload.matchId);
      console.log("payload.board:", payload.board);
      console.log("payload.pieces.length:", payload.pieces?.length);
      console.log(
        "Pieces:",
        payload.pieces.map((p: any) => ({ id: p.id, type: typeof p.id, season: p.season })),
      );

      // バックエンドから送られてくる季節情報を確認
      const firstPiece = payload.pieces?.[0];
      if (firstPiece?.season) {
        console.log("=== BACKEND SEASON DETECTED ===");
        console.log("Backend provided season:", firstPiece.season);
        console.log("Setting currentSeason from backend:", firstPiece.season);
        setCurrentSeason(firstPiece.season);
        setSeasonSelected(true);
        console.log("=== END BACKEND SEASON DETECTED ===");
      }

      hydrateFromInit(payload);
      console.log("=== END GAME INIT DEBUG ===");
      setBoard(payload.board);

      // ピースに画像URLを追加
      const piecesWithImages = payload.pieces.reduce((acc: Record<string, Piece>, piece: Piece) => {
        const pieceWithImage = addImageUrlToPiece(piece, piece.id, payload.board.cols);
        console.log(`Piece ${piece.id} -> imageUrl: ${pieceWithImage.imageUrl}`);
        acc[piece.id] = pieceWithImage;
        return acc;
      }, {});

      setPieces(piecesWithImages);
      const timerData =
        payload.startedAt && payload.durationMs
          ? { startedAt: payload.startedAt, durationMs: payload.durationMs }
          : null;
      console.log("Setting timer from game init:", timerData);
      setTimer(timerData);
    };

    const handleStateSync = (payload: any) => {
      console.log("State sync received:", payload);
      applyStateSync(payload);
      setBoard(payload.board);

      // ピースに画像URLを追加
      const piecesWithImages = payload.pieces.reduce((acc: Record<string, Piece>, piece: Piece) => {
        acc[piece.id] = addImageUrlToPiece(piece, piece.id, payload.board.cols);
        return acc;
      }, {});

      setPieces(piecesWithImages);
      setScore(payload.score);
      console.log("Setting timer from state sync:", payload.timer);
      setTimer(payload.timer);
    };

    const handleGameStart = () => {
      console.log("Game started");
      markStarted();

      // ゲーム開始時にタイマーを開始
      const now = new Date().toISOString();
      const durationMs = 240000; // 4分
      setTimer({ startedAt: now, durationMs });
      setTimerStarted(true);
      console.log("Timer started at:", now, "duration:", durationMs);
    };

    const handlePieceGrabbed = (payload: { pieceId: string; byUserId: string }) => {
      console.log("Piece grabbed:", payload);
      setPieces((prev) => {
        const currentPiece = prev[payload.pieceId];
        if (!currentPiece) return prev;

        return {
          ...prev,
          [payload.pieceId]: {
            ...currentPiece,
            holder: payload.byUserId,
            // 配置済みピースを掴んだ場合は配置状態をリセット
            placed: false,
            row: undefined,
            col: undefined,
            // imageUrlを保持
            imageUrl:
              currentPiece.imageUrl || addImageUrlToPiece(currentPiece, payload.pieceId, board?.cols || 5).imageUrl,
          },
        };
      });
    };

    const handlePieceGrabDenied = (payload: { pieceId: string; reason: string }) => {
      console.log("Piece grab denied:", payload);

      // エラーメッセージをより分かりやすくする
      let message = "";
      switch (payload.reason) {
        case "locked":
          message = "このピースは他のユーザーが掴んでいます";
          break;
        case "placed":
          message = "このピースは既に配置されています";
          break;
        case "notFound":
          message = "ピースが見つかりません";
          break;
        default:
          message = `ピースを掴めませんでした: ${payload.reason}`;
      }

      // ユーザーにフィードバックを表示
      alert(message);

      // ドラッグ状態をリセット
      setDraggedPiece(null);
    };

    const handlePieceMoved = (payload: { pieceId: string; x: number; y: number; byUserId: string; ts: number }) => {
      console.log("Piece moved:", payload);
      // 自分チームのピース移動のみ処理する（相手チームの移動は同期しない）
      if (payload.byUserId === userId) {
        setPieces((prev) => {
          const currentPiece = prev[payload.pieceId];
          if (!currentPiece) return prev;

          return {
            ...prev,
            [payload.pieceId]: {
              ...currentPiece,
              x: payload.x,
              y: payload.y,
              // imageUrlを保持
              imageUrl:
                currentPiece.imageUrl || addImageUrlToPiece(currentPiece, payload.pieceId, board?.cols || 5).imageUrl,
            },
          };
        });
      }
    };

    const handlePiecePlaced = (payload: { pieceId: string; row: number; col: number; byUserId: string }) => {
      console.log("Piece placed:", payload);
      setPieces((prev) => {
        const currentPiece = prev[payload.pieceId];
        if (!currentPiece) return prev;

        return {
          ...prev,
          [payload.pieceId]: {
            ...currentPiece,
            placed: true,
            row: payload.row,
            col: payload.col,
            holder: undefined,
            // imageUrlを保持
            imageUrl:
              currentPiece.imageUrl || addImageUrlToPiece(currentPiece, payload.pieceId, board?.cols || 5).imageUrl,
          },
        };
      });
      setDraggedPiece(null);
    };

    const handlePiecePlaceDenied = (payload: { pieceId: string; reason: string }) => {
      console.log("Piece place denied:", payload);

      // エラーメッセージをより分かりやすくする
      let message = "";
      switch (payload.reason) {
        case "notHolder":
          message = "このピースを掴んでいません。まずピースを掴んでください";
          break;
        case "placed":
          message = "このピースは既に配置されています";
          break;
        case "notFound":
          message = "ピースが見つかりません";
          break;
        case "invalidCell":
          message = "無効な位置です";
          break;
        default:
          message = `ピースを配置できませんでした: ${payload.reason}`;
      }

      alert(message);
    };

    const handleProgressUpdate = (payload: { placedByTeam: Record<string, number> }) => {
      console.log("Progress update:", payload);
      setScore(payload);
    };

    const handleTimerSync = (payload: { serverNow: string; startedAt: string; duration: number }) => {
      console.log("Timer sync:", payload);

      // デバウンス: 5秒以内の重複同期を無視
      const now = Date.now();
      if (now - lastTimerSync.current < 5000) {
        console.log("Timer sync ignored due to debounce");
        return;
      }
      lastTimerSync.current = now;

      // タイマー同期はサーバーの時刻情報を更新するだけで、ローカルタイマーは直接更新しない
      // ローカルタイマーは別のuseEffectで管理される
      if (payload.startedAt && payload.duration) {
        const newTimer = { startedAt: payload.startedAt, durationMs: payload.duration };
        console.log("Setting timer from timer sync:", newTimer);
        setTimer(newTimer);
      }
    };

    const handleGameEnd = (payload: {
      reason: string;
      winnerTeamId: string | null;
      scores: Record<string, number>;
      finishedAt: string;
    }) => {
      console.log("Game ended:", payload);
      setGameEnded(true);
      setWinnerTeamId(payload.winnerTeamId);
      setScore({ placedByTeam: payload.scores });
    };

    // イベントリスナーを登録
    socket.on(GAME_EVENTS.GAME_INIT, handleGameInit);
    socket.on(GAME_EVENTS.STATE_SYNC, handleStateSync);
    socket.on(GAME_EVENTS.GAME_START, handleGameStart);
    socket.on("piece-grabbed", handlePieceGrabbed);
    socket.on("piece-grab-denied", handlePieceGrabDenied);
    socket.on("piece-moved", handlePieceMoved);
    socket.on("piece-placed", handlePiecePlaced);
    socket.on("piece-place-denied", handlePiecePlaceDenied);
    socket.on("progress-update", handleProgressUpdate);
    socket.on("timer-sync", handleTimerSync);
    socket.on("game-end", handleGameEnd);

    // ゲームに参加
    if (game.matchId && teamId && userId) {
      socket.emit(GAME_EVENTS.JOIN_GAME, { matchId: game.matchId, teamId, userId });
    }

    return () => {
      socket.off(GAME_EVENTS.GAME_INIT, handleGameInit);
      socket.off(GAME_EVENTS.STATE_SYNC, handleStateSync);
      socket.off(GAME_EVENTS.GAME_START, handleGameStart);
      socket.off("piece-grabbed", handlePieceGrabbed);
      socket.off("piece-grab-denied", handlePieceGrabDenied);
      socket.off("piece-moved", handlePieceMoved);
      socket.off("piece-placed", handlePiecePlaced);
      socket.off("piece-place-denied", handlePiecePlaceDenied);
      socket.off("progress-update", handleProgressUpdate);
      socket.off("timer-sync", handleTimerSync);
      socket.off("game-end", handleGameEnd);
    };
  }, [hydrateFromInit, applyStateSync, markStarted, game.matchId, teamId, userId]);

  // タイマー更新
  useEffect(() => {
    const updateTimer = () => {
      console.log("Timer update - timer object:", timer, "timerStarted:", timerStarted);

      if (!timer || !timer.startedAt || !timer.durationMs) {
        // タイマーが設定されていない場合は4分で初期化
        console.log("No timer data, using default 240 seconds");
        setTimeLeft(240);
        return;
      }

      try {
        const now = Date.now();
        const startedAt = new Date(timer.startedAt).getTime();

        console.log("Timer calculation:", {
          now,
          startedAt,
          durationMs: timer.durationMs,
          startedAtString: timer.startedAt,
          timeDiff: now - startedAt,
          expectedRemaining: Math.floor((startedAt + timer.durationMs - now) / 1000),
          timerStarted,
        });

        // 開始時刻が無効な場合のチェック
        if (isNaN(startedAt)) {
          console.warn("Invalid timer start time, using default 240 seconds");
          setTimeLeft(240);
          return;
        }

        // タイマーが開始されていない場合は4分を表示
        if (!timerStarted) {
          console.log("Timer not started yet, showing full duration");
          setTimeLeft(Math.floor(timer.durationMs / 1000));
          return;
        }

        const remaining = Math.max(0, Math.floor((startedAt + timer.durationMs - now) / 1000));

        console.log("Calculated remaining time:", remaining);

        // NaNチェック
        if (isNaN(remaining)) {
          console.warn("Timer calculation resulted in NaN, using default 240 seconds");
          setTimeLeft(240);
          return;
        }

        setTimeLeft(remaining);

        if (remaining <= 0) {
          setGameEnded(true);
        }
      } catch (error) {
        console.error("Timer calculation error:", error);
        setTimeLeft(240);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [timer, timerStarted]);

  // ゲーム完成チェック
  useEffect(() => {
    if (!board) return;

    const totalPieces = board.rows * board.cols;
    let correctPieces = 0;

    // 各セルをチェックして、正解位置（画像番号とボード番号が一致）のピースをカウント
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cellIndex = row * board.cols + col;
        const expectedPieceNumber = cellIndex + 1; // ボード上の番号（1から25）

        // そのセルに配置されているピースを探す
        const placedPiece = Object.values(pieces).find((p) => p.placed && p.row === row && p.col === col);

        if (placedPiece) {
          // ピースIDから番号を抽出
          const match = placedPiece.id.match(/p-(\d+)/);
          if (match) {
            const pieceNumber = parseInt(match[1]);
            // 画像番号とボード番号が一致する場合のみ正解としてカウント
            if (pieceNumber === expectedPieceNumber) {
              correctPieces++;
            }
          }
        }
      }
    }

    console.log(`Correct pieces: ${correctPieces}/${totalPieces}`);

    if (correctPieces === totalPieces) {
      setIsComplete(true);
    }
  }, [pieces, board]);

  // ピース操作ハンドラー
  const handlePieceGrab = useCallback(
    (pieceId: string) => {
      if (!game.matchId || !teamId || !userId) return;

      const socket = getSocket();
      socket.emit("piece-grab", {
        matchId: game.matchId,
        teamId,
        userId,
        pieceId,
      });
    },
    [game.matchId, teamId, userId],
  );

  const handlePieceMove = useCallback(
    (pieceId: string, x: number, y: number) => {
      if (!game.matchId || !teamId || !userId || !draggedPiece) return;

      const socket = getSocket();
      socket.emit("piece-move", {
        matchId: game.matchId,
        teamId,
        userId,
        pieceId,
        x,
        y,
        ts: Date.now(),
      });
    },
    [game.matchId, teamId, userId, draggedPiece],
  );

  const handlePiecePlace = useCallback(
    (pieceId: string, row: number, col: number, x: number, y: number) => {
      if (!game.matchId || !teamId || !userId) return;

      const socket = getSocket();
      socket.emit("piece-place", {
        matchId: game.matchId,
        teamId,
        userId,
        pieceId,
        row,
        col,
        x,
        y,
      });
    },
    [game.matchId, teamId, userId],
  );

  const handlePieceRelease = useCallback(
    (pieceId: string, x: number, y: number) => {
      if (!game.matchId || !teamId || !userId) return;

      const socket = getSocket();
      socket.emit("piece-release", {
        matchId: game.matchId,
        teamId,
        userId,
        pieceId,
        x,
        y,
      });
      setDraggedPiece(null);
    },
    [game.matchId, teamId, userId],
  );

  // ドラッグ開始
  const handleDragStart = (pieceId: string) => {
    const piece = pieces[pieceId];
    console.log("Drag start attempt for piece:", pieceId, "piece state:", piece);

    if (!piece) {
      console.warn("Piece not found:", pieceId);
      return;
    }

    // 配置済みピースも掴めるようにする
    // if (piece.placed) {
    //   console.warn("Cannot drag placed piece:", pieceId);
    //   return;
    // }

    if (piece.holder && piece.holder !== userId) {
      console.warn("Piece held by another user:", pieceId, "holder:", piece.holder, "current user:", userId);
      return;
    }

    console.log("Starting drag for piece:", pieceId);
    handlePieceGrab(pieceId);
    setDraggedPiece(pieceId);
  };

  // ドラッグ中
  const handleDrag = (pieceId: string, x: number, y: number) => {
    if (draggedPiece === pieceId) {
      handlePieceMove(pieceId, x, y);
    }
  };

  // ドラッグ終了
  const handleDragEnd = (pieceId: string, x: number, y: number) => {
    if (draggedPiece === pieceId) {
      // ここでセル判定を行う（簡易版）
      const cellSize = 60; // 仮のセルサイズ
      const row = Math.floor(y / cellSize);
      const col = Math.floor(x / cellSize);

      if (row >= 0 && row < (board?.rows || 0) && col >= 0 && col < (board?.cols || 0)) {
        // 既に配置されているピースがあるかチェック
        const existingPiece = Object.values(pieces).find((p) => p.placed && p.row === row && p.col === col);
        if (existingPiece) {
          console.log("Existing piece found at cell during drag, will be replaced:", existingPiece.id);
          // 既存のピースをピース一覧に戻す（サーバー側で処理される）
          // 新しいピースを配置
          handlePiecePlace(pieceId, row, col, x, y);
        } else {
          handlePiecePlace(pieceId, row, col, x, y);
        }
      } else {
        handlePieceRelease(pieceId, x, y);
      }
    }
  };

  // ボードセルクリック時のピース配置
  const handleBoardCellClick = (row: number, col: number) => {
    if (selectedPiece) {
      const piece = pieces[selectedPiece];
      console.log("Board cell click - selected piece:", selectedPiece, "piece state:", piece, "target cell:", {
        row,
        col,
      });

      // 既に配置されているピースは配置できない
      if (piece && piece.placed) {
        console.warn("Cannot place already placed piece:", selectedPiece);
        return;
      }

      // ピースを保持していない場合は、まず掴む必要がある
      if (piece && piece.holder !== userId) {
        console.log("Piece not held by current user, grabbing first:", selectedPiece);
        handlePieceGrab(selectedPiece);
        // 掴み取りが成功したら配置を試行
        setTimeout(() => {
          const updatedPiece = pieces[selectedPiece];
          if (updatedPiece && updatedPiece.holder === userId) {
            console.log("Piece grabbed successfully, now placing:", selectedPiece);
            handlePiecePlace(selectedPiece, row, col, 0, 0);
          } else {
            console.warn("Failed to grab piece for placement:", selectedPiece);
          }
        }, 100);
        return;
      }

      // 既に配置されているピースがあるかチェック
      const existingPiece = Object.values(pieces).find((p) => p.placed && p.row === row && p.col === col);
      if (existingPiece) {
        console.log("Existing piece found at cell, will be replaced:", existingPiece.id);
        // 既存のピースをピース一覧に戻す（サーバー側で処理される）
        // 新しいピースを配置
        handlePiecePlace(selectedPiece, row, col, 0, 0);
      } else {
        console.log("Placing piece:", selectedPiece, "at cell:", { row, col });
        handlePiecePlace(selectedPiece, row, col, 0, 0);
      }
      setSelectedPiece(null);
    }
  };

  // 再同期要求
  const handleRequestSync = () => {
    if (!game.matchId || !teamId || !userId) return;

    const socket = getSocket();
    socket.emit("request-state-sync", {
      matchId: game.matchId,
      teamId,
      userId,
    });
  };

  if (gameEnded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h1 className="text-2xl font-bold mb-4">ゲーム終了</h1>

            {winnerTeamId ? (
              <div className="mb-4">
                <p className="text-lg font-semibold text-green-600">勝者: チーム {winnerTeamId}</p>
              </div>
            ) : (
              <p className="text-lg font-semibold text-gray-600 mb-4">引き分け</p>
            )}

            {score && (
              <div className="space-y-2 mb-6">
                {Object.entries(score.placedByTeam).map(([teamId, count]) => (
                  <div key={teamId} className="flex justify-between items-center">
                    <span>チーム {teamId}:</span>
                    <span className="font-semibold">{count} ピース</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => (window.location.href = "/")}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-xl font-bold text-blue-600">
                  {isNaN(timeLeft)
                    ? "4:00"
                    : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">Match: {game.matchId?.slice(0, 8) || "-"}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {score && (
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-semibold">
                    配置済み: {Object.values(score.placedByTeam).reduce((a, b) => a + b, 0)}
                  </span>
                </div>
              )}

              <button
                onClick={handleRequestSync}
                className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
              >
                同期
              </button>
            </div>
          </div>
        </div>

        {/* パズルボード */}
        {board && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-center">パズルボード</h2>
            <div
              className="grid grid-cols-5 gap-0 bg-gray-100 p-4 rounded-lg border border-[#2EAFB9] mx-auto"
              style={{ maxWidth: "600px" }}
            >
              {Array.from({ length: board.rows * board.cols }, (_, index) => {
                const row = Math.floor(index / board.cols);
                const col = index % board.cols;
                const piece = Object.values(pieces).find((p) => p.placed && p.row === row && p.col === col);

                return (
                  <div
                    key={index}
                    className="aspect-square border border-[#2EAFB9] flex items-center justify-center hover:border-[#27A2AA] hover:bg-[#F0FDFA]"
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const pieceId = e.dataTransfer.getData("pieceId");
                      if (pieceId) {
                        // ドロップ位置がこのセル内かどうかをチェック
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;

                        // セルの中心から一定範囲内の場合のみ配置
                        const cellSize = rect.width;
                        const centerX = cellSize / 2;
                        const centerY = cellSize / 2;
                        const threshold = cellSize * 0.6; // セルの60%の範囲内に制限

                        if (Math.abs(x - centerX) < threshold / 2 && Math.abs(y - centerY) < threshold / 2) {
                          console.log("Dropping piece", pieceId, "at cell", row, col);
                          // 既に配置されているピースがあるかチェック
                          const existingPiece = Object.values(pieces).find(
                            (p) => p.placed && p.row === row && p.col === col,
                          );
                          if (existingPiece) {
                            console.log(
                              "Existing piece found at cell during drop, will be replaced:",
                              existingPiece.id,
                            );
                            // 既存のピースをピース一覧に戻す（サーバー側で処理される）
                            // 新しいピースを配置
                            handlePiecePlace(pieceId, row, col, 0, 0);
                          } else {
                            handlePiecePlace(pieceId, row, col, 0, 0);
                          }
                        } else {
                          console.log("Drop position outside cell bounds:", { x, y, centerX, centerY, threshold });
                        }
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!piece) {
                        // 空のセルをクリックした場合のみ配置処理
                        handleBoardCellClick(row, col);
                      }
                      // ピースがある場合は、ピースのオーバーレイが処理する
                    }}
                  >
                    {piece ? (
                      (() => {
                        const isFocused = selectedPiece === piece.id;

                        return (
                          <div
                            onClick={() => {
                              console.log("Board piece clicked:", piece.id, "piece state:", piece);
                              setSelectedPiece(piece.id);
                            }}
                            className={`w-full h-full relative rounded-lg transition-all overflow-visible flex items-center justify-center
                              ${isFocused ? "z-50 scale-[1.2] shadow-lg" : ""}
                            `}
                            style={{
                              transition: "transform 0.3s ease, box-shadow 0.3s ease",
                            }}
                            draggable={!piece.holder || piece.holder === userId}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              if (!piece.holder || piece.holder === userId) {
                                e.dataTransfer.setData("pieceId", piece.id);
                                handleDragStart(piece.id);
                              }
                            }}
                          >
                            <img
                              src={piece.imageUrl || "/placeholder.svg"}
                              alt={`ピース ${piece.id}`}
                              className="object-cover absolute top-0 left-0 w-full h-full pointer-events-none rounded"
                              style={{
                                transform: `scale(${BOARD_DISPLAY_SCALE})`,
                                transformOrigin: "center",
                              }}
                              onError={(e) => {
                                console.error(`Failed to load board image: ${piece.imageUrl}`);
                                e.currentTarget.style.display = "none";
                              }}
                              onLoad={() => {
                                console.log(`Successfully loaded board image: ${piece.imageUrl}`);
                              }}
                            />
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-xs text-gray-400">{index + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ピース一覧 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
          <h2 className="text-xl font-bold mb-4 text-center">ピース一覧</h2>
          <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
            {Object.values(pieces)
              .filter((piece) => !piece.placed)
              .map((piece) => (
                <div
                  key={piece.id}
                  className={`aspect-square rounded-lg cursor-pointer transition-all shadow-sm flex items-center justify-center relative
                    ${
                      selectedPiece === piece.id
                        ? "z-50 scale-[1.2] shadow-lg overflow-visible p-0"
                        : "overflow-hidden p-1 border-2 border-[#2EAFB9] hover:border-[#27A2AA] hover:bg-[#F0FDFA] hover:shadow-md"
                    }
                  `}
                  style={{
                    transition: "transform 0.3s ease, box-shadow 0.3s ease, padding 0.3s ease",
                  }}
                  draggable={!piece.holder || piece.holder === userId}
                  onDragStart={(e) => {
                    if (!piece.holder || piece.holder === userId) {
                      e.dataTransfer.setData("pieceId", piece.id);
                      handleDragStart(piece.id);
                    }
                  }}
                  onClick={() => {
                    console.log("Piece click - piece:", piece.id, "state:", piece, "current user:", userId);
                    if (!piece.holder || piece.holder === userId) {
                      console.log("Selecting piece:", piece.id);
                      setSelectedPiece(piece.id);
                    } else {
                      console.warn("Cannot select piece held by another user:", piece.id, "holder:", piece.holder);
                      alert("このピースは他のユーザーが掴んでいます");
                    }
                  }}
                >
                  {piece.imageUrl ? (
                    <div className="w-full h-full flex items-center justify-center bg-transparent">
                      <img
                        src={piece.imageUrl}
                        alt={`ピース ${piece.id}`}
                        className="max-w-full max-h-full object-contain"
                        style={{
                          transform: `scale(${LIST_DISPLAY_SCALE})`,
                          transformOrigin: "center",
                          imageRendering: "pixelated",
                        }}
                        onError={(e) => {
                          console.error(`Failed to load image: ${piece.imageUrl}`);
                          e.currentTarget.style.display = "none";
                        }}
                        onLoad={() => {
                          console.log(`Successfully loaded image: ${piece.imageUrl}`);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center relative">
                      <span className="text-sm font-bold text-gray-700">
                        {piece.holder ? (piece.holder === userId ? "あなた" : "他") : "空"}
                      </span>
                      {piece.holder && piece.holder !== userId && (
                        <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center">
                          <span className="text-xs text-red-700 font-bold">使用中</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
          {Object.values(pieces).filter((p) => !p.placed).length === 0 && (
            <div className="text-center text-gray-500 py-8">すべてのピースが配置されました</div>
          )}
        </div>
      </div>
    </div>
  );
}
