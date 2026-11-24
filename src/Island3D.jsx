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

// 1. Otexturovaná mřížka 1 600 parcel (InstancedMesh optimalizovaný i pro mobily)
function PlotsInstancedGrid({
  donorMap,
  selectedPlot,
  hoveredPlot,
  vipPlots = DEFAULT_VIP_PLOTS,
  theme,
  plotTexture,
  isMobile,
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

    // Zajistí existenci bufferu barev hned při prvním vykreslení
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
      const isHovered = !isMobile && hoveredPlot === plotNum;
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
  }, [donorMap, dummy, color, hoveredPlot, isMobile, selectedPlot, theme, vipPlots]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, TOTAL_PLOTS]}
      receiveShadow={!isMobile}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta > 4) return;
        if (typeof e.instanceId === "number") {
          onSelectPlot(e.instanceId + 1);
        }
      }}
      onPointerMove={
        isMobile
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
        isMobile
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

// 2. Detailní 3D budovy s otexturovanými fasádami
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
      {/* $1 Plážový bungalov */}
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

      {/* $5 Art Deco Vila se střešním bazénem */}
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

      {/* $10+ Skleněný mrakodrap */}
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

// 4. Souvislé asfaltové bulváry + fontána + auta + jachty + animovaný oceán
function LivingWorld3D({ theme, roadTex, plazaTex, waterTex, castShadow = true }) {
  const carsRef = useRef([]);
  const boatsRef = useRef([]);
  const fountainRingRef = useRef(null);
  const isLit = theme === "night" || theme === "sunset";

  const islandSpan = COLS * TILE_STEP;

  const cars = useMemo(
    () => [
      { axis: "x", dir: 1, lane: 0.46, speed: 5.5, offset: 0, color: "#F472B6" },
      { axis: "x", dir: 1, lane: 0.46, speed: 4.8, offset: 22, color: "#FACC15" },
      { axis: "x", dir: -1, lane: -0.46, speed: 5.8, offset: 11, color: "#38BDF8" },
      { axis: "z", dir: 1, lane: -0.46, speed: 5.2, offset: 6, color: "#A855F7" },
      { axis: "z", dir: -1, lane: 0.46, speed: 5.6, offset: 18, color: "#10B981" },
    ],
    []
  );

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
    const limit = islandSpan / 2;

    if (waterTex) {
      waterTex.offset.x += delta * 0.025;
      waterTex.offset.y += delta * 0.015;
    }

    cars.forEach((c, idx) => {
      const mesh = carsRef.current[idx];
      if (!mesh) return;
      const span = limit * 2;
      const raw = ((t * c.speed + c.offset) % span) - limit;
      const pos = raw * c.dir;

      if (c.axis === "x") {
        mesh.position.set(pos, 0.16, c.lane);
        mesh.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        mesh.position.set(c.lane, 0.16, pos);
        mesh.rotation.y = c.dir > 0 ? 0 : Math.PI;
      }
    });

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

      {cars.map((c, idx) => (
        <group
          key={idx}
          ref={(el) => {
            carsRef.current[idx] = el;
          }}
        >
          <mesh castShadow={castShadow}>
            <boxGeometry args={[0.34, 0.15, 0.64]} />
            <meshStandardMaterial color={c.color} metalness={0.4} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.11, -0.04]}>
            <boxGeometry args={[0.28, 0.11, 0.34]} />
            <meshStandardMaterial color="#0F172A" metalness={0.8} roughness={0.1} />
          </mesh>
          {isLit && (
            <mesh position={[0, 0, 0.58]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.44, 0.72]} />
              <meshBasicMaterial color="#FEF08A" transparent opacity={0.38} />
            </mesh>
          )}
        </group>
      ))}

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

// 5. Plynulý 3D přelet kamery
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
  onSelectPlot,
  onHoverPlot,
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
      camera={{ position: [0, 32, 36], fov: 44 }}
      className="h-full w-full"
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

      {/* Nekonečný oceán s animovanou texturou vln */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]} receiveShadow={!isMobile}>
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

      {/* Písečný podklad ostrova */}
      <mesh position={[0, -0.06, 0]} receiveShadow={!isMobile}>
        <boxGeometry args={[47.4, 0.24, 47.4]} />
        <meshStandardMaterial map={textures.sand} roughness={0.85} />
      </mesh>

      {/* 1 600 otexturovaných 3D parcel */}
      <PlotsInstancedGrid
        donorMap={donorMap}
        selectedPlot={selectedPlot}
        hoveredPlot={hoveredPlot}
        vipPlots={vipPlots}
        theme={theme}
        plotTexture={textures.plot}
        isMobile={isMobile}
        onSelectPlot={onSelectPlot}
        onHoverPlot={onHoverPlot}
      />

      {/* Otexturované 3D budovy dárců */}
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
            selectedPlot === d.plot ||
            (!isMobile && hoveredPlot === d.plot) ||
            activeDonors.length <= 15
          }
        />
      ))}

      {/* Živý 3D náhled vlastního domu nanečisto */}
      {!selectedDonor && (
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
      <LivingWorld3D
        theme={theme}
        roadTex={textures.road}
        plazaTex={textures.plaza}
        waterTex={textures.water}
        castShadow={!isMobile}
      />

      <CameraController
        focusSignal={focusSignal}
        selectedPlot={selectedPlot}
        resetSignal={resetSignal}
      />
    </Canvas>
  );
}