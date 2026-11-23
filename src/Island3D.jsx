import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";

const COLS = 40;
const ROWS = 40;
const TOTAL_PLOTS = COLS * ROWS;
const TILE_STEP = 1.12;

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

// 1. Mřížka 1 600 parcel vykreslená jedním InstancedMesh (60 FPS na mobilu i Macu)
function PlotsInstancedGrid({
  donorMap,
  selectedPlot,
  hoveredPlot,
  vipPlots,
  theme,
  onSelectPlot,
  onHoverPlot,
}) {
  const meshRef = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < TOTAL_PLOTS; i++) {
      const plotNum = i + 1;
      const { col, row, x, z } = plotToWorld(plotNum);
      const isAvenue = col === 19 || col === 20 || row === 19 || row === 20;
      const donor = donorMap.get(plotNum);
      const isSelected = selectedPlot === plotNum;
      const isHovered = hoveredPlot === plotNum;
      const isVip = Boolean(vipPlots[plotNum]);

      dummy.position.set(x, isAvenue ? 0.02 : 0.06, z);
      dummy.scale.set(1, isAvenue ? 0.5 : 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (isSelected) {
        color.set("#FBBF24");
      } else if (isHovered) {
        color.set("#38BDF8");
      } else if (donor) {
        color.set(theme === "day" ? "#10B981" : "#065F46");
      } else if (plotNum === 1) {
        color.set("#F59E0B");
      } else if (isVip) {
        color.set("#EC4899");
      } else if (isAvenue) {
        color.set(theme === "day" ? "#475569" : "#1E293B");
      } else {
        color.set(
          theme === "night"
            ? "#0F172A"
            : theme === "sunset"
              ? "#2E1065"
              : "#4ADE80"
        );
      }
      mesh.setColorAt(i, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [donorMap, dummy, color, hoveredPlot, selectedPlot, theme, vipPlots]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, TOTAL_PLOTS]}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta > 4) return; // Ignorovat při otáčení kamerou
        if (typeof e.instanceId === "number") {
          onSelectPlot(e.instanceId + 1);
        }
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        if (typeof e.instanceId === "number") {
          onHoverPlot(e.instanceId + 1);
        }
      }}
      onPointerOut={() => onHoverPlot(null)}
    >
      <boxGeometry args={[1.02, 0.12, 1.02]} />
      <meshStandardMaterial roughness={0.65} metalness={0.15} />
    </instancedMesh>
  );
}

