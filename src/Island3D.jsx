import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import {
  createAsphaltRoadTexture,
  createBungalowFacade,
  createPlazaTexture,
  createPlotTexture,
  createPromenadeTexture,
  createRoofTileTexture,
  createSandTexture,
  createShopFacadeTexture,
  createSkyscraperFacade,
  createVillaFacade,
  createWaterTexture,
  createWoodPierTexture,
} from "./textures3D";

export const COLS = 40;
export const ROWS = 40;
export const TOTAL_PLOTS = COLS * ROWS;
export const TILE_STEP = 1.24;
const DEFAULT_VIP_PLOTS = {};

// Souřadnice okružního pobřežního bulváru Ocean Drive
const RING_COORD = 26.4;
const GRID_HALF_SPAN = (COLS * TILE_STEP) / 2; // 24.8

export const PLAYER_SKINS = {
  tourist: {
    id: "tourist",
    name: "Vice Tourist",
    torso: "#06B6D4",
    accent: "#F472B6",
    pants: "#1D4ED8",
    hair: "#1E1B4B",
    shoes: "#F8FAFC",
  },
  hacker: {
    id: "hacker",
    name: "Neon Hacker",
    torso: "#0F172A",
    accent: "#10B981",
    pants: "#020617",
    hair: "#22D3EE",
    shoes: "#10B981",
  },
  vip: {
    id: "vip",
    name: "Golden VIP",
    torso: "#18181B",
    accent: "#FBBF24",
    pants: "#18181B",
    hair: "#F59E0B",
    shoes: "#FBBF24",
  },
  kingpin: {
    id: "kingpin",
    name: "Vice Kingpin",
    torso: "#F8FAFC",
    accent: "#EC4899",
    pants: "#F1F5F9",
    hair: "#334155",
    shoes: "#EC4899",
  },
};

// 4 interaktivní 3D obchody po obvodu ostrova (mimo 1 600 parcel)
export const CITY_SHOPS = [
  {
    id: "diner",
    name: "Malibu Neon Diner",
    subtitle: "Energy Espresso & Turbo Boost",
    x: -4.4,
    z: 29.3,
    rotY: Math.PI,
    color: "#EC4899",
    accent: "#22D3EE",
    w: 2.8,
    h: 1.55,
    d: 2.1,
  },
  {
    id: "motors",
    name: "Vice Motors Showroom",
    subtitle: "Custom Supercars & Neon Paint",
    x: 4.4,
    z: 29.3,
    rotY: Math.PI,
    color: "#F59E0B",
    accent: "#38BDF8",
    w: 3.1,
    h: 1.75,
    d: 2.2,
  },
  {
    id: "boutique",
    name: "Ocean Drive Boutique",
    subtitle: "VIP Outfits & Streetwear",
    x: 29.3,
    z: -4.4,
    rotY: -Math.PI / 2,
    color: "#8B5CF6",
    accent: "#F472B6",
    w: 2.8,
    h: 1.6,
    d: 2.1,
  },
  {
    id: "helipad",
    name: "Marina Sky Helipad",
    subtitle: "Vice Chopper & Aerial Tours",
    x: -29.3,
    z: 4.4,
    rotY: Math.PI / 2,
    color: "#10B981",
    accent: "#FBBF24",
    w: 2.8,
    h: 1.4,
    d: 2.2,
  },
];

// 7 AI aut (4 na hlavních bulvárech + 3 na pobřežním okruhu Ocean Drive) + 1 osobní sporťák
const INITIAL_STREET_CARS = [
  { id: 0, mode: "line", axis: "x", dir: 1, lane: 0.54, baseSpeed: 5.5, offset: 2, color: "#F472B6" },
  { id: 1, mode: "line", axis: "x", dir: -1, lane: -0.54, baseSpeed: 5.8, offset: 15, color: "#38BDF8" },
  { id: 2, mode: "line", axis: "z", dir: 1, lane: -0.54, baseSpeed: 5.2, offset: 8, color: "#A855F7" },
  { id: 3, mode: "line", axis: "z", dir: -1, lane: 0.54, baseSpeed: 5.6, offset: 22, color: "#10B981" },
  { id: 4, mode: "ring", ringDir: 1, progress: 0.05, baseSpeed: 6.4, color: "#FACC15" },
  { id: 5, mode: "ring", ringDir: 1, progress: 0.42, baseSpeed: 6.1, color: "#FB7185" },
  { id: 6, mode: "ring", ringDir: -1, progress: 0.72, baseSpeed: 6.3, color: "#22D3EE" },
  { id: 7, mode: "line", axis: "x", dir: 1, lane: 0.54, baseSpeed: 0, offset: 0, color: "#FFFFFF", isPersonal: true },
];

// Ověření, že souřadnice NEJSOU na žádné z 1 600 parcel (pouze silnice, náměstí, promenáda, mola a pláže)
export function isValidCoinSpot(x, z) {
  // Hranice ostrova + mol
  const onPier =
    (Math.abs(x) < 1.3 && Math.abs(z) >= 33.5 && Math.abs(z) <= 39.2) ||
    (Math.abs(z) < 1.3 && Math.abs(x) >= 33.5 && Math.abs(x) <= 39.2);

  if (!onPier && (Math.abs(x) > 33.5 || Math.abs(z) > 33.5)) {
    return false;
  }

  // Centrální fontána
  if (Math.hypot(x, z) < 1.65) {
    return false;
  }

  // Kolize s 3D obchody
  for (let i = 0; i < CITY_SHOPS.length; i++) {
    const s = CITY_SHOPS[i];
    if (Math.abs(x - s.x) < s.w * 0.65 && Math.abs(z - s.z) < s.d * 0.65) {
      return false;
    }
  }

  // Je bod uvnitř mřížky parcel [-24.8, +24.8]?
  if (Math.abs(x) <= GRID_HALF_SPAN + 0.15 && Math.abs(z) <= GRID_HALF_SPAN + 0.15) {
    // Povoleno POUZE na centrálních asfaltových bulvárech (středový kříž)
    const onCenterCrossRoad = Math.abs(x) <= 1.05 || Math.abs(z) <= 1.05;
    return onCenterCrossRoad;
  }

  // Mimo mřížku parcel (Ocean Drive, promenáda, pláže, mola) -> bezpečná zóna!
  return true;
}

// 36 pečlivě vybraných pozic pro Vice Coiny na silnicích, promenádě, plážích a molech
const RAW_COIN_CANDIDATES = [
  // Centrální křížové bulváry
  [0, 2.4],
  [0, -2.4],
  [2.4, 0],
  [-2.4, 0],
  [6.0, 0.5],
  [-6.0, -0.5],
  [12.0, 0.5],
  [-12.0, -0.5],
  [18.5, 0.5],
  [-18.5, -0.5],
  [0.5, 6.0],
  [-0.5, -6.0],
  [0.5, 12.0],
  [-0.5, -12.0],
  [0.5, 18.5],
  [-0.5, -18.5],
  // Okružní bulvár Ocean Drive (±26.4)
  [0, 26.4],
  [13.0, 26.4],
  [-13.0, 26.4],
  [26.4, 26.4],
  [-26.4, 26.4],
  [0, -26.4],
  [13.0, -26.4],
  [-13.0, -26.4],
  [26.4, -26.4],
  [-26.4, -26.4],
  [26.4, 0],
  [26.4, 13.0],
  [26.4, -13.0],
  [-26.4, 0],
  [-26.4, 13.0],
  [-26.4, -13.0],
  // Pláže a 4 dřevěná mola
  [0, 36.5],
  [0, -36.5],
  [36.5, 0],
  [-36.5, 0],
];

const SAFE_COIN_SPOTS = RAW_COIN_CANDIDATES.filter(([cx, cz]) =>
  isValidCoinSpot(cx, cz)
);

export function plotToWorld(plotNum) {
  const idx = plotNum - 1;
  const row = Math.floor(idx / COLS);
  const col = idx % COLS;
  return {
    col,
    row,
    x: (col - (COLS - 1) / 2) * TILE_STEP,
    z: (row - (ROWS - 1) / 2) * TILE_STEP,
  };
}

export function worldToPlot(x, z) {
  const col = Math.round(x / TILE_STEP + (COLS - 1) / 2);
  const row = Math.round(z / TILE_STEP + (ROWS - 1) / 2);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return row * COLS + col + 1;
}

// Výpočet pozice a natočení na okružním bulváru Ocean Drive
function getRingPose(progress, dir) {
  const p = ((progress % 1) + 1) % 1;
  const side = RING_COORD * 2;
  const laneOffset = dir > 0 ? 0.52 : -0.52;
  const r = RING_COORD + laneOffset;
  const seg = Math.floor(p * 4);
  const t = (p * 4) % 1;

  if (dir > 0) {
    if (seg === 0) return { x: -r + t * (r * 2), z: r, yaw: Math.PI / 2 };
    if (seg === 1) return { x: r, z: r - t * (r * 2), yaw: Math.PI };
    if (seg === 2) return { x: r - t * (r * 2), z: -r, yaw: -Math.PI / 2 };
    return { x: -r, z: -r + t * (r * 2), yaw: 0 };
  } else {
    if (seg === 0) return { x: r - t * (r * 2), z: r, yaw: -Math.PI / 2 };
    if (seg === 1) return { x: -r, z: r - t * (r * 2), yaw: Math.PI };
    if (seg === 2) return { x: -r + t * (r * 2), z: -r, yaw: Math.PI / 2 };
    return { x: r, z: -r + t * (r * 2), yaw: 0 };
  }
}

