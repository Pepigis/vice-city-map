import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import {
  createAsphaltRoadTexture,
  createBungalowFacade,
  createPlazaTexture,
  createPlotTexture,
  createRoofTileTexture,
  createSandTexture,
  createSkyscraperFacade,
  createVillaFacade,
  createWaterTexture,
} from "./textures3D";

const COLS = 40;
const ROWS = 40;
const TOTAL_PLOTS = COLS * ROWS;
const TILE_STEP = 1.12;
const DEFAULT_VIP_PLOTS = {};

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

const INITIAL_STREET_CARS = [
  { id: 0, axis: "x", dir: 1, lane: 0.46, baseSpeed: 5.2, offset: 0, color: "#F472B6" },
  { id: 1, axis: "x", dir: 1, lane: 0.46, baseSpeed: 4.5, offset: 22, color: "#FACC15" },
  { id: 2, axis: "x", dir: -1, lane: -0.46, baseSpeed: 5.5, offset: 11, color: "#38BDF8" },
  { id: 3, axis: "z", dir: 1, lane: -0.46, baseSpeed: 4.9, offset: 6, color: "#A855F7" },
  { id: 4, axis: "z", dir: -1, lane: 0.46, baseSpeed: 5.3, offset: 18, color: "#10B981" },
  { id: 5, axis: "x", dir: 1, lane: 0.46, baseSpeed: 0, offset: 25, color: "#FFFFFF", isPersonal: true },
];

