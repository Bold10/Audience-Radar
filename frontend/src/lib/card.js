const loadImg = (src) =>
  new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });

const wrap = (ctx, text, maxW) => {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  words.forEach((w) => {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  });
  if (line) lines.push(line);
  return lines;
};

const FONTS = { head: "700 66px 'Space Grotesk'", sub: "400 30px Inter", chip: "600 22px Inter" };
const CHIP_Y = 520;

const loadFonts = () => Promise.all(Object.values(FONTS).map((f) => document.fonts.load(f)));

// Shared layout so the PNG and the editable SVG match exactly.
const layout = (ctx, { headline, subline, keywords = [] }) => {
  ctx.font = FONTS.head;
  const head = wrap(ctx, headline, 900).slice(0, 3);
  ctx.font = FONTS.sub;
  const sub = wrap(ctx, subline, 960).slice(0, 2);
  const subY = 170 + head.length * 76 + 10;
  ctx.font = FONTS.chip;
  const chips = [];
  let x = 90;
  keywords.slice(0, 5).forEach((k) => {
    const w = ctx.measureText(k).width + 36;
    if (x + w > 1110) return;
    chips.push({ text: k, x, w });
    x += w + 12;
  });
  return { head, sub, subY, chips };
};

// Renders the branded launch card (1200x630) and returns a PNG data URL.
export async function renderCard(content) {
  await loadFonts();
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 630;
  const ctx = c.getContext("2d");
  const L = layout(ctx, content);
  ctx.fillStyle = "#F4EFE6";
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = "#E5482D";
  ctx.fillRect(0, 0, 18, 630);
  ctx.strokeStyle = "#D3C9B7";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, 1120, 550);
  try {
    ctx.drawImage(await loadImg("/brand/mark-light.png"), 1010, 70, 120, 120);
  } catch { /* card still renders without the mark */ }
  ctx.fillStyle = "#1B1B1B";
  ctx.font = FONTS.head;
  L.head.forEach((l, i) => ctx.fillText(l, 90, 170 + i * 76));
  ctx.fillStyle = "#574F46";
  ctx.font = FONTS.sub;
  L.sub.forEach((l, i) => ctx.fillText(l, 90, L.subY + i * 42));
  ctx.font = FONTS.chip;
  L.chips.forEach(({ text, x, w }) => {
    ctx.fillStyle = "#ECE6DA";
    ctx.beginPath();
    ctx.roundRect(x, CHIP_Y - 32, w, 46, 23);
    ctx.fill();
    ctx.fillStyle = "#C93A20";
    ctx.fillText(text, x + 18, CHIP_Y - 2);
  });
  return c.toDataURL("image/png");
}

const esc = (s) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[ch]));

const toDataUrl = async (src) => {
  const blob = await (await fetch(src)).blob();
  return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
};

// Editable SVG version: real <text> and shapes in named layers, logo as a separate image layer.
export async function renderCardSvg(content) {
  await loadFonts();
  const L = layout(document.createElement("canvas").getContext("2d"), content);
  let mark = "";
  try { mark = await toDataUrl("/brand/mark-light.png"); } catch { /* optional layer */ }
  const head = L.head.map((l, i) => `    <text x="90" y="${170 + i * 76}">${esc(l)}</text>`).join("\n");
  const sub = L.sub.map((l, i) => `    <text x="90" y="${L.subY + i * 42}">${esc(l)}</text>`).join("\n");
  const chips = L.chips.map(({ text, x, w }) =>
    `    <g>\n      <rect x="${x}" y="${CHIP_Y - 32}" width="${w.toFixed(1)}" height="46" rx="23" fill="#ECE6DA"/>\n      <text x="${x + 18}" y="${CHIP_Y - 2}">${esc(text)}</text>\n    </g>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <g id="background">
    <rect width="1200" height="630" fill="#F4EFE6"/>
    <rect width="18" height="630" fill="#E5482D"/>
    <rect x="40" y="40" width="1120" height="550" fill="none" stroke="#D3C9B7" stroke-width="2"/>
  </g>
${mark ? `  <image id="logo-mark" x="1010" y="70" width="120" height="120" href="${mark}" xlink:href="${mark}"/>\n` : ""}  <g id="headline" font-family="'Space Grotesk', sans-serif" font-weight="700" font-size="66" fill="#1B1B1B">
${head}
  </g>
  <g id="subline" font-family="Inter, sans-serif" font-weight="400" font-size="30" fill="#574F46">
${sub}
  </g>
  <g id="keyword-chips" font-family="Inter, sans-serif" font-weight="600" font-size="22" fill="#C93A20">
${chips}
  </g>
</svg>
`;
}
