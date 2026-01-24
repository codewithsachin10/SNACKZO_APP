import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Search, ShoppingBag, HelpCircle, Sparkles,
  Gamepad2, Trophy, X, Play, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================
// OPTIMIZED CATCH FOOD GAME
// ============================================

interface GameItem {
  id: number;
  emoji: string;
  x: number;
  y: number;
  speed: number;
  points: number;
  isBomb: boolean;
}

const ITEMS = [
  { emoji: "🍔", points: 10, weight: 5 },
  { emoji: "🍕", points: 10, weight: 5 },
  { emoji: "🍟", points: 5, weight: 5 },
  { emoji: "🌮", points: 10, weight: 4 },
  { emoji: "🧁", points: 20, weight: 2 },
  { emoji: "🍩", points: 10, weight: 4 },
  { emoji: "💎", points: 50, weight: 1 },
  { emoji: "⭐", points: 30, weight: 1.5 },
];

const CatchFoodGame = ({ onClose }: { onClose: () => void }) => {
  const [screen, setScreen] = useState<'menu' | 'play' | 'end'>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [time, setTime] = useState(45);
  const [combo, setCombo] = useState(0);
  const [items, setItems] = useState<GameItem[]>([]);
  const [plateX, setPlateX] = useState(50);
  const [effect, setEffect] = useState<{ show: boolean; x: number; pts: number }>({ show: false, x: 50, pts: 0 });
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem('game_high') || '0'); } catch { return 0; }
  });

  const itemIdRef = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const comboRef = useRef(0);
  const plateRef = useRef(50);
  const itemsRef = useRef<GameItem[]>([]);
  const gameRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const lastRef = useRef(0);
  const spawnRef = useRef<NodeJS.Timeout>();
  const timerRef = useRef<NodeJS.Timeout>();

  const resetGame = useCallback(() => {
    scoreRef.current = 0;
    livesRef.current = 3;
    comboRef.current = 0;
    plateRef.current = 50;
    itemsRef.current = [];
    itemIdRef.current = 0;
    lastRef.current = 0;
    setScore(0);
    setLives(3);
    setTime(45);
    setCombo(0);
    setItems([]);
    setPlateX(50);
  }, []);

  const spawnItem = useCallback(() => {
    const total = ITEMS.reduce((s, i) => s + i.weight, 0) + 0.8;
    let r = Math.random() * total;
    let sel = ITEMS[0];
    let isBomb = false;

    for (const i of ITEMS) {
      r -= i.weight;
      if (r <= 0) { sel = i; break; }
    }
    if (r > 0) isBomb = true;

    itemsRef.current.push({
      id: itemIdRef.current++,
      emoji: isBomb ? "💣" : sel.emoji,
      x: 8 + Math.random() * 84,
      y: -5,
      speed: 0.25 + Math.random() * 0.15,
      points: isBomb ? -1 : sel.points,
      isBomb
    });
  }, []);

  const endGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    clearInterval(spawnRef.current);
    clearInterval(timerRef.current);
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      try { localStorage.setItem('game_high', scoreRef.current.toString()); } catch { }
    }
    setScreen('end');
  }, [highScore]);

  const gameLoop = useCallback((ts: number) => {
    if (!lastRef.current) lastRef.current = ts;
    const dt = Math.min(ts - lastRef.current, 50);
    lastRef.current = ts;

    const pL = plateRef.current - 12;
    const pR = plateRef.current + 12;
    const cY = 80;
    const next: GameItem[] = [];

    for (const it of itemsRef.current) {
      it.y += it.speed * (dt / 16);

      if (it.y >= cY && it.y < cY + 6 && it.x >= pL && it.x <= pR) {
        if (it.isBomb) {
          livesRef.current--;
          comboRef.current = 0;
          setLives(livesRef.current);
          setCombo(0);
          setEffect({ show: true, x: it.x, pts: -1 });
          setTimeout(() => setEffect(e => ({ ...e, show: false })), 300);
          if (livesRef.current <= 0) { endGame(); return; }
        } else {
          const pts = Math.round(it.points * (1 + comboRef.current * 0.05));
          scoreRef.current += pts;
          comboRef.current++;
          setScore(scoreRef.current);
          setCombo(comboRef.current);
          setEffect({ show: true, x: it.x, pts });
          setTimeout(() => setEffect(e => ({ ...e, show: false })), 300);
        }
        continue;
      }

      if (it.y >= 100) {
        if (!it.isBomb) comboRef.current = 0;
        setCombo(comboRef.current);
        continue;
      }

      next.push(it);
    }

    itemsRef.current = next;
    setItems([...next]);
    animRef.current = requestAnimationFrame(gameLoop);
  }, [endGame]);

  const startGame = useCallback(() => {
    resetGame();
    setScreen('play');
    spawnRef.current = setInterval(spawnItem, 800);
    timerRef.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) { endGame(); return 0; }
        return t - 1;
      });
    }, 1000);
    animRef.current = requestAnimationFrame(gameLoop);
  }, [resetGame, spawnItem, gameLoop, endGame]);

  const onMove = useCallback((x: number) => {
    if (!gameRef.current || screen !== 'play') return;
    const rect = gameRef.current.getBoundingClientRect();
    const pct = Math.max(10, Math.min(90, ((x - rect.left) / rect.width) * 100));
    plateRef.current = pct;
    setPlateX(pct);
  }, [screen]);

  useEffect(() => {
    const m = (e: MouseEvent) => onMove(e.clientX);
    const t = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientX); };
    if (screen === 'play') {
      window.addEventListener('mousemove', m);
      window.addEventListener('touchmove', t, { passive: false });
    }
    return () => {
      window.removeEventListener('mousemove', m);
      window.removeEventListener('touchmove', t);
    };
  }, [screen, onMove]);

  useEffect(() => () => {
    cancelAnimationFrame(animRef.current);
    clearInterval(spawnRef.current);
    clearInterval(timerRef.current);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950"
    >
      {/* HUD */}
      <div className="absolute top-0 inset-x-0 p-2 flex justify-between items-center z-20 bg-black/40">
        <div className="flex gap-2 items-center">
          <div className="bg-black/40 px-3 py-1 rounded-lg">
            <span className="text-lg font-bold text-white">{score}</span>
          </div>
          {combo >= 3 && (
            <span className="text-orange-400 font-bold text-sm">{combo}x🔥</span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex">
            {[0, 1, 2].map(i => (
              <span key={i} className={cn("text-lg", i >= lives && "opacity-20")}>
                {i < lives ? "❤️" : "🖤"}
              </span>
            ))}
          </div>
          {screen === 'play' && (
            <div className={cn("bg-black/40 px-2 py-1 rounded-lg", time <= 10 && "bg-red-600/50")}>
              <span className="text-lg font-bold text-white">{time}s</span>
            </div>
          )}
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center">
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Game */}
      <div ref={gameRef} className="absolute inset-0 top-12 overflow-hidden cursor-none">
        {items.map(it => (
          <div
            key={it.id}
            className="absolute text-3xl select-none pointer-events-none"
            style={{ left: `${it.x}%`, top: `${it.y}%`, transform: 'translate(-50%,-50%)' }}
          >
            {it.emoji}
          </div>
        ))}

        {effect.show && (
          <div
            className="absolute pointer-events-none z-30"
            style={{ left: `${effect.x}%`, top: '72%', transform: 'translateX(-50%)' }}
          >
            <span className={cn("text-xl font-black", effect.pts > 0 ? "text-lime-400" : "text-red-500")}>
              {effect.pts > 0 ? `+${effect.pts}` : '💥'}
            </span>
          </div>
        )}

        {screen === 'play' && (
          <div
            className="absolute bottom-[14%]"
            style={{ left: `${plateX}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-16 h-5 bg-gradient-to-b from-white to-gray-300 rounded-[50%] shadow-lg border border-white/50" />
            <div className="w-10 h-1 mx-auto bg-gray-400 rounded-b -mt-0.5" />
          </div>
        )}

        {screen === 'menu' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-4">
            <div className="text-6xl mb-3">🍽️</div>
            <h2 className="text-2xl font-black text-white mb-1">Catch the Food!</h2>
            <p className="text-white/60 text-center text-sm max-w-xs mb-4">
              Move to control the plate. Catch food, avoid bombs!
            </p>
            <div className="flex gap-2 mb-4">
              <div className="text-center px-2 py-1 bg-white/10 rounded"><span className="text-xl">🍔</span><p className="text-[10px] text-green-400">+10</p></div>
              <div className="text-center px-2 py-1 bg-white/10 rounded"><span className="text-xl">💎</span><p className="text-[10px] text-cyan-400">+50</p></div>
              <div className="text-center px-2 py-1 bg-white/10 rounded"><span className="text-xl">💣</span><p className="text-[10px] text-red-400">-❤️</p></div>
            </div>
            <Button onClick={startGame} className="h-11 px-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl">
              <Play size={18} className="mr-1" /> Play
            </Button>
            {highScore > 0 && <p className="text-amber-400 text-xs mt-3">Best: {highScore}</p>}
          </div>
        )}

        {screen === 'end' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-4">
            {score >= highScore && score > 0 ? (
              <>
                <Trophy size={50} className="text-amber-400 mb-1" />
                <p className="text-amber-400 font-bold text-sm mb-1">NEW HIGH SCORE!</p>
              </>
            ) : (
              <div className="text-5xl mb-2">🎮</div>
            )}
            <h2 className="text-2xl font-black text-white">{lives <= 0 ? "Game Over!" : "Time's Up!"}</h2>
            <p className="text-4xl font-black bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent my-2">{score}</p>
            <div className="flex gap-2 mt-2">
              <Button onClick={startGame} className="h-10 px-5 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg">
                <RotateCcw size={14} className="mr-1" /> Again
              </Button>
              <Button onClick={onClose} variant="outline" className="h-10 px-5 rounded-lg border-white/20">Exit</Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// MEMORY MATCH GAME
// ============================================

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

const EMOJIS = ["🍔", "🍕", "🍟", "🌮", "🍜", "🧁", "🍩", "☕"];

const MemoryGame = ({ onClose }: { onClose: () => void }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [time, setTime] = useState(0);
  const [checking, setChecking] = useState(false);
  const [best, setBest] = useState(() => {
    try { return parseInt(localStorage.getItem('memory_best') || '999'); } catch { return 999; }
  });
  const timerRef = useRef<NodeJS.Timeout>();

  const initGame = useCallback(() => {
    const shuffled = [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5);
    setCards(shuffled.map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false })));
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setWon(false);
    setTime(0);
    setStarted(true);
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
  }, []);

  const clickCard = useCallback((id: number) => {
    if (checking || flipped.length >= 2) return;
    const card = cards[id];
    if (card.flipped || card.matched) return;

    const newCards = [...cards];
    newCards[id].flipped = true;
    setCards(newCards);
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setChecking(true);
      const [a, b] = newFlipped;
      if (cards[a].emoji === cards[b].emoji) {
        setTimeout(() => {
          const matched = [...cards];
          matched[a].matched = true;
          matched[b].matched = true;
          setCards(matched);
          setMatches(m => {
            const newM = m + 1;
            if (newM === 8) {
              clearInterval(timerRef.current);
              setWon(true);
              if (time < best) {
                setBest(time);
                try { localStorage.setItem('memory_best', time.toString()); } catch { }
              }
            }
            return newM;
          });
          setFlipped([]);
          setChecking(false);
        }, 400);
      } else {
        setTimeout(() => {
          const reset = [...cards];
          reset[a].flipped = false;
          reset[b].flipped = false;
          setCards(reset);
          setFlipped([]);
          setChecking(false);
        }, 800);
      }
    }
  }, [cards, flipped, checking, time, best]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 via-teal-950 to-slate-950 flex flex-col"
    >
      <div className="p-2 flex justify-between items-center bg-black/40">
        <div className="flex gap-2">
          <div className="bg-black/40 px-2 py-1 rounded"><span className="text-sm text-white">Moves: {moves}</span></div>
          <div className="bg-black/40 px-2 py-1 rounded"><span className="text-sm text-white">{fmt(time)}</span></div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center">
          <X size={16} className="text-white" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {!started ? (
          <div className="text-center">
            <div className="text-5xl mb-3">🧠</div>
            <h2 className="text-2xl font-black text-white mb-1">Memory Match</h2>
            <p className="text-white/60 text-sm mb-4">Find all 8 matching pairs!</p>
            <div className="flex gap-1 justify-center mb-4">
              {EMOJIS.map((e, i) => <span key={i} className="text-2xl">{e}</span>)}
            </div>
            <Button onClick={initGame} className="h-11 px-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl">
              <Play size={18} className="mr-1" /> Play
            </Button>
            {best < 999 && <p className="text-amber-400 text-xs mt-3">Best: {fmt(best)}</p>}
          </div>
        ) : won ? (
          <div className="text-center">
            <Trophy size={50} className="text-amber-400 mx-auto mb-2" />
            <h2 className="text-2xl font-black text-white mb-1">You Won!</h2>
            <p className="text-3xl font-black text-teal-400">{fmt(time)}</p>
            <p className="text-white/60 text-sm mb-3">{moves} moves</p>
            {time <= best && <p className="text-lime-400 font-bold text-sm mb-2">🏆 New Best!</p>}
            <div className="flex gap-2 justify-center">
              <Button onClick={initGame} className="h-10 px-5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg">
                <RotateCcw size={14} className="mr-1" /> Again
              </Button>
              <Button onClick={onClose} variant="outline" className="h-10 px-5 rounded-lg border-white/20">Exit</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-w-xs">
            {cards.map(c => (
              <button
                key={c.id}
                onClick={() => clickCard(c.id)}
                className={cn(
                  "w-14 h-14 sm:w-16 sm:h-16 rounded-xl text-2xl font-bold transition-all",
                  c.matched ? "bg-teal-500/30 border-2 border-teal-400" :
                    c.flipped ? "bg-purple-500/30 border-2 border-purple-400" :
                      "bg-white/10 border-2 border-white/20 hover:border-white/40"
                )}
              >
                {(c.flipped || c.matched) ? c.emoji : "?"}
              </button>
            ))}
          </div>
        )}
      </div>
      {started && !won && (
        <div className="p-2 text-center bg-black/30">
          <span className="text-white/40 text-xs">Matches: {matches}/8</span>
        </div>
      )}
    </motion.div>
  );
};

// ============================================
// 404 PAGE
// ============================================

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [game, setGame] = useState<'none' | 'catch' | 'memory'>('none');

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  const links = [
    { icon: <Home size={16} />, label: "Home", path: "/" },
    { icon: <ShoppingBag size={16} />, label: "Menu", path: "/products" },
    { icon: <HelpCircle size={16} />, label: "Help", path: "/support" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Games */}
      <AnimatePresence>
        {game === 'catch' && <CatchFoodGame onClose={() => setGame('none')} />}
        {game === 'memory' && <MemoryGame onClose={() => setGame('none')} />}
      </AnimatePresence>

      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {/* 404 */}
          <h1 className="text-[120px] md:text-[180px] font-black leading-none bg-gradient-to-b from-white to-white/30 bg-clip-text text-transparent">
            404
          </h1>

          <h2 className="text-xl md:text-2xl font-bold mb-2">Page Not Found</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            This page went on a snack break! Play a game while you're here 🎮
          </p>

          {/* Games */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button
              onClick={() => setGame('catch')}
              className="h-12 px-6 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl gap-2"
            >
              <Gamepad2 size={18} />
              Catch Food 🍔
            </Button>
            <Button
              onClick={() => setGame('memory')}
              className="h-12 px-6 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl gap-2"
            >
              <Sparkles size={18} />
              Memory Match 🧠
            </Button>
          </div>

          {/* Search */}
          <form
            onSubmit={(e) => { e.preventDefault(); if (search.trim()) navigate(`/?search=${encodeURIComponent(search)}`); }}
            className="flex gap-2 max-w-sm mx-auto mb-6"
          >
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full h-10 pl-9 pr-3 bg-white/5 border border-white/10 rounded-lg text-sm outline-none focus:border-primary/50"
              />
            </div>
            <Button type="submit" className="h-10 px-4 rounded-lg">
              <Search size={16} />
            </Button>
          </form>

          {/* Links */}
          <div className="flex gap-2 justify-center mb-6">
            {links.map(l => (
              <Button
                key={l.path}
                variant="ghost"
                onClick={() => navigate(l.path)}
                className="h-9 px-3 gap-1 text-sm"
              >
                {l.icon} {l.label}
              </Button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)} className="h-10 gap-2">
              ← Back
            </Button>
            <Button onClick={() => navigate("/")} className="h-10 gap-2 bg-primary">
              <Home size={16} /> Home
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
