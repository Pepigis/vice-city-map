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
} from "lucide-react";
import Island3D from "./Island3D";

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

// Demo data pro natáčení ukázek do videa (přepíná se tlačítkem "Demo" v hlavičce)
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
const GOAL_USD = 1600;
const KOFI_URL = "https://ko-fi.com/vectorbra1n";

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

export default function App() {
  const audioCtxRef = useRef(null);

  const [theme, setTheme] = useState("night");
  const [soundOn, setSoundOn] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlot, setSelectedPlot] = useState(1);
  const [hoveredPlot, setHoveredPlot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  const [focusSignal, setFocusSignal] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);

  const [previewName, setPreviewName] = useState("");
  const [previewAmount, setPreviewAmount] = useState(1);
  const [copiedNote, setCopiedNote] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  const focusPlot = (plotNum) => {
    setSelectedPlot(plotNum);
    setFocusSignal((s) => s + 1);
    playSfx("select");
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

  const selectedDonor = donorMap.get(selectedPlot);
  const selectedVip = VIP_PLOTS[selectedPlot];
  const selectedDistrict = getDistrict(selectedPlot);
  const selectedRow = Math.floor((selectedPlot - 1) / COLS);
  const selectedCol = (selectedPlot - 1) % COLS;

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
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition ${
              demoMode
                ? "border-amber-400 bg-amber-400/20 text-amber-200"
                : "border-slate-700 bg-slate-900/90 text-slate-300 hover:border-slate-500"
            }`}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden md:inline">{demoMode ? "Demo: ON" : "Demo"}</span>
          </button>

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

      {/* Banner pro prvního dárce */}
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
        <div
          onClick={handleRadarClick}
          title="GTA Island Radar — Click anywhere to fly 3D camera"
          className="pointer-events-auto relative h-28 w-28 sm:h-32 sm:w-32 cursor-crosshair overflow-hidden rounded-2xl border-2 border-cyan-400/60 bg-slate-950/90 p-1.5 shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md"
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

      {/* Spodní karta vybrané parcely + živý 3D náhled stavby */}
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
              Your 3D building stays permanently on this live island and gets featured in tomorrow's YouTube & TikTok episode!
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
          </div>
        </div>
      )}
    </div>
  );
}