import { useState, useEffect, useRef, useCallback } from "react";

const COLS = 12;
const ROWS = 10;
const BUBBLE_RADIUS = 22;
const COLORS = ["#FF4D6D", "#FF9F1C", "#2EC4B6", "#6B4FBB", "#06D6A0", "#118AB2"];
const POWER_UP_COLORS = { bomb: "#FF0055", rainbow: "#FFD700", freeze: "#00CFFF" };

function hexOffset(row, col) {
  const x = col * (BUBBLE_RADIUS * 2 - 2) + (row % 2 === 1 ? BUBBLE_RADIUS - 1 : 0) + BUBBLE_RADIUS + 10;
  const y = row * (BUBBLE_RADIUS * 1.72) + BUBBLE_RADIUS + 10;
  return { x, y };
}

function initGrid() {
  const grid = [];
  for (let r = 0; r < 6; r++) {
    const row = [];
    const cols = r % 2 === 0 ? COLS : COLS - 1;
    for (let c = 0; c < cols; c++) {
      const rand = Math.random();
      if (rand < 0.05) row.push({ color: POWER_UP_COLORS.bomb, type: "bomb" });
      else if (rand < 0.08) row.push({ color: POWER_UP_COLORS.rainbow, type: "rainbow" });
      else row.push({ color: COLORS[Math.floor(Math.random() * COLORS.length)], type: "normal" });
    }
    grid.push(row);
  }
  return grid;
}

function randomBubble() {
  const rand = Math.random();
  if (rand < 0.05) return { color: POWER_UP_COLORS.bomb, type: "bomb" };
  if (rand < 0.08) return { color: POWER_UP_COLORS.rainbow, type: "rainbow" };
  return { color: COLORS[Math.floor(Math.random() * COLORS.length)], type: "normal" };
}

const LEVELS = [
  { name: "Level 1", targetScore: 500, timeLimit: 60, rows: 5 },
  { name: "Level 2", targetScore: 1200, timeLimit: 55, rows: 6 },
  { name: "Level 3", targetScore: 2500, timeLimit: 50, rows: 7 },
  { name: "Level 4", targetScore: 4000, timeLimit: 45, rows: 8 },
  { name: "Level 5", targetScore: 6000, timeLimit: 40, rows: 9 },
];

const LEADERBOARD_INIT = [
  { name: "StarBlaster", score: 8200 },
  { name: "BubblePro", score: 6500 },
  { name: "NeonShot", score: 5100 },
  { name: "CosmicAim", score: 3800 },
  { name: "You", score: 0 },
];

const CANVAS_W = 540;
const CANVAS_H = 480;

