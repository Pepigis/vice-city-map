import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowDown,
  ArrowUp,
  Award,
  Car,
  Check,
  Coins,
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
  Lock,
  LogOut,
  Map as MapIcon,
  MapPin,
  Moon,
  Navigation,
  Rocket,
  RotateCcw,
  Search,
  Share2,
  Shirt,
  Shuffle,
  Sparkles,
  Sun,
  Sunset,
  Trophy,
  Unlock,
  User,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import Island3D, { PLAYER_SKINS } from "./Island3D";

const FALLBACK_DONORS = [];

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
const TILE_STEP = 1.12;
const XBOX_GOAL_USD = 1224;
const FINAL_GOAL_USD = 1600;
const KOFI_URL = "https://ko-fi.com/vectorbra1n";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/rest\/v1$/i, "");
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

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

const SKIN_UNLOCK_RULES = [
  { id: "tourist", minUsd: 0, minCoins: 0, reqLabel: "Free Starter" },
  { id: "hacker", minUsd: 1, minCoins: 10, reqLabel: "$1+ Donor or 10 Coins" },
  { id: "vip", minUsd: 5, minCoins: 20, reqLabel: "$5+ Donor or 20 Coins" },
  { id: "kingpin", minUsd: 10, minCoins: 35, reqLabel: "$10+ Donor or 35 Coins" },
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

  const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, "#050816");
  bg.addColorStop(0.5, "#1E1035");
  bg.addColorStop(1, "#09152B");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1350);

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

  ctx.fillStyle = "#22D3EE";
  ctx.font = "900 28px system-ui, -apple-system, sans-serif";
  ctx.fillText("BUILD VICE CITY • 3D ISLAND CHALLENGE", 110, 145);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 66px system-ui, -apple-system, sans-serif";
  ctx.fillText(isOwned ? "OFFICIAL PROPERTY DEED" : "PLOT RESERVATION PREVIEW", 110, 222);

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

  ctx.fillStyle = "#334155";
  ctx.fillRect(mapBoxX + pad + 19 * cell, mapBoxY + pad, cell * 2, inner);
  ctx.fillRect(mapBoxX + pad, mapBoxY + pad + 19 * cell, inner, cell * 2);

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

  if (message) {
    drawRoundedRect(ctx, 110, 910, 850, 120, 22);
    ctx.fillStyle = "rgba(2, 6, 23, 0.75)";
    ctx.fill();
    ctx.fillStyle = "#CBD5E1";
    ctx.font = "italic 28px system-ui, -apple-system, sans-serif";
    const cleanMsg = message.length > 56 ? `${message.slice(0, 55)}…` : message;
    ctx.fillText(`“${cleanMsg}”`, 140, 980);
  }

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

function TouchJoystick({ onMove }) {
  const baseRef = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activeTouchIdRef = useRef(null);

  const updateFromClient = (clientX, clientY) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxRadius = rect.width * 0.36;

    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setKnob({ x: dx, y: dy });
    onMove(dx / maxRadius, -dy / maxRadius);
  };

  const resetStick = () => {
    activeTouchIdRef.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      ref={baseRef}
      onTouchStart={(e) => {
        e.stopPropagation();
        const t = e.changedTouches[0];
        if (!t) return;
        activeTouchIdRef.current = t.identifier;
        updateFromClient(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        e.stopPropagation();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === activeTouchIdRef.current) {
            updateFromClient(t.clientX, t.clientY);
            break;
          }
        }
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === activeTouchIdRef.current) {
            resetStick();
            break;
          }
        }
      }}
      onTouchCancel={resetStick}
      className="relative h-28 w-28 rounded-full border-2 border-cyan-400/60 bg-slate-950/75 shadow-2xl backdrop-blur-md touch-none"
    >
      <div
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        className="absolute top-1/2 left-1/2 -mt-5 -ml-5 h-10 w-10 rounded-full bg-gradient-to-br from-cyan-300 to-pink-500 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
      />
    </div>
  );
}

