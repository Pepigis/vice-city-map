import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  Check,
  Copy,
  Crown,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Gamepad2,
  HelpCircle,
  Loader2,
  MapPin,
  Moon,
  Navigation,
  RotateCcw,
  Search,
  Share2,
  Shuffle,
  Sparkles,
  Sun,
  Sunset,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import Island3D from "./Island3D";

// Volitelná záložní/ruční data (živí dárci se načítají automaticky ze Supabase)
const FALLBACK_DONORS = [];

// Demo data pro natáčení ukázek do videa (aktivuje se přes /?demo=1)
const DEMO_DONORS = [
  { plot: 1, name: "@vice_mayor", amount: 10, message: "Claimed #0001! Let's get that Xbox!" },
  { plot: 2, name: "@alex_codes", amount: 5, message: "Respect for hand-coding in 3D" },
  { plot: 3, name: "@lucia_vc", amount: 1, message: "1 pixel closer to Vice City!" },
  { plot: 4, name: "@jason_gta", amount: 5, message: "Pool villa right by the beach" },
  { plot: 5, name: "@karel_cz", amount: 1, message: "Zdravím z Česka!" },
  { plot: 8, name: "@neon_rider", amount: 10, message: "Building the skyline!" },
  { plot: 12, name: "@pixel_hunter", amount: 1, message: "My $1 brick" },
  { plot: 15, name: "@dev_sarah", amount: 5, message: "3D WebGL looks insane!" },
  { plot: 19, name: "@tommy_v", amount: 15, message: "Tommy Vercetti Tower" },
  { plot: 24, name: "@marcus_gg", amount: 1, message: "From TikTok!" },
  { plot: 37, name: "@elena_art", amount: 5, message: "Sunset mode looks awesome" },
  { plot: 42, name: "@react_wizard", amount: 10, message: "60 FPS Three.js power" },
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
const ROWS = 40;
const TOTAL_PLOTS = COLS * ROWS;
const XBOX_GOAL_USD = 1224;
const FINAL_GOAL_USD = 1600;
const KOFI_URL = "https://ko-fi.com/vectorbra1n";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/rest\/v1$/i, "");
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

const MILESTONES = [
  { amount: 300, label: "$300" },
  { amount: 750, label: "$750" },
  { amount: 1224, label: "$1,224 Xbox + GTA VI", primary: true },
];

const VIP_PLOTS = {
  1: { label: "Mayor's Founder Corner", short: "#0001" },
  69: { label: "Vice Legend Spot", short: "#0069" },
  420: { label: "High Roller Plot", short: "#0420" },
  777: { label: "Lucky Jackpot Plot", short: "#0777" },
  1337: { label: "Elite Coder Tower", short: "#1337" },
  1600: { label: "Final Boss Penthouse", short: "#1600" },
};

function getDistrict(plotNum) {
  const idx = plotNum - 1;
  const row = Math.floor(idx / COLS);
  const col = idx % COLS;
  if (col < 12 && row < 12) return "Starfish Island";
  if (col >= 15 && col <= 24 && row >= 15 && row <= 24) return "Downtown Neon";
  if (row >= 28) return "Vice Port";
  return "Ocean Beach";
}