// 1. Otexturovaná mřížka 1 600 parcel
function PlotsInstancedGrid({
  donorMap,
  selectedPlot,
  hoveredPlot,
  vipPlots = DEFAULT_VIP_PLOTS,
  theme,
  plotTexture,
  isMobile,
  streetMode,
  onSelectPlot,
  onHoverPlot,
}) {
  const meshRef = useRef(null);
  const lastHoveredRef = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (!mesh.instanceColor) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(TOTAL_PLOTS * 3),
        3
      );
    }

    for (let i = 0; i < TOTAL_PLOTS; i++) {
      const plotNum = i + 1;
      const { col, row, x, z } = plotToWorld(plotNum);
      const isAvenue = col === 19 || col === 20 || row === 19 || row === 20;
      const donor = donorMap.get(plotNum);
      const isSelected = selectedPlot === plotNum;
      const isHovered = !isMobile && !streetMode && hoveredPlot === plotNum;
      const isVip = Boolean(vipPlots[plotNum]);

      dummy.position.set(x, isAvenue ? 0.01 : 0.07, z);
      dummy.scale.set(1, isAvenue ? 0.25 : 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (isSelected) {
        color.set("#FBBF24");
      } else if (isHovered) {
        color.set("#38BDF8");
      } else if (donor) {
        color.set("#34D399");
      } else if (plotNum === 1) {
        color.set("#F59E0B");
      } else if (isVip) {
        color.set("#F472B6");
      } else {
        color.set("#FFFFFF");
      }
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [
    donorMap,
    dummy,
    color,
    hoveredPlot,
    isMobile,
    selectedPlot,
    streetMode,
    theme,
    vipPlots,
  ]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, TOTAL_PLOTS]}
      receiveShadow={!isMobile}
      onClick={
        streetMode
          ? undefined
          : (e) => {
              e.stopPropagation();
              if (e.delta > 4) return;
              if (typeof e.instanceId === "number") {
                onSelectPlot(e.instanceId + 1);
              }
            }
      }
      onPointerMove={
        isMobile || streetMode
          ? undefined
          : (e) => {
              e.stopPropagation();
              const nextPlot =
                typeof e.instanceId === "number" ? e.instanceId + 1 : null;
              if (nextPlot !== lastHoveredRef.current) {
                lastHoveredRef.current = nextPlot;
                onHoverPlot(nextPlot);
              }
            }
      }
      onPointerOut={
        isMobile || streetMode
          ? undefined
          : () => {
              if (lastHoveredRef.current !== null) {
                lastHoveredRef.current = null;
                onHoverPlot(null);
              }
            }
      }
    >
      <boxGeometry args={[1.16, 0.14, 1.16]} />
      <meshStandardMaterial map={plotTexture} roughness={0.75} metalness={0.1} />
    </instancedMesh>
  );
}