export default function App() {
  const audioCtxRef = useRef(null);
  const prevCountRef = useRef(null);
  const sessionIdRef = useRef(
    `player_${Math.random().toString(36).slice(2, 10)}`
  );
  const channelRef = useRef(null);
  const lastBroadcastRef = useRef(0);
  const latestTransformRef = useRef({
    x: 0,
    y: 0.14,
    z: 3.6,
    yaw: Math.PI,
    vehicleMode: "foot",
    carColor: "#FFFFFF",
  });

  const playerInputRef = useRef({
    moveX: 0,
    moveY: 0,
    sprint: false,
    jump: false,
    descend: false,
    horn: false,
    toggleVehicle: null,
    spawnPersonalCar: null,
    spawnHelicopter: null,
  });

  const [theme, setTheme] = useState("night");
  const [soundOn, setSoundOn] = useState(true);
  const [streetMode, setStreetMode] = useState(
    () => new URLSearchParams(window.location.search).get("street") === "1"
  );
  const [playerPos, setPlayerPos] = useState({ x: 0, z: 3.6 });
  const [touchSprint, setTouchSprint] = useState(false);
  const [viceCoins, setViceCoins] = useState(0);
  const [playerSkin, setPlayerSkin] = useState("tourist");
  const [remotePlayersMap, setRemotePlayersMap] = useState({});

  const [vehicleState, setVehicleState] = useState({
    mode: "foot",
    canEnter: null,
    carColor: null,
    speedKmh: 0,
    altitude: 0,
  });

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
  const [showGarageModal, setShowGarageModal] = useState(false);
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
        } else if (type === "coin") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(987.77, now);
          osc.frequency.setValueAtTime(1318.51, now + 0.06);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.start(now);
          osc.stop(now + 0.19);
        } else if (type === "horn") {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.setValueAtTime(400, now + 0.08);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
          osc.start(now);
          osc.stop(now + 0.25);
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

  const formattedHandle = previewName.trim()
    ? previewName.trim().startsWith("@")
      ? previewName.trim()
      : `@${previewName.trim()}`
    : "@your_name";

  // Supabase Realtime Multiplayer (Presence + Broadcast)
  useEffect(() => {
    if (!supabase) return;

    const myId = sessionIdRef.current;
    const channel = supabase.channel("vice-city-live-island", {
      config: {
        presence: { key: myId },
        broadcast: { self: false },
      },
    });

    channel
      .on("presence", { event: "leave" }, ({ key }) => {
        if (!key) return;
        setRemotePlayersMap((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .on("broadcast", { event: "player_move" }, ({ payload }) => {
        if (!payload || !payload.id || payload.id === myId) return;
        setRemotePlayersMap((prev) => ({
          ...prev,
          [payload.id]: {
            ...payload,
            updatedAt: Date.now(),
          },
        }));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: myId,
            name: previewName.trim() ? formattedHandle : "@visitor",
            onlineAt: Date.now(),
          });
        }
      });

    channelRef.current = channel;

    // Pravidelné odstraňování neaktivních hráčů po 8 sekundách
    const cleanupTimer = setInterval(() => {
      const cutoff = Date.now() - 8000;
      setRemotePlayersMap((prev) => {
        let changed = false;
        const next = {};
        for (const [k, val] of Object.entries(prev)) {
          if (val.updatedAt >= cutoff) {
            next[k] = val;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 3000);

    return () => {
      clearInterval(cleanupTimer);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [formattedHandle, previewName]);

  const remotePlayersList = useMemo(
    () => Object.values(remotePlayersMap),
    [remotePlayersMap]
  );

  // Klávesové zkratky: "H" = skrytí HUDu, "V" = přepnutí Street Mode / Map View
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
      } else if (e.key === "v" || e.key === "V") {
        setStreetMode((prev) => !prev);
        playSfx("theme");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playSfx]);

  // Načítání živých dárců ze Supabase
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

  // Výpočet darované částky aktuálního uživatele (pro odemčení VIP odměn v Garáži)
  const userDonatedUsd = useMemo(() => {
    if (demoMode) return 20;
    const clean = previewName.trim().toLowerCase().replace(/^@/, "");
    if (!clean) return 0;
    return rawSourceRows
      .filter((d) => (d.name || "").toLowerCase().replace(/^@/, "") === clean)
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [demoMode, previewName, rawSourceRows]);

  const helicopterUnlocked =
    demoMode || userDonatedUsd >= 10 || viceCoins >= 25;

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

  const totalRaised = useMemo(() => {
    return rawSourceRows.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [rawSourceRows]);

  const finalPct = Math.min(100, (totalRaised / FINAL_GOAL_USD) * 100);
  const xboxPct = Math.min(100, (totalRaised / XBOX_GOAL_USD) * 100);
  const xboxUnlocked = totalRaised >= XBOX_GOAL_USD;

  const handlePlayerTransformChange = useCallback(
    (transform) => {
      setPlayerPos({ x: transform.x, z: transform.z });
      latestTransformRef.current = transform;

      const now = Date.now();
      if (channelRef.current && now - lastBroadcastRef.current >= 100) {
        lastBroadcastRef.current = now;
        channelRef.current.send({
          type: "broadcast",
          event: "player_move",
          payload: {
            id: sessionIdRef.current,
            name: previewName.trim() ? formattedHandle : "@visitor",
            skin: playerSkin,
            x: transform.x,
            y: transform.y,
            z: transform.z,
            yaw: transform.yaw,
            vehicleMode: transform.vehicleMode,
            carColor: transform.carColor,
          },
        });
      }
    },
    [formattedHandle, playerSkin, previewName]
  );

  const focusPlot = (plotNum) => {
    setSelectedPlot(plotNum);
    if (streetMode) {
      setStreetMode(false);
    }
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

  const playerRadarCol = Math.max(
    0,
    Math.min(COLS, playerPos.x / TILE_STEP + COLS / 2)
  );
  const playerRadarRow = Math.max(
    0,
    Math.min(ROWS, playerPos.z / TILE_STEP + ROWS / 2)
  );

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

  const handleCoinCollect = useCallback(() => {
    setViceCoins((c) => c + 1);
  }, []);

  const handleSpawnPersonalCar = (color) => {
    setShowGarageModal(false);
    if (!streetMode) {
      setStreetMode(true);
      setTimeout(() => {
        playerInputRef.current.spawnPersonalCar?.(color);
      }, 80);
    } else {
      playerInputRef.current.spawnPersonalCar?.(color);
    }
  };

  const handleSpawnHelicopter = () => {
    if (!helicopterUnlocked) return;
    setShowGarageModal(false);
    if (!streetMode) {
      setStreetMode(true);
      setTimeout(() => {
        playerInputRef.current.spawnHelicopter?.();
      }, 80);
    } else {
      playerInputRef.current.spawnHelicopter?.();
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-white select-none font-sans">
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
        streetMode={streetMode}
        playerSkin={playerSkin}
        remotePlayers={remotePlayersList}
        playerInputRef={playerInputRef}
        onSelectPlot={(plot) => {
          setSelectedPlot(plot);
          if (!streetMode) playSfx("select");
        }}
        onHoverPlot={setHoveredPlot}
        onPlayerTransformChange={handlePlayerTransformChange}
        onVehicleStateChange={setVehicleState}
        onCoinCollect={handleCoinCollect}
        onPlaySfx={playSfx}
      />

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
          {/* Horní lišta */}
          <header className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-slate-900/90 px-3 py-2 shadow-2xl backdrop-blur-md">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-400 font-black text-slate-950 shadow-lg">
                3D
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-black tracking-tight sm:text-base">
                    BUILD VICE CITY
                  </h1>
                  {supabase && (
                    <span className="flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-black text-orange-300 border border-orange-400/40">
                      <Users className="h-3 w-3" />
                      {remotePlayersList.length + 1}
                    </span>
                  )}
                </div>
                <p className="hidden text-[11px] text-slate-400 md:block">
                  {streetMode
                    ? vehicleState.mode === "heli"
                      ? "WASD fly • Space ascend • Shift descend • E/F exit"
                      : vehicleState.mode === "car"
                        ? "WASD drive • Space drift • Shift horn • E/F exit"
                        : "WASD walk • Shift sprint • Space jump • E/F steal vehicle"
                    : "Drag to orbit 360° • Scroll to zoom • Click any plot"}
                </p>
              </div>

              <button
                onClick={() => {
                  playSfx("theme");
                  setStreetMode((prev) => !prev);
                }}
                title="Switch between 3D Street Walk and Bird's-Eye Map (V)"
                className={`ml-1 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black shadow-lg transition ${
                  streetMode
                    ? "bg-gradient-to-r from-amber-400 to-pink-500 text-slate-950"
                    : "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 hover:brightness-110"
                }`}
              >
                {streetMode ? (
                  <>
                    <MapIcon className="h-4 w-4" />
                    <span>Map View</span>
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4" />
                    <span>Walk Island</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  playSfx("select");
                  setShowGarageModal(true);
                }}
                title="Open Ko-fi VIP Garage, Outfits & Helicopter"
                className="flex items-center gap-1.5 rounded-xl border border-pink-400/50 bg-pink-500/15 px-2.5 py-2 text-xs font-black text-pink-200 hover:bg-pink-500/25 transition"
              >
                <Shirt className="h-4 w-4 text-pink-400" />
                <span className="hidden sm:inline">Garage</span>
              </button>
            </div>

            {/* Ukazatel cíle s milníky */}
            <div className="pointer-events-auto hidden xl:flex flex-1 max-w-md flex-col gap-1.5 rounded-2xl border border-emerald-400/30 bg-slate-900/90 px-4 py-2 shadow-2xl backdrop-blur-md">
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
                  <strong className="text-amber-300">$1,224 Xbox</strong> • $1,600
                </span>
                <span>
                  {activeDonors.length} / {TOTAL_PLOTS.toLocaleString()} Built
                </span>
              </div>
            </div>

            {/* Pravá horní tlačítka + počítadlo Vice Coinů */}
            <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
              {streetMode && (
                <div className="flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-slate-900/90 px-3 py-1.5 text-xs font-black text-amber-300 shadow-lg backdrop-blur-md">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span>{viceCoins}</span>
                </div>
              )}

              {!streetMode && (
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
                    className="w-24 bg-transparent px-2 text-xs text-white placeholder-slate-400 focus:outline-none sm:w-32"
                  />
                </form>
              )}

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
                  <span>Demo</span>
                </button>
              )}

              <button
                onClick={cycleTheme}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 py-2 text-xs font-bold text-slate-200 hover:border-pink-400 transition"
              >
                {theme === "night" ? (
                  <Moon className="h-4 w-4 text-cyan-300" />
                ) : theme === "sunset" ? (
                  <Sunset className="h-4 w-4 text-pink-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-300" />
                )}
              </button>

              {!streetMode && (
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
              )}

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

          {/* Plovoucí akční výzva pro nastoupení / vystoupení z vozidla */}
          {streetMode && (vehicleState.canEnter || vehicleState.mode !== "foot") && (
            <div className="pointer-events-none fixed top-20 left-1/2 z-20 -translate-x-1/2">
              {vehicleState.canEnter ? (
                <button
                  onClick={() => playerInputRef.current.toggleVehicle?.()}
                  className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-amber-300 bg-slate-950/95 px-4 py-2 text-xs font-black text-amber-200 shadow-[0_0_25px_rgba(251,191,36,0.45)] hover:scale-105 transition"
                >
                  {vehicleState.canEnter === "heli" ? (
                    <>
                      <Rocket className="h-4 w-4 text-pink-400" />
                      <span>BOARD CHOPPER (Press E / F)</span>
                    </>
                  ) : (
                    <>
                      <Car className="h-4 w-4 text-amber-400" />
                      <span>STEAL CAR (Press E / F)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-cyan-400/60 bg-slate-950/90 px-4 py-1.5 text-xs font-black text-white shadow-xl backdrop-blur-md">
                  <span className="font-mono text-cyan-300">
                    {vehicleState.mode === "heli"
                      ? `ALT ${vehicleState.altitude}M • ${vehicleState.speedKmh} KM/H`
                      : `${vehicleState.speedKmh} KM/H`}
                  </span>
                  <span className="text-slate-600">•</span>
                  <button
                    onClick={() => playerInputRef.current.toggleVehicle?.()}
                    className="flex items-center gap-1 text-pink-400 hover:text-pink-300"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Exit (E / F)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Banner posledního dárce (jen v Map View) */}
          {!streetMode &&
            (!demoMode && !loadingDonors && totalRaised === 0 ? (
              <div className="pointer-events-none absolute top-20 left-1/2 z-10 -translate-x-1/2 w-max max-w-[94vw]">
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
                <div className="pointer-events-none absolute top-20 left-1/2 z-10 -translate-x-1/2 w-max max-w-[94vw]">
                  <button
                    onClick={() => focusPlot(latestDonor.plot)}
                    title="Click to fly 3D camera to latest building"
                    className="pointer-events-auto flex items-center gap-2 rounded-full border border-emerald-400/50 bg-slate-900/90 px-3.5 py-1 text-[11px] font-bold text-slate-200 shadow-lg backdrop-blur-md hover:border-cyan-400 transition"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-300 font-black">LATEST:</span>
                    <span className="text-white font-extrabold">{latestDonor.name}</span>
                    <span className="text-slate-400">
                      Plot #{String(latestDonor.plot).padStart(4, "0")} ($
                      {latestDonor.amount})
                    </span>
                  </button>
                </div>
              )
            ))}

          {/* Pravý HUD sloupec: GTA Radar + Top 5 stavitelů */}
          <div className="pointer-events-none absolute top-24 right-3 sm:right-4 z-10 flex flex-col items-end gap-2.5">
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
                {/* Ostatní online hráči na radaru */}
                {remotePlayersList.map((rp) => {
                  const rc = Math.max(0, Math.min(COLS, rp.x / TILE_STEP + COLS / 2));
                  const rr = Math.max(0, Math.min(ROWS, rp.z / TILE_STEP + ROWS / 2));
                  return (
                    <circle
                      key={rp.id}
                      cx={rc}
                      cy={rr}
                      r="1.5"
                      fill="#FB923C"
                    />
                  );
                })}
                {streetMode && (
                  <circle
                    cx={playerRadarCol}
                    cy={playerRadarRow}
                    r="1.8"
                    fill={
                      vehicleState.mode === "heli"
                        ? "#EC4899"
                        : vehicleState.mode === "car"
                          ? "#FACC15"
                          : "#22D3EE"
                    }
                    stroke="#FFFFFF"
                    strokeWidth="0.7"
                  />
                )}
              </svg>
              <div className="pointer-events-none absolute bottom-1 left-1.5 flex items-center gap-0.5 rounded bg-slate-950/80 px-1 text-[9px] font-black tracking-wider text-cyan-300">
                <Navigation className="h-2.5 w-2.5" />{" "}
                {streetMode
                  ? vehicleState.mode === "heli"
                    ? "HELI"
                    : vehicleState.mode === "car"
                      ? "CAR"
                      : "YOU"
                  : "3D RADAR"}
              </div>
            </div>

            {!streetMode && topBuilders.length > 0 && (
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

          {/* Mobilní ovládání + spodní lišta ve Street Mode */}
          {streetMode ? (
            <>
              <div className="pointer-events-auto fixed bottom-28 left-4 z-20 md:hidden">
                <TouchJoystick
                  onMove={(mx, my) => {
                    playerInputRef.current.moveX = mx;
                    playerInputRef.current.moveY = my;
                  }}
                />
              </div>

              <div className="pointer-events-auto fixed bottom-28 right-4 z-20 flex flex-col gap-2.5 md:hidden">
                {(vehicleState.canEnter || vehicleState.mode !== "foot") && (
                  <button
                    onClick={() => playerInputRef.current.toggleVehicle?.()}
                    className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-300 bg-slate-950/90 text-amber-300 shadow-xl active:scale-95 touch-none"
                  >
                    {vehicleState.mode !== "foot" ? (
                      <LogOut className="h-6 w-6" />
                    ) : vehicleState.canEnter === "heli" ? (
                      <Rocket className="h-6 w-6" />
                    ) : (
                      <Car className="h-6 w-6" />
                    )}
                  </button>
                )}

                <button
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    playerInputRef.current.jump = true;
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    playerInputRef.current.jump = false;
                  }}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-400 bg-slate-950/85 text-emerald-300 shadow-xl active:scale-95 touch-none"
                >
                  <ArrowUp className="h-6 w-6" />
                </button>

                {vehicleState.mode === "heli" ? (
                  <button
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      playerInputRef.current.descend = true;
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      playerInputRef.current.descend = false;
                    }}
                    className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-pink-400 bg-slate-950/85 text-pink-300 shadow-xl active:scale-95 touch-none"
                  >
                    <ArrowDown className="h-6 w-6" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const next = !touchSprint;
                      setTouchSprint(next);
                      playerInputRef.current.sprint = next;
                    }}
                    className={`flex h-12 w-14 items-center justify-center rounded-2xl border text-[11px] font-black shadow-xl touch-none ${
                      touchSprint
                        ? "border-amber-400 bg-amber-400 text-slate-950"
                        : "border-slate-700 bg-slate-950/85 text-slate-300"
                    }`}
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="pointer-events-none fixed bottom-3 left-3 right-3 z-10 flex justify-center">
                <div className="pointer-events-auto flex w-full max-w-lg items-center justify-between gap-2 rounded-2xl border border-cyan-400/40 bg-slate-900/92 px-3.5 py-2.5 shadow-2xl backdrop-blur-md">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs font-black text-cyan-300">
                        #{String(selectedPlot).padStart(4, "0")}
                      </span>
                      <span className="truncate text-xs font-bold text-slate-300">
                        {selectedDistrict}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs font-extrabold text-white">
                      {selectedDonor
                        ? `${selectedDonor.name} • $${selectedDonor.amount}`
                        : "Open Plot — Drive up & claim!"}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setShowGarageModal(true)}
                      className="rounded-xl border border-pink-400/50 bg-pink-500/20 px-3 py-2 text-xs font-black text-pink-200"
                    >
                      Garage
                    </button>

                    {!selectedDonor ? (
                      <button
                        onClick={() => {
                          playSfx("build");
                          setShowModal(true);
                        }}
                        className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-3.5 py-2 text-xs font-black text-slate-950 shadow-lg hover:brightness-110 transition"
                      >
                        Claim ($1+)
                      </button>
                    ) : (
                      <button
                        onClick={handleOpenDeedCard}
                        className="rounded-xl border border-cyan-400/50 bg-cyan-500/20 px-3 py-2 text-xs font-black text-cyan-200"
                      >
                        Deed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
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
          )}
        </>
      )}

      {/* Modální okno: Ko-fi VIP Garáž, Skiny & Vrtulník */}
      {showGarageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border-2 border-pink-400/50 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setShowGarageModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-pink-400">
              <Crown className="h-4 w-4" /> VIP Garage & Character Wardrobe
            </div>
            <h2 className="mt-1 text-2xl font-black text-white">
              Vice City Garage
            </h2>

            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Verify your Ko-fi @username to unlock donor perks:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={previewName}
                  onChange={(e) => setPreviewName(e.target.value)}
                  placeholder="@your_username"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1.5 font-mono text-xs font-black text-emerald-300">
                  ${userDonatedUsd} • {viceCoins}c
                </div>
              </div>
            </div>

            {/* Výběr skinů postavy */}
            <div className="mt-4">
              <div className="text-xs font-black uppercase tracking-wider text-cyan-300 mb-2">
                1. Character Outfits
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SKIN_UNLOCK_RULES.map((rule) => {
                  const skin = PLAYER_SKINS[rule.id];
                  const unlocked =
                    demoMode ||
                    userDonatedUsd >= rule.minUsd ||
                    viceCoins >= rule.minCoins;
                  const active = playerSkin === rule.id;

                  return (
                    <button
                      key={rule.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => {
                        setPlayerSkin(rule.id);
                        playSfx("build");
                      }}
                      className={`flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                        active
                          ? "border-cyan-400 bg-cyan-400/15"
                          : unlocked
                            ? "border-slate-700 bg-slate-950 hover:border-pink-400"
                            : "border-slate-800/80 bg-slate-950/50 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span
                          className="h-4 w-4 rounded-full border border-white/40"
                          style={{ backgroundColor: skin.torso }}
                        />
                        {unlocked ? (
                          <Unlock className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-slate-500" />
                        )}
                      </div>
                      <div className="mt-1.5 text-xs font-black text-white">
                        {skin.name}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400">
                        {unlocked ? (active ? "Equipped" : "Click to equip") : rule.reqLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Přivolání osobního auta a vrtulníku */}
            <div className="mt-4">
              <div className="text-xs font-black uppercase tracking-wider text-amber-300 mb-2">
                2. Spawn Personal Vehicles
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    handleSpawnPersonalCar(userDonatedUsd >= 5 ? "#FBBF24" : "#FFFFFF")
                  }
                  className="flex w-full items-center justify-between rounded-2xl border border-cyan-400/50 bg-slate-950 p-3 text-left hover:bg-slate-800/80 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                      <Car className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">
                        Personal Vice Supercar
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Spawns right at your feet • Top speed boost
                      </div>
                    </div>
                  </div>
                  <span className="rounded-lg bg-cyan-400 px-2.5 py-1 text-[11px] font-black text-slate-950">
                    Spawn
                  </span>
                </button>

                <button
                  type="button"
                  disabled={!helicopterUnlocked}
                  onClick={handleSpawnHelicopter}
                  className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                    helicopterUnlocked
                      ? "border-pink-400/60 bg-slate-950 hover:bg-slate-800/80"
                      : "border-slate-800 bg-slate-950/50 opacity-65 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/20 text-pink-300">
                      <Rocket className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">
                        Vice Chopper (Flyable Helicopter)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {helicopterUnlocked
                          ? "Fly over skyscrapers & land on helipads!"
                          : "Unlocked for $10+ Donors or 25 Vice Coins"}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${
                      helicopterUnlocked
                        ? "bg-gradient-to-r from-pink-500 to-amber-400 text-slate-950"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {helicopterUnlocked ? "Fly Now" : "Locked"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
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
              Your 3D building appears live on this island automatically after checkout and unlocks VIP Garage outfits & vehicles!
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
                    <strong>$1 – $4:</strong> Beach Bungalow + Neon Hacker Outfit
                  </li>
                  <li>
                    <strong>$5 – $9:</strong> Art Deco Pool Villa + Golden VIP Outfit
                  </li>
                  <li>
                    <strong>$10+:</strong> Neon Glass Skyscraper + Flyable Vice Chopper
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
                    <strong>Voluntary Creator Support:</strong> Payments made via Ko-fi are voluntary tips supporting content creation. 3D plots and virtual garage items are cosmetic community acknowledgments and carry no monetary, ownership, or NFT value.
                  </li>
                  <li>
                    <strong>Non-Refundable:</strong> Because digital plot allocation and 3D rendering are automated immediately upon payment, contributions are final and non-refundable.
                  </li>
                  <li>
                    <strong>Content Moderation:</strong> Usernames or messages containing hate speech, slurs, harassment, or spam links will be masked or renamed while keeping your building active on the map.
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