function getTierLabel(amount, isFounder) {
  if (isFounder) return "Mayor's Founder Villa (#0001)";
  if (amount >= 10) return "Neon Skyscraper ($10+)";
  if (amount >= 5) return "Pool Villa ($5+)";
  return "Beach Bungalow ($1)";
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Generuje sdílecí PNG kartičku parcely přímo v prohlížeči (1080x1350)
function generateDeedCardDataUrl({
  plotNum,
  handle,
  amount,
  district,
  tierLabel,
  message,
  isOwned,
  allDonors,
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Pozadí ve stylu Vice City
  const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, "#050816");
  bg.addColorStop(0.5, "#1E1035");
  bg.addColorStop(1, "#09152B");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1350);

  // Jemná neonová mřížka na pozadí
  ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
  ctx.lineWidth = 2;
  for (let gx = 0; gx <= 1080; gx += 60) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, 1350);
    ctx.stroke();
  }
  for (let gy = 0; gy <= 1350; gy += 60) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(1080, gy);
    ctx.stroke();
  }

  // Hlavní rámeček certifikátu
  const borderGrad = ctx.createLinearGradient(60, 60, 1020, 1290);
  borderGrad.addColorStop(0, "#EC4899");
  borderGrad.addColorStop(0.5, "#22D3EE");
  borderGrad.addColorStop(1, "#10B981");

  drawRoundedRect(ctx, 56, 56, 968, 1238, 44);
  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = borderGrad;
  ctx.stroke();

  // Hlavička
  ctx.fillStyle = "#22D3EE";
  ctx.font = "900 28px system-ui, -apple-system, sans-serif";
  ctx.fillText("BUILD VICE CITY • 3D ISLAND CHALLENGE", 110, 145);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 66px system-ui, -apple-system, sans-serif";
  ctx.fillText(isOwned ? "OFFICIAL PROPERTY DEED" : "PLOT RESERVATION PREVIEW", 110, 222);

  // Odznak statusu
  drawRoundedRect(ctx, 110, 255, 310, 52, 16);
  ctx.fillStyle = isOwned ? "rgba(16, 185, 129, 0.2)" : "rgba(251, 191, 36, 0.2)";
  ctx.fill();
  ctx.fillStyle = isOwned ? "#6EE7B7" : "#FCD34D";
  ctx.font = "800 24px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    isOwned ? `VERIFIED BUILDER • $${amount}` : `PREVIEW TIER • $${amount}`,
    132,
    289
  );

  // Velké číslo parcely a majitel
  ctx.fillStyle = "#94A3B8";
  ctx.font = "700 26px system-ui, -apple-system, sans-serif";
  ctx.fillText("PLOT NUMBER", 110, 385);

  ctx.fillStyle = "#FBBF24";
  ctx.font = "900 108px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(`#${String(plotNum).padStart(4, "0")}`, 106, 488);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "700 26px system-ui, -apple-system, sans-serif";
  ctx.fillText("OWNER / BUILDER", 110, 565);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 54px system-ui, -apple-system, sans-serif";
  const displayHandle = handle.length > 22 ? `${handle.slice(0, 21)}…` : handle;
  ctx.fillText(displayHandle, 110, 628);

  // Detaily čtvrti a budovy
  drawRoundedRect(ctx, 110, 675, 480, 180, 26);
  ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#F472B6";
  ctx.font = "800 22px system-ui, -apple-system, sans-serif";
  ctx.fillText("DISTRICT", 140, 722);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 32px system-ui, -apple-system, sans-serif";
  ctx.fillText(district, 140, 762);

  ctx.fillStyle = "#38BDF8";
  ctx.font = "800 22px system-ui, -apple-system, sans-serif";
  ctx.fillText("STRUCTURE TIER", 140, 808);
  ctx.fillStyle = "#E2E8F0";
  ctx.font = "800 26px system-ui, -apple-system, sans-serif";
  ctx.fillText(tierLabel, 140, 842);

  // Mini-mapa ostrova 40x40 vpravo
  const mapBoxX = 630;
  const mapBoxY = 540;
  const mapBoxSize = 330;
  drawRoundedRect(ctx, mapBoxX, mapBoxY, mapBoxSize, mapBoxSize, 26);
  ctx.fillStyle = "#020617";
  ctx.fill();
  ctx.strokeStyle = "#22D3EE";
  ctx.lineWidth = 4;
  ctx.stroke();

  const pad = 25;
  const inner = mapBoxSize - pad * 2;
  const cell = inner / COLS;

  // Silnice křížem
  ctx.fillStyle = "#334155";
  ctx.fillRect(mapBoxX + pad + 19 * cell, mapBoxY + pad, cell * 2, inner);
  ctx.fillRect(mapBoxX + pad, mapBoxY + pad + 19 * cell, inner, cell * 2);

  // Všechny existující budovy
  for (const d of allDonors) {
    const r = Math.floor((d.plot - 1) / COLS);
    const c = (d.plot - 1) % COLS;
    ctx.fillStyle =
      d.amount >= 10 ? "#10B981" : d.amount >= 5 ? "#EC4899" : "#38BDF8";
    ctx.fillRect(
      mapBoxX + pad + c * cell,
      mapBoxY + pad + r * cell,
      Math.max(cell, 5),
      Math.max(cell, 5)
    );
  }

  // Zaměřovač na vybranou parcelu
  const targetRow = Math.floor((plotNum - 1) / COLS);
  const targetCol = (plotNum - 1) % COLS;
  const cx = mapBoxX + pad + (targetCol + 0.5) * cell;
  const cy = mapBoxY + pad + (targetRow + 0.5) * cell;

  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.strokeStyle = "#FBBF24";
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  ctx.fillStyle = "#22D3EE";
  ctx.font = "800 20px system-ui, -apple-system, sans-serif";
  ctx.fillText("ISLAND LOCATION (40×40)", mapBoxX + 34, mapBoxY + mapBoxSize + 36);

  // Vzkaz dárce (pokud existuje)
  if (message) {
    drawRoundedRect(ctx, 110, 910, 850, 120, 22);
    ctx.fillStyle = "rgba(2, 6, 23, 0.75)";
    ctx.fill();
    ctx.fillStyle = "#CBD5E1";
    ctx.font = "italic 28px system-ui, -apple-system, sans-serif";
    const cleanMsg = message.length > 56 ? `${message.slice(0, 55)}…` : message;
    ctx.fillText(`“${cleanMsg}”`, 140, 980);
  }

  // Patička s odkazem na web
  drawRoundedRect(ctx, 110, 1085, 850, 140, 28);
  const footerGrad = ctx.createLinearGradient(110, 1085, 960, 1225);
  footerGrad.addColorStop(0, "rgba(16, 185, 129, 0.18)");
  footerGrad.addColorStop(1, "rgba(6, 182, 212, 0.18)");
  ctx.fillStyle = footerGrad;
  ctx.fill();
  ctx.strokeStyle = "rgba(34, 211, 238, 0.45)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#94A3B8";
  ctx.font = "700 24px system-ui, -apple-system, sans-serif";
  ctx.fillText("VISIT THIS 3D BUILDING LIVE AT:", 145, 1142);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 34px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(`vectorbra1n.vercel.app/?plot=${plotNum}`, 145, 1192);

  return canvas.toDataURL("image/png");
}

