"use client";

import { scoreWord } from "@/lib/gameLogic";

interface Props {
  words: string[];
  score: number;
  label: string;
  color: string;
  isMe?: boolean;
  hideWords?: boolean;
}

export default function WordList({ words, score, label, color, isMe, hideWords }: Props) {
  return (
    <div
      className={`flex flex-col gap-1.5 ${
        isMe ? "items-end" : "items-start"
      }`}
    >
      {/* Name + score */}
      <div className={`flex items-center gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
        <span className="text-white/60 font-semibold text-xs truncate max-w-[80px]">{label}</span>
        <span className="text-white font-black text-xl leading-none">{score}</span>
      </div>
      {/* Word count badge (visible during play) */}
      {hideWords && (
        <span className="text-white/30 text-xs">{words.length} word{words.length !== 1 ? "s" : ""}</span>
      )}
      {/* Word pills (only shown after game) */}
      {!hideWords && (
        <div
          className={`flex flex-col gap-1 max-h-64 overflow-y-auto pr-1 ${
            isMe ? "items-end" : "items-start"
          }`}
        >
          {[...words].reverse().map((word) => (
            <div
              key={word}
              className="text-sm font-medium px-2 py-0.5 rounded-full text-white/90 whitespace-nowrap"
              style={{ backgroundColor: color + "22", border: `1px solid ${color}44` }}
            >
              {word} <span className="text-white/40 text-xs">+{scoreWord(word)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
