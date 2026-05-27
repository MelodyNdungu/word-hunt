"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import GameBoard from "@/components/GameBoard";
import Timer from "@/components/Timer";
import WordList from "@/components/WordList";
import { generateGrid, findAllWords, scoreWord } from "@/lib/gameLogic";
import { PlayerState } from "@/lib/types";

type Phase = "lobby" | "waiting" | "playing" | "results";
type Mode = "single" | "multi";

const DEFAULT_TIMER = 90;

export default function Home() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [mode, setMode] = useState<Mode>("single");
  const [playerName, setPlayerName] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [timerDuration, setTimerDuration] = useState(DEFAULT_TIMER);

  // Game state
  const [grid, setGrid] = useState<string[][]>([]);
  const [myId, setMyId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [players, setPlayers] = useState<{ [id: string]: PlayerState }>({});
  const [startTime, setStartTime] = useState(0);
  const [finalPlayers, setFinalPlayers] = useState<{ [id: string]: PlayerState }>({});
  const [gameOver, setGameOver] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const [singleScore, setSingleScore] = useState(0);
  const [singleWords, setSingleWords] = useState<string[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [possibleWords, setPossibleWords] = useState<string[] | null>(null);
  const [resultTab, setResultTab] = useState<"found" | "missed">("found");

  // Compute all possible words when results phase begins
  useEffect(() => {
    if (phase !== "results" || grid.length === 0) return;
    setPossibleWords(null);
    setResultTab("found");
    findAllWords(grid).then(setPossibleWords);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Single player ----------
  const startSingle = () => {
    const g = generateGrid();
    setGrid(g);
    setSingleScore(0);
    setSingleWords([]);
    setGameOver(false);
    setStartTime(Date.now());
    setPhase("playing");
    setMode("single");
  };

  const handleSingleWordFound = useCallback((word: string, score: number) => {
    setSingleWords((prev) => {
      if (prev.includes(word)) return prev;
      return [...prev, word];
    });
    setSingleScore((prev) => prev + score);
  }, []);

  const handleSingleTimerExpire = useCallback(() => {
    setGameOver(true);
    setPhase("results");
  }, []);

  // ---------- Multiplayer ----------
  const connectSocket = () => {
    if (socketRef.current) return socketRef.current;
    const s = io();
    socketRef.current = s;

    s.on("room_joined", ({ roomId: rid, playerId, grid: g, timerDuration: td }: { roomId: string; playerId: string; grid: string[][]; timerDuration: number }) => {
      setRoomId(rid);
      setMyId(playerId);
      setGrid(g);
      setTimerDuration(td);
      setPhase("waiting");
    });

    s.on("player_update", ({ playerId, state }: { playerId: string; state: PlayerState }) => {
      setPlayers((prev) => ({ ...prev, [playerId]: state }));
    });

    s.on("player_left", ({ playerId }: { playerId: string }) => {
      setPlayers((prev) => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
    });

    s.on("game_start", ({ grid: g, startTime: st, timerDuration: td }: { grid: string[][]; startTime: number; timerDuration: number }) => {
      setGrid(g);
      setStartTime(st);
      setTimerDuration(td);
      setPhase("playing");
    });

    s.on("game_over", ({ players: p }: { players: { [id: string]: PlayerState } }) => {
      setFinalPlayers(p);
      setPhase("results");
    });

    s.on("error", (msg: string) => alert(msg));

    return s;
  };

  const createRoom = () => {
    const s = connectSocket();
    const g = generateGrid();
    s.emit("create_room", {
      playerName: playerName || "Player 1",
      timerDuration,
      grid: g,
    });
  };

  const joinRoom = () => {
    if (!roomIdInput.trim()) return;
    const s = connectSocket();
    s.emit("join_room", {
      roomId: roomIdInput.trim().toUpperCase(),
      playerName: playerName || "Player",
    });
  };

  const startMultiGame = () => {
    socketRef.current?.emit("start_game", { roomId });
  };

  const handleMultiWordFound = useCallback(
    (word: string, score: number) => {
      if (!socketRef.current || !roomId) return;
      setPlayers((prev) => {
        if (!prev[myId]) return prev;
        if (prev[myId].foundWords.includes(word)) return prev;
        return {
          ...prev,
          [myId]: {
            ...prev[myId],
            score: prev[myId].score + score,
            foundWords: [...prev[myId].foundWords, word],
          },
        };
      });
      socketRef.current.emit("word_found", { roomId, word, score });
    },
    [roomId, myId]
  );

  const handleMultiTimerExpire = useCallback(() => {
    // Server will send game_over
  }, []);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const resetGame = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setPhase("lobby");
    setPlayers({});
    setGrid([]);
    setRoomId("");
    setMyId("");
    setGameOver(false);
    setPossibleWords(null);
    setResultTab("found");
  };

  // ===================== RENDER =====================

  if (phase === "lobby") {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <h1 className="text-5xl font-black text-center text-white mb-2 tracking-tight">
            Word Hunt
          </h1>
          <p className="text-center text-white/50 mb-10">Find words, beat the clock!</p>

          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden mb-6 border border-white/20">
            <button
              className={`flex-1 py-3 font-bold transition-colors ${
                mode === "single"
                  ? "bg-white text-black"
                  : "bg-white/5 text-white hover:bg-white/10"
              }`}
              onClick={() => setMode("single")}
            >
              Single Player
            </button>
            <button
              className={`flex-1 py-3 font-bold transition-colors ${
                mode === "multi"
                  ? "bg-white text-black"
                  : "bg-white/5 text-white hover:bg-white/10"
              }`}
              onClick={() => setMode("multi")}
            >
              Multiplayer
            </button>
          </div>

          <div className="space-y-4">
            {/* Player name */}
            <input
              className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-white/30 border border-white/10"
              placeholder="Your name (optional)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
            />

            {/* Timer setting */}
            <div>
              <label className="text-white/60 text-sm block mb-1">
                Timer: {timerDuration}s
              </label>
              <input
                type="range"
                min={30}
                max={180}
                step={15}
                value={timerDuration}
                onChange={(e) => setTimerDuration(Number(e.target.value))}
                className="w-full accent-white"
              />
              <div className="flex justify-between text-white/40 text-xs mt-1">
                <span>30s</span><span>90s</span><span>3min</span>
              </div>
            </div>

            {mode === "single" ? (
              <button
                className="w-full bg-white text-black font-black rounded-xl py-4 text-lg transition-all active:scale-95 hover:bg-white/90"
                onClick={startSingle}
              >
                Play!
              </button>
            ) : (
              <>
                <button
                  className="w-full bg-white text-black font-black rounded-xl py-4 text-lg transition-all active:scale-95 hover:bg-white/90"
                  onClick={createRoom}
                >
                  Create Room
                </button>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-white/30 border border-white/10 uppercase"
                    placeholder="Room code"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                  <button
                    className="bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl px-5 py-3 transition-all"
                    onClick={joinRoom}
                  >
                    Join
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (phase === "waiting") {
    const playerList = Object.entries(players);
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md text-center space-y-6">
          <h2 className="text-3xl font-black text-white">Waiting Room</h2>
          <div className="bg-white/10 rounded-2xl p-6">
            <p className="text-white/60 text-sm mb-2">Room Code</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-black text-white tracking-widest">{roomId}</span>
              <button
                onClick={copyRoomId}
                className="text-sm bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition-colors"
              >
                {copySuccess ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {playerList.length === 0 ? (
              <p className="text-white/40">Waiting for players...</p>
            ) : (
              playerList.map(([id, p]) => (
                <div
                  key={id}
                  className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3"
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-white font-semibold">{p.name}</span>
                  {id === myId && (
                    <span className="text-white/40 text-sm ml-auto">(you)</span>
                  )}
                </div>
              ))
            )}
          </div>

          {myId && players[myId] && Object.keys(players)[0] === myId && (
            <button
              className="w-full bg-white text-black font-black rounded-xl py-4 text-lg transition-all active:scale-95 hover:bg-white/90"
              onClick={startMultiGame}
            >
              Start Game!
            </button>
          )}
          <button onClick={resetGame} className="text-white/40 hover:text-white/60 text-sm">
            Leave Room
          </button>
        </div>
      </main>
    );
  }

  if (phase === "playing") {
    const isSingle = mode === "single";
    const myState = isSingle
      ? { score: singleScore, foundWords: singleWords, color: "#ffffff", name: playerName || "You" }
      : players[myId];
    const opponents = Object.entries(players).filter(([id]) => id !== myId);

    return (
      <main className="min-h-screen bg-black flex flex-col items-center p-3 sm:p-6 gap-4">
        {/* Top bar: score panels on each side, timer centred */}
        <div className="w-full max-w-sm sm:max-w-lg flex items-start justify-between gap-2">
          {/* My score */}
          <div className="flex-1">
            {myState && (
              <WordList
                words={myState.foundWords}
                score={myState.score}
                label={myState.name}
                color={myState.color}
                isMe
                hideWords
              />
            )}
          </div>

          {/* Timer */}
          <Timer
            duration={timerDuration}
            startTime={startTime}
            onExpire={isSingle ? handleSingleTimerExpire : handleMultiTimerExpire}
          />

          {/* Opponent score (or blank spacer to keep timer centred) */}
          <div className="flex-1 flex justify-end">
            {opponents.length > 0 ? (
              <WordList
                words={opponents[0][1].foundWords}
                score={opponents[0][1].score}
                label={opponents[0][1].name}
                color={opponents[0][1].color}
                hideWords
              />
            ) : null}
          </div>
        </div>

        {/* Board — centred, fills available width on mobile */}
        {grid.length > 0 && (
          <div className="flex-1 flex items-center justify-center w-full">
            <GameBoard
              grid={grid}
              onWordFound={isSingle ? handleSingleWordFound : handleMultiWordFound}
              disabled={gameOver}
            />
          </div>
        )}
      </main>
    );
  }

  if (phase === "results") {
    const isSingle = mode === "single";
    const resultPlayers = isSingle
      ? [{ name: playerName || "You", score: singleScore, foundWords: singleWords, color: "#ffffff" }]
      : Object.values(finalPlayers).sort((a, b) => b.score - a.score);
    const winner = resultPlayers[0];
    const myFoundWords = isSingle ? singleWords : (winner?.foundWords ?? []);
    const foundSet = new Set(myFoundWords);
    const missedWords = possibleWords?.filter((w) => !foundSet.has(w)) ?? null;
    const pct =
      possibleWords && possibleWords.length > 0
        ? Math.round((foundSet.size / possibleWords.length) * 100)
        : null;

    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-lg space-y-5 text-center">
          <h2 className="text-4xl font-black text-white">
            {isSingle ? "Time's Up!" : `${winner?.name} Wins!`}
          </h2>

          {/* Stats row */}
          <div className="border border-white/20 rounded-2xl p-5 flex items-center justify-around">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Score</p>
              <p className="text-3xl font-black text-white">
                {isSingle ? singleScore : winner?.score ?? 0}
              </p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Found</p>
              <p className="text-3xl font-black text-white">{myFoundWords.length}</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Possible</p>
              <p className="text-3xl font-black text-white">
                {possibleWords !== null ? possibleWords.length : <span className="text-white/30 text-2xl">…</span>}
              </p>
            </div>
            {pct !== null && (
              <>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Rate</p>
                  <p className="text-3xl font-black text-white">{pct}%</p>
                </div>
              </>
            )}
          </div>

          {/* Multiplayer leaderboard */}
          {!isSingle && (
            <div className="space-y-2">
              {resultPlayers.map((p, i) => (
                <div
                  key={p.name}
                  className="flex items-center gap-4 border border-white/10 rounded-xl px-5 py-3"
                >
                  <span className="text-xl font-black text-white/30">#{i + 1}</span>
                  <div
                    className="w-3 h-3 rounded-full border-2"
                    style={{ borderColor: p.color, backgroundColor: p.color + "44" }}
                  />
                  <span className="text-white font-bold flex-1 text-left">{p.name}</span>
                  <span className="text-white font-black text-xl">{p.score}</span>
                </div>
              ))}
            </div>
          )}

          {/* Found / Missed tab toggle */}
          <div className="flex rounded-xl overflow-hidden border border-white/20 text-sm">
            <button
              className={`flex-1 py-2 font-bold transition-colors ${
                resultTab === "found" ? "bg-white text-black" : "text-white/50 hover:text-white"
              }`}
              onClick={() => setResultTab("found")}
            >
              Found ({myFoundWords.length})
            </button>
            <button
              className={`flex-1 py-2 font-bold transition-colors ${
                resultTab === "missed" ? "bg-white text-black" : "text-white/50 hover:text-white"
              }`}
              onClick={() => setResultTab("missed")}
            >
              Missed{" "}
              {possibleWords !== null ? `(${missedWords?.length ?? 0})` : "…"}
            </button>
          </div>

          {/* Word list panel */}
          <div className="border border-white/10 rounded-2xl p-4 min-h-[120px] max-h-72 overflow-y-auto">
            {resultTab === "found" ? (
              <div className="flex flex-wrap gap-2 justify-center">
                {[...myFoundWords]
                  .sort((a, b) => b.length - a.length || a.localeCompare(b))
                  .map((w) => (
                    <span
                      key={w}
                      className="text-sm font-bold bg-white text-black rounded-full px-3 py-1"
                    >
                      {w}{" "}
                      <span className="text-black/40 text-xs font-medium">+{scoreWord(w)}</span>
                    </span>
                  ))}
                {myFoundWords.length === 0 && (
                  <p className="text-white/30 text-sm self-center">No words found</p>
                )}
              </div>
            ) : possibleWords === null ? (
              <p className="text-white/40 text-sm">Calculating possible words…</p>
            ) : (
              <div className="flex flex-wrap gap-2 justify-center">
                {(missedWords ?? []).map((w) => (
                  <span
                    key={w}
                    className="text-sm font-medium text-white/40 bg-white/5 border border-white/10 rounded-full px-3 py-1"
                  >
                    {w}
                  </span>
                ))}
                {(missedWords ?? []).length === 0 && (
                  <p className="text-white/70 text-sm font-bold self-center">
                    You found every possible word! 🎉
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            className="w-full bg-white text-black font-black rounded-xl py-4 text-lg transition-all active:scale-95 hover:bg-white/90"
            onClick={resetGame}
          >
            Play Again
          </button>
        </div>
      </main>
    );
  }

  return null;
}