export default function App() {
  const audioCtxRef = useRef(null);
  const prevCountRef = useRef(null);

  const [theme, setTheme] = useState("night");
  const [soundOn, setSoundOn] = useState(true);
  const [demoMode, setDemoMode] = useState(
    () => new URLSearchParams(window.location.search).get("demo") === "1"
  );
  const [hudHidden, setHudHidden] = useState(
    () => new URLSearchParams(window.location.search).get("clean") === "1"
  );

  const [liveRows, setLiveRows] = useState(FALLBACK_DONORS);
  const [loadingDonors, setLoadingDonors] = useState(
    Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlot, setSelectedPlot] = useState(1);
  const [hoveredPlot, setHoveredPlot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDeedModal, setShowDeedModal] = useState(false);
  const [deedImageUrl, setDeedImageUrl] = useState("");
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  const [focusSignal, setFocusSignal] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);

  const [previewName, setPreviewName] = useState("");
  const [previewAmount, setPreviewAmount] = useState(1);
  const [copiedNote, setCopiedNote] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

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
        // Ignorujeme blokování zvuku prohlížečem
      }
    },
    [soundOn]
  );

  // Klávesová zkratka "H" pro skrytí/zobrazení HUD při natáčení videí
  useEffect(() => {
    const onKeyDown = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "h" || e.key === "H") {
        setHudHidden((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Načítání živých dárců ze Supabase + automatická kontrola nových staveb každých 30 s
  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setLoadingDonors(false);
      return;
    }

    let cancelled = false;

    const fetchDonors = async () => {
      try {
        const headers = { apikey: SUPABASE_ANON_KEY };
        if (SUPABASE_ANON_KEY.startsWith("eyJ")) {
          headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
        }

        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/donors?select=plot,name,amount,message,status&order=created_at.asc`,
          { headers }
        );
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;

        const validRows = data
          .filter((r) => r.status !== "refunded" && r.status !== "rejected")
          .map((r) => ({
            plot: r.plot ? Number(r.plot) : null,
            name: r.name || "@builder",
            amount: Number(r.amount) || 1,
            message: r.message || "",
            status: r.status || "active",
          }));

        if (prevCountRef.current !== null && validRows.length > prevCountRef.current) {
          playSfx("build");
        }
        prevCountRef.current = validRows.length;
        setLiveRows(validRows);
      } catch {
        // Při výpadku sítě ponecháme poslední načtený stav
      } finally {
        if (!cancelled) setLoadingDonors(false);
      }
    };

    fetchDonors();
    const intervalId = setInterval(fetchDonors, 30000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [playSfx]);

  const rawSourceRows = demoMode ? DEMO_DONORS : liveRows;

  // Dárci přiřazení ke konkrétní parcele (1–1600) pro vykreslení na 3D ostrově
  const activeDonors = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const d of rawSourceRows) {
      if (
        d.plot >= 1 &&
        d.plot <= TOTAL_PLOTS &&
        (!d.status || d.status === "active") &&
        !seen.has(d.plot)
      ) {
        seen.add(d.plot);
        list.push(d);
      }
    }
    return list;
  }, [rawSourceRows]);

  // Nejnovější stavitel na mapě (pro živý banner nahoře)
  const latestDonor = useMemo(() => {
    if (activeDonors.length === 0) return null;
    return activeDonors[activeDonors.length - 1];
  }, [activeDonors]);

  const donorMap = useMemo(() => {
    const map = new Map();
    for (const d of activeDonors) {
      map.set(d.plot, d);
    }
    return map;
  }, [activeDonors]);

  const topBuilders = useMemo(() => {
    return [...activeDonors]
      .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
      .slice(0, 5);
  }, [activeDonors]);

  // Celková vybraná částka
  const totalRaised = useMemo(() => {
    return rawSourceRows.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [rawSourceRows]);

  const finalPct = Math.min(100, (totalRaised / FINAL_GOAL_USD) * 100);
  const xboxPct = Math.min(100, (totalRaised / XBOX_GOAL_USD) * 100);
  const xboxUnlocked = totalRaised >= XBOX_GOAL_USD;

  const formattedHandle = previewName.trim()
    ? previewName.trim().startsWith("@")
      ? previewName.trim()
      : `@${previewName.trim()}`
    : "@your_name";

  const focusPlot = (plotNum) => {
    setSelectedPlot(plotNum);
    setFocusSignal((s) => s + 1);
    playSfx("select");
  };

  const handleJumpRandomFreePlot = () => {
    if (donorMap.size >= TOTAL_PLOTS) return;
    for (let attempt = 0; attempt < 120; attempt++) {
      const candidate = Math.floor(Math.random() * TOTAL_PLOTS) + 1;
      const idx = candidate - 1;
      const r = Math.floor(idx / COLS);
      const c = idx % COLS;
      const isRoad = c === 19 || c === 20 || r === 19 || r === 20;
      if (!isRoad && !donorMap.has(candidate)) {
        focusPlot(candidate);
        return;
      }
    }
    for (let p = 1; p <= TOTAL_PLOTS; p++) {
      if (!donorMap.has(p)) {
        focusPlot(p);
        return;
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plotParam = parseInt(params.get("plot") || "", 10);
    if (!Number.isNaN(plotParam) && plotParam >= 1 && plotParam <= TOTAL_PLOTS) {
      setSelectedPlot(plotParam);
      setFocusSignal((s) => s + 1);
    }
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

  const selectedDonor = donorMap.get(selectedPlot);
  const selectedVip = VIP_PLOTS[selectedPlot];
  const selectedDistrict = getDistrict(selectedPlot);
  const selectedRow = Math.floor((selectedPlot - 1) / COLS);
  const selectedCol = (selectedPlot - 1) % COLS;

  const handleOpenDeedCard = () => {
    const ownerHandle = selectedDonor ? selectedDonor.name : formattedHandle;
    const ownerAmount = selectedDonor ? selectedDonor.amount : previewAmount;
    const ownerMessage = selectedDonor ? selectedDonor.message : "";
    const dataUrl = generateDeedCardDataUrl({
      plotNum: selectedPlot,
      handle: ownerHandle,
      amount: ownerAmount,
      district: selectedDistrict,
      tierLabel: getTierLabel(ownerAmount, selectedPlot === 1),
      message: ownerMessage,
      isOwned: Boolean(selectedDonor),
      allDonors: activeDonors,
    });
    setDeedImageUrl(dataUrl);
    setShowDeedModal(true);
    playSfx("select");
  };

  const handleDownloadDeed = () => {
    if (!deedImageUrl) return;
    const link = document.createElement("a");
    link.href = deedImageUrl;
    link.download = `vice-city-plot-${String(selectedPlot).padStart(4, "0")}.png`;
    link.click();
    playSfx("build");
  };

  const handleCopySocialCaption = () => {
    const ownerHandle = selectedDonor ? selectedDonor.name : formattedHandle;
    const caption = `I just claimed Plot #${String(selectedPlot).padStart(
      4,
      "0"
    )} in ${selectedDistrict} (${ownerHandle}) on the live 3D Vice City island! 🌴🏙️ Check out my building: ${
      window.location.origin
    }/?plot=${selectedPlot}`;
    navigator.clipboard?.writeText(caption);
    setCopiedCaption(true);
    playSfx("select");
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  const kofiNoteText = `${formattedHandle} - Plot #${String(selectedPlot).padStart(
    4,
    "0"
  )}`;

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
    focusPlot(row * COLS + col + 1);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-white select-none font-sans">
      {/* Plně 3D WebGL ostrov */}
      <Island3D
        activeDonors={activeDonors}
        donorMap={donorMap}
        selectedPlot={selectedPlot}
        hoveredPlot={hoveredPlot}
        vipPlots={VIP_PLOTS}
        theme={theme}
        previewAmount={previewAmount}
        previewName={previewName}
        formattedHandle={formattedHandle}
        focusSignal={focusSignal}
        resetSignal={resetSignal}
        onSelectPlot={(plot) => {
          setSelectedPlot(plot);
          playSfx("select");
        }}
        onHoverPlot={setHoveredPlot}
      />

      {/* Plovoucí tlačítko pro návrat UI při skrytém HUD (?clean=1 nebo klávesa H) */}
      {hudHidden && (
        <button
          onClick={() => setHudHidden(false)}
          title="Show HUD (or press H)"
          className="fixed bottom-4 right-4 z-30 flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] font-bold text-slate-300 backdrop-blur-md hover:border-cyan-400 hover:text-white transition"
        >
          <Eye className="h-3.5 w-3.5 text-cyan-400" />
          <span>Show HUD (H)</span>
        </button>
      )}

      {!hudHidden && (
        <>
          {/* Horní lišta s pokrokem a ovládáním */}
          <header className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-cyan-400/30 bg-slate-900/90 px-3.5 py-2 shadow-2xl backdrop-blur-md">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-400 font-black text-slate-950 shadow-lg">
                3D
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
                  Drag to orbit 360° • Scroll to zoom • Click any plot
                </p>
              </div>
            </div>

            {/* Ukazatel cíle s milníky ($300, $750, $1,224 Xbox + GTA VI, $1,600) */}
            <div className="pointer-events-auto flex flex-1 max-w-lg flex-col gap-1.5 rounded-2xl border border-emerald-400/30 bg-slate-900/90 px-4 py-2 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
                <span className="flex items-center gap-1 text-emerald-300">
                  <DollarSign className="h-3.5 w-3.5" />
                  ${totalRaised.toLocaleString()} / ${FINAL_GOAL_USD.toLocaleString()}
                  {loadingDonors && (
                    <Loader2 className="ml-1 h-3 w-3 animate-spin text-cyan-400" />
                  )}
                </span>

                <span className="flex items-center gap-1 text-[11px] font-black text-amber-300">
                  <Gamepad2 className="h-3.5 w-3.5 text-amber-400" />
                  {xboxUnlocked
                    ? "Xbox + GTA VI UNLOCKED!"
                    : `$1,224 Xbox + GTA VI (${xboxPct.toFixed(0)}%)`}
                </span>
              </div>

              {/* Progress bar se značkami milníků */}
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-pink-500 transition-all duration-500"
                  style={{ width: `${Math.max(finalPct, totalRaised > 0 ? 2 : 0)}%` }}
                />
                {MILESTONES.map((m) => {
                  const leftPct = (m.amount / FINAL_GOAL_USD) * 100;
                  return (
                    <div
                      key={m.amount}
                      title={m.label}
                      style={{ left: `${leftPct}%` }}
                      className={`absolute top-0 bottom-0 -translate-x-1/2 ${
                        m.primary
                          ? "w-0.5 bg-amber-300 shadow-[0_0_8px_#FBBF24]"
                          : "w-px bg-slate-400/60"
                      }`}
                    />
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                <span>
                  Milestones: $300 • $750 •{" "}
                  <strong className="text-amber-300">$1,224 Xbox</strong> • $1,600 (+Fees)
                </span>
                <span>
                  {activeDonors.length} / {TOTAL_PLOTS.toLocaleString()} Built
                </span>
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

              {demoMode && (
                <button
                  onClick={() => {
                    playSfx("select");
                    setDemoMode(false);
                  }}
                  title="Exit secret demo mode"
                  className="flex items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-400/20 px-2.5 py-2 text-xs font-bold text-amber-200 transition"
                >
                  <Eye className="h-4 w-4" />
                  <span>Demo: ON</span>
                </button>
              )}

              <button
                onClick={cycleTheme}
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

              <button
                onClick={() => {
                  playSfx("select");
                  setResetSignal((r) => r + 1);
                }}
                title="Reset 3D camera"
                className="rounded-xl border border-slate-700 bg-slate-900/90 p-2 text-slate-200 hover:border-cyan-400 transition"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                onClick={() => setHudHidden(true)}
                title="Hide UI for clean video recording (H)"
                className="hidden sm:block rounded-xl border border-slate-700 bg-slate-900/90 p-2 text-slate-200 hover:border-cyan-400 transition"
              >
                <EyeOff className="h-4 w-4" />
              </button>

              <button
                onClick={() => setSoundOn((s) => !s)}
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

          {/* Banner pro prvního dárce NEBO živý banner posledního dárce */}
          {!demoMode && !loadingDonors && totalRaised === 0 ? (
            <div className="pointer-events-none absolute top-32 sm:top-22 left-1/2 z-10 -translate-x-1/2 w-max max-w-[94vw]">
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
          ) : (
            latestDonor && (
              <div className="pointer-events-none absolute top-32 sm:top-22 left-1/2 z-10 -translate-x-1/2 w-max max-w-[94vw]">
                <button
                  onClick={() => focusPlot(latestDonor.plot)}
                  title="Click to fly 3D camera to latest building"
                  className="pointer-events-auto flex items-center gap-2 rounded-full border border-emerald-400/50 bg-slate-900/90 px-3.5 py-1 text-[11px] font-bold text-slate-200 shadow-lg backdrop-blur-md hover:border-cyan-400 transition"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 font-black">LATEST:</span>
                  <span className="text-white font-extrabold">{latestDonor.name}</span>
                  <span className="text-slate-400">
                    built Plot #{String(latestDonor.plot).padStart(4, "0")} ($
                    {latestDonor.amount})
                  </span>
                </button>
              </div>
            )
          )}

          {/* Pravý HUD sloupec: GTA Radar + Top 5 stavitelů */}
          <div className="pointer-events-none absolute top-38 right-3 sm:top-24 sm:right-4 z-10 flex flex-col items-end gap-2.5">
            <div
              onClick={handleRadarClick}
              title="GTA Island Radar — Click anywhere to fly 3D camera"
              className="pointer-events-auto relative h-24 w-24 sm:h-32 sm:w-32 cursor-crosshair overflow-hidden rounded-2xl border-2 border-cyan-400/60 bg-slate-950/90 p-1.5 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md"
            >
              <svg viewBox="0 0 40 40" className="h-full w-full">
                <rect x="0" y="0" width="40" height="40" rx="2" fill="#0F172A" />
                <rect x="19" y="0" width="2" height="40" fill="#334155" />
                <rect x="0" y="19" width="40" height="2" fill="#334155" />
                {activeDonors.map((d) => {
                  const r = Math.floor((d.plot - 1) / COLS);
                  const c = (d.plot - 1) % COLS;
                  const color =
                    d.amount >= 10 ? "#10B981" : d.amount >= 5 ? "#EC4899" : "#38BDF8";
                  return (
                    <rect key={d.plot} x={c} y={r} width="1.2" height="1.2" fill={color} />
                  );
                })}
                <circle cx="0.8" cy="0.8" r="1.4" fill="#FBBF24" />
                <circle
                  cx={selectedCol + 0.5}
                  cy={selectedRow + 0.5}
                  r="1.6"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="0.8"
                />
              </svg>
              <div className="pointer-events-none absolute bottom-1 left-1.5 flex items-center gap-0.5 rounded bg-slate-950/80 px-1 text-[9px] font-black tracking-wider text-cyan-300">
                <Navigation className="h-2.5 w-2.5" /> 3D RADAR
              </div>
            </div>

            {topBuilders.length > 0 && (
              <div className="pointer-events-auto w-44 sm:w-52 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-2.5 shadow-xl backdrop-blur-md">
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

          {/* Spodní karta vybrané parcely + patička s legendou a Terms */}
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10 flex flex-col items-start justify-between gap-2.5 sm:flex-row sm:items-end">
            <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-lg bg-slate-800 px-2 py-1 font-mono text-xs font-black text-cyan-300">
                    #{String(selectedPlot).padStart(4, "0")}
                  </span>
                  <span className="flex items-center gap-1 rounded-lg bg-slate-800/70 px-2 py-1 text-[11px] font-semibold text-slate-300">
                    <MapPin className="h-3 w-3 text-pink-400" />
                    {selectedDistrict}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleJumpRandomFreePlot}
                    title="Jump to a random open plot"
                    className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-300 hover:border-amber-400 hover:text-amber-300 transition"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={handleOpenDeedCard}
                    title="Generate shareable PNG Property Deed Card"
                    className="flex items-center gap-1 rounded-lg border border-pink-500/40 bg-pink-500/15 px-2 py-1 text-[11px] font-bold text-pink-200 hover:border-pink-400 transition"
                  >
                    <Award className="h-3 w-3 text-pink-400" /> Deed
                  </button>

                  <button
                    onClick={handleSharePlot}
                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1 text-[11px] font-bold text-slate-300 hover:border-cyan-400 hover:text-white transition"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" /> Link
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3 w-3" /> Share
                      </>
                    )}
                  </button>
                </div>
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
                    {getTierLabel(selectedDonor.amount, selectedPlot === 1)}
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
                    <span>Test-build in 3D on this plot:</span>
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
                  if (selectedDonor) {
                    handleJumpRandomFreePlot();
                    return;
                  }
                  playSfx("build");
                  setShowModal(true);
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-2.5 text-sm font-black text-slate-950 shadow-lg hover:brightness-110 transition"
              >
                <Sparkles className="h-4 w-4" />
                {selectedDonor
                  ? "Find Available Plot ($1)"
                  : `Lock In Plot #${String(selectedPlot).padStart(4, "0")} ($${previewAmount})`}
              </button>
            </div>

            {/* Patička vpravo dole: Legenda + How it Works & Terms */}
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 self-end">
              <div className="hidden items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs text-slate-300 backdrop-blur-md lg:flex">
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

              <button
                onClick={() => {
                  playSfx("select");
                  setShowTermsModal(true);
                }}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-xs font-bold text-slate-300 shadow-xl backdrop-blur-md hover:border-cyan-400 hover:text-white transition"
              >
                <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
                <span>How it Works & Terms</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modální okno pro Ko-fi */}
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
              Your 3D building appears live on this island automatically after checkout and gets featured in our YouTube & TikTok series!
            </p>

            <div className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  1. Your @username (shown above your 3D building)
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

            <p className="mt-2.5 text-center text-[10px] text-slate-400">
              By supporting on Ko-fi, you agree to our{" "}
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setShowTermsModal(true);
                }}
                className="underline hover:text-cyan-300"
              >
                Terms & Refund Policy
              </button>
              .
            </p>
          </div>
        </div>
      )}

      {/* Modální okno: Sdílecí Deed karta parcely */}
      {showDeedModal && deedImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border-2 border-pink-500/50 bg-slate-900 p-5 shadow-2xl">
            <button
              onClick={() => setShowDeedModal(false)}
              className="absolute top-3.5 right-3.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-base font-black text-white flex items-center gap-1.5">
              <Award className="h-4 w-4 text-pink-400" />
              Plot #{String(selectedPlot).padStart(4, "0")} Deed Card
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Download or share your building card on TikTok, Instagram, or X!
            </p>

            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
              <img
                src={deedImageUrl}
                alt={`Plot #${selectedPlot} Deed`}
                className="mx-auto max-h-[52vh] w-auto object-contain"
              />
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadDeed}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-2.5 text-xs font-black text-slate-950 hover:brightness-110 transition"
              >
                <Download className="h-4 w-4" /> Save PNG
              </button>

              <button
                onClick={handleCopySocialCaption}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-black text-white hover:border-pink-400 transition"
              >
                {copiedCaption ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-pink-400" /> Copy Post
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modální okno: How it Works & Terms */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setShowTermsModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-black text-white">
              How Build Vice City Works & Terms
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Community 3D island challenge • Road to Xbox Series X + GTA VI
            </p>

            <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
                <h3 className="font-black text-cyan-300 uppercase tracking-wider text-[11px]">
                  1. How Digital Plot Placement Works
                </h3>
                <p className="mt-1">
                  The island consists of 1,600 numbered 3D plots (#0001–#1600). When you tip on Ko-fi and include{" "}
                  <code className="rounded bg-slate-800 px-1 text-amber-200">
                    @yourname - Plot #XXXX
                  </code>{" "}
                  in your message, our webhook automatically builds your 3D property on that plot:
                </p>
                <ul className="mt-1.5 list-disc pl-4 space-y-0.5 text-slate-300">
                  <li>
                    <strong>$1 – $4:</strong> Beach Bungalow
                  </li>
                  <li>
                    <strong>$5 – $9:</strong> Art Deco Pool Villa (plus #0001 Founder Special)
                  </li>
                  <li>
                    <strong>$10+:</strong> Neon Glass Skyscraper with Helipad
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
                <h3 className="font-black text-emerald-300 uppercase tracking-wider text-[11px]">
                  2. Funding Milestones
                </h3>
                <p className="mt-1">
                  Every contribution goes toward our creator gear goal:{" "}
                  <strong>$300</strong> (First District), <strong>$750</strong> (Skyline),{" "}
                  <strong className="text-amber-300">
                    $1,224 (Xbox Series X + GTA VI Unlocked)
                  </strong>
                  , and <strong>$1,600</strong> (100% Complete Island + Payment Fees).
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5">
                <h3 className="font-black text-pink-300 uppercase tracking-wider text-[11px]">
                  3. Terms, Moderation & Refund Policy
                </h3>
                <ul className="mt-1 list-disc pl-4 space-y-1 text-slate-300">
                  <li>
                    <strong>Voluntary Creator Support:</strong> Payments made via Ko-fi are voluntary tips supporting content creation. 3D plots are cosmetic community acknowledgments and carry no monetary, ownership, or NFT value.
                  </li>
                  <li>
                    <strong>Non-Refundable:</strong> Because digital plot allocation and 3D rendering are automated immediately upon payment, contributions are final and non-refundable.
                  </li>
                  <li>
                    <strong>Content Moderation:</strong> Usernames or messages containing hate speech, slurs, harassment, or spam links will be masked or renamed while keeping your building active on the map. If you forgot your plot number at checkout, contact us with your Ko-fi receipt and we will assign an available plot.
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowTermsModal(false)}
              className="mt-5 w-full rounded-xl bg-slate-800 py-2.5 text-xs font-black text-white hover:bg-slate-700 transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}