// 2. Detailní 3D budovy dárců
function Building3D({
  plotNum,
  amount,
  name,
  textures,
  isPreview = false,
  showLabel = false,
  isSelected = false,
  castShadow = true,
}) {
  const groupRef = useRef(null);
  const beaconRef = useRef(null);
  const { x, z } = plotToWorld(plotNum);
  const isFounder = plotNum === 1;

  const tier = isFounder
    ? "founder"
    : amount >= 10
      ? "skyscraper"
      : amount >= 5
        ? "villa"
        : "bungalow";

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current && isPreview) {
      groupRef.current.position.y = 0.16 + Math.sin(t * 4) * 0.08;
    }
    if (beaconRef.current) {
      beaconRef.current.scale.setScalar(0.85 + Math.sin(t * 5 + plotNum) * 0.3);
    }
  });

  const labelHeight =
    tier === "skyscraper"
      ? amount >= 20
        ? 4.85
        : 3.95
      : tier === "villa" || tier === "founder"
        ? 2.0
        : 1.42;

  return (
    <group ref={groupRef} position={[x, 0.14, z]}>
      {tier === "bungalow" && (
        <group>
          {/* Dřevěná veranda */}
          <mesh position={[0, 0.04, 0.1]} receiveShadow={castShadow}>
            <boxGeometry args={[0.98, 0.08, 1.02]} />
            <meshStandardMaterial color="#92400E" roughness={0.85} />
          </mesh>
          {/* Sloupky verandy */}
          <mesh position={[-0.36, 0.3, 0.5]}>
            <cylinderGeometry args={[0.025, 0.025, 0.48, 8]} />
            <meshStandardMaterial color="#F8FAFC" />
          </mesh>
          <mesh position={[0.36, 0.3, 0.5]}>
            <cylinderGeometry args={[0.025, 0.025, 0.48, 8]} />
            <meshStandardMaterial color="#F8FAFC" />
          </mesh>
          {/* Hlavní stěny bungalovu */}
          <mesh
            position={[0, 0.36, -0.04]}
            castShadow={castShadow}
            receiveShadow={castShadow}
          >
            <boxGeometry args={[0.82, 0.58, 0.74]} />
            <meshStandardMaterial
              map={textures.bungalow}
              roughness={0.5}
              transparent={isPreview}
              opacity={isPreview ? 0.88 : 1}
            />
          </mesh>
          {/* Tropická valbová střecha */}
          <mesh
            position={[0, 0.84, 0.02]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow={castShadow}
          >
            <coneGeometry args={[0.74, 0.4, 4]} />
            <meshStandardMaterial map={textures.roof} roughness={0.6} />
          </mesh>
          {/* Komín */}
          <mesh position={[0.22, 0.92, -0.18]}>
            <boxGeometry args={[0.1, 0.24, 0.1]} />
            <meshStandardMaterial color="#7C2D12" />
          </mesh>
        </group>
      )}

      {(tier === "villa" || tier === "founder") && (
        <group>
          {/* Kamenná terasa */}
          <mesh position={[0, 0.05, 0]} receiveShadow={castShadow}>
            <boxGeometry args={[1.06, 0.1, 1.06]} />
            <meshStandardMaterial color="#E2E8F0" />
          </mesh>
          {/* Hlavní dvoupatrová Art Deco vila */}
          <mesh
            position={[0, 0.58, 0]}
            castShadow={castShadow}
            receiveShadow={castShadow}
          >
            <boxGeometry args={[0.94, 0.96, 0.94]} />
            <meshStandardMaterial
              map={isFounder ? textures.founderVilla : textures.villa}
              roughness={0.35}
              metalness={0.1}
              transparent={isPreview}
              opacity={isPreview ? 0.88 : 1}
            />
          </mesh>
          {/* Neonová střešní římsa */}
          <mesh position={[0, 1.1, 0]} castShadow={castShadow}>
            <boxGeometry args={[1.04, 0.09, 1.04]} />
            <meshStandardMaterial
              color={isFounder ? "#F59E0B" : "#EC4899"}
              emissive={isFounder ? "#F59E0B" : "#EC4899"}
              emissiveIntensity={0.5}
            />
          </mesh>
          {/* Střešní bazén */}
          <mesh position={[0, 1.155, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.68, 0.68]} />
            <meshBasicMaterial color="#22D3EE" />
          </mesh>
          {/* Lehátko u bazénu */}
          <mesh position={[0.38, 1.17, 0]}>
            <boxGeometry args={[0.1, 0.04, 0.28]} />
            <meshStandardMaterial color="#F472B6" />
          </mesh>
        </group>
      )}

      {tier === "skyscraper" && (
        <group>
          {(() => {
            const h = amount >= 20 ? 3.85 : 2.95;
            return (
              <>
                {/* Spodní lobby */}
                <mesh position={[0, 0.18, 0]}>
                  <boxGeometry args={[1.04, 0.36, 1.04]} />
                  <meshStandardMaterial color="#0F172A" metalness={0.7} roughness={0.2} />
                </mesh>
                {/* Hlavní skleněná věž */}
                <mesh
                  position={[0, h / 2, 0]}
                  castShadow={castShadow}
                  receiveShadow={castShadow}
                >
                  <boxGeometry args={[0.96, h, 0.96]} />
                  <meshStandardMaterial
                    map={textures.skyscraper}
                    metalness={0.65}
                    roughness={0.2}
                    transparent={isPreview}
                    opacity={isPreview ? 0.88 : 1}
                  />
                </mesh>
                {/* Ustoupené horní patro (penthouse) */}
                <mesh position={[0, h + 0.18, 0]} castShadow={castShadow}>
                  <boxGeometry args={[0.72, 0.36, 0.72]} />
                  <meshStandardMaterial
                    map={textures.skyscraper}
                    metalness={0.75}
                    roughness={0.16}
                  />
                </mesh>
                {/* Střešní heliport */}
                <mesh position={[0, h + 0.37, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.18, 0.28, 24]} />
                  <meshBasicMaterial color="#10B981" />
                </mesh>
                {/* Anténa a blikající maják */}
                <mesh position={[0, h + 0.54, 0]}>
                  <cylinderGeometry args={[0.015, 0.025, 0.34, 6]} />
                  <meshBasicMaterial color="#E2E8F0" />
                </mesh>
                <mesh ref={beaconRef} position={[0, h + 0.74, 0]}>
                  <sphereGeometry args={[0.09, 12, 12]} />
                  <meshBasicMaterial color="#F472B6" />
                </mesh>
              </>
            );
          })()}
        </group>
      )}

      {showLabel && (
        <Html position={[0, labelHeight, 0]} center zIndexRange={[10, 0]}>
          <div
            className={`pointer-events-none whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-black shadow-lg border ${
              isSelected || isPreview
                ? "bg-slate-950/95 text-amber-200 border-amber-400"
                : "bg-slate-950/88 text-white border-cyan-400/80"
            }`}
          >
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

// 3. Klenuté 3D palmy a plážové slunečníky kolem celého zvětšeného ostrova
function CoastalProps3D({ castShadow = true }) {
  const { palms, umbrellas } = useMemo(() => {
    const pArr = [];
    const uArr = [];
    const promEdge = 28.4;

    // Palmy podél celé pobřežní promenády Ocean Drive
    for (let i = -promEdge + 2.5; i <= promEdge - 2.5; i += 4.2) {
      if (Math.abs(i) < 2.2) continue; // Volný průjezd k molům
      pArr.push([i, -promEdge], [i, promEdge], [-promEdge, i], [promEdge, i]);
    }
    // 4 palmy u centrálního náměstí
    pArr.push([-2.15, -2.15], [2.15, -2.15], [-2.15, 2.15], [2.15, 2.15]);

    // Barevné plážové slunečníky a lehátka na písku (±31.4)
    const beachCoord = 31.4;
    const colors = ["#EC4899", "#06B6D4", "#F59E0B", "#10B981"];
    let cIdx = 0;
    for (let i = -24; i <= 24; i += 8) {
      if (Math.abs(i) < 3) continue;
      uArr.push({ x: i, z: beachCoord, color: colors[cIdx++ % colors.length] });
      uArr.push({ x: i, z: -beachCoord, color: colors[cIdx++ % colors.length] });
      uArr.push({ x: beachCoord, z: i, color: colors[cIdx++ % colors.length] });
      uArr.push({ x: -beachCoord, z: i, color: colors[cIdx++ % colors.length] });
    }

    return { palms: pArr, umbrellas: uArr };
  }, []);

  return (
    <group>
      {palms.map(([tx, tz], idx) => (
        <group key={`palm-${idx}`} position={[tx, 0.05, tz]} rotation={[0, idx * 0.9, 0]}>
          <mesh position={[0, 0.38, 0]} rotation={[0.08, 0, 0.06]} castShadow={castShadow}>
            <cylinderGeometry args={[0.085, 0.13, 0.76, 7]} />
            <meshStandardMaterial color="#78350F" roughness={0.9} />
          </mesh>
          <mesh
            position={[0.06, 1.05, 0.05]}
            rotation={[0.16, 0, 0.12]}
            castShadow={castShadow}
          >
            <cylinderGeometry args={[0.06, 0.085, 0.74, 7]} />
            <meshStandardMaterial color="#92400E" roughness={0.9} />
          </mesh>
          <mesh position={[0.1, 1.34, 0.08]}>
            <sphereGeometry args={[0.085, 8, 8]} />
            <meshStandardMaterial color="#451A03" />
          </mesh>
          {[0, 1.05, 2.1, 3.15, 4.2, 5.25].map((rot, fIdx) => (
            <group
              key={fIdx}
              position={[0.1, 1.4, 0.08]}
              rotation={[0.45, rot, 0]}
            >
              <mesh position={[0, 0, 0.45]} castShadow={castShadow}>
                <boxGeometry args={[0.19, 0.03, 0.88]} />
                <meshStandardMaterial color={fIdx % 2 === 0 ? "#10B981" : "#059669"} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Plážové slunečníky a lehátka */}
      {umbrellas.map((u, idx) => (
        <group key={`umb-${idx}`} position={[u.x, 0.05, u.z]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.9, 6]} />
            <meshStandardMaterial color="#F8FAFC" />
          </mesh>
          <mesh position={[0, 0.88, 0]} castShadow={castShadow}>
            <coneGeometry args={[0.65, 0.28, 8]} />
            <meshStandardMaterial color={u.color} />
          </mesh>
          <mesh position={[0.38, 0.06, 0.12]}>
            <boxGeometry args={[0.28, 0.08, 0.56]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// 4. 4 Interaktivní 3D obchody po obvodu ostrova
function CityShops3D({ textures, nearShopId, castShadow = true }) {
  const showCarRef = useRef(null);

  useFrame(({ clock }) => {
    if (showCarRef.current) {
      showCarRef.current.rotation.y = clock.getElapsedTime() * 1.4;
    }
  });

  return (
    <group>
      {CITY_SHOPS.map((shop) => {
        const isNear = nearShopId === shop.id;
        return (
          <group
            key={shop.id}
            position={[shop.x, 0.08, shop.z]}
            rotation={[0, shop.rotY, 0]}
          >
            {/* Budova obchodu */}
            <mesh position={[0, shop.h / 2, 0]} castShadow={castShadow} receiveShadow={castShadow}>
              <boxGeometry args={[shop.w, shop.h, shop.d]} />
              <meshStandardMaterial
                map={textures.shops[shop.id]}
                roughness={0.35}
                metalness={0.2}
              />
            </mesh>

            {/* Neonový střešní rám */}
            <mesh position={[0, shop.h + 0.08, 0]}>
              <boxGeometry args={[shop.w + 0.16, 0.12, shop.d + 0.16]} />
              <meshStandardMaterial
                color={shop.color}
                emissive={shop.color}
                emissiveIntensity={0.7}
              />
            </mesh>

            {/* Speciální rekvizity u obchodů */}
            {shop.id === "motors" && (
              <group position={[0, shop.h + 0.28, 0]} ref={showCarRef}>
                <mesh>
                  <boxGeometry args={[0.52, 0.18, 0.96]} />
                  <meshStandardMaterial color="#FBBF24" metalness={0.8} roughness={0.15} />
                </mesh>
                <mesh position={[0, 0.14, -0.05]}>
                  <boxGeometry args={[0.42, 0.14, 0.48]} />
                  <meshStandardMaterial color="#0F172A" />
                </mesh>
              </group>
            )}

            {shop.id === "helipad" && (
              <mesh position={[0, shop.h + 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.55, 0.78, 24]} />
                <meshBasicMaterial color="#FBBF24" />
              </mesh>
            )}

            {/* Svítící interakční zóna před vchodem */}
            <mesh position={[0, 0.02, shop.d / 2 + 0.95]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.55, 0.72, 24]} />
              <meshBasicMaterial
                color={isNear ? "#FBBF24" : shop.accent}
                transparent
                opacity={isNear ? 0.95 : 0.65}
              />
            </mesh>

            <Html position={[0, shop.h + 0.65, 0]} center zIndexRange={[10, 0]}>
              <div
                className={`pointer-events-none whitespace-nowrap rounded-lg px-2.5 py-0.5 text-[10px] font-black shadow-xl border ${
                  isNear
                    ? "bg-amber-400 text-slate-950 border-white scale-110"
                    : "bg-slate-950/90 text-white border-pink-400/80"
                }`}
              >
                {shop.name}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// 5. Asfaltové bulváry + okruh Ocean Drive + mola + fontána + jachty + animovaný oceán
function StaticWorldEnvironment({
  roadTex,
  plazaTex,
  promenadeTex,
  pierTex,
  waterTex,
  castShadow = true,
}) {
  const boatsRef = useRef([]);
  const fountainRingRef = useRef(null);
  const fullRoadSpan = RING_COORD * 2 + 2.3;

  const boats = useMemo(
    () => [
      { radius: 42.5, speed: 0.18, offset: 0, color: "#EC4899" },
      { radius: 46.5, speed: -0.15, offset: 2.1, color: "#06B6D4" },
      { radius: 44.5, speed: 0.16, offset: 4.2, color: "#F59E0B" },
    ],
    []
  );

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    if (waterTex) {
      waterTex.offset.x += delta * 0.025;
      waterTex.offset.y += delta * 0.015;
    }

    boats.forEach((b, idx) => {
      const mesh = boatsRef.current[idx];
      if (!mesh) return;
      const angle = t * b.speed + b.offset;
      mesh.position.set(Math.cos(angle) * b.radius, -0.06, Math.sin(angle) * b.radius);
      mesh.rotation.y = -angle + (b.speed > 0 ? 0 : Math.PI);
    });

    if (fountainRingRef.current) {
      const s = 0.6 + ((t * 0.8) % 0.8);
      fountainRingRef.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      {/* Palmová promenáda kolem okružního bulváru */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={castShadow}>
        <planeGeometry args={[59.5, 59.5]} />
        <meshStandardMaterial map={promenadeTex} roughness={0.75} />
      </mesh>

      {/* Centrální křížové bulváry */}
      <mesh
        position={[0, 0.055, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={castShadow}
      >
        <planeGeometry args={[TILE_STEP * 2.02, fullRoadSpan]} />
        <meshStandardMaterial map={roadTex} roughness={0.85} />
      </mesh>

      <mesh
        position={[0, 0.057, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        receiveShadow={castShadow}
      >
        <planeGeometry args={[TILE_STEP * 2.02, fullRoadSpan]} />
        <meshStandardMaterial map={roadTex} roughness={0.85} />
      </mesh>

      {/* 4 úseky okružního pobřežního bulváru Ocean Drive (±26.4) */}
      <mesh position={[0, 0.056, RING_COORD]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow={castShadow}>
        <planeGeometry args={[2.3, fullRoadSpan]} />
        <meshStandardMaterial map={roadTex} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.056, -RING_COORD]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow={castShadow}>
        <planeGeometry args={[2.3, fullRoadSpan]} />
        <meshStandardMaterial map={roadTex} roughness={0.85} />
      </mesh>
      <mesh position={[RING_COORD, 0.056, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={castShadow}>
        <planeGeometry args={[2.3, fullRoadSpan]} />
        <meshStandardMaterial map={roadTex} roughness={0.85} />
      </mesh>
      <mesh position={[-RING_COORD, 0.056, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={castShadow}>
        <planeGeometry args={[2.3, fullRoadSpan]} />
        <meshStandardMaterial map={roadTex} roughness={0.85} />
      </mesh>

      {/* 4 Dřevěná mola vybíhající do oceánu */}
      <mesh position={[0, 0.04, 36.2]} receiveShadow={castShadow}>
        <boxGeometry args={[2.4, 0.14, 6.4]} />
        <meshStandardMaterial map={pierTex} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.04, -36.2]} receiveShadow={castShadow}>
        <boxGeometry args={[2.4, 0.14, 6.4]} />
        <meshStandardMaterial map={pierTex} roughness={0.85} />
      </mesh>
      <mesh position={[36.2, 0.04, 0]} receiveShadow={castShadow}>
        <boxGeometry args={[6.4, 0.14, 2.4]} />
        <meshStandardMaterial map={pierTex} roughness={0.85} />
      </mesh>
      <mesh position={[-36.2, 0.04, 0]} receiveShadow={castShadow}>
        <boxGeometry args={[6.4, 0.14, 2.4]} />
        <meshStandardMaterial map={pierTex} roughness={0.85} />
      </mesh>

      {/* Centrální náměstí s přechody */}
      <mesh
        position={[0, 0.062, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={castShadow}
      >
        <planeGeometry args={[TILE_STEP * 2.35, TILE_STEP * 2.35]} />
        <meshStandardMaterial map={plazaTex} roughness={0.7} />
      </mesh>

      {/* Centrální neonová fontána */}
      <group position={[0, 0.09, 0]}>
        <mesh>
          <cylinderGeometry args={[0.98, 1.08, 0.16, 24]} />
          <meshStandardMaterial color="#1E1B4B" />
        </mesh>
        <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.84, 24]} />
          <meshBasicMaterial color="#22D3EE" />
        </mesh>
        <mesh
          ref={fountainRingRef}
          position={[0, 0.11, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.42, 0.56, 24]} />
          <meshBasicMaterial color="#F472B6" />
        </mesh>
      </group>

      {/* Jachty plující kolem ostrova */}
      {boats.map((b, idx) => (
        <group
          key={idx}
          ref={(el) => {
            boatsRef.current[idx] = el;
          }}
        >
          <mesh castShadow={castShadow}>
            <boxGeometry args={[0.68, 0.25, 1.9]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.16, -0.1]}>
            <boxGeometry args={[0.48, 0.16, 0.98]} />
            <meshStandardMaterial color={b.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// 6. Plynulý 3D přelet kamery (Map View)
function CameraController({ focusSignal, selectedPlot, resetSignal }) {
  const controlsRef = useRef(null);
  const flyRef = useRef(null);
  const { camera } = useThree();

  useEffect(() => {
    if (focusSignal === 0) return;
    const { x, z } = plotToWorld(selectedPlot);
    flyRef.current = {
      target: new THREE.Vector3(x, 0.5, z),
      pos: new THREE.Vector3(x + 9.5, 10.5, z + 11.5),
    };
  }, [focusSignal, selectedPlot]);

  useEffect(() => {
    if (resetSignal === 0) return;
    flyRef.current = {
      target: new THREE.Vector3(0, 0, 0),
      pos: new THREE.Vector3(0, 40, 44),
    };
  }, [resetSignal]);

  useFrame(() => {
    const ctrl = controlsRef.current;
    const fly = flyRef.current;
    if (!ctrl || !fly) return;

    ctrl.target.lerp(fly.target, 0.1);
    camera.position.lerp(fly.pos, 0.1);
    ctrl.update();

    if (
      ctrl.target.distanceTo(fly.target) < 0.12 &&
      camera.position.distanceTo(fly.pos) < 0.25
    ) {
      flyRef.current = null;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      minDistance={4.5}
      maxDistance={85}
      maxPolarAngle={Math.PI / 2.15}
      onStart={() => {
        flyRef.current = null;
      }}
    />
  );
}

// 7. Vylepšený 3D model sporťáku
function SportsCarModel({ color, isLit, neonRef, castShadow }) {
  return (
    <group>
      {/* Hlavní spodní šasi */}
      <mesh position={[0, 0.02, 0]} castShadow={castShadow}>
        <boxGeometry args={[0.42, 0.12, 0.84]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.22} />
      </mesh>
      {/* Zkosená přední kapota */}
      <mesh position={[0, 0.07, 0.22]} rotation={[0.14, 0, 0]} castShadow={castShadow}>
        <boxGeometry args={[0.38, 0.06, 0.34]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.22} />
      </mesh>
      {/* Prosklená kabina */}
      <mesh position={[0, 0.13, -0.05]}>
        <boxGeometry args={[0.33, 0.12, 0.4]} />
        <meshStandardMaterial color="#090D16" metalness={0.9} roughness={0.08} />
      </mesh>
      {/* Zadní křídlo / spoiler */}
      <mesh position={[0, 0.14, -0.39]}>
        <boxGeometry args={[0.42, 0.03, 0.08]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[-0.14, 0.1, -0.38]}>
        <boxGeometry args={[0.03, 0.07, 0.05]} />
        <meshStandardMaterial color="#0F172A" />
      </mesh>
      <mesh position={[0.14, 0.1, -0.38]}>
        <boxGeometry args={[0.03, 0.07, 0.05]} />
        <meshStandardMaterial color="#0F172A" />
      </mesh>
      {/* 4 3D kola */}
      {[
        [-0.21, -0.02, 0.25],
        [0.21, -0.02, 0.25],
        [-0.21, -0.02, -0.25],
        [0.21, -0.02, -0.25],
      ].map(([wx, wy, wz], idx) => (
        <mesh key={idx} position={[wx, wy, wz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.075, 0.075, 0.05, 12]} />
          <meshStandardMaterial color="#0F172A" roughness={0.7} />
        </mesh>
      ))}
      {/* Přední LED světlomety + zadní červená světla */}
      <mesh position={[0, 0.04, 0.425]}>
        <boxGeometry args={[0.32, 0.035, 0.01]} />
        <meshBasicMaterial color="#FEF08A" />
      </mesh>
      <mesh position={[0, 0.05, -0.425]}>
        <boxGeometry args={[0.34, 0.035, 0.01]} />
        <meshBasicMaterial color="#EF4444" />
      </mesh>
      {isLit && (
        <mesh position={[0, -0.05, 0.78]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.52, 0.95]} />
          <meshBasicMaterial color="#FEF08A" transparent opacity={0.38} />
        </mesh>
      )}
      {/* Neonové podsvícení */}
      <mesh
        ref={neonRef}
        visible={false}
        position={[0, -0.07, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[0.62, 1.04]} />
        <meshBasicMaterial color="#22D3EE" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// 8. Živí multiplayer hráči v 3D světě
function RemotePlayerEntity({ player }) {
  const groupRef = useRef(null);
  const rotorRef = useRef(null);
  const targetPos = useMemo(() => new THREE.Vector3(player.x, player.y, player.z), []);
  const skin = PLAYER_SKINS[player.skin] || PLAYER_SKINS.tourist;

  targetPos.set(player.x, player.y, player.z);

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    if (groupRef.current) {
      groupRef.current.position.lerp(targetPos, Math.min(1, dt * 10));
      let diff = player.yaw - groupRef.current.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * Math.min(1, dt * 10);
    }
    if (rotorRef.current) {
      rotorRef.current.rotation.y = clock.getElapsedTime() * 24;
    }
  });

  const labelY =
    player.vehicleMode === "heli"
      ? 1.15
      : player.vehicleMode === "car"
        ? 0.75
        : 1.16;

  return (
    <group ref={groupRef} position={[player.x, player.y, player.z]}>
      {player.vehicleMode === "heli" ? (
        <group>
          <mesh>
            <boxGeometry args={[0.48, 0.34, 0.92]} />
            <meshStandardMaterial color="#EC4899" metalness={0.6} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.04, -0.78]}>
            <boxGeometry args={[0.12, 0.14, 0.72]} />
            <meshStandardMaterial color="#1E1B4B" />
          </mesh>
          <mesh ref={rotorRef} position={[0, 0.26, 0]}>
            <boxGeometry args={[1.65, 0.02, 0.1]} />
            <meshBasicMaterial color="#22D3EE" />
          </mesh>
        </group>
      ) : player.vehicleMode === "car" ? (
        <SportsCarModel
          color={player.carColor || "#F472B6"}
          isLit={false}
          castShadow={false}
        />
      ) : (
        <group>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.3, 24]} />
            <meshBasicMaterial color="#FB923C" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.24, 0.32, 0.14]} />
            <meshStandardMaterial color={skin.pants} />
          </mesh>
          <mesh position={[0, 0.52, 0]}>
            <boxGeometry args={[0.3, 0.34, 0.17]} />
            <meshStandardMaterial color={skin.torso} />
          </mesh>
          <mesh position={[0, 0.81, 0]}>
            <boxGeometry args={[0.21, 0.21, 0.21]} />
            <meshStandardMaterial color="#FDBA74" />
          </mesh>
        </group>
      )}

      <Html position={[0, labelY, 0]} center zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-full border border-orange-400 bg-slate-950/90 px-2 py-0.5 text-[10px] font-black text-orange-200 shadow-lg">
          {player.name}
        </div>
      </Html>
    </group>
  );
}

// 9. Kompletní GTA simulace: 7 AI aut + Osobní auto + Vrtulník + Off-Plot Vice Coiny + Obchody
function InteractiveCitySimulation({
  streetMode,
  theme,
  activeDonors,
  playerName,
  playerSkin,
  speedBoostActive = false,
  playerInputRef,
  castShadow = true,
  onNearbyPlotChange,
  onNearbyShopChange,
  onPlayerTransformChange,
  onVehicleStateChange,
  onCoinCollect,
  onPlaySfx,
}) {
  const { camera, gl } = useThree();
  const isLit = theme === "night" || theme === "sunset";
  const lineLimit = RING_COORD;
  const activeSkin = PLAYER_SKINS[playerSkin] || PLAYER_SKINS.tourist;

  const carMeshesRef = useRef([]);
  const carNeonMeshesRef = useRef([]);
  const coinMeshesRef = useRef([]);

  const heliGroupRef = useRef(null);
  const mainRotorRef = useRef(null);
  const tailRotorRef = useRef(null);

  const heliStateRef = useRef({
    spawned: false,
    inHeli: false,
    x: -29.3,
    y: 0.16,
    z: 7.2,
    yaw: Math.PI / 2,
    vy: 0,
  });

  const carsStateRef = useRef(
    INITIAL_STREET_CARS.map((c) => {
      if (c.mode === "ring") {
        const pose = getRingPose(c.progress, c.ringDir);
        return {
          ...c,
          visible: true,
          x: pose.x,
          z: pose.z,
          yaw: pose.yaw,
          speed: 0,
          hijacked: false,
        };
      }
      const startPos = -lineLimit + c.offset;
      return {
        ...c,
        visible: !c.isPersonal,
        x: c.axis === "x" ? startPos * c.dir : c.lane,
        z: c.axis === "z" ? startPos * c.dir : c.lane,
        yaw:
          c.axis === "x"
            ? c.dir > 0
              ? Math.PI / 2
              : -Math.PI / 2
            : c.dir > 0
              ? 0
              : Math.PI,
        speed: 0,
        hijacked: Boolean(c.isPersonal),
      };
    })
  );

  const coinsStateRef = useRef(
    SAFE_COIN_SPOTS.map(([cx, cz], idx) => ({
      id: idx,
      x: cx,
      z: cz,
      respawnTimer: 0,
    }))
  );

  const playerGroupRef = useRef(null);
  const leftLegRef = useRef(null);
  const rightLegRef = useRef(null);
  const leftArmRef = useRef(null);
  const rightArmRef = useRef(null);

  const posRef = useRef(new THREE.Vector3(0, 0.14, 3.6));
  const velYRef = useRef(0);
  const facingYawRef = useRef(Math.PI);
  const camYawRef = useRef(0);
  const camPitchRef = useRef(0.32);

  const inCarIdRef = useRef(null);
  const nearbyTargetRef = useRef(null); // { type: "car" | "heli" | "shop", id?: number|string }
  const lastReportedVehicleRef = useRef("");
  const lastReportedShopRef = useRef(null);

  const keysRef = useRef({});
  const dragRef = useRef({ active: false, x: 0, y: 0 });
  const walkCycleRef = useRef(0);
  const lastNearbyPlotRef = useRef(null);
  const uiTickRef = useRef(0);
  const hornCooldownRef = useRef(0);

  // Kolizní boxy všech budov dárců + všech 3D obchodů
  const staticColliders = useMemo(() => {
    const list = activeDonors.map((d) => {
      const { x, z } = plotToWorld(d.plot);
      return { x, z, halfX: 0.54, halfZ: 0.54 };
    });
    for (const s of CITY_SHOPS) {
      list.push({
        x: s.x,
        z: s.z,
        halfX: s.w / 2 + 0.1,
        halfZ: s.d / 2 + 0.1,
      });
    }
    return list;
  }, [activeDonors]);

  // Nastoupení / vystoupení z vozidla NEBO vstup do obchodu
  const toggleAction = useMemo(() => {
    return () => {
      if (!streetMode) return;
      const heli = heliStateRef.current;

      if (heli.inHeli) {
        heli.inHeli = false;
        heli.y = 0.16;
        heli.vy = 0;
        const exitX = heli.x - Math.cos(heli.yaw) * 1.05;
        const exitZ = heli.z + Math.sin(heli.yaw) * 1.05;
        posRef.current.set(
          Math.max(-33.0, Math.min(33.0, exitX)),
          0.14,
          Math.max(-33.0, Math.min(33.0, exitZ))
        );
        facingYawRef.current = heli.yaw;
        onPlaySfx?.("select");
        return;
      }

      if (inCarIdRef.current !== null) {
        const car = carsStateRef.current.find((c) => c.id === inCarIdRef.current);
        if (car) {
          car.speed = 0;
          const exitX = car.x - Math.cos(car.yaw) * 0.78;
          const exitZ = car.z + Math.sin(car.yaw) * 0.78;
          posRef.current.set(
            Math.max(-33.0, Math.min(33.0, exitX)),
            0.14,
            Math.max(-33.0, Math.min(33.0, exitZ))
          );
          facingYawRef.current = car.yaw;
        }
        inCarIdRef.current = null;
        onPlaySfx?.("select");
        return;
      }

      const target = nearbyTargetRef.current;
      if (!target) return;

      if (target.type === "shop") {
        playerInputRef.current.openShop?.(target.id);
        onPlaySfx?.("select");
      } else if (target.type === "heli" && heli.spawned) {
        heli.inHeli = true;
        camYawRef.current = heli.yaw + Math.PI;
        onPlaySfx?.("build");
      } else if (target.type === "car") {
        const car = carsStateRef.current.find((c) => c.id === target.id);
        if (car && car.visible) {
          car.hijacked = true;
          car.speed = 0;
          inCarIdRef.current = car.id;
          camYawRef.current = car.yaw + Math.PI;
          onPlaySfx?.("build");
        }
      }
    };
  }, [onPlaySfx, playerInputRef, streetMode]);

  const spawnPersonalCar = useMemo(() => {
    return (colorHex = "#FFFFFF") => {
      const car = carsStateRef.current.find((c) => c.isPersonal);
      if (!car) return;
      heliStateRef.current.inHeli = false;
      car.visible = true;
      car.hijacked = true;
      car.color = colorHex;
      car.x = posRef.current.x;
      car.z = posRef.current.z;
      car.yaw = facingYawRef.current;
      car.speed = 0;
      inCarIdRef.current = car.id;
      camYawRef.current = car.yaw + Math.PI;
      onPlaySfx?.("build");
    };
  }, [onPlaySfx]);

  const spawnHelicopter = useMemo(() => {
    return () => {
      inCarIdRef.current = null;
      const heli = heliStateRef.current;
      heli.spawned = true;
      heli.inHeli = true;
      heli.x = posRef.current.x;
      heli.y = 1.4;
      heli.z = posRef.current.z;
      heli.yaw = facingYawRef.current;
      heli.vy = 0;
      camYawRef.current = heli.yaw + Math.PI;
      onPlaySfx?.("build");
    };
  }, [onPlaySfx]);

  useEffect(() => {
    if (playerInputRef?.current) {
      playerInputRef.current.toggleVehicle = toggleAction;
      playerInputRef.current.spawnPersonalCar = spawnPersonalCar;
      playerInputRef.current.spawnHelicopter = spawnHelicopter;
    }
  }, [playerInputRef, spawnHelicopter, spawnPersonalCar, toggleAction]);

  useEffect(() => {
    if (!streetMode) {
      if (inCarIdRef.current !== null) {
        const car = carsStateRef.current.find((c) => c.id === inCarIdRef.current);
        if (car) car.speed = 0;
        inCarIdRef.current = null;
      }
      if (heliStateRef.current.inHeli) {
        heliStateRef.current.inHeli = false;
        heliStateRef.current.y = 0.16;
      }
      onVehicleStateChange?.({
        mode: "foot",
        canEnter: null,
        shopId: null,
        carColor: null,
        speedKmh: 0,
        altitude: 0,
      });
    }
  }, [onVehicleStateChange, streetMode]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (!e.repeat && (e.code === "KeyE" || e.code === "KeyF")) {
        toggleAction();
      }
      keysRef.current[e.code] = true;
    };
    const onKeyUp = (e) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [toggleAction]);

  useEffect(() => {
    if (!streetMode) return;
    const dom = gl.domElement;

    const onPointerDown = (e) => {
      dragRef.current = { active: true, x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current.x = e.clientX;
      dragRef.current.y = e.clientY;

      camYawRef.current -= dx * 0.0065;
      camPitchRef.current = Math.max(
        0.1,
        Math.min(1.05, camPitchRef.current + dy * 0.005)
      );
    };
    const onPointerUp = () => {
      dragRef.current.active = false;
    };

    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [gl, streetMode]);

  // Hlavní herní smyčka (60 FPS)
  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const elapsed = clock.getElapsedTime();
    const keys = keysRef.current;
    const touch = playerInputRef?.current || {
      moveX: 0,
      moveY: 0,
      sprint: false,
      jump: false,
      descend: false,
      horn: false,
    };

    if (hornCooldownRef.current > 0) {
      hornCooldownRef.current -= dt;
    }

    // 1. Pohyb všech 8 aut
    const cars = carsStateRef.current;
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      const mesh = carMeshesRef.current[i];

      if (mesh) {
        mesh.visible = c.visible;
      }
      if (!c.visible) continue;

      if (inCarIdRef.current === c.id && streetMode) {
        let throttle = touch.moveY;
        let steer = touch.moveX;
        if (keys["KeyW"] || keys["ArrowUp"]) throttle += 1;
        if (keys["KeyS"] || keys["ArrowDown"]) throttle -= 1;
        if (keys["KeyD"] || keys["ArrowRight"]) steer += 1;
        if (keys["KeyA"] || keys["ArrowLeft"]) steer -= 1;

        const isDrifting = Boolean(keys["Space"] || touch.jump);
        const wantsHorn = Boolean(
          keys["ShiftLeft"] || keys["ShiftRight"] || touch.sprint || touch.horn
        );

        if (wantsHorn && hornCooldownRef.current <= 0) {
          hornCooldownRef.current = 0.45;
          onPlaySfx?.("horn");
        }

        const maxForward = (c.isPersonal ? 18.5 : 16.0) * (speedBoostActive ? 1.15 : 1);
        const maxReverse = -6.5;

        if (throttle > 0.05) {
          c.speed += throttle * 18.0 * dt;
        } else if (throttle < -0.05) {
          c.speed += throttle * 18.5 * dt;
        } else {
          c.speed *= Math.pow(0.16, dt);
          if (Math.abs(c.speed) < 0.08) c.speed = 0;
        }

        if (isDrifting) {
          c.speed *= Math.pow(0.45, dt);
        }

        c.speed = Math.max(maxReverse, Math.min(maxForward, c.speed));

        if (Math.abs(c.speed) > 0.25 && Math.abs(steer) > 0.05) {
          const dirSign = c.speed >= 0 ? 1 : -1;
          const turnRate = isDrifting ? 3.35 : 2.55;
          const speedFactor = Math.min(1, Math.abs(c.speed) / 3.5);
          c.yaw -= steer * turnRate * speedFactor * dirSign * dt;
        }

        c.x += Math.sin(c.yaw) * c.speed * dt;
        c.z += Math.cos(c.yaw) * c.speed * dt;

        // Kolize auta s okrajem rozšířeného ostrova
        const maxCarBound = 33.0;
        if (Math.abs(c.x) > maxCarBound) {
          c.x = Math.sign(c.x) * maxCarBound;
          c.speed *= 0.5;
        }
        if (Math.abs(c.z) > maxCarBound) {
          c.z = Math.sign(c.z) * maxCarBound;
          c.speed *= 0.5;
        }

        // Kolize s fontánou
        const fDist = Math.hypot(c.x, c.z);
        const minFountainCar = 1.54;
        if (fDist < minFountainCar && fDist > 0.001) {
          const push = (minFountainCar - fDist) / fDist;
          c.x += c.x * push;
          c.z += c.z * push;
          c.speed *= 0.65;
        }

        // Kolize s budovami dárců i obchody
        const carRadius = 0.38;
        for (let bIdx = 0; bIdx < staticColliders.length; bIdx++) {
          const b = staticColliders[bIdx];
          const hitX = b.halfX + carRadius;
          const hitZ = b.halfZ + carRadius;
          const dx = c.x - b.x;
          const dz = c.z - b.z;
          if (Math.abs(dx) < hitX && Math.abs(dz) < hitZ) {
            const ovX = hitX - Math.abs(dx);
            const ovZ = hitZ - Math.abs(dz);
            if (ovX < ovZ) {
              c.x += dx >= 0 ? ovX : -ovX;
            } else {
              c.z += dz >= 0 ? ovZ : -ovZ;
            }
            c.speed *= 0.72;
          }
        }

        const neonMesh = carNeonMeshesRef.current[i];
        if (neonMesh) {
          neonMesh.visible =
            (isDrifting && Math.abs(c.speed) > 2.5) || Boolean(c.isPersonal);
        }

        posRef.current.set(c.x, 0.14, c.z);
        facingYawRef.current = c.yaw;

        if (!dragRef.current.active && c.speed > 1.2) {
          const targetCamYaw = c.yaw + Math.PI;
          let yawDiff = targetCamYaw - camYawRef.current;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
          camYawRef.current += yawDiff * Math.min(1, dt * 3.2);
        }
      } else if (!c.hijacked) {
        const distToPlayer = streetMode
          ? Math.hypot(c.x - posRef.current.x, c.z - posRef.current.z)
          : 99;
        const aiSpeed = distToPlayer < 2.0 ? 0 : c.baseSpeed;

        if (c.mode === "ring") {
          const perimeter = RING_COORD * 8;
          c.progress = (c.progress + (aiSpeed * dt) / perimeter) % 1;
          const pose = getRingPose(c.progress, c.ringDir);
          c.x = pose.x;
          c.z = pose.z;
          c.yaw = pose.yaw;
        } else {
          const span = lineLimit * 2;
          if (c.axis === "x") {
            c.x += c.dir * aiSpeed * dt;
            if (c.x > lineLimit) c.x -= span;
            if (c.x < -lineLimit) c.x += span;
            c.z = c.lane;
            c.yaw = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            c.z += c.dir * aiSpeed * dt;
            if (c.z > lineLimit) c.z -= span;
            if (c.z < -lineLimit) c.z += span;
            c.x = c.lane;
            c.yaw = c.dir > 0 ? 0 : Math.PI;
          }
        }
      }

      if (mesh) {
        mesh.position.set(c.x, 0.16, c.z);
        mesh.rotation.y = c.yaw;
      }
    }

    // 2. Fyzika vrtulníku (Vice Chopper)
    const heli = heliStateRef.current;
    if (heliGroupRef.current) {
      heliGroupRef.current.visible = heli.spawned;
      if (heli.spawned) {
        if (heli.inHeli && streetMode) {
          let pitch = touch.moveY;
          let yawInput = touch.moveX;
          if (keys["KeyW"] || keys["ArrowUp"]) pitch += 1;
          if (keys["KeyS"] || keys["ArrowDown"]) pitch -= 1;
          if (keys["KeyD"] || keys["ArrowRight"]) yawInput += 1;
          if (keys["KeyA"] || keys["ArrowLeft"]) yawInput -= 1;

          const ascend = Boolean(keys["Space"] || touch.jump);
          const descend = Boolean(
            keys["ShiftLeft"] || keys["ShiftRight"] || touch.descend
          );

          if (ascend) {
            heli.vy = 6.8;
          } else if (descend) {
            heli.vy = -6.8;
          } else {
            heli.vy *= Math.pow(0.08, dt);
          }

          heli.y = Math.max(0.16, Math.min(20.0, heli.y + heli.vy * dt));
          heli.yaw -= yawInput * 2.2 * dt;

          const airSpeed = pitch * 14.5;
          heli.x += Math.sin(heli.yaw) * airSpeed * dt;
          heli.z += Math.cos(heli.yaw) * airSpeed * dt;

          const maxHeliBound = 35.0;
          heli.x = Math.max(-maxHeliBound, Math.min(maxHeliBound, heli.x));
          heli.z = Math.max(-maxHeliBound, Math.min(maxHeliBound, heli.z));

          posRef.current.set(heli.x, heli.y, heli.z);
          facingYawRef.current = heli.yaw;

          if (!dragRef.current.active && Math.abs(pitch) > 0.1) {
            const targetCamYaw = heli.yaw + Math.PI;
            let yawDiff = targetCamYaw - camYawRef.current;
            while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
            while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
            camYawRef.current += yawDiff * Math.min(1, dt * 2.8);
          }
        }

        heliGroupRef.current.position.set(heli.x, heli.y, heli.z);
        heliGroupRef.current.rotation.y = heli.yaw;

        const rotorSpeed = heli.inHeli ? 26 : 3;
        if (mainRotorRef.current) {
          mainRotorRef.current.rotation.y += rotorSpeed * dt;
        }
        if (tailRotorRef.current) {
          tailRotorRef.current.rotation.x += rotorSpeed * dt;
        }
      }
    }

    // 3. Vice Coiny (striktně mimo parcely a budovy)
    const coins = coinsStateRef.current;
    const pickupRadius = heli.inHeli ? 1.3 : inCarIdRef.current !== null ? 0.96 : 0.7;

    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];
      const mesh = coinMeshesRef.current[i];

      if (coin.respawnTimer > 0) {
        coin.respawnTimer -= dt;
        if (coin.respawnTimer <= 0) {
          coin.respawnTimer = 0;
          // Hledáme bezpečný bod mimo parcely
          for (let attempt = 0; attempt < 15; attempt++) {
            const spot =
              SAFE_COIN_SPOTS[Math.floor(Math.random() * SAFE_COIN_SPOTS.length)];
            const candX = spot[0] + (Math.random() - 0.5) * 0.35;
            const candZ = spot[1] + (Math.random() - 0.5) * 0.35;
            if (isValidCoinSpot(candX, candZ)) {
              coin.x = candX;
              coin.z = candZ;
              break;
            }
          }
        }
        if (mesh) mesh.visible = false;
        continue;
      }

      if (mesh) {
        mesh.visible = true;
        mesh.position.set(coin.x, 0.42 + Math.sin(elapsed * 4 + i) * 0.08, coin.z);
        mesh.rotation.y = elapsed * 3.2 + i;
      }

      if (streetMode && posRef.current.y < 1.8) {
        const d = Math.hypot(coin.x - posRef.current.x, coin.z - posRef.current.z);
        if (d < pickupRadius) {
          coin.respawnTimer = 10;
          if (mesh) mesh.visible = false;
          onCoinCollect?.();
          onPlaySfx?.("coin");
        }
      }
    }

    // 4. Pohyb hráče pěšky + kamera
    if (!streetMode) return;

    const pos = posRef.current;
    const isInCar = inCarIdRef.current !== null;
    const isInHeli = heli.inHeli;
    const onFoot = !isInCar && !isInHeli;

    if (playerGroupRef.current) {
      playerGroupRef.current.visible = onFoot;
    }

    if (onFoot) {
      let forward = touch.moveY;
      let strafe = touch.moveX;
      if (keys["KeyW"] || keys["ArrowUp"]) forward += 1;
      if (keys["KeyS"] || keys["ArrowDown"]) forward -= 1;
      if (keys["KeyD"] || keys["ArrowRight"]) strafe += 1;
      if (keys["KeyA"] || keys["ArrowLeft"]) strafe -= 1;

      const inputLen = Math.hypot(forward, strafe);
      if (inputLen > 1) {
        forward /= inputLen;
        strafe /= inputLen;
      }

      const isSprinting = Boolean(
        keys["ShiftLeft"] || keys["ShiftRight"] || touch.sprint
      );
      const boostMult = speedBoostActive ? 1.45 : 1.0;
      const speed = (isSprinting ? 7.8 : 4.6) * boostMult;

      const sinYaw = Math.sin(camYawRef.current);
      const cosYaw = Math.cos(camYawRef.current);

      const moveWorldX = -sinYaw * forward + cosYaw * strafe;
      const moveWorldZ = -cosYaw * forward - sinYaw * strafe;

      pos.x += moveWorldX * speed * dt;
      pos.z += moveWorldZ * speed * dt;

      const groundY = 0.14;
      const wantsJump = Boolean(keys["Space"] || touch.jump);
      if (wantsJump && pos.y <= groundY + 0.005) {
        velYRef.current = speedBoostActive ? 8.2 : 6.4;
        if (playerInputRef?.current) {
          playerInputRef.current.jump = false;
        }
      }

      velYRef.current -= 17.5 * dt;
      pos.y += velYRef.current * dt;
      if (pos.y <= groundY) {
        pos.y = groundY;
        velYRef.current = 0;
      }

      // Hranice rozšířeného ostrova (včetně mol)
      const onPier =
        (Math.abs(pos.x) < 1.15 && Math.abs(pos.z) <= 39.0) ||
        (Math.abs(pos.z) < 1.15 && Math.abs(pos.x) <= 39.0);
      const maxIsland = onPier ? 39.0 : 33.4;
      pos.x = Math.max(-maxIsland, Math.min(maxIsland, pos.x));
      pos.z = Math.max(-maxIsland, Math.min(maxIsland, pos.z));

      // Kolize s fontánou
      const fountainDist = Math.hypot(pos.x, pos.z);
      const minFountainDist = 1.32;
      if (fountainDist < minFountainDist && fountainDist > 0.001) {
        const push = (minFountainDist - fountainDist) / fountainDist;
        pos.x += pos.x * push;
        pos.z += pos.z * push;
      }

      // Kolize s budovami dárců i obchody
      const playerRadius = 0.24;
      for (let i = 0; i < staticColliders.length; i++) {
        const b = staticColliders[i];
        const hitX = b.halfX + playerRadius;
        const hitZ = b.halfZ + playerRadius;
        const dx = pos.x - b.x;
        const dz = pos.z - b.z;
        if (Math.abs(dx) < hitX && Math.abs(dz) < hitZ) {
          const overlapX = hitX - Math.abs(dx);
          const overlapZ = hitZ - Math.abs(dz);
          if (overlapX < overlapZ) {
            pos.x += dx >= 0 ? overlapX : -overlapX;
          } else {
            pos.z += dz >= 0 ? overlapZ : -overlapZ;
          }
        }
      }

      const isMoving = inputLen > 0.05;
      if (isMoving) {
        const targetAngle = Math.atan2(moveWorldX, moveWorldZ);
        let diff = targetAngle - facingYawRef.current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        facingYawRef.current += diff * Math.min(1, dt * 14);
        walkCycleRef.current += dt * (isSprinting ? 16 : 11);
      } else {
        walkCycleRef.current = 0;
      }

      const swing = isMoving ? Math.sin(walkCycleRef.current) * 0.65 : 0;
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.85;
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.85;

      if (playerGroupRef.current) {
        playerGroupRef.current.position.copy(pos);
        playerGroupRef.current.rotation.y = facingYawRef.current;
      }

      // Kontrola nejbližšího obchodu, auta nebo vrtulníku
      let closestTarget = null;
      let closestDist = 2.4;

      for (let i = 0; i < CITY_SHOPS.length; i++) {
        const s = CITY_SHOPS[i];
        const entranceX = s.x + Math.sin(s.rotY) * (s.d / 2 + 0.95);
        const entranceZ = s.z + Math.cos(s.rotY) * (s.d / 2 + 0.95);
        const dShop = Math.hypot(entranceX - pos.x, entranceZ - pos.z);
        if (dShop < 1.65) {
          closestDist = dShop;
          closestTarget = { type: "shop", id: s.id };
        }
      }

      if (heli.spawned) {
        const dHeli = Math.hypot(heli.x - pos.x, heli.z - pos.z);
        if (dHeli < closestDist) {
          closestDist = dHeli;
          closestTarget = { type: "heli" };
        }
      }

      for (let i = 0; i < cars.length; i++) {
        if (!cars[i].visible) continue;
        const d = Math.hypot(cars[i].x - pos.x, cars[i].z - pos.z);
        if (d < Math.min(closestDist, 1.95)) {
          closestDist = d;
          closestTarget = { type: "car", id: cars[i].id };
        }
      }
      nearbyTargetRef.current = closestTarget;
    }

    // Kamera z pohledu 3. osoby
    const activeCar = isInCar
      ? cars.find((c) => c.id === inCarIdRef.current)
      : null;
    const speedBoostDist = activeCar ? Math.abs(activeCar.speed) * 0.08 : 0;
    const camDist = (isInHeli ? 6.4 : isInCar ? 5.2 : 4.5) + speedBoostDist;
    const camHeight =
      (isInHeli ? 2.2 : isInCar ? 1.85 : 1.65) + Math.sin(camPitchRef.current) * 2.5;
    const horizDist = Math.cos(camPitchRef.current) * camDist;

    const desiredCamPos = new THREE.Vector3(
      pos.x + Math.sin(camYawRef.current) * horizDist,
      pos.y + camHeight,
      pos.z + Math.cos(camYawRef.current) * horizDist
    );
    camera.position.lerp(desiredCamPos, Math.min(1, dt * 12));
    camera.lookAt(pos.x, pos.y + (isInHeli ? 0.35 : isInCar ? 0.55 : 0.72), pos.z);

    // Detekce parcely pod/před hráčem
    const probeDist = isInHeli ? 0 : isInCar ? 1.3 : 0.85;
    const probeX = pos.x + Math.sin(facingYawRef.current) * probeDist;
    const probeZ = pos.z + Math.cos(facingYawRef.current) * probeDist;
    const nearbyPlot = worldToPlot(probeX, probeZ);
    if (nearbyPlot && nearbyPlot !== lastNearbyPlotRef.current) {
      lastNearbyPlotRef.current = nearbyPlot;
      onNearbyPlotChange(nearbyPlot);
    }

    // Aktualizace UI a multiplayer pozice
    uiTickRef.current += dt;
    if (uiTickRef.current >= 0.1) {
      uiTickRef.current = 0;
      const mode = isInHeli ? "heli" : isInCar ? "car" : "foot";

      onPlayerTransformChange?.({
        x: pos.x,
        y: pos.y,
        z: pos.z,
        yaw: facingYawRef.current,
        vehicleMode: mode,
        carColor: activeCar?.color || "#FFFFFF",
      });

      const speedKmh = isInHeli
        ? Math.round(Math.hypot(heli.vy, 8) * 11)
        : activeCar
          ? Math.round(Math.abs(activeCar.speed) * 9.5)
          : 0;
      const altitude = isInHeli ? Math.max(0, Math.round((heli.y - 0.16) * 8)) : 0;
      const targetType = onFoot ? nearbyTargetRef.current?.type || null : null;
      const shopId =
        onFoot && nearbyTargetRef.current?.type === "shop"
          ? nearbyTargetRef.current.id
          : null;

      if (shopId !== lastReportedShopRef.current) {
        lastReportedShopRef.current = shopId;
        onNearbyShopChange?.(shopId);
      }

      const signature = `${mode}-${targetType}-${shopId}-${speedKmh}-${altitude}`;
      if (signature !== lastReportedVehicleRef.current) {
        lastReportedVehicleRef.current = signature;
        onVehicleStateChange?.({
          mode,
          canEnter: targetType,
          shopId,
          carColor: activeCar?.color || null,
          speedKmh,
          altitude,
        });
      }
    }
  });

  const activeShopId =
    streetMode && inCarIdRef.current === null && !heliStateRef.current.inHeli
      ? lastReportedShopRef.current
      : null;

  return (
    <group>
      {/* 7 AI aut + 1 osobní sporťák */}
      {INITIAL_STREET_CARS.map((c, idx) => (
        <group
          key={c.id}
          ref={(el) => {
            carMeshesRef.current[idx] = el;
          }}
        >
          <SportsCarModel
            color={c.color}
            isLit={isLit}
            neonRef={(el) => {
              carNeonMeshesRef.current[idx] = el;
            }}
            castShadow={castShadow}
          />
        </group>
      ))}

      {/* Osobní 3D vrtulník (Vice Chopper) */}
      <group ref={heliGroupRef} visible={false} position={[-29.3, 0.16, 7.2]}>
        {/* Trup */}
        <mesh castShadow={castShadow}>
          <boxGeometry args={[0.5, 0.36, 0.96]} />
          <meshStandardMaterial color="#EC4899" metalness={0.65} roughness={0.2} />
        </mesh>
        {/* Čelní kokpit */}
        <mesh position={[0, 0.04, 0.38]}>
          <boxGeometry args={[0.45, 0.28, 0.34]} />
          <meshStandardMaterial color="#22D3EE" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Přistávací ližiny */}
        <mesh position={[-0.22, -0.22, 0.05]}>
          <boxGeometry args={[0.04, 0.04, 0.92]} />
          <meshStandardMaterial color="#CBD5E1" />
        </mesh>
        <mesh position={[0.22, -0.22, 0.05]}>
          <boxGeometry args={[0.04, 0.04, 0.92]} />
          <meshStandardMaterial color="#CBD5E1" />
        </mesh>
        {/* Ocasní nosník */}
        <mesh position={[0, 0.04, -0.82]}>
          <boxGeometry args={[0.12, 0.14, 0.78]} />
          <meshStandardMaterial color="#1E1B4B" />
        </mesh>
        {/* Rotorová hlava + listy */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.12, 8]} />
          <meshStandardMaterial color="#CBD5E1" />
        </mesh>
        <mesh ref={mainRotorRef} position={[0, 0.28, 0]}>
          <boxGeometry args={[1.82, 0.02, 0.12]} />
          <meshBasicMaterial color="#22D3EE" />
        </mesh>
        <mesh ref={tailRotorRef} position={[0.09, 0.08, -1.16]}>
          <boxGeometry args={[0.02, 0.36, 0.06]} />
          <meshBasicMaterial color="#FBBF24" />
        </mesh>
      </group>

      {/* Rotující Vice Coiny (striktně na silnicích, promenádě, molech a plážích) */}
      {SAFE_COIN_SPOTS.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            coinMeshesRef.current[idx] = el;
          }}
          position={[0, 0.42, 0]}
        >
          <cylinderGeometry args={[0.18, 0.18, 0.05, 16]} />
          <meshStandardMaterial
            color="#FBBF24"
            emissive="#F59E0B"
            emissiveIntensity={0.7}
            metalness={0.85}
            roughness={0.18}
          />
        </mesh>
      ))}

      {/* Hratelná 3D postava s vybraným skinem */}
      {streetMode && (
        <group ref={playerGroupRef} position={[0, 0.14, 3.6]}>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.3, 24]} />
            <meshBasicMaterial
              color={speedBoostActive ? "#F472B6" : "#22D3EE"}
              transparent
              opacity={0.9}
            />
          </mesh>

          <group ref={leftLegRef} position={[-0.085, 0.34, 0]}>
            <mesh position={[0, -0.15, 0]} castShadow={castShadow}>
              <boxGeometry args={[0.11, 0.28, 0.12]} />
              <meshStandardMaterial color={activeSkin.pants} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.31, 0.02]}>
              <boxGeometry args={[0.115, 0.07, 0.16]} />
              <meshStandardMaterial color={activeSkin.shoes} roughness={0.4} />
            </mesh>
          </group>

          <group ref={rightLegRef} position={[0.085, 0.34, 0]}>
            <mesh position={[0, -0.15, 0]} castShadow={castShadow}>
              <boxGeometry args={[0.11, 0.28, 0.12]} />
              <meshStandardMaterial color={activeSkin.pants} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.31, 0.02]}>
              <boxGeometry args={[0.115, 0.07, 0.16]} />
              <meshStandardMaterial color={activeSkin.shoes} roughness={0.4} />
            </mesh>
          </group>

          <mesh position={[0, 0.52, 0]} castShadow={castShadow}>
            <boxGeometry args={[0.3, 0.34, 0.17]} />
            <meshStandardMaterial color={activeSkin.torso} roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.52, 0.088]}>
            <boxGeometry args={[0.24, 0.22, 0.01]} />
            <meshStandardMaterial color={activeSkin.accent} roughness={0.5} />
          </mesh>

          <group ref={leftArmRef} position={[-0.2, 0.65, 0]}>
            <mesh position={[0, -0.13, 0]} castShadow={castShadow}>
              <boxGeometry args={[0.09, 0.26, 0.09]} />
              <meshStandardMaterial color="#FDBA74" roughness={0.6} />
            </mesh>
          </group>

          <group ref={rightArmRef} position={[0.2, 0.65, 0]}>
            <mesh position={[0, -0.13, 0]} castShadow={castShadow}>
              <boxGeometry args={[0.09, 0.26, 0.09]} />
              <meshStandardMaterial color="#FDBA74" roughness={0.6} />
            </mesh>
          </group>

          <group position={[0, 0.81, 0]}>
            <mesh castShadow={castShadow}>
              <boxGeometry args={[0.21, 0.21, 0.21]} />
              <meshStandardMaterial color="#FDBA74" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.09, -0.01]}>
              <boxGeometry args={[0.225, 0.08, 0.225]} />
              <meshStandardMaterial color={activeSkin.hair} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.02, 0.11]}>
              <boxGeometry args={[0.19, 0.055, 0.02]} />
              <meshStandardMaterial color="#090D16" metalness={0.85} roughness={0.1} />
            </mesh>
          </group>

          <Html position={[0, 1.16, 0]} center zIndexRange={[10, 0]}>
            <div className="pointer-events-none whitespace-nowrap rounded-full border border-cyan-400 bg-slate-950/90 px-2.5 py-0.5 text-[10px] font-black text-cyan-200 shadow-lg">
              {playerName}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

export default function Island3D({
  activeDonors,
  donorMap,
  selectedPlot,
  hoveredPlot,
  vipPlots = DEFAULT_VIP_PLOTS,
  theme,
  previewAmount,
  previewName,
  formattedHandle,
  focusSignal,
  resetSignal,
  streetMode = false,
  playerSkin = "tourist",
  speedBoostActive = false,
  remotePlayers = [],
  playerInputRef,
  onSelectPlot,
  onHoverPlot,
  onPlayerTransformChange,
  onVehicleStateChange,
  onCoinCollect,
  onPlaySfx,
}) {
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768 || navigator.maxTouchPoints > 0;
  }, []);

  const textures = useMemo(() => {
    return {
      road: createAsphaltRoadTexture(),
      plaza: createPlazaTexture(),
      promenade: createPromenadeTexture(),
      pier: createWoodPierTexture(),
      plot: createPlotTexture(theme),
      skyscraper: createSkyscraperFacade(theme),
      villa: createVillaFacade(theme, false),
      founderVilla: createVillaFacade(theme, true),
      bungalow: createBungalowFacade(theme),
      roof: createRoofTileTexture(),
      sand: createSandTexture(theme),
      water: createWaterTexture(theme),
      shops: {
        diner: createShopFacadeTexture("#EC4899", "#22D3EE", "MALIBU DINER"),
        motors: createShopFacadeTexture("#F59E0B", "#38BDF8", "VICE MOTORS"),
        boutique: createShopFacadeTexture("#8B5CF6", "#F472B6", "VICE DRIP"),
        helipad: createShopFacadeTexture("#10B981", "#FBBF24", "SKY HELIPAD"),
      },
    };
  }, [theme]);

  useEffect(() => {
    return () => {
      Object.entries(textures).forEach(([key, val]) => {
        if (key === "shops") {
          Object.values(val).forEach((t) => t?.dispose());
        } else {
          val?.dispose();
        }
      });
    };
  }, [textures]);

  const bgHex =
    theme === "night" ? "#050814" : theme === "sunset" ? "#2E1065" : "#0284C7";

  const selectedDonor = donorMap.get(selectedPlot);

  return (
    <Canvas
      shadows={!isMobile}
      dpr={isMobile ? [1, 1.25] : [1, 2]}
      gl={{ powerPreference: "high-performance", antialias: !isMobile }}
      camera={{ position: [0, 40, 44], fov: streetMode ? 56 : 44 }}
      className="h-full w-full touch-none"
    >
      <color attach="background" args={[bgHex]} />
      <fog attach="fog" args={[bgHex, 72, 165]} />

      <ambientLight intensity={theme === "day" ? 1.15 : 0.75} />
      <directionalLight
        position={[32, 48, 28]}
        intensity={theme === "day" ? 1.8 : theme === "sunset" ? 1.5 : 1.15}
        color={
          theme === "sunset"
            ? "#FB923C"
            : theme === "night"
              ? "#93C5FD"
              : "#FFFFFF"
        }
        castShadow={!isMobile}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 8, 0]} intensity={1.5} color="#EC4899" distance={45} />

      {/* Hluboký oceán + mělká tyrkysová laguna */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.25, 0]}
        receiveShadow={!isMobile}
      >
        <planeGeometry args={[340, 340]} />
        <meshStandardMaterial
          map={textures.water}
          roughness={0.25}
          metalness={0.35}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <planeGeometry args={[76, 76]} />
        <meshBasicMaterial
          color={theme === "day" ? "#22D3EE" : "#0E7490"}
          transparent
          opacity={0.44}
        />
      </mesh>

      {/* Rozšířený písečný ostrov (68 x 68) */}
      <mesh position={[0, -0.06, 0]} receiveShadow={!isMobile}>
        <boxGeometry args={[68.0, 0.24, 68.0]} />
        <meshStandardMaterial map={textures.sand} roughness={0.85} />
      </mesh>

      <PlotsInstancedGrid
        donorMap={donorMap}
        selectedPlot={selectedPlot}
        hoveredPlot={hoveredPlot}
        vipPlots={vipPlots}
        theme={theme}
        plotTexture={textures.plot}
        isMobile={isMobile}
        streetMode={streetMode}
        onSelectPlot={onSelectPlot}
        onHoverPlot={onHoverPlot}
      />

      {activeDonors.map((d) => (
        <Building3D
          key={d.plot}
          plotNum={d.plot}
          amount={d.amount}
          name={d.name}
          textures={textures}
          isSelected={selectedPlot === d.plot}
          castShadow={!isMobile}
          showLabel={
            streetMode ||
            selectedPlot === d.plot ||
            (!isMobile && hoveredPlot === d.plot) ||
            activeDonors.length <= 15
          }
        />
      ))}

      {!streetMode && !selectedDonor && (
        <Building3D
          plotNum={selectedPlot}
          amount={previewAmount}
          name={
            previewName.trim()
              ? `${formattedHandle} (PREVIEW)`
              : `YOUR PLOT #${String(selectedPlot).padStart(4, "0")}`
          }
          textures={textures}
          isPreview
          isSelected
          castShadow={!isMobile}
          showLabel
        />
      )}

      <CoastalProps3D castShadow={!isMobile} />
      <CityShops3D textures={textures} castShadow={!isMobile} />
      <StaticWorldEnvironment
        roadTex={textures.road}
        plazaTex={textures.plaza}
        promenadeTex={textures.promenade}
        pierTex={textures.pier}
        waterTex={textures.water}
        castShadow={!isMobile}
      />

      {remotePlayers.map((rp) => (
        <RemotePlayerEntity key={rp.id} player={rp} />
      ))}

      <InteractiveCitySimulation
        streetMode={streetMode}
        theme={theme}
        activeDonors={activeDonors}
        playerName={previewName.trim() ? formattedHandle : "@visitor"}
        playerSkin={playerSkin}
        speedBoostActive={speedBoostActive}
        playerInputRef={playerInputRef}
        castShadow={!isMobile}
        onNearbyPlotChange={onSelectPlot}
        onPlayerTransformChange={onPlayerTransformChange}
        onVehicleStateChange={onVehicleStateChange}
        onCoinCollect={onCoinCollect}
        onPlaySfx={onPlaySfx}
      />

      {!streetMode && (
        <CameraController
          focusSignal={focusSignal}
          selectedPlot={selectedPlot}
          resetSignal={resetSignal}
        />
      )}
    </Canvas>
  );
}