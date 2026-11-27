import * as THREE from "three";

function makeCanvas(w = 512, h = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext("2d") };
}

function finalizeTexture(canvas, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function createAsphaltRoadTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);

  // Základní tmavý asfalt
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(0, 0, 512, 512);

  // Jemná zrnitost asfaltu
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.14)";
    ctx.fillRect(x, y, 2, 2);
  }

  // Krajnice / obrubníky
  ctx.fillStyle = "#475569";
  ctx.fillRect(0, 0, 22, 512);
  ctx.fillRect(490, 0, 22, 512);

  // Bílé postranní čáry
  ctx.fillStyle = "#E2E8F0";
  ctx.fillRect(30, 0, 6, 512);
  ctx.fillRect(476, 0, 6, 512);

  // Dvojitá žlutá středová čára (Vice City styl)
  ctx.fillStyle = "#FACC15";
  for (let y = 12; y < 512; y += 64) {
    ctx.fillRect(247, y, 6, 38);
    ctx.fillRect(259, y, 6, 38);
  }

  return finalizeTexture(canvas, 1, 24);
}

export function createPlazaTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);

  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, 512, 512);

  // Art Deco dlažba
  const step = 64;
  for (let y = 0; y < 512; y += step) {
    for (let x = 0; x < 512; x += step) {
      ctx.fillStyle = (x / step + y / step) % 2 === 0 ? "#1E293B" : "#172033";
      ctx.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  }

  // Přechody pro chodce po obvodu náměstí
  ctx.fillStyle = "rgba(248, 250, 252, 0.85)";
  for (let i = 48; i <= 440; i += 32) {
    ctx.fillRect(i, 12, 16, 36);
    ctx.fillRect(i, 464, 16, 36);
    ctx.fillRect(12, i, 36, 16);
    ctx.fillRect(464, i, 36, 16);
  }

  // Neonový kruh kolem fontány
  ctx.strokeStyle = "#EC4899";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(256, 256, 175, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#22D3EE";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 256, 155, 0, Math.PI * 2);
  ctx.stroke();

  return finalizeTexture(canvas, 1, 1);
}

export function createPromenadeTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);

  ctx.fillStyle = "#CBD5E1";
  ctx.fillRect(0, 0, 512, 512);

  // Růžovo-tyrkysové dlaždice stylu Ocean Drive
  const tile = 64;
  for (let y = 0; y < 512; y += tile) {
    for (let x = 0; x < 512; x += tile) {
      const checker = (x / tile + y / tile) % 2 === 0;
      ctx.fillStyle = checker ? "#E2E8F0" : "#CBD5E1";
      ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
    }
  }

  // Dekorativní pruh u okraje
  ctx.fillStyle = "#F472B6";
  ctx.fillRect(0, 16, 512, 10);
  ctx.fillStyle = "#06B6D4";
  ctx.fillRect(0, 486, 512, 10);

  return finalizeTexture(canvas, 28, 28);
}

export function createWoodPierTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);

  ctx.fillStyle = "#78350F";
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 32) {
    ctx.fillStyle = y % 64 === 0 ? "#92400E" : "#78350F";
    ctx.fillRect(0, y + 2, 256, 28);
    ctx.fillStyle = "#451A03";
    ctx.fillRect(0, y, 256, 2);
  }

  return finalizeTexture(canvas, 2, 8);
}

export function createPlotTexture(theme) {
  const { canvas, ctx } = makeCanvas(256, 256);
  const isNight = theme === "night";
  const isSunset = theme === "sunset";

  ctx.fillStyle = isNight ? "#132A2E" : isSunset ? "#1E3A3A" : "#34D399";
  ctx.fillRect(0, 0, 256, 256);

  // Jemná textura trávníku / pozemku
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle =
      i % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }

  // Ohraničení parcely
  ctx.strokeStyle = isNight
    ? "rgba(56, 189, 248, 0.35)"
    : "rgba(15, 23, 42, 0.25)";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 248);

  return finalizeTexture(canvas, 1, 1);
}

export function createSkyscraperFacade(theme) {
  const { canvas, ctx } = makeCanvas(512, 512);
  const lit = theme === "night" || theme === "sunset";

  // Ocelově-skleněná fasáda
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, "#090D16");
  grad.addColorStop(0.5, "#1E293B");
  grad.addColorStop(1, "#0F172A");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Svislé neonové akcenty na rozích
  ctx.fillStyle = "#22D3EE";
  ctx.fillRect(8, 0, 6, 512);
  ctx.fillStyle = "#EC4899";
  ctx.fillRect(498, 0, 6, 512);

  // Mřížka osvětlených kancelářských oken
  const cols = 8;
  const rows = 16;
  const padX = 26;
  const padY = 16;
  const cellW = (512 - padX * 2) / cols;
  const cellH = (512 - padY * 2) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = padX + c * cellW + 4;
      const wy = padY + r * cellH + 4;
      const ww = cellW - 8;
      const wh = cellH - 8;

      const seed = (r * 17 + c * 31) % 10;
      if (lit) {
        if (seed < 4) ctx.fillStyle = "#38BDF8";
        else if (seed < 7) ctx.fillStyle = "#FEF08A";
        else if (seed === 7) ctx.fillStyle = "#F472B6";
        else ctx.fillStyle = "#1E293B";
      } else {
        ctx.fillStyle = seed % 3 === 0 ? "#7DD3FC" : "#38BDF8";
      }
      ctx.fillRect(wx, wy, ww, wh);
    }
  }

  return finalizeTexture(canvas, 1, 1);
}

