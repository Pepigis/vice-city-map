import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Crown,
  DollarSign,
  ExternalLink,
  Eye,
  Moon,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  Trophy,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

/**
 * ============================================================================
 * TADY PŘIDÁVÁŠ NOVÉ DÁRCE PO PLATBĚ NA KO-FI
 * Stačí přidat objekt do pole LIVE_DONORS a uložit (git push -> Vercel aktualizuje web).
 * - plot: číslo parcely 1 až 1224
 * - name: @uživatelské_jméno dárce
 * - amount: částka v USD (1 = Bungalov, 5+ = Vila s bazénem, 10+ = Mrakodrap)
 * - message: volitelný vzkaz z Ko-fi
 * ============================================================================
 */
const LIVE_DONORS = [
  // Příklad prvního dárce (odkomentuj až někdo pošle první $1):
  // { plot: 1, name: "@first_builder", amount: 1, message: "First! Road to GTA 6!" },
];

// Demo data pro natáčení ukázek do videa (přepíná se tlačítkem "Demo Preview" v hlavičce)
const DEMO_DONORS = [
  { plot: 1, name: "@vice_mayor", amount: 10, message: "Claimed #0001! Let's get that Xbox!" },
  { plot: 2, name: "@alex_codes", amount: 5, message: "Respect for hand-coding in React" },
  { plot: 3, name: "@lucia_vc", amount: 1, message: "1 pixel closer to Vice City!" },
  { plot: 4, name: "@jason_gta", amount: 5, message: "Pool villa right by the beach" },
  { plot: 5, name: "@karel_cz", amount: 1, message: "Zdravím z Česka!" },
  { plot: 8, name: "@neon_rider", amount: 10, message: "Building the skyline!" },
  { plot: 12, name: "@pixel_hunter", amount: 1, message: "My $1 brick" },
  { plot: 15, name: "@dev_sarah", amount: 5, message: "Love the isometric canvas" },
  { plot: 19, name: "@tommy_v", amount: 15, message: "Tommy Vercetti Tower" },
  { plot: 24, name: "@marcus_gg", amount: 1, message: "From TikTok!" },
  { plot: 37, name: "@elena_art", amount: 5, message: "Night mode looks insane" },
  { plot: 42, name: "@react_wizard", amount: 10, message: "60 FPS SVG/Canvas power" },
  { plot: 55, name: "@dan_plays", amount: 1, message: "Good luck bro" },
  { plot: 64, name: "@miami_86", amount: 5, message: "Vice City vibes" },
  { plot: 73, name: "@nico_bellic", amount: 1, message: "Bowling later?" },
  { plot: 88, name: "@crypto_cat", amount: 10, message: "Penthouse view" },
  { plot: 101, name: "@student_cz", amount: 1, message: "Držím palce!" },
  { plot: 118, name: "@sofia_m", amount: 5, message: "Greetings from Spain" },
  { plot: 130, name: "@hyper_clip", amount: 1, message: "Saw your Shorts!" },
  { plot: 145, name: "@cyber_punk", amount: 10, message: "Neon skyscraper club" },
  { plot: 162, name: "@lucas_dev", amount: 1, message: "Clean code" },
  { plot: 180, name: "@hannah_k", amount: 5, message: "Pool party at #0180" },
  { plot: 205, name: "@drift_king", amount: 1, message: "GTA 6 hype" },
  { plot: 222, name: "@max_power", amount: 5, message: "Keep grinding!" },
  { plot: 250, name: "@zero_to_hero", amount: 10, message: "Quarter thousand!" },
];

const COLS = 36;
const ROWS = 34; // 36 * 34 = 1,224 parcel
const TOTAL_PLOTS = COLS * ROWS;
const GOAL_USD = 1224;
const KOFI_URL = "https://ko-fi.com/vectorbra1n";

const TILE_W = 44;
const TILE_H = 22;

function getTier(amount, isFounder) {
  if (isFounder) return "founder";
  if (amount >= 10) return "skyscraper";
  if (amount >= 5) return "villa";
  return "bungalow";
}

function getTierLabel(tier) {
  switch (tier) {
    case "founder":
      return "Mayor's Founder Villa (#0001)";
    case "skyscraper":
      return "Neon Skyscraper ($10+)";
    case "villa":
      return "Pool Villa ($5+)";
    default:
      return "Beach Bungalow ($1)";
  }
}

