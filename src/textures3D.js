import * as THREE from "three";

function makeCanvas(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext("2d") };
}

function finalizeTexture(canvas, repeatX = 1, repeatY = 1, isColor = true) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

// 1. Asfaltová dvouproudá silnice s chodníky a žlutou čárou
export function createAsphaltRoadTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);

  // Chodníky po stranách
  ctx.fillStyle = "#64748B";
  ctx.fillRect(0, 0, 512, 512);

  // Obrubníky
  ctx.fillStyle = "#94A3B8";
  ctx.fillRect(54, 0, 10, 512);
  ctx.fillRect(448, 0, 10, 512);

  // Tmavý asfalt
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(64, 0, 384, 512);

  // Jemná zrnitost asfaltu
  for (let i = 0; i < 4500; i++) {
    const x = 64 + Math.random() * 384;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.16)";
    ctx.fillRect(x, y, 2, 2);
  }

  // Krajní bílé čáry
  ctx.fillStyle = "rgba(248, 250, 252, 0.75)";
  ctx.fillRect(78, 0, 5, 512);
  ctx.fillRect(429, 0, 5, 512);

  // Přerušovaná dvojitá žlutá středová čára
  ctx.fillStyle = "#FACC15";
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(249, y, 5, 36);
    ctx.fillRect(258, y, 5, 36);
  }

  return finalizeTexture(canvas, 1, 18, true);
}

// 2. Dlažba centrálního náměstí Art Deco
export function createPlazaTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);

  ctx.fillStyle = "#1E293B";
  ctx.fillRect(0, 0, 512, 512);

  // Radiální paprsky a soustředné kruhy dlažby
  const cx = 256;
  const cy = 256;
  const rings = [240, 205, 165, 125];
  rings.forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = idx % 2 === 0 ? "#334155" : "#1E293B";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = idx === 0 ? "#F472B6" : "rgba(56, 189, 248, 0.45)";
    ctx.stroke();
  });

  // Bílé přechody pro chodce na 4 vjezdech
  ctx.fillStyle = "rgba(248, 250, 252, 0.85)";
  for (let offset = -55; offset <= 55; offset += 22) {
    ctx.fillRect(cx + offset - 6, 12, 12, 34);
    ctx.fillRect(cx + offset - 6, 466, 12, 34);
    ctx.fillRect(12, cy + offset - 6, 34, 12);
    ctx.fillRect(466, cy + offset - 6, 34, 12);
  }

  return finalizeTexture(canvas, 1, 1, true);
}

// 3. Textura parcely (trávník / dlážděný pozemek s obrubníkem)
export function createPlotTexture(theme) {
  const { canvas, ctx } = makeCanvas(256, 256);

  if (theme === "day") {
    ctx.fillStyle = "#22C55E";
  } else if (theme === "sunset") {
    ctx.fillStyle = "#2E1065";
  } else {
    ctx.fillStyle = "#0F172A";
  }
  ctx.fillRect(0, 0, 256, 256);

  // Jemná textura trávníku / dlaždic
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle =
      theme === "day"
        ? "rgba(255,255,255,0.08)"
        : "rgba(56, 189, 248, 0.05)";
    ctx.fillRect(x, y, 3, 3);
  }

  // Obrubník kolem pozemku
  ctx.strokeStyle =
    theme === "day"
      ? "rgba(255, 255, 255, 0.45)"
      : theme === "sunset"
        ? "rgba(244, 114, 182, 0.38)"
        : "rgba(56, 189, 248, 0.28)";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 246);

  return finalizeTexture(canvas, 1, 1, true);
}

// 4. Skleněná fasáda mrakodrapu ($10+) se stovkami kancelářských oken
export function createSkyscraperFacade(theme) {
  const { canvas, ctx } = makeCanvas(256, 512);
  const isLit = theme === "night" || theme === "sunset";

  // Ocelový rám fasády
  ctx.fillStyle = theme === "day" ? "#1E3A8A" : "#090D16";
  ctx.fillRect(0, 0, 256, 512);

  const cols = 8;
  const rows = 22;
  const padX = 14;
  const padY = 14;
  const cellW = (256 - padX * 2) / cols;
  const cellH = (512 - padY * 2) / rows;

  // Deterministický generátor pro přirozené rozsvícení kanceláří
  let seed = 137;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = padX + c * cellW + 3;
      const wy = padY + r * cellH + 3;
      const ww = cellW - 6;
      const wh = cellH - 5;

      const v = rand();
      if (!isLit) {
        ctx.fillStyle = v > 0.5 ? "#38BDF8" : "#0284C7";
      } else if (v > 0.38) {
        if (theme === "sunset") {
          ctx.fillStyle = v > 0.78 ? "#FDE047" : "#F472B6";
        } else {
          ctx.fillStyle = v > 0.72 ? "#FEF08A" : "#38BDF8";
        }
      } else {
        ctx.fillStyle = "#1E293B";
      }
      ctx.fillRect(wx, wy, ww, wh);
    }
  }

  // Svislé neonové pruhy po okrajích
  ctx.fillStyle = isLit ? "#22D3EE" : "#93C5FD";
  ctx.fillRect(3, 0, 5, 512);
  ctx.fillStyle = isLit ? "#F472B6" : "#93C5FD";
  ctx.fillRect(248, 0, 5, 512);

  return finalizeTexture(canvas, 1, 1, true);
}