export function createVillaFacade(theme, isFounder = false) {
  const { canvas, ctx } = makeCanvas(512, 512);
  const lit = theme === "night" || theme === "sunset";

  // Pastelová Art Deco omítka (bílá / růžová / zlatá pro zakladatele)
  ctx.fillStyle = isFounder ? "#FEF3C7" : "#FDF2F8";
  ctx.fillRect(0, 0, 512, 512);

  // Horizontální Art Deco římsy
  ctx.fillStyle = isFounder ? "#F59E0B" : "#EC4899";
  ctx.fillRect(0, 0, 512, 26);
  ctx.fillRect(0, 244, 512, 20);
  ctx.fillRect(0, 486, 512, 26);

  ctx.fillStyle = "#06B6D4";
  ctx.fillRect(0, 26, 512, 8);
  ctx.fillRect(0, 264, 512, 8);

  // Velká panoramatická okna
  const winPositions = [
    [52, 64, 170, 145],
    [290, 64, 170, 145],
    [52, 304, 170, 150],
    [290, 304, 170, 150],
  ];

  for (const [wx, wy, ww, wh] of winPositions) {
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
    ctx.fillStyle = lit ? "#FDE047" : "#38BDF8";
    ctx.fillRect(wx, wy, ww, wh);

    // Žaluzie / rámy oken
    ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
    ctx.fillRect(wx + ww / 2 - 3, wy, 6, wh);
    ctx.fillRect(wx, wy + wh / 2 - 3, ww, 6);
  }

  return finalizeTexture(canvas, 1, 1);
}

export function createBungalowFacade(theme) {
  const { canvas, ctx } = makeCanvas(512, 512);
  const lit = theme === "night" || theme === "sunset";

  // Tropická pastelová fasáda s dřevěným obložením
  ctx.fillStyle = "#FDE68A";
  ctx.fillRect(0, 0, 512, 512);

  // Spodní dřevěný sokl
  ctx.fillStyle = "#92400E";
  ctx.fillRect(0, 390, 512, 122);

  // Dveře uprostřed
  ctx.fillStyle = "#451A03";
  ctx.fillRect(206, 220, 100, 292);
  ctx.fillStyle = "#FBBF24";
  ctx.beginPath();
  ctx.arc(286, 370, 8, 0, Math.PI * 2);
  ctx.fill();

  // Dvě okna se okenicemi
  const windows = [55, 345];
  for (const wx of windows) {
    ctx.fillStyle = "#0284C7";
    ctx.fillRect(wx - 18, 220, 148, 136);
    ctx.fillStyle = lit ? "#FEF08A" : "#7DD3FC";
    ctx.fillRect(wx, 234, 112, 108);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 6;
    ctx.strokeRect(wx, 234, 112, 108);
  }

  return finalizeTexture(canvas, 1, 1);
}

export function createRoofTileTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);

  ctx.fillStyle = "#EA580C";
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = (x + y) % 64 === 0 ? "#F97316" : "#C2410C";
      ctx.beginPath();
      ctx.arc(x + 16, y + 16, 15, 0, Math.PI);
      ctx.fill();
    }
  }

  return finalizeTexture(canvas, 3, 3);
}

export function createShopFacadeTexture(primaryHex, accentHex, titleText) {
  const { canvas, ctx } = makeCanvas(512, 512);

  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, 512, 512);

  // Horní neonový pás s názvem obchodu
  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 512, 128);

  ctx.fillStyle = "#090D16";
  ctx.fillRect(16, 16, 480, 96);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, 480, 96);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 42px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(titleText, 256, 66);

  // Velké prosklené výlohy
  ctx.fillStyle = "#38BDF8";
  ctx.fillRect(32, 160, 180, 280);
  ctx.fillRect(300, 160, 180, 280);

  // Odlesky ve výloze
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(52, 180, 24, 240);
  ctx.fillRect(320, 180, 24, 240);

  // Vstupní dveře uprostřed
  ctx.fillStyle = accentHex;
  ctx.fillRect(226, 200, 60, 312);
  ctx.fillStyle = "#090D16";
  ctx.fillRect(234, 212, 44, 290);

  return finalizeTexture(canvas, 1, 1);
}

export function createSandTexture(theme) {
  const { canvas, ctx } = makeCanvas(512, 512);
  const isNight = theme === "night";

  ctx.fillStyle = isNight ? "#92400E" : "#FDE047";
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 3500; i++) {
    ctx.fillStyle = isNight
      ? "rgba(251, 191, 36, 0.14)"
      : "rgba(217, 119, 6, 0.16)";
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 4, 2);
  }

  return finalizeTexture(canvas, 18, 18);
}

export function createWaterTexture(theme) {
  const { canvas, ctx } = makeCanvas(512, 512);
  const isNight = theme === "night";
  const isSunset = theme === "sunset";

  ctx.fillStyle = isNight ? "#0369A1" : isSunset ? "#0E7490" : "#06B6D4";
  ctx.fillRect(0, 0, 512, 512);

  // Kaustické vlny na hladině
  ctx.strokeStyle = isNight
    ? "rgba(56, 189, 248, 0.25)"
    : "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 4;
  for (let i = 0; i < 36; i++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    const r = 18 + Math.random() * 44;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 1.3);
    ctx.stroke();
  }

  return finalizeTexture(canvas, 24, 24);
}