export default function BubbleShooter() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({});
  const soundCtxRef = useRef(null);

  const [screen, setScreen] = useState("menu"); // menu | game | levelup | gameover | leaderboard
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [leaderboard, setLeaderboard] = useState(LEADERBOARD_INIT);
  const [combo, setCombo] = useState(0);
  const [powerupMsg, setPowerupMsg] = useState("");
  const [frozen, setFrozen] = useState(false);
  const timerRef = useRef(null);

  const playSound = useCallback((type) => {
    try {
      if (!soundCtxRef.current) soundCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = soundCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === "pop") {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(); osc.stop(ctx.currentTime + 0.12);
      } else if (type === "shoot") {
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.07);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(); osc.stop(ctx.currentTime + 0.08);
      } else if (type === "combo") {
        [0, 0.08, 0.16].forEach((t, i) => {
          const o2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.frequency.setValueAtTime(500 + i * 200, ctx.currentTime + t);
          g2.gain.setValueAtTime(0.14, ctx.currentTime + t);
          g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.1);
          o2.start(ctx.currentTime + t); o2.stop(ctx.currentTime + t + 0.1);
        });
      } else if (type === "bomb") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(); osc.stop(ctx.currentTime + 0.25);
      }
    } catch {}
  }, []);

  function startGame(lvlIdx = 0) {
    const grid = initGrid();
    const shooter = randomBubble();
    const next = randomBubble();
    stateRef.current = {
      grid,
      shooter,
      next,
      projectile: null,
      particles: [],
      aimAngle: -Math.PI / 2,
      frozen: false,
      score: 0,
      combo: 0,
      level: lvlIdx,
    };
    setScore(0);
    setLevel(lvlIdx);
    setTimeLeft(LEVELS[lvlIdx].timeLimit);
    setCombo(0);
    setFrozen(false);
    setPowerupMsg("");
    setScreen("game");
  }

  // Timer
  useEffect(() => {
    if (screen !== "game") { clearInterval(timerRef.current); return; }
    if (stateRef.current.frozen) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, frozen]);

  function endGame() {
    const s = stateRef.current.score;
    setLeaderboard(prev => {
      const updated = [...prev];
      const youIdx = updated.findIndex(e => e.name === "You");
      if (youIdx >= 0) updated[youIdx].score = Math.max(updated[youIdx].score, s);
      return updated.sort((a, b) => b.score - a.score);
    });
    setScreen("gameover");
  }

  // Canvas game loop
  useEffect(() => {
    if (screen !== "game") { cancelAnimationFrame(animRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function drawBubble(x, y, color, type, r = BUBBLE_RADIUS) {
      ctx.save();
      const grd = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      grd.addColorStop(0, lighten(color, 60));
      grd.addColorStop(0.6, color);
      grd.addColorStop(1, darken(color, 40));
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
      if (type === "bomb") {
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${r}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("💣", x, y);
      } else if (type === "rainbow") {
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${r}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🌈", x, y);
      }
      // Shine
      ctx.beginPath();
      ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fill();
      ctx.restore();
    }

    function lighten(hex, amt) {
      let r = parseInt(hex.slice(1, 3), 16);
      let g = parseInt(hex.slice(3, 5), 16);
      let b = parseInt(hex.slice(5, 7), 16);
      return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt)},${Math.min(255, b + amt)})`;
    }
    function darken(hex, amt) {
      let r = parseInt(hex.slice(1, 3), 16);
      let g = parseInt(hex.slice(3, 5), 16);
      let b = parseInt(hex.slice(5, 7), 16);
      return `rgb(${Math.max(0, r - amt)},${Math.max(0, g - amt)},${Math.max(0, b - amt)})`;
    }

    function drawGrid(grid) {
      grid.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (!cell) return;
          const { x, y } = hexOffset(r, c);
          drawBubble(x, y, cell.color, cell.type);
        });
      });
    }

    function drawParticles(particles) {
      particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      });
    }

    function drawAimLine(angle) {
      const sx = CANVAS_W / 2, sy = CANVAS_H - 55;
      ctx.save();
      ctx.setLineDash([8, 10]);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(angle) * 200, sy + Math.sin(angle) * 200);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    function loop() {
      const st = stateRef.current;
      // Background
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bg.addColorStop(0, "#0a0a1a");
      bg.addColorStop(1, "#12103a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Stars
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 137 + 17) % CANVAS_W);
        const sy2 = ((i * 83 + 7) % (CANVAS_H - 80));
        ctx.beginPath();
        ctx.arc(sx, sy2, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      drawGrid(st.grid);
      drawAimLine(st.aimAngle);

      // Projectile
      if (st.projectile) {
        const p = st.projectile;
        drawBubble(p.x, p.y, p.color, p.type);
        p.x += p.vx;
        p.y += p.vy;
        if (p.x - BUBBLE_RADIUS < 0) { p.x = BUBBLE_RADIUS; p.vx *= -1; }
        if (p.x + BUBBLE_RADIUS > CANVAS_W) { p.x = CANVAS_W - BUBBLE_RADIUS; p.vx *= -1; }
        // Hit top
        if (p.y - BUBBLE_RADIUS <= 10) {
          snapBubble(p.x, p.y, p);
          st.projectile = null;
        } else {
          // Collision with grid
          let snapped = false;
          for (let r = 0; r < st.grid.length && !snapped; r++) {
            for (let c = 0; c < st.grid[r].length && !snapped; c++) {
              if (!st.grid[r][c]) continue;
              const pos = hexOffset(r, c);
              const dx = p.x - pos.x, dy = p.y - pos.y;
              if (Math.sqrt(dx * dx + dy * dy) < BUBBLE_RADIUS * 1.85) {
                snapBubble(p.x, p.y, p);
                st.projectile = null;
                snapped = true;
              }
            }
          }
        }
      }

      // Particles
      st.particles = st.particles.filter(p => p.alpha > 0.02);
      st.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.alpha -= 0.025; p.r *= 0.97;
      });
      drawParticles(st.particles);

      // Shooter bubble
      const sx2 = CANVAS_W / 2, sy2 = CANVAS_H - 55;
      drawBubble(sx2, sy2, st.shooter.color, st.shooter.type, BUBBLE_RADIUS + 2);

      // Next bubble
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.roundRect(CANVAS_W - 72, CANVAS_H - 78, 58, 58, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "bold 10px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillText("NEXT", CANVAS_W - 43, CANVAS_H - 66);
      drawBubble(CANVAS_W - 43, CANVAS_H - 44, st.next.color, st.next.type, BUBBLE_RADIUS - 5);
      ctx.restore();

      // Check win
      if (st.score >= LEVELS[st.level].targetScore) {
        if (st.level < LEVELS.length - 1) {
          setScore(st.score);
          setLevel(st.level);
          setScreen("levelup");
        } else {
          setScore(st.score);
          endGame();
        }
        return;
      }

      // Check lose (bubbles reach bottom)
      const lastRow = st.grid[st.grid.length - 1];
      if (lastRow && lastRow.some(b => b)) {
        const lastPos = hexOffset(st.grid.length - 1, 0);
        if (lastPos.y + BUBBLE_RADIUS > CANVAS_H - 90) {
          setScore(st.score);
          endGame();
          return;
        }
      }

      animRef.current = requestAnimationFrame(loop);
    }

    function snapBubble(px, py, proj) {
      const st = stateRef.current;
      let bestRow = -1, bestCol = -1, bestDist = Infinity;
      for (let r = 0; r <= st.grid.length; r++) {
        const cols = r % 2 === 0 ? COLS : COLS - 1;
        for (let c = 0; c < cols; c++) {
          if (r < st.grid.length && st.grid[r][c]) continue;
          const pos = hexOffset(r, c);
          const d = Math.hypot(px - pos.x, py - pos.y);
          if (d < bestDist) { bestDist = d; bestRow = r; bestCol = c; }
        }
      }
      if (bestRow === -1) return;
      while (st.grid.length <= bestRow) st.grid.push([]);
      if (!st.grid[bestRow]) st.grid[bestRow] = [];
      st.grid[bestRow][bestCol] = { color: proj.color, type: proj.type };

      // Handle power-ups
      if (proj.type === "bomb") {
        playSound("bomb");
        explodeAround(bestRow, bestCol);
        setPowerupMsg("💣 BOMB!");
        setTimeout(() => setPowerupMsg(""), 1000);
      } else if (proj.type === "rainbow") {
        playSound("combo");
        clearAllOfMostColor();
        setPowerupMsg("🌈 RAINBOW!");
        setTimeout(() => setPowerupMsg(""), 1000);
      } else {
        const popped = findMatches(bestRow, bestCol, proj.color);
        if (popped.length >= 3) {
          st.combo++;
          setCombo(st.combo);
          const pts = popped.length * 10 * st.combo;
          st.score += pts;
          setScore(st.score);
          popped.forEach(([r, c]) => {
            const pos = hexOffset(r, c);
            spawnParticles(pos.x, pos.y, st.grid[r][c]?.color || proj.color);
            st.grid[r][c] = null;
          });
          if (st.combo >= 3) { playSound("combo"); setPowerupMsg(`🔥 x${st.combo} COMBO!`); setTimeout(() => setPowerupMsg(""), 900); }
          else playSound("pop");
          dropFloating();
        } else {
          st.combo = 0;
          setCombo(0);
        }
      }

      st.shooter = st.next;
      st.next = randomBubble();
    }

    function findMatches(row, col, color) {
      const visited = new Set();
      const stack = [[row, col]];
      const matched = [];
      while (stack.length) {
        const [r, c] = stack.pop();
        const key = `${r},${c}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (!stateRef.current.grid[r] || !stateRef.current.grid[r][c]) continue;
        const cell = stateRef.current.grid[r][c];
        if (cell.color !== color && cell.type !== "rainbow") continue;
        matched.push([r, c]);
        getNeighbors(r, c).forEach(n => stack.push(n));
      }
      return matched;
    }

    function getNeighbors(r, c) {
      const isOdd = r % 2 === 1;
      const dirs = isOdd
        ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
        : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
      return dirs.map(([dr, dc]) => [r + dr, c + dc]).filter(([nr, nc]) =>
        nr >= 0 && nr < stateRef.current.grid.length && nc >= 0 && stateRef.current.grid[nr] && nc < stateRef.current.grid[nr].length
      );
    }

    function explodeAround(row, col) {
      const st = stateRef.current;
      getNeighbors(row, col).forEach(([r, c]) => {
        if (st.grid[r] && st.grid[r][c]) {
          const pos = hexOffset(r, c);
          spawnParticles(pos.x, pos.y, st.grid[r][c].color);
          st.grid[r][c] = null;
          st.score += 15;
          setScore(st.score);
        }
      });
      if (st.grid[row]) { st.grid[row][col] = null; st.score += 15; setScore(st.score); }
      dropFloating();
    }

    function clearAllOfMostColor() {
      const st = stateRef.current;
      const counts = {};
      st.grid.forEach((row, r) => row && row.forEach((cell, c) => {
        if (cell && cell.type === "normal") counts[cell.color] = (counts[cell.color] || 0) + 1;
      }));
      const topColor = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!topColor) return;
      st.grid.forEach((row, r) => row && row.forEach((cell, c) => {
        if (cell && cell.color === topColor) {
          const pos = hexOffset(r, c);
          spawnParticles(pos.x, pos.y, topColor);
          st.grid[r][c] = null;
          st.score += 12;
          setScore(st.score);
        }
      }));
      dropFloating();
    }

    function dropFloating() {
      const st = stateRef.current;
      const connected = new Set();
      // BFS from top row
      const queue = [];
      if (st.grid[0]) st.grid[0].forEach((cell, c) => { if (cell) { queue.push([0, c]); connected.add(`0,${c}`); } });
      while (queue.length) {
        const [r, c] = queue.shift();
        getNeighbors(r, c).forEach(([nr, nc]) => {
          const key = `${nr},${nc}`;
          if (!connected.has(key) && st.grid[nr] && st.grid[nr][nc]) {
            connected.add(key);
            queue.push([nr, nc]);
          }
        });
      }
      st.grid.forEach((row, r) => row && row.forEach((cell, c) => {
        if (cell && !connected.has(`${r},${c}`)) {
          const pos = hexOffset(r, c);
          spawnParticles(pos.x, pos.y, cell.color);
          st.grid[r][c] = null;
          st.score += 20;
          setScore(st.score);
        }
      }));
    }

    function spawnParticles(x, y, color) {
      const st = stateRef.current;
      for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3;
        st.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1.5, r: 4 + Math.random() * 5, color, alpha: 1 });
      }
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [screen]);

  // Mouse/touch aim and shoot
  useEffect(() => {
    if (screen !== "game") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    function getAngle(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      const sx = CANVAS_W / 2, sy = CANVAS_H - 55;
      return Math.atan2(cy - sy, cx - sx);
    }
    function onMove(e) {
      const angle = getAngle(e);
      if (angle > -Math.PI + 0.15 && angle < -0.15) stateRef.current.aimAngle = angle;
    }
    function onClick(e) {
      const st = stateRef.current;
      if (st.projectile) return;
      const angle = getAngle(e);
      if (angle > -Math.PI + 0.15 && angle < -0.15) {
        st.aimAngle = angle;
        const speed = 13;
        st.projectile = { x: CANVAS_W / 2, y: CANVAS_H - 55, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: st.shooter.color, type: st.shooter.type };
        playSound("shoot");
      }
    }
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchmove", e => { e.preventDefault(); onMove(e.touches[0]); }, { passive: false });
    canvas.addEventListener("touchend", e => { e.preventDefault(); onClick(e.changedTouches[0]); }, { passive: false });
    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
    };
  }, [screen]);

  const lvlData = LEVELS[level] || LEVELS[0];
  const progress = Math.min(1, score / lvlData.targetScore);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a1a 0%,#12103a 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Courier New', monospace", color: "#fff", userSelect: "none" }}>

      {/* MENU */}
      {screen === "menu" && (
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>🫧</div>
          <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: 4, background: "linear-gradient(90deg,#FF4D6D,#FFD700,#2EC4B6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 }}>BUBBLE</div>
          <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: 8, background: "linear-gradient(90deg,#2EC4B6,#6B4FBB,#FF4D6D)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 28 }}>BLASTER</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
            <button onClick={() => startGame(0)} style={btnStyle("#FF4D6D")}>🚀 PLAY</button>
            <button onClick={() => setScreen("leaderboard")} style={btnStyle("#FFD700")}>🏆 LEADERBOARD</button>
          </div>
          <div style={{ marginTop: 28, opacity: 0.5, fontSize: 13 }}>
            Match 3+ bubbles • 💣 Bomb explodes neighbors • 🌈 Rainbow clears color
          </div>
        </div>
      )}

      {/* GAME */}
      {screen === "game" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          {/* HUD */}
          <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 4, width: CANVAS_W, justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontSize: 11, opacity: 0.6 }}>SCORE</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#FFD700" }}>{score}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{ fontSize: 13, opacity: 0.6 }}>{lvlData.name}</div>
              <div style={{ width: 180, height: 10, background: "rgba(255,255,255,0.12)", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: `${progress * 100}%`, height: "100%", background: "linear-gradient(90deg,#2EC4B6,#FFD700)", borderRadius: 5, transition: "width 0.4s" }} />
              </div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>{score} / {lvlData.targetScore}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <div style={{ fontSize: 11, opacity: 0.6 }}>TIME</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: timeLeft <= 10 ? "#FF4D6D" : "#fff" }}>{timeLeft}s</div>
            </div>
          </div>

          {/* Powerup message */}
          {powerupMsg && (
            <div style={{ position: "absolute", fontSize: 28, fontWeight: 900, color: "#FFD700", textShadow: "0 0 20px #FFD700", pointerEvents: "none", zIndex: 10, animation: "fadeUp 0.9s ease forwards" }}>
              {powerupMsg}
            </div>
          )}
          {combo >= 2 && (
            <div style={{ fontSize: 14, color: "#FF9F1C", fontWeight: 700, letterSpacing: 2 }}>🔥 COMBO x{combo}</div>
          )}

          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
            style={{ borderRadius: 18, boxShadow: "0 0 60px rgba(110,70,200,0.4), 0 0 0 2px rgba(255,255,255,0.08)", cursor: "crosshair", maxWidth: "100vw" }} />

          <button onClick={endGame} style={{ marginTop: 8, padding: "7px 22px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#aaa", fontSize: 13, cursor: "pointer" }}>Quit</button>
        </div>
      )}

      {/* LEVEL UP */}
      {screen === "levelup" && (
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 64 }}>🎉</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#FFD700", marginBottom: 8 }}>LEVEL UP!</div>
          <div style={{ fontSize: 18, opacity: 0.7, marginBottom: 4 }}>Score: <b style={{ color: "#FFD700" }}>{score}</b></div>
          <div style={{ fontSize: 16, opacity: 0.6, marginBottom: 28 }}>Next: {LEVELS[level + 1]?.name}</div>
          <button onClick={() => startGame(level + 1)} style={btnStyle("#06D6A0")}>▶ NEXT LEVEL</button>
        </div>
      )}

      {/* GAME OVER */}
      {screen === "gameover" && (
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 56 }}>💥</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#FF4D6D", marginBottom: 8 }}>GAME OVER</div>
          <div style={{ fontSize: 22, color: "#FFD700", marginBottom: 4 }}>Score: <b>{score}</b></div>
          <div style={{ fontSize: 15, opacity: 0.5, marginBottom: 28 }}>{lvlData.name} • Target: {lvlData.targetScore}</div>
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <button onClick={() => startGame(0)} style={btnStyle("#FF4D6D")}>🔄 RETRY</button>
            <button onClick={() => setScreen("leaderboard")} style={btnStyle("#FFD700")}>🏆 SCORES</button>
            <button onClick={() => setScreen("menu")} style={btnStyle("#6B4FBB")}>🏠 MENU</button>
          </div>
        </div>
      )}

      {/* LEADERBOARD */}
      {screen === "leaderboard" && (
        <div style={{ textAlign: "center", padding: 32, minWidth: 320 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#FFD700", marginBottom: 24, letterSpacing: 3 }}>🏆 TOP SCORES</div>
          {leaderboard.map((entry, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", marginBottom: 10, background: entry.name === "You" ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.06)", borderRadius: 12, border: entry.name === "You" ? "1px solid rgba(255,215,0,0.4)" : "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 22 }}>{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}</span>
              <span style={{ flex: 1, textAlign: "left", marginLeft: 14, fontWeight: entry.name === "You" ? 900 : 400, color: entry.name === "You" ? "#FFD700" : "#fff" }}>{entry.name}</span>
              <span style={{ fontWeight: 900, color: "#2EC4B6", fontSize: 18 }}>{entry.score.toLocaleString()}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <button onClick={() => startGame(0)} style={btnStyle("#FF4D6D")}>🚀 PLAY</button>
            <button onClick={() => setScreen("menu")} style={btnStyle("#6B4FBB")}>🏠 MENU</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-40px)} }
      `}</style>
    </div>
  );
}

function btnStyle(color) {
  return {
    padding: "14px 36px",
    background: `linear-gradient(135deg, ${color}cc, ${color}88)`,
    border: `2px solid ${color}`,
    borderRadius: 14,
    color: "#fff",
    fontSize: 16,
    fontWeight: 900,
    letterSpacing: 2,
    cursor: "pointer",
    fontFamily: "'Courier New', monospace",
    boxShadow: `0 4px 24px ${color}55`,
    transition: "transform 0.1s, box-shadow 0.1s",
  };
}