export default function App() {
  const canvasRef = useRef(null);

  const [isNight, setIsNight] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlot, setSelectedPlot] = useState(1);
  const [hoveredPlot, setHoveredPlot] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Kamera (posun a přiblížení)
  const [camera, setCamera] = useState({ x: 0, y: -60, zoom: 1.05 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, moved: false });

  const activeDonors = demoMode ? DEMO_DONORS : LIVE_DONORS;

  const donorMap = useMemo(() => {
    const map = new Map();
    for (const d of activeDonors) {
      if (d.plot >= 1 && d.plot <= TOTAL_PLOTS) {
        map.set(d.plot, d);
      }
    }
    return map;
  }, [activeDonors]);

  const totalRaised = useMemo(() => {
    return activeDonors.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [activeDonors]);

  const progressPct = Math.min(100, (totalRaised / GOAL_USD) * 100);

  // Převod čísla parcely (1..1224) na souřadnice mřížky
  const plotToGrid = (plotNum) => {
    const idx = plotNum - 1;
    const row = Math.floor(idx / COLS);
    const col = idx % COLS;
    return { col, row };
  };

  // Převod souřadnic mřížky na izometrický střed
  const gridToIso = (col, row) => {
    const centerCol = COLS / 2;
    const centerRow = ROWS / 2;
    const dc = col - centerCol;
    const dr = row - centerRow;
    return {
      x: (dc - dr) * (TILE_W / 2),
      y: (dc + dr) * (TILE_H / 2),
    };
  };

  // Vycentrování kamery na konkrétní parcelu
  const focusPlot = (plotNum) => {
    const { col, row } = plotToGrid(plotNum);
    const iso = gridToIso(col, row);
    setSelectedPlot(plotNum);
    setCamera((prev) => ({
      x: -iso.x * Math.max(prev.zoom, 1.4),
      y: -iso.y * Math.max(prev.zoom, 1.4),
      zoom: Math.max(prev.zoom, 1.4),
    }));
  };

  // Vyhledávání podle @jména nebo čísla parcely
  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase().replace(/^#/, "");
    if (!q) return;

    const asNum = parseInt(q, 10);
    if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= TOTAL_PLOTS) {
      focusPlot(asNum);
      return;
    }

    for (const [plot, donor] of donorMap.entries()) {
      if (donor.name.toLowerCase().includes(q)) {
        focusPlot(plot);
        return;
      }
    }
  };

  // Vykreslení izometrického ostrova v 60 FPS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const render = (timeMs) => {
      const t = timeMs * 0.001;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;

      // Pozadí oceánu
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      if (isNight) {
        bgGrad.addColorStop(0, "#050814");
        bgGrad.addColorStop(0.5, "#09152B");
        bgGrad.addColorStop(1, "#061E2E");
      } else {
        bgGrad.addColorStop(0, "#0284C7");
        bgGrad.addColorStop(0.5, "#0EA5E9");
        bgGrad.addColorStop(1, "#06B6D4");
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Jemné vlny na oceánu
      ctx.strokeStyle = isNight
        ? "rgba(56, 189, 248, 0.08)"
        : "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) {
        const wy = ((i * 95 + t * 18) % (h + 60)) - 30;
        ctx.beginPath();
        for (let wx = 0; wx <= w; wx += 40) {
          const offset = Math.sin(wx * 0.015 + t * 2 + i) * 4;
          if (wx === 0) ctx.moveTo(wx, wy + offset);
          else ctx.lineTo(wx, wy + offset);
        }
        ctx.stroke();
      }

      // Posun do středu obrazovky + kamera
      ctx.translate(w / 2 + camera.x, h / 2 + camera.y);
      ctx.scale(camera.zoom, camera.zoom);

      // Písečná pláž a podkladový útes pod celým ostrovem
      const topCorner = gridToIso(-1.2, -1.2);
      const rightCorner = gridToIso(COLS + 0.2, -1.2);
      const bottomCorner = gridToIso(COLS + 0.2, ROWS + 0.2);
      const leftCorner = gridToIso(-1.2, ROWS + 0.2);

      // Hloubka útesu
      ctx.beginPath();
      ctx.moveTo(leftCorner.x, leftCorner.y);
      ctx.lineTo(bottomCorner.x, bottomCorner.y);
      ctx.lineTo(rightCorner.x, rightCorner.y);
      ctx.lineTo(rightCorner.x, rightCorner.y + 26);
      ctx.lineTo(bottomCorner.x, bottomCorner.y + 26);
      ctx.lineTo(leftCorner.x, leftCorner.y + 26);
      ctx.closePath();
      ctx.fillStyle = isNight ? "#1E1B4B" : "#B45309";
      ctx.fill();

      // Písečný okraj ostrova
      ctx.beginPath();
      ctx.moveTo(topCorner.x, topCorner.y);
      ctx.lineTo(rightCorner.x, rightCorner.y);
      ctx.lineTo(bottomCorner.x, bottomCorner.y);
      ctx.lineTo(leftCorner.x, leftCorner.y);
      ctx.closePath();
      ctx.fillStyle = isNight ? "#312E81" : "#FDE68A";
      ctx.fill();

      // Vykreslení všech 1 224 parcel odzadu dopředu (malířův algoritmus)
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const plotNum = row * COLS + col + 1;
          const { x, y } = gridToIso(col, row);
          const donor = donorMap.get(plotNum);
          const isSelected = selectedPlot === plotNum;
          const isHovered = hoveredPlot === plotNum;
          const isPlotOne = plotNum === 1;

          // Hlavní promenáda uprostřed ostrova
          const isAvenue = col === 17 || col === 18 || row === 16 || row === 17;

          // Základní kosočtverec parcely
          ctx.beginPath();
          ctx.moveTo(x, y - TILE_H / 2);
          ctx.lineTo(x + TILE_W / 2, y);
          ctx.lineTo(x, y + TILE_H / 2);
          ctx.lineTo(x - TILE_W / 2, y);
          ctx.closePath();

          if (donor) {
            ctx.fillStyle = isNight ? "#064E3B" : "#34D399";
          } else if (isPlotOne) {
            const pulse = 0.55 + Math.abs(Math.sin(t * 3.5)) * 0.45;
            ctx.fillStyle = `rgba(251, 191, 36, ${pulse})`;
          } else if (isAvenue) {
            ctx.fillStyle = isNight ? "#1E293B" : "#CBD5E1";
          } else {
            ctx.fillStyle = isNight ? "#0F172A" : "#86EFAC";
          }
          ctx.fill();

          // Mřížka parcel
          ctx.strokeStyle = isSelected
            ? "#FBBF24"
            : isHovered
              ? "#38BDF8"
              : isNight
                ? "rgba(56, 189, 248, 0.16)"
                : "rgba(15, 23, 42, 0.14)";
          ctx.lineWidth = isSelected || isHovered ? 2 : 0.8;
          ctx.stroke();

          // Maják pro neobsazenou Parcelu #0001 (Founder's Special)
          if (isPlotOne && !donor) {
            const beamHeight = 36 + Math.sin(t * 4) * 6;
            const beamGrad = ctx.createLinearGradient(x, y, x, y - beamHeight);
            beamGrad.addColorStop(0, "rgba(251, 191, 36, 0.85)");
            beamGrad.addColorStop(1, "rgba(251, 191, 36, 0)");
            ctx.fillStyle = beamGrad;
            ctx.fillRect(x - 6, y - beamHeight, 12, beamHeight);

            ctx.fillStyle = "#FEF08A";
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("#0001", x, y - beamHeight - 3);
          }

          // Vykreslení budovy, pokud je parcela obsazená
          if (donor) {
            const tier = getTier(donor.amount, plotNum === 1);
            drawBuilding(ctx, x, y, tier, isNight, t);

            // Jmenovka nad budovou při větším přiblížení nebo výběru
            if (camera.zoom >= 1.35 || isSelected || isHovered) {
              ctx.font = "bold 9px system-ui, sans-serif";
              const label = donor.name;
              const tw = ctx.measureText(label).width + 10;
              const bh = tier === "skyscraper" ? 56 : tier === "villa" || tier === "founder" ? 30 : 20;

              ctx.fillStyle = "rgba(9, 13, 22, 0.88)";
              ctx.beginPath();
              ctx.roundRect(x - tw / 2, y - bh - 16, tw, 14, 4);
              ctx.fill();

              ctx.strokeStyle = isSelected ? "#FBBF24" : "#38BDF8";
              ctx.lineWidth = 1;
              ctx.stroke();

              ctx.fillStyle = "#F8FAFC";
              ctx.textAlign = "center";
              ctx.fillText(label, x, y - bh - 6);
            }
          }
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [camera, donorMap, hoveredPlot, isNight, selectedPlot]);

  // Vykreslení konkrétní budovy podle částky ($1 / $5 / $10+)
  function drawBuilding(ctx, x, y, tier, night, t) {
    if (tier === "bungalow") {
      // Malý plážový bungalov ($1)
      const h = 11;
      const w = 11;
      // Levá stěna
      ctx.fillStyle = night ? "#0284C7" : "#38BDF8";
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.lineTo(x, y + w * 0.5);
      ctx.lineTo(x, y + w * 0.5 - h);
      ctx.lineTo(x - w, y - h);
      ctx.closePath();
      ctx.fill();

      // Pravá stěna
      ctx.fillStyle = night ? "#0369A1" : "#0284C7";
      ctx.beginPath();
      ctx.moveTo(x, y + w * 0.5);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y - h);
      ctx.lineTo(x, y + w * 0.5 - h);
      ctx.closePath();
      ctx.fill();

      // Růžová Vice City střecha
      ctx.fillStyle = "#F472B6";
      ctx.beginPath();
      ctx.moveTo(x, y - w * 0.5 - h);
      ctx.lineTo(x + w, y - h);
      ctx.lineTo(x, y + w * 0.5 - h);
      ctx.lineTo(x - w, y - h);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (tier === "villa" || tier === "founder") {
      // Luxusní vila s bazénem ($5 nebo #0001 Founder)
      const h = 18;
      const w = 13;
      const isFounder = tier === "founder";

      // Tělo vily
      ctx.fillStyle = isFounder ? "#FDE047" : night ? "#E2E8F0" : "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.lineTo(x, y + w * 0.5);
      ctx.lineTo(x, y + w * 0.5 - h);
      ctx.lineTo(x - w, y - h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isFounder ? "#EAB308" : night ? "#94A3B8" : "#CBD5E1";
      ctx.beginPath();
      ctx.moveTo(x, y + w * 0.5);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y - h);
      ctx.lineTo(x, y + w * 0.5 - h);
      ctx.closePath();
      ctx.fill();

      // Střecha s tyrkysovým střešním bazénem
      ctx.fillStyle = isFounder ? "#F59E0B" : "#EC4899";
      ctx.beginPath();
      ctx.moveTo(x, y - w * 0.5 - h);
      ctx.lineTo(x + w, y - h);
      ctx.lineTo(x, y + w * 0.5 - h);
      ctx.lineTo(x - w, y - h);
      ctx.closePath();
      ctx.fill();

      // Zářící bazén na terase
      ctx.fillStyle = "#22D3EE";
      ctx.beginPath();
      ctx.ellipse(x, y - h, 5.5, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Mrakodrap ($10+)
    const h = 44;
    const w = 13;

    // Levá fasáda
    ctx.fillStyle = night ? "#1E1B4B" : "#3B82F6";
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x, y + w * 0.5);
    ctx.lineTo(x, y + w * 0.5 - h);
    ctx.lineTo(x - w, y - h);
    ctx.closePath();
    ctx.fill();

    // Pravá fasáda
    ctx.fillStyle = night ? "#0F172A" : "#1D4ED8";
    ctx.beginPath();
    ctx.moveTo(x, y + w * 0.5);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y - h);
    ctx.lineTo(x, y + w * 0.5 - h);
    ctx.closePath();
    ctx.fill();

    // Neonová okna v noci
    if (night) {
      ctx.fillStyle = "#FDE047";
      for (let wy = 7; wy < h - 6; wy += 7) {
        ctx.fillRect(x - w + 3, y - wy, 3, 2.5);
        ctx.fillRect(x + 4, y - wy + 1, 3, 2.5);
      }
    }

    // Střecha + neonový lem
    ctx.fillStyle = "#10B981";
    ctx.beginPath();
    ctx.moveTo(x, y - w * 0.5 - h);
    ctx.lineTo(x + w, y - h);
    ctx.lineTo(x, y + w * 0.5 - h);
    ctx.lineTo(x - w, y - h);
    ctx.closePath();
    ctx.fill();

    // Blikající maják na špičce mrakodrapu
    const beacon = 0.4 + Math.abs(Math.sin(t * 4 + x)) * 0.6;
    ctx.fillStyle = `rgba(244, 114, 182, ${beacon})`;
    ctx.beginPath();
    ctx.arc(x, y - h - 4, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Zjištění čísla parcely pod kurzorem / prstem
  const getPlotAtClientPos = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;

    const wx = (sx - rect.width / 2 - camera.x) / camera.zoom;
    const wy = (sy - rect.height / 2 - camera.y) / camera.zoom;

    const dc = (wx / (TILE_W / 2) + wy / (TILE_H / 2)) / 2;
    const dr = (wy / (TILE_H / 2) - wx / (TILE_W / 2)) / 2;

    const col = Math.floor(dc + COLS / 2);
    const row = Math.floor(dr + ROWS / 2);

    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      return row * COLS + col + 1;
    }
    return null;
  };

  const handlePointerDown = (e) => {
    dragRef.current = {
      dragging: true,
      startX: e.clientX - camera.x,
      startY: e.clientY - camera.y,
      moved: false,
    };
  };

  const handlePointerMove = (e) => {
    if (dragRef.current.dragging) {
      const nextX = e.clientX - dragRef.current.startX;
      const nextY = e.clientY - dragRef.current.startY;
      if (Math.hypot(nextX - camera.x, nextY - camera.y) > 4) {
        dragRef.current.moved = true;
      }
      setCamera((prev) => ({ ...prev, x: nextX, y: nextY }));
      return;
    }
    const plot = getPlotAtClientPos(e.clientX, e.clientY);
    setHoveredPlot(plot);
  };

  const handlePointerUp = (e) => {
    const wasMoved = dragRef.current.moved;
    dragRef.current.dragging = false;
    if (!wasMoved) {
      const plot = getPlotAtClientPos(e.clientX, e.clientY);
      if (plot) setSelectedPlot(plot);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.9;
    setCamera((prev) => ({
      ...prev,
      zoom: Math.min(3.5, Math.max(0.55, prev.zoom * factor)),
    }));
  };

  const selectedDonor = donorMap.get(selectedPlot);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-white select-none font-sans">
      {/* Plátno s izometrickým ostrovem */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="h-full w-full cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Horní lišta s pokrokem a ovládáním */}
      <header className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-cyan-400/30 bg-slate-900/90 px-4 py-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-cyan-400 font-black text-slate-950 shadow-lg">
            VC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight sm:text-lg">
                BUILD VICE CITY
              </h1>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-400/40">
                1,224 PLOTS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Xbox Series X + GTA VI Challenge • Hand-Coded in React
            </p>
          </div>
        </div>

        {/* Ukazatel cíle $1,224 */}
        <div className="pointer-events-auto flex flex-1 max-w-md flex-col gap-1.5 rounded-2xl border border-emerald-400/30 bg-slate-900/90 px-4 py-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <DollarSign className="h-4 w-4" />
              ${totalRaised.toLocaleString()} / ${GOAL_USD.toLocaleString()}
            </span>
            <span className="text-slate-300">
              {activeDonors.length} / {TOTAL_PLOTS} Plots Built ({progressPct.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-pink-500 transition-all duration-500"
              style={{ width: `${Math.max(progressPct, totalRaised > 0 ? 2 : 0)}%` }}
            />
          </div>
        </div>

        {/* Vyhledávání + přepínače */}
        <div className="pointer-events-auto flex items-center gap-2">
          <form
            onSubmit={handleSearch}
            className="flex items-center rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 backdrop-blur-md"
          >
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find @user or #1..."
              className="w-32 bg-transparent px-2 text-xs text-white placeholder-slate-400 focus:outline-none sm:w-40"
            />
          </form>

          <button
            onClick={() => setDemoMode((v) => !v)}
            title="Preview how the island looks with 45 builders"
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
              demoMode
                ? "border-amber-400 bg-amber-400/20 text-amber-200"
                : "border-slate-700 bg-slate-900/90 text-slate-300 hover:border-slate-500"
            }`}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">
              {demoMode ? "Demo: ON" : "Demo Preview"}
            </span>
          </button>

          <button
            onClick={() => setIsNight((n) => !n)}
            title="Toggle Day / Neon Night"
            className="rounded-xl border border-slate-700 bg-slate-900/90 p-2 text-slate-200 hover:border-cyan-400 transition"
          >
            {isNight ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-cyan-300" />}
          </button>
        </div>
      </header>

      {/* Banner pro prvního dárce (pokud je vybráno $0) */}
      {!demoMode && totalRaised === 0 && (
        <div className="pointer-events-none absolute top-24 left-1/2 z-10 -translate-x-1/2">
          <button
            onClick={() => {
              focusPlot(1);
              setShowModal(true);
            }}
            className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-amber-300 bg-slate-900/95 px-4 py-1.5 text-xs font-black text-amber-200 shadow-[0_0_25px_rgba(251,191,36,0.45)] hover:scale-105 transition"
          >
            <Crown className="h-4 w-4 text-amber-400" />
            FOUNDER SPECIAL: Claim Plot #0001 for $1 & get a $5 Pool Villa!
          </button>
        </div>
      )}

      {/* Ovládání přiblížení vpravo dole */}
      <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-2 sm:bottom-6">
        <button
          onClick={() => setCamera((c) => ({ ...c, zoom: Math.min(3.5, c.zoom * 1.25) }))}
          className="rounded-xl border border-slate-700 bg-slate-900/90 p-2.5 text-slate-200 hover:border-cyan-400"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          onClick={() => setCamera((c) => ({ ...c, zoom: Math.max(0.55, c.zoom * 0.8) }))}
          className="rounded-xl border border-slate-700 bg-slate-900/90 p-2.5 text-slate-200 hover:border-cyan-400"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <button
          onClick={() => setCamera({ x: 0, y: -60, zoom: 1.05 })}
          className="rounded-xl border border-slate-700 bg-slate-900/90 p-2.5 text-slate-200 hover:border-cyan-400"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      {/* Spodní karta vybrané parcely + CTA tlačítko na Ko-fi */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="rounded-lg bg-slate-800 px-2.5 py-1 font-mono text-xs font-black text-cyan-300">
              PLOT #{String(selectedPlot).padStart(4, "0")}
            </span>
            {selectedDonor ? (
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                OWNED • ${selectedDonor.amount}
              </span>
            ) : (
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                AVAILABLE ($1+)
              </span>
            )}
          </div>

          {selectedDonor ? (
            <div className="mt-2.5">
              <div className="text-lg font-black text-white">{selectedDonor.name}</div>
              <div className="text-xs font-semibold text-pink-400">
                {getTierLabel(getTier(selectedDonor.amount, selectedPlot === 1))}
              </div>
              {selectedDonor.message && (
                <p className="mt-1.5 rounded-lg bg-slate-950/80 p-2 text-xs text-slate-300 border border-slate-800">
                  “{selectedDonor.message}”
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2.5">
              <div className="text-sm font-bold text-slate-200">
                {selectedPlot === 1
                  ? "👑 Mayor's Corner — Unclaimed!"
                  : "Empty beachfront land ready to build"}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Send $1 on Ko-fi with your <span className="text-white font-semibold">@username</span> and{" "}
                <span className="text-cyan-300 font-semibold">#{selectedPlot}</span> to build here!
              </p>
            </div>
          )}

          <button
            onClick={() => setShowModal(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-2.5 text-sm font-black text-slate-950 shadow-lg hover:brightness-110 transition"
          >
            <Sparkles className="h-4 w-4" />
            {selectedDonor ? "Build Your Own Plot ($1)" : `Claim Plot #${String(selectedPlot).padStart(4, "0")} ($1)`}
          </button>
        </div>

        {/* Legenda velikostí budov */}
        <div className="pointer-events-auto hidden items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs text-slate-300 backdrop-blur-md lg:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-sky-400" /> $1 Bungalow
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-pink-500" /> $5 Pool Villa
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-400" /> $10+ Skyscraper
          </span>
        </div>
      </div>

      {/* Modální okno s instrukcemi pro Ko-fi */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border-2 border-cyan-400/50 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-cyan-300 text-xs font-black uppercase tracking-wider">
              <Trophy className="h-4 w-4" /> Join the 1,224 Builders
            </div>
            <h2 className="mt-1 text-2xl font-black text-white">
              Claim Plot #{String(selectedPlot).padStart(4, "0")}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Every $1 goes directly toward the Xbox Series X + GTA VI goal and permanently places your building on this island + in the next YouTube/TikTok episode.
            </p>

            <div className="mt-4 space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-sky-400">$1 Donation</span>
                <span className="text-slate-300">Beach Bungalow + @name</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-pink-400">$5 Donation</span>
                <span className="text-slate-300">Luxury Pool Villa + custom note</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-emerald-400">$10+ Donation</span>
                <span className="text-slate-300">Neon Skyscraper + rooftop beacon</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <strong>Important:</strong> Write your <code>@username</code> and{" "}
              <code>#{selectedPlot}</code> in the Ko-fi message box so I know where to place your building!
            </div>

            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-pink-500 py-3 text-sm font-black text-slate-950 shadow-xl hover:brightness-110 transition"
            >
              Open Ko-fi ($1 Minimum)
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}