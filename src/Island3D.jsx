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

const INITIAL_STREET_CARS = [
  { id: 0, axis: "x", dir: 1, lane: 0.46, baseSpeed: 5.2, offset: 0, color: "#F472B6" },
  { id: 1, axis: "x", dir: 1, lane: 0.46, baseSpeed: 4.5, offset: 22, color: "#FACC15" },
  { id: 2, axis: "x", dir: -1, lane: -0.46, baseSpeed: 5.5, offset: 11, color: "#38BDF8" },
  { id: 3, axis: "z", dir: 1, lane: -0.46, baseSpeed: 4.9, offset: 6, color: "#A855F7" },
  { id: 4, axis: "z", dir: -1, lane: 0.46, baseSpeed: 5.3, offset: 18, color: "#10B981" },
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
function StaticWorldEnvironment({ theme, roadTex, plazaTex, waterTex, castShadow = true }) {
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

// 6. Kompletní GTA simulace: 5 kraditelných aut + Vice Coiny + 3D postava
function InteractiveCitySimulation({
  streetMode,
  theme,
  activeDonors,
  playerName,
  playerInputRef,
  castShadow = true,
  onNearbyPlotChange,
  onPlayerPosChange,
  onVehicleStateChange,
  onCoinCollect,
  onPlaySfx,
}) {
  const { camera, gl } = useThree();
  const isLit = theme === "night" || theme === "sunset";
  const limit = (COLS * TILE_STEP) / 2;

  // Refy na 3D skupiny aut a mincí
  const carMeshesRef = useRef([]);
  const carNeonMeshesRef = useRef([]);
  const coinMeshesRef = useRef([]);

  // Stav všech 5 aut na ostrově
  const carsStateRef = useRef(
    INITIAL_STREET_CARS.map((c) => {
      const startPos = -limit + c.offset;
      return {
        ...c,
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
        hijacked: false,
      };
    })
  );

  // Stav 25 sběratelných Vice Coinů
  const coinsStateRef = useRef(
    COIN_SPOTS.map(([cx, cz], idx) => ({
      id: idx,
      x: cx,
      z: cz,
      respawnTimer: 0,
    }))
  );

  // Stav hráče (pěšky nebo v autě)
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
  const nearbyCarIdRef = useRef(null);
  const lastReportedVehicleRef = useRef("");

  const keysRef = useRef({});
  const dragRef = useRef({ active: false, x: 0, y: 0 });
  const walkCycleRef = useRef(0);
  const lastNearbyPlotRef = useRef(null);
  const uiTickRef = useRef(0);
  const hornCooldownRef = useRef(0);

  // Kolizní boxy všech budov
  const buildingColliders = useMemo(() => {
    return activeDonors.map((d) => {
      const { x, z } = plotToWorld(d.plot);
      return { x, z, half: 0.48 };
    });
  }, [activeDonors]);

  // Funkce pro nastoupení / vystoupení z auta (volá klávesa E/F i tlačítko v App.jsx)
  const toggleVehicleAction = useMemo(() => {
    return () => {
      if (!streetMode) return;

      // Vystoupení z auta
      if (inCarIdRef.current !== null) {
        const car = carsStateRef.current.find((c) => c.id === inCarIdRef.current);
        if (car) {
          car.speed = 0;
          // Hráč vystoupí vlevo vedle dveří řidiče
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

      // Nastoupení do nejbližšího auta
      if (nearbyCarIdRef.current !== null) {
        const car = carsStateRef.current.find((c) => c.id === nearbyCarIdRef.current);
        if (car) {
          car.hijacked = true;
          car.speed = 0;
          inCarIdRef.current = car.id;
          // Natočíme kameru za záď ukradeného auta
          camYawRef.current = car.yaw + Math.PI;
          onPlaySfx?.("build");
        }
      }
    };
  }, [onPlaySfx, streetMode]);

  // Propojení s tlačítky v App.jsx
  useEffect(() => {
    if (playerInputRef?.current) {
      playerInputRef.current.toggleVehicle = toggleVehicleAction;
    }
  }, [playerInputRef, toggleVehicleAction]);

  // Při vypnutí Street Mode automaticky vystoupíme z auta
  useEffect(() => {
    if (!streetMode && inCarIdRef.current !== null) {
      const car = carsStateRef.current.find((c) => c.id === inCarIdRef.current);
      if (car) car.speed = 0;
      inCarIdRef.current = null;
      onVehicleStateChange?.({ inCar: false, canEnter: false, carColor: null, speedKmh: 0 });
    }
  }, [onVehicleStateChange, streetMode]);

  // Klávesnice
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

  // Rozhlížení myší / prstem ve Street Mode
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
      horn: false,
    };

    if (hornCooldownRef.current > 0) {
      hornCooldownRef.current -= dt;
    }

    // 1. Pohyb všech 5 aut (AI provoz + auto řízené hráčem)
    const cars = carsStateRef.current;
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      const mesh = carMeshesRef.current[i];

      if (inCarIdRef.current === c.id && streetMode) {
        // Auto řízené hráčem
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

        const maxForward = 15.5;
        const maxReverse = -6.0;

        if (throttle > 0.05) {
          c.speed += throttle * 16.5 * dt;
        } else if (throttle < -0.05) {
          c.speed += throttle * 18.0 * dt;
        } else {
          // Přirozené brzdění motorem
          c.speed *= Math.pow(0.16, dt);
          if (Math.abs(c.speed) < 0.08) c.speed = 0;
        }

        if (isDrifting) {
          c.speed *= Math.pow(0.45, dt);
        }

        c.speed = Math.max(maxReverse, Math.min(maxForward, c.speed));

        // Zatáčení (silnější při driftu, obrácené při couvání)
        if (Math.abs(c.speed) > 0.25 && Math.abs(steer) > 0.05) {
          const dirSign = c.speed >= 0 ? 1 : -1;
          const turnRate = isDrifting ? 3.35 : 2.55;
          const speedFactor = Math.min(1, Math.abs(c.speed) / 3.5);
          c.yaw -= steer * turnRate * speedFactor * dirSign * dt;
        }

        c.x += Math.sin(c.yaw) * c.speed * dt;
        c.z += Math.cos(c.yaw) * c.speed * dt;

        // Kolize auta s okrajem ostrova
        const maxCarBound = 22.9;
        if (Math.abs(c.x) > maxCarBound) {
          c.x = Math.sign(c.x) * maxCarBound;
          c.speed *= 0.5;
        }
        if (Math.abs(c.z) > maxCarBound) {
          c.z = Math.sign(c.z) * maxCarBound;
          c.speed *= 0.5;
        }

        // Kolize auta s centrální fontánou
        const fDist = Math.hypot(c.x, c.z);
        const minFountainCar = 1.48;
        if (fDist < minFountainCar && fDist > 0.001) {
          const push = (minFountainCar - fDist) / fDist;
          c.x += c.x * push;
          c.z += c.z * push;
          c.speed *= 0.65;
        }

        // Kolize auta s 3D budovami dárců
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

        // Neonové podsvícení při driftu
        const neonMesh = carNeonMeshesRef.current[i];
        if (neonMesh) {
          neonMesh.visible = isDrifting && Math.abs(c.speed) > 2.5;
        }

        // Synchronizace pozice hráče s autem
        posRef.current.set(c.x, 0.14, c.z);
        facingYawRef.current = c.yaw;

        // Kamera plynule sleduje auto (pokud hráč zrovna netáhne myší)
        if (!dragRef.current.active && c.speed > 1.2) {
          const targetCamYaw = c.yaw + Math.PI;
          let yawDiff = targetCamYaw - camYawRef.current;
          while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
          while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
          camYawRef.current += yawDiff * Math.min(1, dt * 3.2);
        }
      } else if (!c.hijacked) {
        // AI jízda po hlavním bulváru
        const distToPlayer = streetMode
          ? Math.hypot(c.x - posRef.current.x, c.z - posRef.current.z)
          : 99;
        // AI auto přibrzdí, když hráč stojí přímo u něj, aby šlo snadno ukrást
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

    // 2. Rotace a sbírání Vice Coinů
    const coins = coinsStateRef.current;
    const pickupRadius = inCarIdRef.current !== null ? 0.92 : 0.65;

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

      if (streetMode) {
        const d = Math.hypot(coin.x - posRef.current.x, coin.z - posRef.current.z);
        if (d < pickupRadius) {
          coin.respawnTimer = 11;
          if (mesh) mesh.visible = false;
          onCoinCollect?.();
          onPlaySfx?.("coin");
        }
      }
    }

    // 3. Pohyb hráče pěšky + kamera ve Street Mode
    if (!streetMode) return;

    const pos = posRef.current;
    const isInCar = inCarIdRef.current !== null;

    if (playerGroupRef.current) {
      playerGroupRef.current.visible = !isInCar;
    }

    if (!isInCar) {
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

      // Skok a gravitace
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

      // Hranice ostrova
      const maxIsland = 23.2;
      pos.x = Math.max(-maxIsland, Math.min(maxIsland, pos.x));
      pos.z = Math.max(-maxIsland, Math.min(maxIsland, pos.z));

      // Kolize s fontánou
      const fountainDist = Math.hypot(pos.x, pos.z);
      const minFountainDist = 1.28;
      if (fountainDist < minFountainDist && fountainDist > 0.001) {
        const push = (minFountainDist - fountainDist) / fountainDist;
        pos.x += pos.x * push;
        pos.z += pos.z * push;
      }

      // Kolize s budovami
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

      // Animace postavy
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

      // Kontrola nejbližšího auta pro nastoupení
      let closestId = null;
      let closestDist = 1.95;
      for (let i = 0; i < cars.length; i++) {
        const d = Math.hypot(cars[i].x - pos.x, cars[i].z - pos.z);
        if (d < closestDist) {
          closestDist = d;
          closestId = cars[i].id;
        }
      }
      nearbyCarIdRef.current = closestId;
    }

    // Kamera z pohledu 3. osoby (o kousek dál, když sedíš v autě)
    const activeCar = isInCar
      ? cars.find((c) => c.id === inCarIdRef.current)
      : null;
    const speedBoostDist = activeCar ? Math.abs(activeCar.speed) * 0.08 : 0;
    const camDist = (isInCar ? 5.1 : 4.4) + speedBoostDist;
    const camHeight = (isInCar ? 1.85 : 1.65) + Math.sin(camPitchRef.current) * 2.5;
    const horizDist = Math.cos(camPitchRef.current) * camDist;

    const desiredCamPos = new THREE.Vector3(
      pos.x + Math.sin(camYawRef.current) * horizDist,
      pos.y + camHeight,
      pos.z + Math.cos(camYawRef.current) * horizDist
    );
    camera.position.lerp(desiredCamPos, Math.min(1, dt * 12));
    camera.lookAt(pos.x, pos.y + (isInCar ? 0.55 : 0.72), pos.z);

    // Detekce parcely před hráčem/autem
    const probeDist = isInCar ? 1.3 : 0.85;
    const probeX = pos.x + Math.sin(facingYawRef.current) * probeDist;
    const probeZ = pos.z + Math.cos(facingYawRef.current) * probeDist;
    const nearbyPlot = worldToPlot(probeX, probeZ);
    if (nearbyPlot && nearbyPlot !== lastNearbyPlotRef.current) {
      lastNearbyPlotRef.current = nearbyPlot;
      onNearbyPlotChange(nearbyPlot);
    }

    // Aktualizace UI radaru a stavu vozidla (~10x za sekundu)
    uiTickRef.current += dt;
    if (uiTickRef.current >= 0.1) {
      uiTickRef.current = 0;
      onPlayerPosChange({ x: pos.x, z: pos.z });

      const nearCar =
        nearbyCarIdRef.current !== null
          ? cars.find((c) => c.id === nearbyCarIdRef.current)
          : null;
      const speedKmh = activeCar ? Math.round(Math.abs(activeCar.speed) * 9.5) : 0;
      const signature = `${isInCar}-${nearCar?.id ?? "none"}-${speedKmh}`;

      if (signature !== lastReportedVehicleRef.current) {
        lastReportedVehicleRef.current = signature;
        onVehicleStateChange?.({
          inCar: isInCar,
          canEnter: !isInCar && nearCar !== null,
          carColor: activeCar?.color || nearCar?.color || null,
          speedKmh,
        });
      }
    }
  });

  return (
    <group>
      {/* 5 kraditelných 3D aut na ulicích */}
      {INITIAL_STREET_CARS.map((c, idx) => (
        <group
          key={c.id}
          ref={(el) => {
            carMeshesRef.current[idx] = el;
          }}
        >
          {/* Karoserie */}
          <mesh castShadow={castShadow}>
            <boxGeometry args={[0.38, 0.16, 0.72]} />
            <meshStandardMaterial color={c.color} metalness={0.45} roughness={0.28} />
          </mesh>
          {/* Kabina */}
          <mesh position={[0, 0.12, -0.04]}>
            <boxGeometry args={[0.31, 0.12, 0.38]} />
            <meshStandardMaterial color="#0F172A" metalness={0.85} roughness={0.1} />
          </mesh>
          {/* Zadní neonový spoiler */}
          <mesh position={[0, 0.12, -0.34]}>
            <boxGeometry args={[0.38, 0.04, 0.06]} />
            <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.6} />
          </mesh>
          {/* Přední světla v noci/západu slunce */}
          {isLit && (
            <mesh position={[0, -0.02, 0.65]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.48, 0.85]} />
              <meshBasicMaterial color="#FEF08A" transparent opacity={0.36} />
            </mesh>
          )}
          {/* Drift neon pod podvozkem */}
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

      {/* 25 rotujících Vice Coinů po městě */}
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

      {/* Hratelná 3D postava (zobrazí se v Street Mode mimo auto) */}
      {streetMode && (
        <group ref={playerGroupRef} position={[0, 0.14, 3.6]}>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.3, 24]} />
            <meshBasicMaterial color="#22D3EE" transparent opacity={0.85} />
          </mesh>

          <group ref={leftLegRef} position={[-0.085, 0.34, 0]}>
            <mesh position={[0, -0.15, 0]} castShadow={castShadow}>
              <boxGeometry args={[0.11, 0.28, 0.12]} />
              <meshStandardMaterial color="#1D4ED8" roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.31, 0.02]}>
              <boxGeometry args={[0.115, 0.07, 0.16]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
            </mesh>
          </group>

          <group ref={rightLegRef} position={[0.085, 0.34, 0]}>
            <mesh position={[0, -0.15, 0]} castShadow={castShadow}>
              <boxGeometry args={[0.11, 0.28, 0.12]} />
              <meshStandardMaterial color="#1D4ED8" roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.31, 0.02]}>
              <boxGeometry args={[0.115, 0.07, 0.16]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.4} />
            </mesh>
          </group>

          <mesh position={[0, 0.52, 0]} castShadow={castShadow}>
            <boxGeometry args={[0.3, 0.34, 0.17]} />
            <meshStandardMaterial color="#06B6D4" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.52, 0.088]}>
            <boxGeometry args={[0.24, 0.22, 0.01]} />
            <meshStandardMaterial color="#F472B6" roughness={0.5} />
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
              <meshStandardMaterial color="#1E1B4B" roughness={0.8} />
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
  playerInputRef,
  onSelectPlot,
  onHoverPlot,
  onPlayerPosChange,
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
        theme={theme}
        roadTex={textures.road}
        plazaTex={textures.plaza}
        waterTex={textures.water}
        castShadow={!isMobile}
      />

      <InteractiveCitySimulation
        streetMode={streetMode}
        theme={theme}
        activeDonors={activeDonors}
        playerName={previewName.trim() ? formattedHandle : "@visitor"}
        playerInputRef={playerInputRef}
        castShadow={!isMobile}
        onNearbyPlotChange={onSelectPlot}
        onPlayerPosChange={onPlayerPosChange}
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