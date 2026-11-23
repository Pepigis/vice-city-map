import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Crown,
  DollarSign,
  ExternalLink,
  Eye,
  Flame,
  MapPin,
  Moon,
  Navigation,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Sun,
  Sunset,
  Trophy,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

/**
 * ============================================================================
 * TADY PŘIDÁVÁŠ NOVÉ DÁRCE PO PLATBĚ NA KO-FI
 * Stačí přidat objekt do pole LIVE_DONORS a uložit (git push -> Vercel aktualizuje web).
 * - plot: číslo parcely 1 až 1600
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
  { plot: 37, name: "@elena_art", amount: 5, message: "Sunset mode looks insane" },
  { plot: 42, name: "@react_wizard", amount: 10, message: "60 FPS Canvas power" },
  { plot: 69, name: "@vice_legend", amount: 10, message: "Had to claim #0069" },
  { plot: 88, name: "@crypto_cat", amount: 10, message: "Penthouse view" },
  { plot: 101, name: "@student_cz", amount: 1, message: "Držím palce!" },
  { plot: 118, name: "@sofia_m", amount: 5, message: "Greetings from Spain" },
  { plot: 145, name: "@cyber_punk", amount: 10, message: "Neon skyscraper club" },
  { plot: 180, name: "@hannah_k", amount: 5, message: "Pool party at #0180" },
  { plot: 250, name: "@zero_to_hero", amount: 10, message: "Quarter thousand!" },
  { plot: 420, name: "@miami_420", amount: 5, message: "Best spot in Downtown!" },
  { plot: 777, name: "@lucky_seven", amount: 20, message: "Jackpot skyscraper!" },
];

const COLS = 40;
const ROWS = 40; // 40 * 40 = 1,600 parcel (rezerva na poplatky PayPalu)
const TOTAL_PLOTS = COLS * ROWS;
const GOAL_USD = 1600;
const KOFI_URL = "https://ko-fi.com/vectorbra1n";

const TILE_W = 44;
const TILE_H = 22;

// Kultovní VIP čísla parcel zvýrazněná na mapě
const VIP_PLOTS = {
  1: { label: "Mayor's Founder Corner", short: "#0001" },
  69: { label: "Vice Legend Spot", short: "#0069" },
  420: { label: "High Roller Plot", short: "#0420" },
  777: { label: "Lucky Jackpot Plot", short: "#0777" },
  1337: { label: "Elite Coder Tower", short: "#1337" },
  1600: { label: "Final Boss Penthouse", short: "#1600" },
};

// Palmy rozmístěné kolem písečné pláže a u centrálního náměstí
const PALM_TREES = (() => {
  const list = [];
  let seed = 1;
  for (let i = 1; i < COLS - 1; i += 3) {
    list.push({ col: i + 0.5, row: -0.65, seed: seed++, layer: "back" });
    list.push({ col: -0.65, row: i + 0.5, seed: seed++, layer: "back" });
    list.push({ col: i + 0.5, row: ROWS - 0.35, seed: seed++, layer: "front" });
    list.push({ col: ROWS - 0.35, row: i + 0.5, seed: seed++, layer: "front" });
  }
  // 4 palmy kolem centrální fontány
  list.push({ col: 18.2, row: 18.2, seed: 91, layer: "mid" });
  list.push({ col: 20.8, row: 18.2, seed: 92, layer: "mid" });
  list.push({ col: 18.2, row: 20.8, seed: 93, layer: "mid" });
  list.push({ col: 20.8, row: 20.8, seed: 94, layer: "mid" });
  return list;
})();

// Auta jezdící po hlavní křižovatce
const TRAFFIC_CARS = [
  { dir: "E", speed: 3.1, offset: 2, body: "#F472B6", roof: "#FBCFE8" },
  { dir: "E", speed: 2.6, offset: 22, body: "#FACC15", roof: "#FEF08A" },
  { dir: "W", speed: 3.3, offset: 11, body: "#38BDF8", roof: "#BAE6FD" },
  { dir: "W", speed: 2.8, offset: 31, body: "#F8FAFC", roof: "#E2E8F0" },
  { dir: "S", speed: 3.0, offset: 6, body: "#A855F7", roof: "#E9D5FF" },
  { dir: "S", speed: 2.5, offset: 26, body: "#FACC15", roof: "#FEF08A" },
  { dir: "N", speed: 3.2, offset: 15, body: "#10B981", roof: "#A7F3D0" },
  { dir: "N", speed: 2.7, offset: 34, body: "#FB7185", roof: "#FECDD3" },
];

// Motorové čluny a jachty kroužící kolem ostrova
const OCEAN_BOATS = [
  { speed: 2.4, offset: 0, accent: "#EC4899" },
  { speed: 2.1, offset: 48, accent: "#06B6D4" },
  { speed: 2.6, offset: 96, accent: "#F59E0B" },
  { speed: 1.9, offset: 135, accent: "#10B981" },
];

function getDistrict(plotNum) {
  const idx = plotNum - 1;
  const row = Math.floor(idx / COLS);
  const col = idx % COLS;
  if (col < 12 && row < 12) return "Starfish Island";
  if (col >= 15 && col <= 24 && row >= 15 && row <= 24) return "Downtown Neon";
  if (row >= 28) return "Vice Port";
  return "Ocean Beach";
}

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
  const audioCtxRef = useRef(null);

  // 3 světelné režimy: "night" | "sunset" | "day"
  const [theme, setTheme] = useState("night");
  const [soundOn, setSoundOn] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlot, setSelectedPlot] = useState(1);
  const [hoveredPlot, setHoveredPlot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  // Interaktivní náhled vlastního domu před platbou ("Test-build")
  const [previewName, setPreviewName] = useState("");
  const [previewAmount, setPreviewAmount] = useState(1);
  const [copiedNote, setCopiedNote] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Kamera (posun a přiblížení pro ostrov 40x40)
  const [camera, setCamera] = useState({ x: 0, y: -45, zoom: 0.95 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, moved: false });

  // Syntetizované retro zvuky přes Web Audio API (nulová velikost souborů)
  const playSfx = useCallback(
    (type) => {
      if (!soundOn) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") ctx.resume();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "select") {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(840, now + 0.055);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.start(now);
          osc.stop(now + 0.065);
        } else if (type === "build") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(360, now);
          osc.frequency.setValueAtTime(540, now + 0.05);
          osc.frequency.setValueAtTime(720, now + 0.1);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.start(now);
          osc.stop(now + 0.19);
        } else if (type === "theme") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(280, now);
          osc.frequency.exponentialRampToValueAtTime(560, now + 0.12);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
          osc.start(now);
          osc.stop(now + 0.14);
        }
      } catch {
        // Ignorujeme blokování zvuku prohlížečem před prvním kliknutím
      }
    },
    [soundOn]
  );

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

  const topBuilders = useMemo(() => {
    return [...activeDonors]
      .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
      .slice(0, 5);
  }, [activeDonors]);

  const totalRaised = useMemo(() => {
    return activeDonors.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [activeDonors]);

  const progressPct = Math.min(100, (totalRaised / GOAL_USD) * 100);

  const formattedHandle = previewName.trim()
    ? previewName.trim().startsWith("@")
      ? previewName.trim()
      : `@${previewName.trim()}`
    : "@your_name";

  // Reference aktuálního stavu pro nepřerušenou 60 FPS smyčku plátna
  const liveStateRef = useRef({
    camera,
    donorMap,
    hoveredPlot,
    selectedPlot,
    theme,
    previewAmount,
    previewName,
    formattedHandle,
  });

  useEffect(() => {
    liveStateRef.current = {
      camera,
      donorMap,
      hoveredPlot,
      selectedPlot,
      theme,
      previewAmount,
      previewName,
      formattedHandle,
    };
  }, [
    camera,
    donorMap,
    hoveredPlot,
    selectedPlot,
    theme,
    previewAmount,
    previewName,
    formattedHandle,
  ]);

  const plotToGrid = (plotNum) => {
    const idx = plotNum - 1;
    const row = Math.floor(idx / COLS);
    const col = idx % COLS;
    return { col, row };
  };

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

  const focusPlot = (plotNum, zoomLevel = 1.45) => {
    const { col, row } = plotToGrid(plotNum);
    const iso = gridToIso(col, row);
    setSelectedPlot(plotNum);
    playSfx("select");
    setCamera((prev) => {
      const z = Math.max(prev.zoom, zoomLevel);
      return {
        x: -iso.x * z,
        y: -iso.y * z,
        zoom: z,
      };
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plotParam = parseInt(params.get("plot") || "", 10);
    if (!Number.isNaN(plotParam) && plotParam >= 1 && plotParam <= TOTAL_PLOTS) {
      focusPlot(plotParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSharePlot = () => {
    const url = `${window.location.origin}/?plot=${selectedPlot}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    playSfx("select");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const kofiNoteText = `${formattedHandle} - Plot #${String(selectedPlot).padStart(
    4,
    "0"
  )} ($${previewAmount})`;

  const handleCopyAndOpenKofi = () => {
    navigator.clipboard?.writeText(kofiNoteText);
    setCopiedNote(true);
    playSfx("build");
    setTimeout(() => setCopiedNote(false), 3000);
    window.open(KOFI_URL, "_blank", "noopener,noreferrer");
  };

  const cycleTheme = () => {
    playSfx("theme");
    setTheme((prev) =>
      prev === "night" ? "sunset" : prev === "sunset" ? "day" : "night"
    );
  };

  // ==========================================================================
  // HLAVNÍ 60 FPS RENDEROVACÍ SMYČKA OSTROVA
  // ==========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const render = (timeMs) => {
      const t = timeMs * 0.001;
      const st = liveStateRef.current;
      const {
        camera: cam,
        donorMap: dMap,
        hoveredPlot: hPlot,
        selectedPlot: sPlot,
        theme: curTheme,
        previewAmount: pAmt,
        previewName: pName,
        formattedHandle: fHandle,
      } = st;

      const isNight = curTheme === "night";
      const isSunset = curTheme === "sunset";
      const isLit = isNight || isSunset;

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

      // 1. OCEÁN PODLE DENNÍ DOBY
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      if (isNight) {
        bgGrad.addColorStop(0, "#040711");
        bgGrad.addColorStop(0.5, "#09152B");
        bgGrad.addColorStop(1, "#061E2E");
      } else if (isSunset) {
        bgGrad.addColorStop(0, "#1E1035");
        bgGrad.addColorStop(0.45, "#581C87");
        bgGrad.addColorStop(0.8, "#BE185D");
        bgGrad.addColorStop(1, "#D97706");
      } else {
        bgGrad.addColorStop(0, "#0284C7");
        bgGrad.addColorStop(0.5, "#0EA5E9");
        bgGrad.addColorStop(1, "#06B6D4");
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Odlesk zapadajícího slunce na vodě v režimu Sunset
      if (isSunset) {
        const sunGrad = ctx.createRadialGradient(
          w * 0.5,
          h * 0.12,
          10,
          w * 0.5,
          h * 0.12,
          w * 0.45
        );
        sunGrad.addColorStop(0, "rgba(253, 224, 71, 0.35)");
        sunGrad.addColorStop(0.5, "rgba(244, 114, 182, 0.14)");
        sunGrad.addColorStop(1, "rgba(244, 114, 182, 0)");
        ctx.fillStyle = sunGrad;
        ctx.fillRect(0, 0, w, h);
      }

      // Animované vlny
      ctx.strokeStyle = isNight
        ? "rgba(56, 189, 248, 0.08)"
        : isSunset
          ? "rgba(253, 186, 116, 0.15)"
          : "rgba(255, 255, 255, 0.24)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 15; i++) {
        const wy = ((i * 90 + t * 18) % (h + 60)) - 30;
        ctx.beginPath();
        for (let wx = 0; wx <= w; wx += 42) {
          const offset = Math.sin(wx * 0.015 + t * 2 + i) * 4;
          if (wx === 0) ctx.moveTo(wx, wy + offset);
          else ctx.lineTo(wx, wy + offset);
        }
        ctx.stroke();
      }

      // 2. KAMERA OSTROVA
      ctx.translate(w / 2 + cam.x, h / 2 + cam.y);
      ctx.scale(cam.zoom, cam.zoom);

      // Mělký tyrkysový/neonový šelf kolem celého ostrova
      const reefTop = gridToIso(-2.6, -2.6);
      const reefRight = gridToIso(COLS + 1.6, -2.6);
      const reefBottom = gridToIso(COLS + 1.6, ROWS + 1.6);
      const reefLeft = gridToIso(-2.6, ROWS + 1.6);

      ctx.beginPath();
      ctx.moveTo(reefTop.x, reefTop.y);
      ctx.lineTo(reefRight.x, reefRight.y);
      ctx.lineTo(reefBottom.x, reefBottom.y);
      ctx.lineTo(reefLeft.x, reefLeft.y);
      ctx.closePath();
      ctx.fillStyle = isNight
        ? "rgba(6, 182, 212, 0.12)"
        : isSunset
          ? "rgba(244, 114, 182, 0.18)"
          : "rgba(34, 211, 238, 0.36)";
      ctx.fill();

      // Motorové čluny kroužící po oceánu
      drawOceanBoats(ctx, t, isLit);

      // Písečná pláž a útes ostrova
      const topCorner = gridToIso(-1.2, -1.2);
      const rightCorner = gridToIso(COLS + 0.2, -1.2);
      const bottomCorner = gridToIso(COLS + 0.2, ROWS + 0.2);
      const leftCorner = gridToIso(-1.2, ROWS + 0.2);

      // Hloubka útesu
      ctx.beginPath();
      ctx.moveTo(leftCorner.x, leftCorner.y);
      ctx.lineTo(bottomCorner.x, bottomCorner.y);
      ctx.lineTo(rightCorner.x, rightCorner.y);
      ctx.lineTo(rightCorner.x, rightCorner.y + 28);
      ctx.lineTo(bottomCorner.x, bottomCorner.y + 28);
      ctx.lineTo(leftCorner.x, leftCorner.y + 28);
      ctx.closePath();
      ctx.fillStyle = isNight ? "#1E1B4B" : isSunset ? "#4C1D95" : "#B45309";
      ctx.fill();

      // Plážový okraj
      ctx.beginPath();
      ctx.moveTo(topCorner.x, topCorner.y);
      ctx.lineTo(rightCorner.x, rightCorner.y);
      ctx.lineTo(bottomCorner.x, bottomCorner.y);
      ctx.lineTo(leftCorner.x, leftCorner.y);
      ctx.closePath();
      ctx.fillStyle = isNight ? "#312E81" : isSunset ? "#F59E0B" : "#FDE68A";
      ctx.fill();

      // Zadní řada palem na pláži
      for (const p of PALM_TREES) {
        if (p.layer === "back") {
          const pos = gridToIso(p.col, p.row);
          drawPalmTree(ctx, pos.x, pos.y, t, p.seed, isLit);
        }
      }

      // 3. PASS 1: PARCELY, SILNICE A MŘÍŽKA
      const buildingQueue = [];
      const labelQueue = [];

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const plotNum = row * COLS + col + 1;
          const { x, y } = gridToIso(col, row);
          const donor = dMap.get(plotNum);
          const isSelected = sPlot === plotNum;
          const isHovered = hPlot === plotNum;
          const isPlotOne = plotNum === 1;
          const isVip = Boolean(VIP_PLOTS[plotNum]);
          const isAvenue = col === 19 || col === 20 || row === 19 || row === 20;

          ctx.beginPath();
          ctx.moveTo(x, y - TILE_H / 2);
          ctx.lineTo(x + TILE_W / 2, y);
          ctx.lineTo(x, y + TILE_H / 2);
          ctx.lineTo(x - TILE_W / 2, y);
          ctx.closePath();

          if (donor) {
            ctx.fillStyle = isNight ? "#064E3B" : isSunset ? "#065F46" : "#34D399";
          } else if (isPlotOne) {
            const pulse = 0.55 + Math.abs(Math.sin(t * 3.5)) * 0.45;
            ctx.fillStyle = `rgba(251, 191, 36, ${pulse})`;
          } else if (isVip) {
            ctx.fillStyle = isLit
              ? "rgba(236, 72, 153, 0.38)"
              : "rgba(244, 114, 182, 0.55)";
          } else if (isSelected) {
            ctx.fillStyle = isLit ? "#164E63" : "#67E8F9";
          } else if (isAvenue) {
            ctx.fillStyle = isNight ? "#1E293B" : isSunset ? "#2E1065" : "#64748B";
          } else {
            ctx.fillStyle = isNight ? "#0F172A" : isSunset ? "#271447" : "#86EFAC";
          }
          ctx.fill();

          // Mřížka parcel (vynecháme středovou čáru silnice pro čistší asfalt)
          ctx.strokeStyle = isSelected
            ? "#FBBF24"
            : isHovered
              ? "#38BDF8"
              : isNight
                ? "rgba(56, 189, 248, 0.16)"
                : isSunset
                  ? "rgba(244, 114, 182, 0.22)"
                  : "rgba(15, 23, 42, 0.14)";
          ctx.lineWidth = isSelected || isHovered ? 2 : 0.75;
          ctx.stroke();

          // Žlutá středová čára na hlavní třídě
          if (col === 19 && row !== 19 && row !== 20) {
            ctx.strokeStyle = "rgba(250, 204, 21, 0.75)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x + TILE_W * 0.25, y + TILE_H * 0.25);
            ctx.lineTo(x + TILE_W * 0.45, y + TILE_H * 0.45);
            ctx.stroke();
          }
          if (row === 19 && col !== 19 && col !== 20) {
            ctx.strokeStyle = "rgba(250, 204, 21, 0.75)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(x - TILE_W * 0.25, y + TILE_H * 0.25);
            ctx.lineTo(x - TILE_W * 0.45, y + TILE_H * 0.45);
            ctx.stroke();
          }

          // Maják pro neobsazenou Parcelu #0001
          if (isPlotOne && !donor && !isSelected) {
            const beamHeight = 38 + Math.sin(t * 4) * 6;
            const beamGrad = ctx.createLinearGradient(x, y, x, y - beamHeight);
            beamGrad.addColorStop(0, "rgba(251, 191, 36, 0.85)");
            beamGrad.addColorStop(1, "rgba(251, 191, 36, 0)");
            ctx.fillStyle = beamGrad;
            ctx.fillRect(x - 6, y - beamHeight, 12, beamHeight);

            ctx.fillStyle = "#FEF08A";
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("#0001", x, y - beamHeight - 3);
          } else if (isVip && !donor && !isSelected && cam.zoom >= 1.15) {
            ctx.fillStyle = isLit ? "#F9A8D4" : "#831843";
            ctx.font = "bold 8px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(VIP_PLOTS[plotNum].short, x, y - 6);
          }

          // Zařazení budov do fronty pro vykreslení ve správném pořadí
          if (donor) {
            const tier = getTier(donor.amount, plotNum === 1);
            buildingQueue.push({
              x,
              y,
              tier,
              isPreview: false,
              amount: donor.amount,
            });
            if (cam.zoom >= 1.3 || isSelected || isHovered) {
              labelQueue.push({
                x,
                y,
                tier,
                label: donor.name,
                border: isSelected ? "#FBBF24" : "#38BDF8",
              });
            }
          } else if (isSelected) {
            const previewTier = getTier(pAmt, plotNum === 1);
            buildingQueue.push({
              x,
              y,
              tier: previewTier,
              isPreview: true,
              amount: pAmt,
            });
            const tagText = pName.trim()
              ? `${fHandle} (PREVIEW)`
              : `YOUR PLOT #${String(plotNum).padStart(4, "0")}`;
            labelQueue.push({
              x,
              y,
              tier: previewTier,
              label: tagText,
              border: "#FBBF24",
            });
          }
        }
      }

      // 4. CENTRÁLNÍ NEONOVÁ FONTÁNA + JEZDÍCÍ AUTA NA KŘIŽOVATCE
      const plazaPos = gridToIso(19.5, 19.5);
      drawNeonFountain(ctx, plazaPos.x, plazaPos.y, t, isLit);
      drawTrafficCars(ctx, t, isLit);

      // Palmy kolem centrálního náměstí
      for (const p of PALM_TREES) {
        if (p.layer === "mid") {
          const pos = gridToIso(p.col, p.row);
          drawPalmTree(ctx, pos.x, pos.y, t, p.seed, isLit);
        }
      }

      // 5. PASS 2: BUDOVY SE STÍNY
      for (const b of buildingQueue) {
        ctx.save();
        if (b.isPreview) {
          ctx.globalAlpha = 0.84 + Math.sin(t * 5) * 0.12;
        }
        drawBuilding(ctx, b.x, b.y, b.tier, curTheme, t, b.isPreview, b.amount);
        ctx.restore();
      }

      // Přední řada palem na pláži
      for (const p of PALM_TREES) {
        if (p.layer === "front") {
          const pos = gridToIso(p.col, p.row);
          drawPalmTree(ctx, pos.x, pos.y, t, p.seed, isLit);
        }
      }

      // 6. PASS 3: JMENOVKY VŽDY NA SAMÉM VRCHU (nikdy se nepřekryjí budovou)
      for (const lbl of labelQueue) {
        drawNameTag(ctx, lbl.x, lbl.y, lbl.tier, lbl.label, lbl.border);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ==========================================================================
  // POMOCNÉ KRESLÍCÍ FUNKCE PRO SVĚT VICE CITY
  // ==========================================================================

  function drawPalmTree(ctx, x, y, t, seed, isLit) {
    const sway = Math.sin(t * 1.9 + seed) * 2.4;

    // Stín palmy
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.beginPath();
    ctx.ellipse(x + 7, y + 2, 8, 3.2, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Kmen palmy
    const topX = x + 2 + sway;
    const topY = y - 22;
    ctx.strokeStyle = isLit ? "#78350F" : "#92400E";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 3, y - 11, topX, topY);
    ctx.stroke();

    // Listy koruny
    const fronds = [
      [-11, -3],
      [11, -3],
      [-9, 4],
      [9, 4],
      [0, -8],
    ];
    ctx.strokeStyle = isLit ? "#10B981" : "#16A34A";
    ctx.lineWidth = 2;
    for (const [fx, fy] of fronds) {
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(
        topX + fx * 0.6,
        topY + fy - 3,
        topX + fx + sway * 0.5,
        topY + fy + 3
      );
      ctx.stroke();
    }
  }

  function drawNeonFountain(ctx, x, y, t, isLit) {
    // Kruhový kamenný základ
    ctx.fillStyle = isLit ? "#1E1B4B" : "#CBD5E1";
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#EC4899";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tyrkysová voda
    ctx.fillStyle = isLit ? "#06B6D4" : "#22D3EE";
    ctx.beginPath();
    ctx.ellipse(x, y, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pulzující vodní kruh a gejzír
    const r = 4 + ((t * 10) % 11);
    const alpha = Math.max(0, 1 - r / 15);
    ctx.strokeStyle = `rgba(244, 114, 182, ${alpha})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    const sprayH = 8 + Math.sin(t * 6) * 2;
    ctx.strokeStyle = "#A5F3FC";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - sprayH);
    ctx.stroke();
  }

  function drawTrafficCars(ctx, t, isLit) {
    for (const car of TRAFFIC_CARS) {
      const prog = (car.offset + t * car.speed) % 40;
      let col = 19.5;
      let row = 19.5;
      let ux = 0;
      let uy = 0;

      if (car.dir === "E") {
        col = prog;
        row = 19.76;
        ux = 0.894;
        uy = 0.447;
      } else if (car.dir === "W") {
        col = 39 - prog;
        row = 19.24;
        ux = -0.894;
        uy = -0.447;
      } else if (car.dir === "S") {
        col = 19.24;
        row = prog;
        ux = -0.894;
        uy = 0.447;
      } else {
        col = 19.76;
        row = 39 - prog;
        ux = 0.894;
        uy = -0.447;
      }

      // Objezd kolem centrální fontány
      const distCenter = Math.hypot(col - 19.5, row - 19.5);
      if (distCenter < 1.2) continue;

      const { x, y } = gridToIso(col, row);
      const px = -uy;
      const py = ux;

      // Kužel předních světel v noci / při západu slunce
      if (isLit) {
        const beamGrad = ctx.createLinearGradient(
          x + ux * 5,
          y + uy * 5,
          x + ux * 24,
          y + uy * 24
        );
        beamGrad.addColorStop(0, "rgba(254, 240, 138, 0.55)");
        beamGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(x + ux * 4 + px * 2, y + uy * 4 + py * 2);
        ctx.lineTo(x + ux * 24 + px * 7, y + uy * 24 + py * 7);
        ctx.lineTo(x + ux * 24 - px * 7, y + uy * 24 - py * 7);
        ctx.lineTo(x + ux * 4 - px * 2, y + uy * 4 - py * 2);
        ctx.closePath();
        ctx.fill();
      }

      // Karoserie auta
      ctx.fillStyle = car.body;
      ctx.beginPath();
      ctx.moveTo(x + ux * 5 + px * 2.5, y + uy * 5 + py * 2.5 - 2);
      ctx.lineTo(x + ux * 5 - px * 2.5, y + uy * 5 - py * 2.5 - 2);
      ctx.lineTo(x - ux * 5 - px * 2.5, y - uy * 5 - py * 2.5 - 2);
      ctx.lineTo(x - ux * 5 + px * 2.5, y - uy * 5 + py * 2.5 - 2);
      ctx.closePath();
      ctx.fill();

      // Střecha kabiny
      ctx.fillStyle = car.roof;
      ctx.beginPath();
      ctx.arc(x, y - 3.5, 2.3, 0, Math.PI * 2);
      ctx.fill();

      // Zadní brzdová světla
      ctx.fillStyle = "#EF4444";
      ctx.beginPath();
      ctx.arc(x - ux * 5, y - uy * 5 - 2, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawOceanBoats(ctx, t, isLit) {
    const min = -3.4;
    const max = COLS + 2.4;
    const span = max - min;
    const perim = span * 4;

    for (const boat of OCEAN_BOATS) {
      const p = (boat.offset + t * boat.speed) % perim;
      let col = min;
      let row = min;
      let ux = 0.894;
      let uy = 0.447;

      if (p < span) {
        col = min + p;
        row = min;
        ux = 0.894;
        uy = 0.447;
      } else if (p < span * 2) {
        col = max;
        row = min + (p - span);
        ux = -0.894;
        uy = 0.447;
      } else if (p < span * 3) {
        col = max - (p - span * 2);
        row = max;
        ux = -0.894;
        uy = -0.447;
      } else {
        col = min;
        row = max - (p - span * 3);
        ux = 0.894;
        uy = -0.447;
      }

      const { x, y } = gridToIso(col, row);
      const px = -uy;
      const py = ux;

      // Pěnová brázda za člunem
      ctx.strokeStyle = isLit
        ? "rgba(165, 243, 252, 0.25)"
        : "rgba(255, 255, 255, 0.55)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - ux * 7, y - uy * 7);
      ctx.lineTo(x - ux * 24 + px * 5, y - uy * 24 + py * 5);
      ctx.moveTo(x - ux * 7, y - uy * 7);
      ctx.lineTo(x - ux * 24 - px * 5, y - uy * 24 - py * 5);
      ctx.stroke();

      // Trup jachty
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(x + ux * 9, y + uy * 9);
      ctx.lineTo(x - ux * 6 + px * 3.5, y - uy * 6 + py * 3.5);
      ctx.lineTo(x - ux * 6 - px * 3.5, y - uy * 6 - py * 3.5);
      ctx.closePath();
      ctx.fill();

      // Barevný pruh paluby
      ctx.fillStyle = boat.accent;
      ctx.beginPath();
      ctx.arc(x, y - 1.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawNameTag(ctx, x, y, tier, label, borderColor) {
    ctx.font = "bold 9px system-ui, sans-serif";
    const tw = ctx.measureText(label).width + 10;
    const bh =
      tier === "skyscraper" ? 58 : tier === "villa" || tier === "founder" ? 31 : 21;

    ctx.fillStyle = "rgba(9, 13, 22, 0.92)";
    ctx.beginPath();
    ctx.roundRect(x - tw / 2, y - bh - 16, tw, 14, 4);
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = "#F8FAFC";
    ctx.textAlign = "center";
    ctx.fillText(label, x, y - bh - 6);
  }

  function drawBuilding(ctx, x, y, tier, curTheme, t, isPreview, amount) {
    const isNight = curTheme === "night";
    const isSunset = curTheme === "sunset";
    const isLit = isNight || isSunset;

    // Vržený stín budovy
    const shadowLen = tier === "skyscraper" ? 26 : tier === "villa" || tier === "founder" ? 15 : 10;
    ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
    ctx.beginPath();
    ctx.moveTo(x, y + TILE_H / 2);
    ctx.lineTo(x + TILE_W / 2, y);
    ctx.lineTo(x + TILE_W / 2 + shadowLen, y + shadowLen * 0.45);
    ctx.lineTo(x + shadowLen, y + TILE_H / 2 + shadowLen * 0.45);
    ctx.closePath();
    ctx.fill();

    if (tier === "bungalow") {
      const h = 11;
      const w = 11;
      ctx.fillStyle = isNight ? "#0284C7" : isSunset ? "#38BDF8" : "#38BDF8";
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.lineTo(x, y + w * 0.5);
      ctx.lineTo(x, y + w * 0.5 - h);
      ctx.lineTo(x - w, y - h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isNight ? "#0369A1" : isSunset ? "#0284C7" : "#0284C7";
      ctx.beginPath();
      ctx.moveTo(x, y + w * 0.5);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y - h);
      ctx.lineTo(x, y + w * 0.5 - h);
      ctx.closePath();
      ctx.fill();

      // Rozsvícené okénko v noci
      if (isLit) {
        ctx.fillStyle = "#FEF08A";
        ctx.fillRect(x - 6, y - 5, 3, 3);
      }

      // Růžová Vice City střecha
      ctx.fillStyle = "#F472B6";
      ctx.beginPath();
      ctx.moveTo(x, y - w * 0.5 - h);
      ctx.lineTo(x + w, y - h);
      ctx.lineTo(x, y + w * 0.5 - h);
      ctx.lineTo(x - w, y - h);
      ctx.closePath();
      ctx.fill();

      if (isPreview) {
        ctx.strokeStyle = "#FDE047";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      return;
    }

    if (tier === "villa" || tier === "founder") {
      const h = 19;
      const w = 13;
      const isFounder = tier === "founder";

      ctx.fillStyle = isFounder
        ? "#FDE047"
        : isNight
          ? "#E2E8F0"
          : isSunset
            ? "#FDE68A"
            : "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.lineTo(x, y + w * 0.5);
      ctx.lineTo(x, y + w * 0.5 - h);
      ctx.lineTo(x - w, y - h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = isFounder
        ? "#EAB308"
        : isNight
          ? "#94A3B8"
          : isSunset
            ? "#F59E0B"
            : "#CBD5E1";
      ctx.beginPath();
      ctx.moveTo(x, y + w * 0.5);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y - h);
      ctx.lineTo(x, y + w * 0.5 - h);
      ctx.closePath();
      ctx.fill();

      // Rozsvícená okna vily
      if (isLit) {
        ctx.fillStyle = isFounder ? "#FFFFFF" : "#38BDF8";
        ctx.fillRect(x - 8, y - 9, 4, 3);
        ctx.fillRect(x + 4, y - 8, 4, 3);
      }

      // Terasa s bazénem
      ctx.fillStyle = isFounder ? "#F59E0B" : "#EC4899";
      ctx.beginPath();
      ctx.moveTo(x, y - w * 0.5 - h);
      ctx.lineTo(x + w, y - h);
      ctx.lineTo(x, y + w * 0.5 - h);
      ctx.lineTo(x - w, y - h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#22D3EE";
      ctx.beginPath();
      ctx.ellipse(x, y - h, 5.8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Mrakodrap ($10+)
    const h = amount >= 20 ? 54 : 46;
    const w = 13;

    ctx.fillStyle = isNight ? "#1E1B4B" : isSunset ? "#3B0764" : "#3B82F6";
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x, y + w * 0.5);
    ctx.lineTo(x, y + w * 0.5 - h);
    ctx.lineTo(x - w, y - h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isNight ? "#0F172A" : isSunset ? "#1E1B4B" : "#1D4ED8";
    ctx.beginPath();
    ctx.moveTo(x, y + w * 0.5);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y - h);
    ctx.lineTo(x, y + w * 0.5 - h);
    ctx.closePath();
    ctx.fill();

    // Neonový svislý pruh na hraně mrakodrapu
    ctx.strokeStyle = isLit ? "#22D3EE" : "#93C5FD";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y + w * 0.5);
    ctx.lineTo(x, y + w * 0.5 - h);
    ctx.stroke();

    // Svítící okna v noci a při západu slunce
    if (isLit) {
      ctx.fillStyle = isSunset ? "#F472B6" : "#FDE047";
      for (let wy = 7; wy < h - 6; wy += 7) {
        ctx.fillRect(x - w + 3, y - wy, 3, 2.5);
        ctx.fillRect(x + 4, y - wy + 1, 3, 2.5);
      }
    }

    // Střecha + Heliport (H)
    ctx.fillStyle = "#10B981";
    ctx.beginPath();
    ctx.moveTo(x, y - w * 0.5 - h);
    ctx.lineTo(x + w, y - h);
    ctx.lineTo(x, y + w * 0.5 - h);
    ctx.lineTo(x - w, y - h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y - h, 5.5, 2.8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Maják na špičce
    const beacon = 0.4 + Math.abs(Math.sin(t * 4 + x)) * 0.6;
    ctx.fillStyle = `rgba(244, 114, 182, ${beacon})`;
    ctx.beginPath();
    ctx.arc(x, y - h - 5, 2.8, 0, Math.PI * 2);
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
      if (plot) {
        setSelectedPlot(plot);
        playSfx("select");
      }
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

  // Kliknutí na GTA Radar přesune kameru na dané místo ostrova
  const handleRadarClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const col = Math.max(
      0,
      Math.min(COLS - 1, Math.floor(((e.clientX - rect.left) / rect.width) * COLS))
    );
    const row = Math.max(
      0,
      Math.min(ROWS - 1, Math.floor(((e.clientY - rect.top) / rect.height) * ROWS))
    );
    const plotNum = row * COLS + col + 1;
    focusPlot(plotNum, Math.max(camera.zoom, 1.3));
  };

  const selectedDonor = donorMap.get(selectedPlot);
  const selectedVip = VIP_PLOTS[selectedPlot];
  const selectedDistrict = getDistrict(selectedPlot);
  const selectedGrid = plotToGrid(selectedPlot);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-white select-none font-sans">
      {/* Hlavní 60 FPS plátno s izometrickým ostrovem */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="h-full w-full cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Horní lišta s pokrokem a ovládáním */}
      <header className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-cyan-400/30 bg-slate-900/90 px-3.5 py-2 shadow-2xl backdrop-blur-md">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-400 font-black text-slate-950 shadow-lg">
            VC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight sm:text-base">
                BUILD VICE CITY
              </h1>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300 border border-emerald-400/40">
                {TOTAL_PLOTS.toLocaleString()} PLOTS
              </span>
            </div>
            <p className="hidden text-[11px] text-slate-400 sm:block">
              Xbox Series X + GTA VI Challenge • Live Isometric Map
            </p>
          </div>
        </div>

        {/* Ukazatel cíle $1,600 */}
        <div className="pointer-events-auto flex flex-1 max-w-md flex-col gap-1.5 rounded-2xl border border-emerald-400/30 bg-slate-900/90 px-4 py-2 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span className="flex items-center gap-1 text-emerald-300">
              <DollarSign className="h-3.5 w-3.5" />
              ${totalRaised.toLocaleString()} / ${GOAL_USD.toLocaleString()}
            </span>
            <span className="text-slate-300">
              {activeDonors.length} / {TOTAL_PLOTS.toLocaleString()} Built ({progressPct.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-pink-500 transition-all duration-500"
              style={{ width: `${Math.max(progressPct, totalRaised > 0 ? 2 : 0)}%` }}
            />
          </div>
        </div>

        {/* Vyhledávání + přepínače */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <form
            onSubmit={handleSearch}
            className="flex items-center rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 backdrop-blur-md"
          >
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find @user or #420..."
              className="w-24 bg-transparent px-2 text-xs text-white placeholder-slate-400 focus:outline-none sm:w-36"
            />
          </form>

          <button
            onClick={() => {
              playSfx("select");
              setDemoMode((v) => !v);
            }}
            title="Preview how the island looks with builders"
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition ${
              demoMode
                ? "border-amber-400 bg-amber-400/20 text-amber-200"
                : "border-slate-700 bg-slate-900/90 text-slate-300 hover:border-slate-500"
            }`}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden md:inline">
              {demoMode ? "Demo: ON" : "Demo"}
            </span>
          </button>

          {/* Přepínač 3 denních dob: Night / Sunset / Day */}
          <button
            onClick={cycleTheme}
            title="Switch Atmosphere: Neon Night / Vice Sunset / Miami Day"
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-2 text-xs font-bold text-slate-200 hover:border-pink-400 transition"
          >
            {theme === "night" ? (
              <>
                <Moon className="h-4 w-4 text-cyan-300" />
                <span className="hidden lg:inline">Night</span>
              </>
            ) : theme === "sunset" ? (
              <>
                <Sunset className="h-4 w-4 text-pink-400" />
                <span className="hidden lg:inline">Sunset</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 text-amber-300" />
                <span className="hidden lg:inline">Day</span>
              </>
            )}
          </button>

          {/* Ztlumení / zapnutí retro zvuků */}
          <button
            onClick={() => setSoundOn((s) => !s)}
            title={soundOn ? "Mute UI sound effects" : "Enable UI sound effects"}
            className="rounded-xl border border-slate-700 bg-slate-900/90 p-2 text-slate-200 hover:border-cyan-400 transition"
          >
            {soundOn ? (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-500" />
            )}
          </button>
        </div>
      </header>

      {/* Banner pro prvního dárce (pokud je vybráno $0) */}
      {!demoMode && totalRaised === 0 && (
        <div className="pointer-events-none absolute top-28 sm:top-20 left-1/2 z-10 -translate-x-1/2 w-max max-w-[94vw]">
          <button
            onClick={() => {
              focusPlot(1);
              setPreviewAmount(5);
              setShowModal(true);
            }}
            className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-amber-300 bg-slate-900/95 px-3.5 py-1.5 text-[11px] sm:text-xs font-black text-amber-200 shadow-[0_0_25px_rgba(251,191,36,0.45)] hover:scale-105 transition"
          >
            <Crown className="h-4 w-4 shrink-0 text-amber-400" />
            <span>FOUNDER SPECIAL: Claim #0001 for $1 & get a $5 Pool Villa!</span>
          </button>
        </div>
      )}

      {/* Pravý HUD sloupec: GTA Radar + Top 5 stavitelů */}
      <div className="pointer-events-none absolute top-32 right-3 sm:top-22 sm:right-4 z-10 flex flex-col items-end gap-2.5">
        {/* Klasický GTA Radar (kliknutím skočí kamera na dané místo ostrova) */}
        <div
          onClick={handleRadarClick}
          title="GTA Island Radar — Click anywhere to jump camera"
          className="pointer-events-auto relative h-28 w-28 sm:h-32 sm:w-32 cursor-crosshair overflow-hidden rounded-2xl border-2 border-cyan-400/60 bg-slate-950/90 p-1.5 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md"
        >
          <svg viewBox="0 0 40 40" className="h-full w-full">
            {/* Půdorys ostrova */}
            <rect x="0" y="0" width="40" height="40" rx="2" fill="#0F172A" />
            {/* Hlavní křižovatka */}
            <rect x="19" y="0" width="2" height="40" fill="#334155" />
            <rect x="0" y="19" width="40" height="2" fill="#334155" />
            {/* Obsazené budovy */}
            {activeDonors.map((d) => {
              const g = plotToGrid(d.plot);
              const color =
                d.amount >= 10 ? "#10B981" : d.amount >= 5 ? "#EC4899" : "#38BDF8";
              return (
                <rect
                  key={d.plot}
                  x={g.col}
                  y={g.row}
                  width="1.2"
                  height="1.2"
                  fill={color}
                />
              );
            })}
            {/* Zlatá parcela #0001 */}
            <circle cx="0.8" cy="0.8" r="1.4" fill="#FBBF24" />
            {/* Aktuálně vybraná parcela */}
            <circle
              cx={selectedGrid.col + 0.5}
              cy={selectedGrid.row + 0.5}
              r="1.6"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="0.8"
            />
          </svg>
          <div className="pointer-events-none absolute bottom-1 left-1.5 flex items-center gap-0.5 rounded bg-slate-950/80 px-1 text-[9px] font-black tracking-wider text-cyan-300">
            <Navigation className="h-2.5 w-2.5" /> RADAR
          </div>
        </div>

        {/* Žebříček Top 5 stavitelů */}
        {topBuilders.length > 0 && (
          <div className="pointer-events-auto w-48 sm:w-52 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-2.5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-[11px] font-black text-amber-300">
              <span className="flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" /> TOP BUILDERS
              </span>
              <button
                onClick={() => setShowLeaderboard((s) => !s)}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                {showLeaderboard ? "Hide" : "Show"}
              </button>
            </div>
            {showLeaderboard && (
              <div className="mt-1.5 space-y-1">
                {topBuilders.map((b, i) => (
                  <button
                    key={b.plot}
                    onClick={() => focusPlot(b.plot)}
                    className="flex w-full items-center justify-between rounded-lg bg-slate-950/80 px-2 py-1 text-left text-[11px] hover:bg-slate-800 transition"
                  >
                    <span className="truncate font-bold text-slate-200">
                      <span className="text-amber-400 mr-1">#{i + 1}</span>
                      {b.name}
                    </span>
                    <span className="ml-1 shrink-0 font-mono font-bold text-emerald-400">
                      ${b.amount}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ovládání přiblížení vpravo dole */}
      <div className="absolute bottom-24 right-4 z-10 flex flex-col gap-2 sm:bottom-6">
        <button
          onClick={() => {
            playSfx("select");
            setCamera((c) => ({ ...c, zoom: Math.min(3.5, c.zoom * 1.25) }));
          }}
          className="rounded-xl border border-slate-700 bg-slate-900/90 p-2.5 text-slate-200 hover:border-cyan-400"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            playSfx("select");
            setCamera((c) => ({ ...c, zoom: Math.max(0.55, c.zoom * 0.8) }));
          }}
          className="rounded-xl border border-slate-700 bg-slate-900/90 p-2.5 text-slate-200 hover:border-cyan-400"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            playSfx("select");
            setCamera({ x: 0, y: -45, zoom: 0.95 });
          }}
          className="rounded-xl border border-slate-700 bg-slate-900/90 p-2.5 text-slate-200 hover:border-cyan-400"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      {/* Spodní karta vybrané parcely + živý náhled stavby */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="rounded-lg bg-slate-800 px-2.5 py-1 font-mono text-xs font-black text-cyan-300">
                PLOT #{String(selectedPlot).padStart(4, "0")}
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-slate-800/70 px-2 py-1 text-[11px] font-semibold text-slate-300">
                <MapPin className="h-3 w-3 text-pink-400" />
                {selectedDistrict}
              </span>
            </div>

            <button
              onClick={handleSharePlot}
              title="Copy direct link to this plot"
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1 text-[11px] font-bold text-slate-300 hover:border-cyan-400 hover:text-white transition"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Share2 className="h-3 w-3" /> Share
                </>
              )}
            </button>
          </div>

          {selectedVip && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-pink-500/15 border border-pink-500/30 px-2.5 py-1 text-[11px] font-bold text-pink-300">
              <Flame className="h-3.5 w-3.5 text-pink-400" />
              VIP SPOT: {selectedVip.label}
            </div>
          )}

          {selectedDonor ? (
            <div className="mt-2.5">
              <div className="flex items-center justify-between">
                <div className="text-lg font-black text-white">{selectedDonor.name}</div>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  OWNED • ${selectedDonor.amount}
                </span>
              </div>
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
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
                <span>Test-build your house on this plot:</span>
                <span className="text-amber-300">AVAILABLE</span>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value)}
                  placeholder="Type your @username..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-[11px] font-black">
                  {[1, 5, 10].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setPreviewAmount(amt);
                        playSfx("build");
                      }}
                      className={`rounded-md px-2 py-1 transition ${
                        previewAmount === amt
                          ? "bg-cyan-400 text-slate-950"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              playSfx("build");
              setShowModal(true);
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-2.5 text-sm font-black text-slate-950 shadow-lg hover:brightness-110 transition"
          >
            <Sparkles className="h-4 w-4" />
            {selectedDonor
              ? "Build Your Own Plot ($1)"
              : `Lock In Plot #${String(selectedPlot).padStart(4, "0")} ($${previewAmount})`}
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

      {/* Modální okno s jedním kliknutím pro zkopírování poznámky a otevření Ko-fi */}
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
              <Trophy className="h-4 w-4" /> {selectedDistrict} •{" "}
              {TOTAL_PLOTS.toLocaleString()} Builders
            </div>
            <h2 className="mt-1 text-2xl font-black text-white">
              Claim Plot #{String(selectedPlot).padStart(4, "0")}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Your building stays permanently on this live island and gets featured in tomorrow's YouTube & TikTok episode!
            </p>

            <div className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  1. Your @username (shown above your building)
                </label>
                <input
                  type="text"
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value)}
                  placeholder="@your_username"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  2. Choose your building size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { amt: 1, label: "Bungalow", color: "text-sky-400" },
                    { amt: 5, label: "Pool Villa", color: "text-pink-400" },
                    { amt: 10, label: "Skyscraper", color: "text-emerald-400" },
                  ].map((tier) => (
                    <button
                      key={tier.amt}
                      type="button"
                      onClick={() => {
                        setPreviewAmount(tier.amt);
                        playSfx("build");
                      }}
                      className={`rounded-xl border p-2 text-center transition ${
                        previewAmount === tier.amt
                          ? "border-cyan-400 bg-cyan-400/15"
                          : "border-slate-800 bg-slate-900 hover:border-slate-700"
                      }`}
                    >
                      <div className={`text-sm font-black ${tier.color}`}>
                        ${tier.amt}
                      </div>
                      <div className="text-[10px] font-bold text-slate-300">
                        {tier.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-200">
                <div className="font-bold">3. Paste this note on Ko-fi (auto-copied):</div>
                <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-950/90 px-2.5 py-1.5 font-mono text-xs text-white">
                  <span className="truncate">{kofiNoteText}</span>
                  <Copy className="h-3.5 w-3.5 shrink-0 text-amber-300 ml-2" />
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyAndOpenKofi}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-pink-500 py-3 text-sm font-black text-slate-950 shadow-xl hover:brightness-110 transition"
            >
              {copiedNote ? (
                <>
                  <Check className="h-4 w-4" /> Note Copied! Opening Ko-fi...
                </>
              ) : (
                <>
                  Copy Note & Open Ko-fi (${previewAmount})
                  <ExternalLink className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}