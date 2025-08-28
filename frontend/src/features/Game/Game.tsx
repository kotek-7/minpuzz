"use client";

import type React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import { useState, useEffect, useCallback } from "react";
import { Trophy, Clock } from "lucide-react";

// Button Component
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

// Card Component
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-white text-card-foreground flex flex-col gap-6 rounded-xl border border-[#2EAFB9] py-6 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

interface PuzzlePiece {
  id: number;
  currentPosition: number | null;
  correctPosition: number;
  imageUrl: string;
}

const JigsawPuzzle = () => {
  const DISPLAY_SCALE = 3.5; // 表示サイズ（scale=350相当）

  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [board, setBoard] = useState<(number | null)[]>(Array(25).fill(null));
  const [draggedPiece, setDraggedPiece] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [completedPieces, setCompletedPieces] = useState<Set<number>>(new Set());
  const [currentSeason, setCurrentSeason] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(120); // 2分 = 120秒
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);

  // パズルピースを初期化
  const initializePieces = useCallback(() => {
    const seasons = ["spring", "summer", "winter"];
    const selectedSeason = seasons[Math.floor(Math.random() * seasons.length)];
    setCurrentSeason(selectedSeason);

    const initialPieces: PuzzlePiece[] = [];

    for (let i = 1; i <= 25; i++) {
      initialPieces.push({
        id: i,
        currentPosition: null,
        correctPosition: i - 1, // 0-based index
        imageUrl: `/pieces/${selectedSeason}/${i}.png`,
      });
    }

    // ピースをランダムにシャッフル
    const shuffledPieces = [...initialPieces].sort(() => Math.random() - 0.5);

    setPieces(shuffledPieces);
    setBoard(Array(25).fill(null));
    setIsComplete(false);
    setCompletedPieces(new Set());
    setTimeLeft(120); // タイマーをリセット
    setIsGameStarted(false);
  }, []);

  useEffect(() => {
    initializePieces();
  }, [initializePieces]);

  // タイマー機能
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isGameStarted && timeLeft > 0 && !isComplete) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsGameStarted(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isGameStarted, timeLeft, isComplete]);

  // 完成チェック
  useEffect(() => {
    const correctPieces = pieces.filter((piece) => {
      return piece.currentPosition === piece.correctPosition;
    });
    setCompletedPieces(new Set(correctPieces.map((p) => p.id)));

    if (correctPieces.length === 25 && pieces.length === 25) {
      setIsComplete(true);
    }
  }, [pieces]);

  const handleDragStart = (pieceId: number) => {
    // ゲーム開始
    if (!isGameStarted) {
      setIsGameStarted(true);
    }
    setDraggedPiece(pieceId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (position: number) => {
    if (draggedPiece === null) return;

    const newPieces = pieces.map((piece) => {
      if (piece.id === draggedPiece) {
        // 現在の位置をクリア
        if (piece.currentPosition !== null) {
          setBoard((prev) => {
            const newBoard = [...prev];
            newBoard[piece.currentPosition!] = null;
            return newBoard;
          });
        }
        return { ...piece, currentPosition: position };
      }
      // 既にその位置にあるピースを移動
      if (piece.currentPosition === position) {
        return { ...piece, currentPosition: null };
      }
      return piece;
    });

    setPieces(newPieces);

    // ボードを更新
    setBoard((prev) => {
      const newBoard = [...prev];
      newBoard[position] = draggedPiece;
      return newBoard;
    });

    setDraggedPiece(null);
  };

  const handlePieceClick = (pieceId: number) => {
    // ゲーム開始
    if (!isGameStarted) {
      setIsGameStarted(true);
    }

    // 空いている最初の位置に配置
    const emptyPosition = board.findIndex((pos) => pos === null);
    if (emptyPosition !== -1) {
      handleDrop(emptyPosition);
    }
  };

  const availablePieces = pieces.filter((piece) => piece.currentPosition === null);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* コントロールパネル */}
      <Card className="py-3 px-6 w-fit">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-teal-600" />
            <span className="text-2xl font-bold text-teal-600">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
          {isComplete && (
            <div className="flex items-center gap-2 text-green-600">
              <Trophy className="w-5 h-5" />
              <span className="font-semibold">完成おめでとう！</span>
            </div>
          )}
          {timeLeft === 0 && !isComplete && (
            <div className="flex items-center gap-2 text-red-600">
              <span className="font-semibold">時間切れ！</span>
            </div>
          )}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* パズルボード */}
        <Card className="p-6">
          <div className="grid grid-cols-5 gap-0 bg-gray-100 p-4 rounded-lg border border-[#2EAFB9]">
            {Array.from({ length: 25 }, (_, index) => {
              const pieceId = board[index];
              const piece = pieces.find((p) => p.id === pieceId);
              const isCorrect = piece && piece.correctPosition === index;

              return (
                <div
                  key={index}
                  className={`
                    aspect-square border border-[#2EAFB9] 
                    rounded-none flex items-center justify-center
                    transition-all duration-200
                    bg-white
                    hover:border-[#27A2AA] hover:bg-[#F0FDFA]
                  `}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                >
                  {piece && (
                    <div draggable onDragStart={() => handleDragStart(piece.id)} className="w-full h-full relative">
                      <img
                        src={piece.imageUrl || "/placeholder.svg"}
                        alt={`ピース ${piece.id}`}
                        className={`
                          object-cover rounded absolute top-0 left-0 pointer-events-none
                        `}
                        style={{
                          transform: `scale(${DISPLAY_SCALE})`,
                          transformOrigin: "center",
                        }}
                        draggable={false}
                        onDragStart={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  {!piece && <span className="text-xs text-gray-400">{index + 1}</span>}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ピース置き場 */}
        <Card className="p-6">
          <div className="grid grid-cols-5 gap-2 max-h-[500px] overflow-y-auto p-2">
            {availablePieces.map((piece) => (
              <div
                key={piece.id}
                className="aspect-square border-2 border-[#2EAFB9] rounded-lg overflow-hidden cursor-pointer hover:border-[#27A2AA] transition-colors shadow-sm hover:shadow-md"
                draggable
                onDragStart={() => handleDragStart(piece.id)}
                onClick={() => handlePieceClick(piece.id)}
              >
                <img
                  src={piece.imageUrl || "/placeholder.svg"}
                  alt={`ピース ${piece.id}`}
                  className="w-full h-full object-cover"
                  style={{
                    transform: `scale(${DISPLAY_SCALE})`,
                    transformOrigin: "center",
                  }}
                />
              </div>
            ))}
          </div>
          {availablePieces.length === 0 && (
            <div className="text-center text-gray-500 py-8">すべてのピースが配置されました</div>
          )}
        </Card>
      </div>

      {/* 下部の波型デザインのコンポーネントです。 */}
      <svg
        className="mt-auto mt-10 w-full h-[73px]"
        fill="none"
        viewBox="0 0 393 73"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M19.65 7.665C13.1 12.775 6.55 15.33 0 15.33L0 73H393V15.33C386.45 15.33 379.9 12.775 373.35 7.665C360.25 -2.555 347.15 -2.555 334.05 7.665C327.5 12.775 320.95 15.33 314.4 15.33C307.85 15.33 301.3 12.775 294.75 7.665C281.65 -2.555 268.55 -2.555 255.45 7.665C248.9 12.775 242.35 15.33 235.8 15.33C229.25 15.33 222.7 12.775 216.15 7.665C203.05 -2.555 189.95 -2.555 176.85 7.665C170.3 12.775 163.75 15.33 157.2 15.33C150.65 15.33 144.1 12.775 137.55 7.665C124.45 -2.555 111.35 -2.555 98.25 7.665C91.7 12.775 85.15 15.33 78.6 15.33C72.05 15.33 65.5 12.775 58.95 7.665C45.85 -2.555 32.75 -2.555 19.65 7.665Z"
          fill="url(#paint0_linear_12_62)"
        />
        <defs>
          <linearGradient id="paint0_linear_12_62" x1="196.5" y1="0" x2="196.5" y2="73" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2EAFB9" />
            <stop offset="1" stopColor="#27A2AA" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default function Game() {
  return (
    <main className="min-h-screen bg-white p-4">
      <div className="container mx-auto max-w-6xl">
        <JigsawPuzzle />
      </div>
    </main>
  );
}