// 5. Art Deco fasáda luxusní vily ($5 / #0001 Founder)
export function createVillaFacade(theme, isFounder) {
  const { canvas, ctx } = makeCanvas(256, 256);
  const isLit = theme === "night" || theme === "sunset";

  // Travertin / zlatá omítka
  ctx.fillStyle = isFounder
    ? "#FACC15"
    : theme === "sunset"
      ? "#FDE68A"
      : "#F8FAFC";
  ctx.fillRect(0, 0, 256, 256);

  // Horizontální architektonické římsy
  ctx.fillStyle = isFounder ? "#CA8A04" : "#CBD5E1";
  ctx.fillRect(0, 120, 256, 14);
  ctx.fillRect(0, 236, 256, 20);

  // Velká panoramatická okna v patře i přízemí
  const winColor = isLit
    ? isFounder
      ? "#FFFFFF"
      : "#38BDF8"
    : "#0F172A";

  for (const rowY of [28, 150]) {
    for (const colX of [24, 98, 172]) {
      ctx.fillStyle = winColor;
      ctx.fillRect(colX, rowY, 60, 72);
      ctx.strokeStyle = isFounder ? "#854D0E" : "#475569";
      ctx.lineWidth = 4;
      ctx.strokeRect(colX, rowY, 60, 72);
    }
  }

  return finalizeTexture(canvas, 1, 1, true);
}

// 6. Pobřežní bungalov ($1) + tašková střecha
export function createBungalowFacade(theme) {
  const { canvas, ctx } = makeCanvas(256, 256);
  const isLit = theme === "night" || theme === "sunset";

  // Dřevěné obložení v barvě Miami tyrkysu
  ctx.fillStyle = "#0284C7";
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  for (let y = 0; y < 256; y += 24) {
    ctx.fillRect(0, y, 256, 4);
  }

  // Dveře uprostřed
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(104, 108, 48, 148);
  ctx.fillStyle = "#F472B6";
  ctx.fillRect(112, 118, 32, 138);

  // Dvě osvětlená okna s bílými okenicemi
  for (const wx of [26, 174]) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(wx - 6, 112, 68, 68);
    ctx.fillStyle = isLit ? "#FEF08A" : "#BAE6FD";
    ctx.fillRect(wx, 118, 56, 56);
  }

  return finalizeTexture(canvas, 1, 1, true);
}

export function createRoofTileTexture() {
  const { canvas, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = "#EC4899";
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = "#BE185D";
  ctx.lineWidth = 4;
  for (let y = 0; y < 128; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }
  return finalizeTexture(canvas, 2, 2, true);
}

// 7. Tropický písek a vlnící se oceán
export function createSandTexture(theme) {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle =
    theme === "night" ? "#312E81" : theme === "sunset" ? "#D97706" : "#FDE68A";
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle =
      Math.random() > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
    ctx.fillRect(x, y, 2, 2);
  }
  return finalizeTexture(canvas, 14, 14, true);
}

export function createWaterTexture(theme) {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.fillStyle =
    theme === "night" ? "#061529" : theme === "sunset" ? "#4C1D95" : "#0284C7";
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle =
    theme === "night"
      ? "rgba(56, 189, 248, 0.16)"
      : theme === "sunset"
        ? "rgba(251, 146, 60, 0.22)"
        : "rgba(186, 230, 253, 0.35)";
  ctx.lineWidth = 3;

  for (let y = 16; y < 256; y += 32) {
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 16) {
      const wy = y + Math.sin((x / 256) * Math.PI * 4) * 5;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }
  return finalizeTexture(canvas, 28, 28, true);
}