"use client";

import type React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const DISPLAY_SCALE = 3.5;

  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [board, setBoard] = useState<(number | null)[]>(Array(25).fill(null));
  const [isComplete, setIsComplete] = useState(false);
  const [completedPieces, setCompletedPieces] = useState<Set<number>>(new Set());
  const [currentSeason, setCurrentSeason] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null);
  const [glowPieceId, setGlowPieceId] = useState<number | null>(null);

  const placeSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    placeSoundRef.current = new Audio("/sounds/pieceSound.mp3");
  }, []);

  const selectSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    selectSoundRef.current = new Audio("/sounds/pieceSelect.mp3");
    selectSoundRef.current.playbackRate = 2;
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
    @keyframes glowFade {
      0% {
        opacity: 1;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(1.5);
      }
    }
  `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);


  const initializePieces = useCallback(() => {
    const seasons = ["spring", "summer", "winter", "autumn"];
    const selectedSeason = seasons[Math.floor(Math.random() * seasons.length)];
    setCurrentSeason(selectedSeason);

    const initialPieces: PuzzlePiece[] = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      currentPosition: null,
      correctPosition: i,
      imageUrl: `/pieces/${selectedSeason}/${i + 1}.png`,
    }));

    const shuffledPieces = [...initialPieces].sort(() => Math.random() - 0.5);
    setPieces(shuffledPieces);
    setBoard(Array(25).fill(null));
    setIsComplete(false);
    setCompletedPieces(new Set());
    setTimeLeft(120);
    setIsGameStarted(false);
    setSelectedPieceId(null);
  }, []);

  useEffect(() => {
    initializePieces();
  }, [initializePieces]);

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
    return () => clearInterval(interval);
  }, [isGameStarted, timeLeft, isComplete]);

  useEffect(() => {
    const correctPieces = pieces.filter((piece) => piece.currentPosition === piece.correctPosition);
    setCompletedPieces(new Set(correctPieces.map((p) => p.id)));
    if (correctPieces.length === 25 && pieces.length === 25) {
      setIsComplete(true);
    }
  }, [pieces]);

  const handleDrop = (position: number, pieceId: number) => {
    setGlowPieceId(pieceId);
    if (placeSoundRef.current) {
      placeSoundRef.current.currentTime = 0;
      placeSoundRef.current.play();
    }

    setTimeout(() => {
      setGlowPieceId(null);
    }, 500);

    const newPieces = pieces.map((piece) => {
      if (piece.id === pieceId) {
        if (piece.currentPosition !== null) {
          setBoard((prev) => {
            const newBoard = [...prev];
            newBoard[piece.currentPosition!] = null;
            return newBoard;
          });
        }
        return { ...piece, currentPosition: position };
      }
      if (piece.currentPosition === position) {
        return { ...piece, currentPosition: null };
      }
      return piece;
    });

    setPieces(newPieces);
    setBoard((prev) => {
      const newBoard = [...prev];
      newBoard[position] = pieceId;
      return newBoard;
    });
  };

  const handlePieceSelect = (pieceId: number) => {
    if (!isGameStarted) setIsGameStarted(true);
    if (selectSoundRef.current) {
    selectSoundRef.current.currentTime = 0;
    selectSoundRef.current.play();
  }
    setSelectedPieceId(pieceId);
  };

  const handleBoardClick = (position: number) => {
    if (selectedPieceId === null) return;
    handleDrop(position, selectedPieceId);
    setSelectedPieceId(null);
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

              return (
                <div
                  key={index}
                  onClick={() => handleBoardClick(index)}
                  className="aspect-square border border-[#2EAFB9] flex items-center justify-center hover:border-[#27A2AA] hover:bg-[#F0FDFA]"
                >
                  {piece ? (
                    (() => {
                      const isFocused = selectedPieceId === piece.id;
                      const isGlowing = glowPieceId === piece.id;

                      return (
                        <div
                          onClick={() => handlePieceSelect(piece.id)}
                          className={`w-full h-full relative rounded-lg transition-all overflow-visible flex items-center justify-center
                            ${isFocused ? 'z-50 scale-[1.2] shadow-lg' : ''}
                          `}
                          style={{
                            transition: "transform 0.3s ease, box-shadow 0.3s ease",
                          }}
                        >

                          {isGlowing && (
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                borderRadius: "12px",
                                boxShadow: "0 0 20px 8px rgba(74,226,243,0.6)",
                                opacity: 1,
                                transform: "scale(1)",
                                animation: "glowFade 0.5s ease-out forwards",
                                pointerEvents: "none",
                                zIndex: 10,
                              }}
                            />
                          )}

                          <img
                            src={piece.imageUrl || "/placeholder.svg"}
                            alt={`ピース ${piece.id}`}
                            className="object-cover absolute top-0 left-0 w-full h-full pointer-events-none rounded"
                            style={{
                              transform: `scale(${DISPLAY_SCALE})`,
                              transformOrigin: "center",
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
        </Card>

        {/* ピース一覧 */}
        <Card className="p-6">
          <div
            className="grid grid-cols-5 gap-2 overflow-y-auto p-2"
            style={{ maxHeight: `calc(100vh - 550px)` }}
          >
            {availablePieces.map((piece) => {
              const isFocused = selectedPieceId === piece.id;

              return (
                <div
                  key={piece.id}
                  onClick={() => handlePieceSelect(piece.id)}
                  className={`aspect-square rounded-lg cursor-pointer transition-all shadow-sm flex items-center justify-center relative
                    ${isFocused
                      ? 'z-50 scale-[1.2] shadow-lg overflow-visible p-0'
                      : 'overflow-hidden p-1 border-2 border-[#2EAFB9] hover:border-[#27A2AA] hover:bg-[#F0FDFA] hover:shadow-md'}
                  `}
                  style={{
                    transition: "transform 0.3s ease, box-shadow 0.3s ease, padding 0.3s ease",
                  }}
                >
                  <img
                    src={piece.imageUrl || "/placeholder.svg"}
                    alt={`ピース ${piece.id}`}
                    className="w-full h-full object-cover pointer-events-none rounded"
                    style={{
                      transform: `scale(${DISPLAY_SCALE})`,
                      transformOrigin: "center",
                    }}
                  />
                </div>
              );
            })}
            {availablePieces.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                すべてのピースが配置されました
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default function Puzzle() {
  return (
    <main className="relative min-h-screen overflow-hidden p-4">
      <svg
        className="absolute inset-0 w-full h-full -z-10"
        viewBox="0 0 540 960"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect x="0" y="0" width="540" height="960" fill="#F5B12A" />
        <defs>
          <linearGradient id="grad1_0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="30%" stopColor="#f5b12a" stopOpacity="1" />
            <stop offset="70%" stopColor="#f5b12a" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="grad2_0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="30%" stopColor="#f5b12a" stopOpacity="1" />
            <stop offset="70%" stopColor="#f5b12a" stopOpacity="1" />
          </linearGradient>
        </defs>
        <g transform="translate(540, 0)">
          <path
            d="M0 432C-73.6 418 -147.2 404 -213.5 369.8C-279.8 335.5 -338.9 281 -374.1 216C-409.3 151 -420.7 75.5 -432 0L0 0Z"
            fill="#4AE2F3"
          />
        </g>
        <g transform="translate(0, 960)">
          <path
            d="M0 -432C74.4 -419.4 148.8 -406.8 215 -372.4C281.2 -338 339.3 -281.7 374.1 -216C408.9 -150.3 420.5 -75.1 432 0L0 0Z"
            fill="#4AE2F3"
          />
        </g>
      </svg>

      <div className="container mx-auto max-w-6xl">
        <JigsawPuzzle />
      </div>
    </main>
  );
}
