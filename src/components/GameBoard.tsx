"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CellCoord, cellKey, isAdjacent, scoreWord, GRID_SIZE } from "@/lib/gameLogic";
import { isValidWord } from "@/lib/dictionary";

interface Props {
  grid: string[][];
  onWordFound: (word: string, score: number, path: CellCoord[]) => void;
  disabled?: boolean;
  opponentFoundWords?: string[];
}

export default function GameBoard({ grid, onWordFound, disabled, opponentFoundWords = [] }: Props) {
  const [selectedPath, setSelectedPath] = useState<CellCoord[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [flash, setFlash] = useState<"valid" | "invalid" | null>(null);
  const [liveValid, setLiveValid] = useState(false);
  const isDragging = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);

  // Check validity in real-time as path grows
  useEffect(() => {
    if (currentWord.length < 3) { setLiveValid(false); return; }
    isValidWord(currentWord).then(setLiveValid);
  }, [currentWord]);

  function getCellFromPoint(x: number, y: number): CellCoord | null {
    if (!boardRef.current) return null;
    const cells = boardRef.current.querySelectorAll("[data-cell]");
    for (const el of cells) {
      const rect = el.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const [r, c] = (el as HTMLElement).dataset.cell!.split("-").map(Number);
        return [r, c];
      }
    }
    return null;
  }

  const addCell = useCallback(
    (coord: CellCoord) => {
      setSelectedPath((prev) => {
        const key = cellKey(coord[0], coord[1]);
        if (prev.some(([r, c]) => cellKey(r, c) === key)) return prev;
        if (prev.length > 0 && !isAdjacent(prev[prev.length - 1], coord)) return prev;
        const next = [...prev, coord];
        const word = next.map(([r, c]) => grid[r][c]).join("");
        setCurrentWord(word);
        return next;
      });
    },
    [grid]
  );

  const finishSelection = useCallback(async () => {
    if (selectedPath.length < 3) {
      setSelectedPath([]);
      setCurrentWord("");
      return;
    }
    const word = selectedPath.map(([r, c]) => grid[r][c]).join("");
    const valid = await isValidWord(word);
    if (valid) {
      const pts = scoreWord(word);
      setFlash("valid");
      onWordFound(word, pts, selectedPath);
    } else {
      setFlash("invalid");
    }
    setTimeout(() => setFlash(null), 600);
    setSelectedPath([]);
    setCurrentWord("");
  }, [selectedPath, grid, onWordFound]);

  // Mouse events
  const onMouseDown = (r: number, c: number) => {
    if (disabled) return;
    isDragging.current = true;
    setSelectedPath([[r, c]]);
    setCurrentWord(grid[r][c]);
  };

  const onMouseEnter = (r: number, c: number) => {
    if (!isDragging.current || disabled) return;
    addCell([r, c]);
  };

  const onMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    finishSelection();
  };

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const t = e.touches[0];
    const coord = getCellFromPoint(t.clientX, t.clientY);
    if (coord) {
      isDragging.current = true;
      setSelectedPath([coord]);
      setCurrentWord(grid[coord[0]][coord[1]]);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging.current || disabled) return;
    const t = e.touches[0];
    const coord = getCellFromPoint(t.clientX, t.clientY);
    if (coord) addCell(coord);
  };

  const onTouchEnd = () => {
    isDragging.current = false;
    finishSelection();
  };

  useEffect(() => {
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  });

  const selectedKeys = new Set(selectedPath.map(([r, c]) => cellKey(r, c)));

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Dot markers — shown while selecting; flash result after release */}
      <div className="h-10 flex items-center justify-center gap-1.5">
        {flash !== null ? (
          // Brief flash feedback
          <span
            className={`text-lg font-black tracking-widest transition-colors ${
              flash === "valid" ? "text-green-400" : "text-red-400"
            }`}
          >
            {flash === "valid" ? "✓" : "✗"}
          </span>
        ) : selectedPath.length > 0 ? (
          // One dot per letter in path
          selectedPath.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-100 ${
                liveValid
                  ? "w-3 h-3 bg-green-400"
                  : "w-2.5 h-2.5 bg-yellow-200/80"
              }`}
            />
          ))
        ) : (
          <div className="h-3" />
        )}
      </div>

      {/* Grid */}
      <div
        ref={boardRef}
        className="grid grid-cols-4 gap-[clamp(4px,1.5vw,8px)] p-[clamp(8px,2vw,12px)] bg-white/5 rounded-2xl backdrop-blur-sm"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ touchAction: "none" }}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const key = cellKey(r, c);
            const isSelected = selectedKeys.has(key);
            const selIdx = selectedPath.findIndex(([sr, sc]) => sr === r && sc === c);
            const isFirst = selIdx === 0;
            const isLast = selIdx === selectedPath.length - 1 && selIdx >= 0;

            return (
              <div
                key={key}
                data-cell={`${r}-${c}`}
                onMouseDown={() => onMouseDown(r, c)}
                onMouseEnter={() => onMouseEnter(r, c)}
                className={`
                  w-[clamp(52px,18vw,72px)] h-[clamp(52px,18vw,72px)] rounded-xl flex items-center justify-center
                  text-[clamp(14px,4vw,20px)] font-black cursor-pointer
                  transition-all duration-100
                  ${
                    isSelected
                      ? flash === "valid"
                        ? "bg-green-400 text-black scale-105 shadow-lg shadow-green-400/40"
                        : flash === "invalid"
                        ? "bg-red-400 text-white scale-105"
                        : liveValid
                        ? "bg-green-400 text-black scale-105 shadow-lg shadow-green-400/40"
                        : "bg-yellow-100 text-black scale-105 shadow-md shadow-yellow-100/20"
                      : disabled
                      ? "bg-white/5 text-white/30 border border-white/10"
                      : "bg-white/10 text-white border border-white/20 hover:bg-white/20 active:scale-95"
                  }
                `}
              >
                {letter}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