const COIN_SPOTS = [
  [0, 2.2],
  [0, -2.2],
  [2.2, 0],
  [-2.2, 0],
  [4.5, 0.45],
  [-4.5, -0.45],
  [9.0, 0.45],
  [-9.0, -0.45],
  [14.0, 0.45],
  [-14.0, -0.45],
  [19.5, 0.45],
  [-19.5, -0.45],
  [0.45, 5.2],
  [-0.45, -5.2],
  [0.45, 10.5],
  [-0.45, -10.5],
  [0.45, 15.5],
  [-0.45, -15.5],
  [0.45, 20.0],
  [-0.45, -20.0],
  [6.5, 6.5],
  [-6.5, 6.5],
  [6.5, -6.5],
  [-6.5, -6.5],
  [12.5, -12.5],
];

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
      <boxGeometry args={[1.06, 0.14, 1.06]} />
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
        ? 4.45
        : 3.65
      : tier === "villa" || tier === "founder"
        ? 1.85
        : 1.3;

  return (
    <group ref={groupRef} position={[x, 0.14, z]}>
      {tier === "bungalow" && (
        <group>
          <mesh position={[0, 0.04, 0.08]} receiveShadow={castShadow}>
            <boxGeometry args={[0.88, 0.08, 0.92]} />
            <meshStandardMaterial color="#92400E" roughness={0.85} />
          </mesh>
          <mesh
            position={[0, 0.34, -0.02]}
            castShadow={castShadow}
            receiveShadow={castShadow}
          >
            <boxGeometry args={[0.74, 0.54, 0.68]} />
            <meshStandardMaterial
              map={textures.bungalow}
              roughness={0.5}
              transparent={isPreview}
              opacity={isPreview ? 0.88 : 1}
            />
          </mesh>
          <mesh
            position={[0, 0.78, -0.02]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow={castShadow}
          >
            <coneGeometry args={[0.64, 0.36, 4]} />
            <meshStandardMaterial map={textures.roof} roughness={0.6} />
          </mesh>
        </group>
      )}

      {(tier === "villa" || tier === "founder") && (
        <group>
          <mesh position={[0, 0.05, 0]} receiveShadow={castShadow}>
            <boxGeometry args={[0.96, 0.1, 0.96]} />
            <meshStandardMaterial color="#CBD5E1" />
          </mesh>
          <mesh
            position={[0, 0.54, 0]}
            castShadow={castShadow}
            receiveShadow={castShadow}
          >
            <boxGeometry args={[0.86, 0.88, 0.86]} />
            <meshStandardMaterial
              map={isFounder ? textures.founderVilla : textures.villa}
              roughness={0.35}
              metalness={0.1}
              transparent={isPreview}
              opacity={isPreview ? 0.88 : 1}
            />
          </mesh>
          <mesh position={[0, 1.02, 0]} castShadow={castShadow}>
            <boxGeometry args={[0.94, 0.08, 0.94]} />
            <meshStandardMaterial
              color={isFounder ? "#F59E0B" : "#EC4899"}
              emissive={isFounder ? "#F59E0B" : "#EC4899"}
              emissiveIntensity={0.45}
            />
          </mesh>
          <mesh position={[0, 1.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.62, 0.62]} />
            <meshBasicMaterial color="#22D3EE" />
          </mesh>
        </group>
      )}

      {tier === "skyscraper" && (
        <group>
          {(() => {
            const h = amount >= 20 ? 3.5 : 2.7;
            return (
              <>
                <mesh
                  position={[0, h / 2, 0]}
                  castShadow={castShadow}
                  receiveShadow={castShadow}
                >
                  <boxGeometry args={[0.88, h, 0.88]} />
                  <meshStandardMaterial
                    map={textures.skyscraper}
                    metalness={0.65}
                    roughness={0.2}
                    transparent={isPreview}
                    opacity={isPreview ? 0.88 : 1}
                  />
                </mesh>
                <mesh position={[0, h + 0.16, 0]} castShadow={castShadow}>
                  <boxGeometry args={[0.64, 0.32, 0.64]} />
                  <meshStandardMaterial
                    map={textures.skyscraper}
                    metalness={0.7}
                    roughness={0.18}
                  />
                </mesh>
                <mesh position={[0, h + 0.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.16, 0.25, 24]} />
                  <meshBasicMaterial color="#10B981" />
                </mesh>
                <mesh position={[0, h + 0.48, 0]}>
                  <cylinderGeometry args={[0.015, 0.02, 0.3, 6]} />
                  <meshBasicMaterial color="#E2E8F0" />
                </mesh>
                <mesh ref={beaconRef} position={[0, h + 0.66, 0]}>
                  <sphereGeometry args={[0.08, 12, 12]} />
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

// 3. Klenuté 3D palmy kolem ostrova
function PalmTrees3D({ castShadow = true }) {
  const trees = useMemo(() => {
    const arr = [];
    const edge = (COLS / 2) * TILE_STEP + 0.85;
    for (let i = -edge + 2; i <= edge - 2; i += 3.6) {
      arr.push([i, -edge], [i, edge], [-edge, i], [edge, i]);
    }
    arr.push([-1.85, -1.85], [1.85, -1.85], [-1.85, 1.85], [1.85, 1.85]);
    return arr;
  }, []);

  return (
    <group>
      {trees.map(([tx, tz], idx) => (
        <group key={idx} position={[tx, 0.05, tz]} rotation={[0, idx * 0.9, 0]}>
          <mesh position={[0, 0.35, 0]} rotation={[0.08, 0, 0.06]} castShadow={castShadow}>
            <cylinderGeometry args={[0.08, 0.12, 0.7, 7]} />
            <meshStandardMaterial color="#78350F" roughness={0.9} />
          </mesh>
          <mesh
            position={[0.06, 0.98, 0.05]}
            rotation={[0.16, 0, 0.12]}
            castShadow={castShadow}
          >
            <cylinderGeometry args={[0.055, 0.08, 0.68, 7]} />
            <meshStandardMaterial color="#92400E" roughness={0.9} />
          </mesh>
          <mesh position={[0.1, 1.24, 0.08]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#451A03" />
          </mesh>
          {[0, 1.05, 2.1, 3.15, 4.2, 5.25].map((rot, fIdx) => (
            <group
              key={fIdx}
              position={[0.1, 1.3, 0.08]}
              rotation={[0.45, rot, 0]}
            >
              <mesh position={[0, 0, 0.42]} castShadow={castShadow}>
                <boxGeometry args={[0.18, 0.03, 0.82]} />
                <meshStandardMaterial color={fIdx % 2 === 0 ? "#10B981" : "#059669"} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

// 4. Asfaltové bulváry + fontána + jachty + animovaný oceán
function StaticWorldEnvironment({ roadTex, plazaTex, waterTex, castShadow = true }) {
  const boatsRef = useRef([]);
  const fountainRingRef = useRef(null);
  const islandSpan = COLS * TILE_STEP;

  const boats = useMemo(
    () => [
      { radius: 28.5, speed: 0.22, offset: 0, color: "#EC4899" },
      { radius: 31.5, speed: -0.18, offset: 2.1, color: "#06B6D4" },
      { radius: 30, speed: 0.2, offset: 4.2, color: "#F59E0B" },
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
      <mesh
        position={[0, 0.055, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={castShadow}
      >
        <planeGeometry args={[TILE_STEP * 2.02, islandSpan]} />
        <meshStandardMaterial map={roadTex} roughness={0.85} />
      </mesh>

      <mesh
        position={[0, 0.057, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        receiveShadow={castShadow}
      >
        <planeGeometry args={[TILE_STEP * 2.02, islandSpan]} />
        <meshStandardMaterial map={roadTex} roughness={0.85} />
      </mesh>

      <mesh
        position={[0, 0.062, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={castShadow}
      >
        <planeGeometry args={[TILE_STEP * 2.35, TILE_STEP * 2.35]} />
        <meshStandardMaterial map={plazaTex} roughness={0.7} />
      </mesh>

      <group position={[0, 0.09, 0]}>
        <mesh>
          <cylinderGeometry args={[0.92, 1.02, 0.16, 24]} />
          <meshStandardMaterial color="#1E1B4B" />
        </mesh>
        <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.78, 24]} />
          <meshBasicMaterial color="#22D3EE" />
        </mesh>
        <mesh
          ref={fountainRingRef}
          position={[0, 0.11, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.4, 0.52, 24]} />
          <meshBasicMaterial color="#F472B6" />
        </mesh>
      </group>

      {boats.map((b, idx) => (
        <group
          key={idx}
          ref={(el) => {
            boatsRef.current[idx] = el;
          }}
        >
          <mesh castShadow={castShadow}>
            <boxGeometry args={[0.58, 0.22, 1.65]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.14, -0.1]}>
            <boxGeometry args={[0.42, 0.14, 0.85]} />
            <meshStandardMaterial color={b.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// 5. Plynulý 3D přelet kamery (Map View)
function CameraController({ focusSignal, selectedPlot, resetSignal }) {
  const controlsRef = useRef(null);
  const flyRef = useRef(null);
  const { camera } = useThree();

  useEffect(() => {
    if (focusSignal === 0) return;
    const { x, z } = plotToWorld(selectedPlot);
    flyRef.current = {
      target: new THREE.Vector3(x, 0.5, z),
      pos: new THREE.Vector3(x + 8.5, 9.5, z + 10.5),
    };
  }, [focusSignal, selectedPlot]);

  useEffect(() => {
    if (resetSignal === 0) return;
    flyRef.current = {
      target: new THREE.Vector3(0, 0, 0),
      pos: new THREE.Vector3(0, 32, 36),
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
      maxDistance={68}
      maxPolarAngle={Math.PI / 2.15}
      onStart={() => {
        flyRef.current = null;
      }}
    />
  );
}

// 6. Živí multiplayer hráči v 3D světě
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
        ? 0.72
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
        <group>
          <mesh>
            <boxGeometry args={[0.38, 0.16, 0.72]} />
            <meshStandardMaterial
              color={player.carColor || "#F472B6"}
              metalness={0.45}
              roughness={0.28}
            />
          </mesh>
          <mesh position={[0, 0.12, -0.04]}>
            <boxGeometry args={[0.31, 0.12, 0.38]} />
            <meshStandardMaterial color="#0F172A" metalness={0.85} roughness={0.1} />
          </mesh>
        </group>
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

// 7. Kompletní GTA simulace: 5 AI aut + Osobní auto + Vrtulník + Vice Coiny + Postava
function InteractiveCitySimulation({
  streetMode,
  theme,
  activeDonors,
  playerName,
  playerSkin,
  playerInputRef,
  castShadow = true,
  onNearbyPlotChange,
  onPlayerTransformChange,
  onVehicleStateChange,
  onCoinCollect,
  onPlaySfx,
}) {
  const { camera, gl } = useThree();
  const isLit = theme === "night" || theme === "sunset";
  const limit = (COLS * TILE_STEP) / 2;
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
    x: 2.2,
    y: 0.16,
    z: 2.2,
    yaw: 0,
    vy: 0,
  });

  const carsStateRef = useRef(
    INITIAL_STREET_CARS.map((c) => {
      const startPos = -limit + c.offset;
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
    COIN_SPOTS.map(([cx, cz], idx) => ({
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
  const nearbyTargetRef = useRef(null); // { type: "car" | "heli", id?: number }
  const lastReportedVehicleRef = useRef("");

  const keysRef = useRef({});
  const dragRef = useRef({ active: false, x: 0, y: 0 });
  const walkCycleRef = useRef(0);
  const lastNearbyPlotRef = useRef(null);
  const uiTickRef = useRef(0);
  const hornCooldownRef = useRef(0);

  const buildingColliders = useMemo(() => {
    return activeDonors.map((d) => {
      const { x, z } = plotToWorld(d.plot);
      return { x, z, half: 0.48 };
    });
  }, [activeDonors]);

  // Nastoupení / vystoupení z auta nebo vrtulníku
  const toggleVehicleAction = useMemo(() => {
    return () => {
      if (!streetMode) return;
      const heli = heliStateRef.current;

      // Vystoupení z vrtulníku
      if (heli.inHeli) {
        heli.inHeli = false;
        heli.y = 0.16;
        heli.vy = 0;
        const exitX = heli.x - Math.cos(heli.yaw) * 0.95;
        const exitZ = heli.z + Math.sin(heli.yaw) * 0.95;
        posRef.current.set(
          Math.max(-22.8, Math.min(22.8, exitX)),
          0.14,
          Math.max(-22.8, Math.min(22.8, exitZ))
        );
        facingYawRef.current = heli.yaw;
        onPlaySfx?.("select");
        return;
      }

      // Vystoupení z auta
      if (inCarIdRef.current !== null) {
        const car = carsStateRef.current.find((c) => c.id === inCarIdRef.current);
        if (car) {
          car.speed = 0;
          const exitX = car.x - Math.cos(car.yaw) * 0.72;
          const exitZ = car.z + Math.sin(car.yaw) * 0.72;
          posRef.current.set(
            Math.max(-22.8, Math.min(22.8, exitX)),
            0.14,
            Math.max(-22.8, Math.min(22.8, exitZ))
          );
          facingYawRef.current = car.yaw;
        }
        inCarIdRef.current = null;
        onPlaySfx?.("select");
        return;
      }

      // Nastoupení do nejbližšího vozidla
      const target = nearbyTargetRef.current;
      if (!target) return;

      if (target.type === "heli" && heli.spawned) {
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
  }, [onPlaySfx, streetMode]);

  // Přivolání osobního auta nebo vrtulníku z Garáže
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
      playerInputRef.current.toggleVehicle = toggleVehicleAction;
      playerInputRef.current.spawnPersonalCar = spawnPersonalCar;
      playerInputRef.current.spawnHelicopter = spawnHelicopter;
    }
  }, [playerInputRef, spawnHelicopter, spawnPersonalCar, toggleVehicleAction]);

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
        toggleVehicleAction();
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
  }, [toggleVehicleAction]);

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

    // 1. Pohyb aut
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

        const maxForward = c.isPersonal ? 18.0 : 15.5;
        const maxReverse = -6.0;

        if (throttle > 0.05) {
          c.speed += throttle * 17.5 * dt;
        } else if (throttle < -0.05) {
          c.speed += throttle * 18.0 * dt;
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

        const maxCarBound = 22.9;
        if (Math.abs(c.x) > maxCarBound) {
          c.x = Math.sign(c.x) * maxCarBound;
          c.speed *= 0.5;
        }
        if (Math.abs(c.z) > maxCarBound) {
          c.z = Math.sign(c.z) * maxCarBound;
          c.speed *= 0.5;
        }

        const fDist = Math.hypot(c.x, c.z);
        const minFountainCar = 1.48;
        if (fDist < minFountainCar && fDist > 0.001) {
          const push = (minFountainCar - fDist) / fDist;
          c.x += c.x * push;
          c.z += c.z * push;
          c.speed *= 0.65;
        }

        const carRadius = 0.36;
        for (let bIdx = 0; bIdx < buildingColliders.length; bIdx++) {
          const b = buildingColliders[bIdx];
          const hitLimit = b.half + carRadius;
          const dx = c.x - b.x;
          const dz = c.z - b.z;
          if (Math.abs(dx) < hitLimit && Math.abs(dz) < hitLimit) {
            const ovX = hitLimit - Math.abs(dx);
            const ovZ = hitLimit - Math.abs(dz);
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
          neonMesh.visible = (isDrifting && Math.abs(c.speed) > 2.5) || Boolean(c.isPersonal);
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
        const aiSpeed = distToPlayer < 1.9 ? 0 : c.baseSpeed;
        const span = limit * 2;

        if (c.axis === "x") {
          c.x += c.dir * aiSpeed * dt;
          if (c.x > limit) c.x -= span;
          if (c.x < -limit) c.x += span;
          c.z = c.lane;
          c.yaw = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        } else {
          c.z += c.dir * aiSpeed * dt;
          if (c.z > limit) c.z -= span;
          if (c.z < -limit) c.z += span;
          c.x = c.lane;
          c.yaw = c.dir > 0 ? 0 : Math.PI;
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
            heli.vy = 6.5;
          } else if (descend) {
            heli.vy = -6.5;
          } else {
            heli.vy *= Math.pow(0.08, dt);
          }

          heli.y = Math.max(0.16, Math.min(18.0, heli.y + heli.vy * dt));
          heli.yaw -= yawInput * 2.2 * dt;

          const airSpeed = pitch * 13.5;
          heli.x += Math.sin(heli.yaw) * airSpeed * dt;
          heli.z += Math.cos(heli.yaw) * airSpeed * dt;

          const maxHeliBound = 24.5;
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

    // 3. Vice Coiny
    const coins = coinsStateRef.current;
    const pickupRadius = heli.inHeli ? 1.25 : inCarIdRef.current !== null ? 0.92 : 0.65;

    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];
      const mesh = coinMeshesRef.current[i];

      if (coin.respawnTimer > 0) {
        coin.respawnTimer -= dt;
        if (coin.respawnTimer <= 0) {
          coin.respawnTimer = 0;
          const spot = COIN_SPOTS[Math.floor(Math.random() * COIN_SPOTS.length)];
          coin.x = spot[0] + (Math.random() - 0.5) * 0.4;
          coin.z = spot[1] + (Math.random() - 0.5) * 0.4;
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
          coin.respawnTimer = 11;
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
      const speed = isSprinting ? 7.6 : 4.4;

      const sinYaw = Math.sin(camYawRef.current);
      const cosYaw = Math.cos(camYawRef.current);

      const moveWorldX = -sinYaw * forward + cosYaw * strafe;
      const moveWorldZ = -cosYaw * forward - sinYaw * strafe;

      pos.x += moveWorldX * speed * dt;
      pos.z += moveWorldZ * speed * dt;

      const groundY = 0.14;
      const wantsJump = Boolean(keys["Space"] || touch.jump);
      if (wantsJump && pos.y <= groundY + 0.005) {
        velYRef.current = 6.2;
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

      const maxIsland = 23.2;
      pos.x = Math.max(-maxIsland, Math.min(maxIsland, pos.x));
      pos.z = Math.max(-maxIsland, Math.min(maxIsland, pos.z));

      const fountainDist = Math.hypot(pos.x, pos.z);
      const minFountainDist = 1.28;
      if (fountainDist < minFountainDist && fountainDist > 0.001) {
        const push = (minFountainDist - fountainDist) / fountainDist;
        pos.x += pos.x * push;
        pos.z += pos.z * push;
      }

      const playerRadius = 0.22;
      for (let i = 0; i < buildingColliders.length; i++) {
        const b = buildingColliders[i];
        const hitLimit = b.half + playerRadius;
        const dx = pos.x - b.x;
        const dz = pos.z - b.z;
        if (Math.abs(dx) < hitLimit && Math.abs(dz) < hitLimit) {
          const overlapX = hitLimit - Math.abs(dx);
          const overlapZ = hitLimit - Math.abs(dz);
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

      // Kontrola nejbližšího auta nebo vrtulníku
      let closestTarget = null;
      let closestDist = 1.95;

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
        if (d < closestDist) {
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
    const camDist = (isInHeli ? 6.2 : isInCar ? 5.1 : 4.4) + speedBoostDist;
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

    // Aktualizace UI a multiplayer pozice (~10x za sekundu)
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
      const canEnterType = onFoot ? nearbyTargetRef.current?.type || null : null;
      const signature = `${mode}-${canEnterType}-${speedKmh}-${altitude}`;

      if (signature !== lastReportedVehicleRef.current) {
        lastReportedVehicleRef.current = signature;
        onVehicleStateChange?.({
          mode,
          canEnter: canEnterType,
          carColor: activeCar?.color || null,
          speedKmh,
          altitude,
        });
      }
    }
  });

  return (
    <group>
      {/* 5 AI aut + 1 osobní sporťák */}
      {INITIAL_STREET_CARS.map((c, idx) => (
        <group
          key={c.id}
          ref={(el) => {
            carMeshesRef.current[idx] = el;
          }}
        >
          <mesh castShadow={castShadow}>
            <boxGeometry args={[0.38, 0.16, 0.72]} />
            <meshStandardMaterial color={c.color} metalness={0.45} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.12, -0.04]}>
            <boxGeometry args={[0.31, 0.12, 0.38]} />
            <meshStandardMaterial color="#0F172A" metalness={0.85} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.12, -0.34]}>
            <boxGeometry args={[0.38, 0.04, 0.06]} />
            <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.6} />
          </mesh>
          {isLit && (
            <mesh position={[0, -0.02, 0.65]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.48, 0.85]} />
              <meshBasicMaterial color="#FEF08A" transparent opacity={0.36} />
            </mesh>
          )}
          <mesh
            ref={(el) => {
              carNeonMeshesRef.current[idx] = el;
            }}
            visible={false}
            position={[0, -0.07, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.56, 0.92]} />
            <meshBasicMaterial color="#22D3EE" transparent opacity={0.75} />
          </mesh>
        </group>
      ))}

      {/* Osobní 3D vrtulník (Vice Chopper) */}
      <group ref={heliGroupRef} visible={false} position={[2.2, 0.16, 2.2]}>
        <mesh castShadow={castShadow}>
          <boxGeometry args={[0.48, 0.34, 0.92]} />
          <meshStandardMaterial color="#EC4899" metalness={0.65} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.04, 0.36]}>
          <boxGeometry args={[0.44, 0.26, 0.32]} />
          <meshStandardMaterial color="#22D3EE" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.04, -0.78]}>
          <boxGeometry args={[0.12, 0.14, 0.72]} />
          <meshStandardMaterial color="#1E1B4B" />
        </mesh>
        <mesh position={[0, 0.21, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.12, 8]} />
          <meshStandardMaterial color="#CBD5E1" />
        </mesh>
        <mesh ref={mainRotorRef} position={[0, 0.27, 0]}>
          <boxGeometry args={[1.72, 0.02, 0.11]} />
          <meshBasicMaterial color="#22D3EE" />
        </mesh>
        <mesh ref={tailRotorRef} position={[0.09, 0.08, -1.1]}>
          <boxGeometry args={[0.02, 0.34, 0.06]} />
          <meshBasicMaterial color="#FBBF24" />
        </mesh>
      </group>

      {/* 25 rotujících Vice Coinů */}
      {COIN_SPOTS.map((_, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            coinMeshesRef.current[idx] = el;
          }}
          position={[0, 0.42, 0]}
        >
          <cylinderGeometry args={[0.17, 0.17, 0.05, 16]} />
          <meshStandardMaterial
            color="#FBBF24"
            emissive="#F59E0B"
            emissiveIntensity={0.65}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* Hratelná 3D postava s vybraným skinem */}
      {streetMode && (
        <group ref={playerGroupRef} position={[0, 0.14, 3.6]}>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.3, 24]} />
            <meshBasicMaterial color="#22D3EE" transparent opacity={0.85} />
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
      plot: createPlotTexture(theme),
      skyscraper: createSkyscraperFacade(theme),
      villa: createVillaFacade(theme, false),
      founderVilla: createVillaFacade(theme, true),
      bungalow: createBungalowFacade(theme),
      roof: createRoofTileTexture(),
      sand: createSandTexture(theme),
      water: createWaterTexture(theme),
    };
  }, [theme]);

  useEffect(() => {
    return () => {
      Object.values(textures).forEach((tex) => tex?.dispose());
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
      camera={{ position: [0, 32, 36], fov: streetMode ? 56 : 44 }}
      className="h-full w-full touch-none"
    >
      <color attach="background" args={[bgHex]} />
      <fog attach="fog" args={[bgHex, 58, 140]} />

      <ambientLight intensity={theme === "day" ? 1.15 : 0.72} />
      <directionalLight
        position={[24, 38, 22]}
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
      <pointLight position={[0, 6, 0]} intensity={1.4} color="#EC4899" distance={35} />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.25, 0]}
        receiveShadow={!isMobile}
      >
        <planeGeometry args={[280, 280]} />
        <meshStandardMaterial
          map={textures.water}
          roughness={0.25}
          metalness={0.35}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <planeGeometry args={[52, 52]} />
        <meshBasicMaterial
          color={theme === "day" ? "#22D3EE" : "#0E7490"}
          transparent
          opacity={0.42}
        />
      </mesh>

      <mesh position={[0, -0.06, 0]} receiveShadow={!isMobile}>
        <boxGeometry args={[47.4, 0.24, 47.4]} />
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

      <PalmTrees3D castShadow={!isMobile} />
      <StaticWorldEnvironment
        roadTex={textures.road}
        plazaTex={textures.plaza}
        waterTex={textures.water}
        castShadow={!isMobile}
      />

      {/* Ostatní online hráči v 3D */}
      {remotePlayers.map((rp) => (
        <RemotePlayerEntity key={rp.id} player={rp} />
      ))}

      <InteractiveCitySimulation
        streetMode={streetMode}
        theme={theme}
        activeDonors={activeDonors}
        playerName={previewName.trim() ? formattedHandle : "@visitor"}
        playerSkin={playerSkin}
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