// 2. Jednotlivá 3D budova ($1 Bungalov / $5 Vila s bazénem / $10+ Mrakodrap)
function Building3D({
  plotNum,
  amount,
  name,
  theme,
  isPreview = false,
  showLabel = false,
  isSelected = false,
}) {
  const groupRef = useRef(null);
  const beaconRef = useRef(null);
  const { x, z } = plotToWorld(plotNum);
  const isLit = theme === "night" || theme === "sunset";
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
      groupRef.current.position.y = 0.14 + Math.sin(t * 4) * 0.08;
    }
    if (beaconRef.current) {
      beaconRef.current.scale.setScalar(0.85 + Math.sin(t * 5 + plotNum) * 0.3);
    }
  });

  const labelHeight =
    tier === "skyscraper" ? (amount >= 20 ? 4.3 : 3.5) : tier === "villa" || tier === "founder" ? 1.8 : 1.25;

  return (
    <group ref={groupRef} position={[x, 0.12, z]}>
      {/* $1 Plážový bungalov */}
      {tier === "bungalow" && (
        <group>
          <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.72, 0.56, 0.72]} />
            <meshStandardMaterial
              color="#0284C7"
              transparent={isPreview}
              opacity={isPreview ? 0.85 : 1}
            />
          </mesh>
          {/* Růžová střecha */}
          <mesh position={[0, 0.68, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.62, 0.34, 4]} />
            <meshStandardMaterial color="#F472B6" />
          </mesh>
          {/* Svítící okno */}
          <mesh position={[0, 0.3, 0.37]}>
            <planeGeometry args={[0.26, 0.2]} />
            <meshBasicMaterial color={isLit ? "#FEF08A" : "#BAE6FD"} />
          </mesh>
        </group>
      )}

      {/* $5 Luxusní vila s bazénem (nebo zlatá #0001 Founder Villa) */}
      {(tier === "villa" || tier === "founder") && (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.84, 0.9, 0.84]} />
            <meshStandardMaterial
              color={isFounder ? "#FACC15" : "#F8FAFC"}
              transparent={isPreview}
              opacity={isPreview ? 0.85 : 1}
            />
          </mesh>
          {/* Neonový lem terasy */}
          <mesh position={[0, 0.93, 0]} castShadow>
            <boxGeometry args={[0.9, 0.08, 0.9]} />
            <meshStandardMaterial
              color={isFounder ? "#F59E0B" : "#EC4899"}
              emissive={isFounder ? "#F59E0B" : "#EC4899"}
              emissiveIntensity={isLit ? 0.6 : 0.1}
            />
          </mesh>
          {/* Tyrkysový střešní bazén */}
          <mesh position={[0, 0.98, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.56, 0.56]} />
            <meshBasicMaterial color="#22D3EE" />
          </mesh>
          {/* Okna */}
          <mesh position={[0, 0.48, 0.43]}>
            <planeGeometry args={[0.52, 0.26]} />
            <meshBasicMaterial color={isLit ? "#38BDF8" : "#0F172A"} />
          </mesh>
        </group>
      )}

      {/* $10+ Neonový mrakodrap s heliportem */}
      {tier === "skyscraper" && (
        <group>
          {(() => {
            const h = amount >= 20 ? 3.5 : 2.7;
            return (
              <>
                <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
                  <boxGeometry args={[0.86, h, 0.86]} />
                  <meshStandardMaterial
                    color={theme === "day" ? "#2563EB" : "#1E1B4B"}
                    metalness={0.55}
                    roughness={0.25}
                    transparent={isPreview}
                    opacity={isPreview ? 0.85 : 1}
                  />
                </mesh>
                {/* Neonové svislé hrany */}
                <mesh position={[0.44, h / 2, 0.44]}>
                  <boxGeometry args={[0.04, h, 0.04]} />
                  <meshBasicMaterial color="#22D3EE" />
                </mesh>
                <mesh position={[-0.44, h / 2, 0.44]}>
                  <boxGeometry args={[0.04, h, 0.04]} />
                  <meshBasicMaterial color="#F472B6" />
                </mesh>
                {/* Svítící okna */}
                {isLit && (
                  <mesh position={[0, h / 2, 0.44]}>
                    <planeGeometry args={[0.54, h * 0.78]} />
                    <meshBasicMaterial
                      color={theme === "sunset" ? "#F472B6" : "#FDE047"}
                    />
                  </mesh>
                )}
                {/* Střešní heliport */}
                <mesh position={[0, h + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.18, 0.28, 24]} />
                  <meshBasicMaterial color="#10B981" />
                </mesh>
                {/* Blikající maják */}
                <mesh ref={beaconRef} position={[0, h + 0.24, 0]}>
                  <sphereGeometry args={[0.09, 12, 12]} />
                  <meshBasicMaterial color="#F472B6" />
                </mesh>
              </>
            );
          })()}
        </group>
      )}

      {/* Plovoucí 3D jmenovka nad budovou */}
      {showLabel && (
        <Html position={[0, labelHeight, 0]} center distanceFactor={22}>
          <div
            className={`whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-black shadow-lg border ${
              isSelected || isPreview
                ? "bg-slate-950/95 text-amber-200 border-amber-400"
                : "bg-slate-950/90 text-white border-cyan-400/80"
            }`}
          >
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

// 3. 3D Palmy kolem ostrova
function PalmTrees3D() {
  const trees = useMemo(() => {
    const arr = [];
    const edge = (COLS / 2) * TILE_STEP + 0.8;
    for (let i = -edge + 2; i <= edge - 2; i += 3.6) {
      arr.push([i, -edge], [i, edge], [-edge, i], [edge, i]);
    }
    arr.push([-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]);
    return arr;
  }, []);

  return (
    <group>
      {trees.map(([tx, tz], idx) => (
        <group key={idx} position={[tx, 0.05, tz]}>
          <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.11, 1.3, 6]} />
            <meshStandardMaterial color="#78350F" />
          </mesh>
          {[0, 1.25, 2.5, 3.75, 5.0].map((rot, fIdx) => (
            <mesh
              key={fIdx}
              position={[Math.cos(rot) * 0.35, 1.28, Math.sin(rot) * 0.35]}
              rotation={[0.35, -rot, 0]}
              castShadow
            >
              <boxGeometry args={[0.75, 0.04, 0.22]} />
              <meshStandardMaterial color="#10B981" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// 4. Živý provoz (3D auta se světly + motorové čluny na oceánu + centrální fontána)
function LivingWorld3D({ theme }) {
  const carsRef = useRef([]);
  const boatsRef = useRef([]);
  const fountainRingRef = useRef(null);
  const isLit = theme === "night" || theme === "sunset";

  const cars = useMemo(
    () => [
      { axis: "x", dir: 1, lane: 0.45, speed: 5.5, offset: 0, color: "#F472B6" },
      { axis: "x", dir: 1, lane: 0.45, speed: 4.8, offset: 22, color: "#FACC15" },
      { axis: "x", dir: -1, lane: -0.45, speed: 5.8, offset: 11, color: "#38BDF8" },
      { axis: "z", dir: 1, lane: -0.45, speed: 5.2, offset: 6, color: "#A855F7" },
      { axis: "z", dir: -1, lane: 0.45, speed: 5.6, offset: 18, color: "#10B981" },
    ],
    []
  );

  const boats = useMemo(
    () => [
      { radius: 28, speed: 0.22, offset: 0, color: "#EC4899" },
      { radius: 31, speed: -0.18, offset: 2.1, color: "#06B6D4" },
      { radius: 29.5, speed: 0.2, offset: 4.2, color: "#F59E0B" },
    ],
    []
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const limit = (COLS / 2) * TILE_STEP;

    cars.forEach((c, idx) => {
      const mesh = carsRef.current[idx];
      if (!mesh) return;
      const span = limit * 2;
      const raw = ((t * c.speed + c.offset) % span) - limit;
      const pos = raw * c.dir;

      if (c.axis === "x") {
        mesh.position.set(pos, 0.2, c.lane);
        mesh.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        mesh.position.set(c.lane, 0.2, pos);
        mesh.rotation.y = c.dir > 0 ? 0 : Math.PI;
      }
    });

    boats.forEach((b, idx) => {
      const mesh = boatsRef.current[idx];
      if (!mesh) return;
      const angle = t * b.speed + b.offset;
      mesh.position.set(Math.cos(angle) * b.radius, -0.08, Math.sin(angle) * b.radius);
      mesh.rotation.y = -angle + (b.speed > 0 ? 0 : Math.PI);
    });

    if (fountainRingRef.current) {
      const s = 0.6 + ((t * 0.8) % 0.8);
      fountainRingRef.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      {/* Centrální neonová fontána na náměstí */}
      <group position={[0, 0.08, 0]}>
        <mesh>
          <cylinderGeometry args={[1.05, 1.15, 0.18, 24]} />
          <meshStandardMaterial color="#1E1B4B" />
        </mesh>
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.9, 24]} />
          <meshBasicMaterial color="#22D3EE" />
        </mesh>
        <mesh
          ref={fountainRingRef}
          position={[0, 0.12, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.45, 0.58, 24]} />
          <meshBasicMaterial color="#F472B6" />
        </mesh>
      </group>

      {/* 3D Auta na hlavní třídě */}
      {cars.map((c, idx) => (
        <group
          key={idx}
          ref={(el) => {
            carsRef.current[idx] = el;
          }}
        >
          <mesh castShadow>
            <boxGeometry args={[0.34, 0.16, 0.62]} />
            <meshStandardMaterial color={c.color} />
          </mesh>
          <mesh position={[0, 0.12, -0.04]}>
            <boxGeometry args={[0.28, 0.12, 0.34]} />
            <meshStandardMaterial color="#F8FAFC" />
          </mesh>
          {/* Přední světla */}
          {isLit && (
            <mesh position={[0, 0, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.42, 0.7]} />
              <meshBasicMaterial color="#FEF08A" transparent opacity={0.35} />
            </mesh>
          )}
        </group>
      ))}

      {/* 3D Jachty na oceánu */}
      {boats.map((b, idx) => (
        <group
          key={idx}
          ref={(el) => {
            boatsRef.current[idx] = el;
          }}
        >
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.22, 1.5]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[0, 0.14, -0.1]}>
            <boxGeometry args={[0.4, 0.14, 0.8]} />
            <meshStandardMaterial color={b.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// 5. Plynulý 3D přelet kamery při kliknutí na radar, žebříček nebo vyhledávání
function CameraController({ focusSignal, selectedPlot, resetSignal }) {
  const controlsRef = useRef(null);
  const flyRef = useRef(null);
  const { camera } = useThree();

  useEffect(() => {
    if (focusSignal === 0) return;
    const { x, z } = plotToWorld(selectedPlot);
    flyRef.current = {
      target: new THREE.Vector3(x, 0.5, z),
      pos: new THREE.Vector3(x + 9, 10, z + 11),
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
      minDistance={5}
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
  vipPlots,
  theme,
  previewAmount,
  previewName,
  formattedHandle,
  focusSignal,
  resetSignal,
  onSelectPlot,
  onHoverPlot,
}) {
  const bgHex =
    theme === "night" ? "#050814" : theme === "sunset" ? "#2E1065" : "#0284C7";
  const waterHex =
    theme === "night" ? "#08182E" : theme === "sunset" ? "#581C87" : "#0EA5E9";
  const sandHex =
    theme === "night" ? "#312E81" : theme === "sunset" ? "#F59E0B" : "#FDE68A";

  const selectedDonor = donorMap.get(selectedPlot);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 32, 36], fov: 44 }}
      className="h-full w-full"
    >
      <color attach="background" args={[bgHex]} />
      <fog attach="fog" args={[bgHex, 55, 135]} />

      {/* Osvětlení scény podle denní doby */}
      <ambientLight intensity={theme === "day" ? 1.1 : 0.65} />
      <directionalLight
        position={[24, 38, 22]}
        intensity={theme === "day" ? 1.8 : theme === "sunset" ? 1.5 : 1.1}
        color={
          theme === "sunset"
            ? "#FB923C"
            : theme === "night"
              ? "#93C5FD"
              : "#FFFFFF"
        }
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 6, 0]} intensity={1.4} color="#EC4899" distance={35} />

      {/* Nekonečný oceán + tyrkysový útes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]} receiveShadow>
        <planeGeometry args={[280, 280]} />
        <meshStandardMaterial color={waterHex} roughness={0.25} metalness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <planeGeometry args={[52, 52]} />
        <meshBasicMaterial
          color={theme === "day" ? "#22D3EE" : "#0E7490"}
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* Písečný podklad ostrova */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[47.2, 0.24, 47.2]} />
        <meshStandardMaterial color={sandHex} roughness={0.85} />
      </mesh>

      {/* 1 600 3D parcel */}
      <PlotsInstancedGrid
        donorMap={donorMap}
        selectedPlot={selectedPlot}
        hoveredPlot={hoveredPlot}
        vipPlots={vipPlots}
        theme={theme}
        onSelectPlot={onSelectPlot}
        onHoverPlot={onHoverPlot}
      />

      {/* Skutečné 3D budovy dárců */}
      {activeDonors.map((d) => (
        <Building3D
          key={d.plot}
          plotNum={d.plot}
          amount={d.amount}
          name={d.name}
          theme={theme}
          isSelected={selectedPlot === d.plot}
          showLabel={
            selectedPlot === d.plot ||
            hoveredPlot === d.plot ||
            activeDonors.length <= 30
          }
        />
      ))}

      {/* Živý 3D náhled vlastního domu nanečisto na vybrané prázdné parcele */}
      {!selectedDonor && (
        <Building3D
          plotNum={selectedPlot}
          amount={previewAmount}
          name={
            previewName.trim()
              ? `${formattedHandle} (PREVIEW)`
              : `YOUR PLOT #${String(selectedPlot).padStart(4, "0")}`
          }
          theme={theme}
          isPreview
          isSelected
          showLabel
        />
      )}

      <PalmTrees3D />
      <LivingWorld3D theme={theme} />

      <CameraController
        focusSignal={focusSignal}
        selectedPlot={selectedPlot}
        resetSignal={resetSignal}
      />
    </Canvas>
  );
}