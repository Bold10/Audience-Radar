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

// Renders the branded launch card (1200x630) and returns a PNG data URL.
export async function renderCard({ headline, subline, keywords = [] }) {
  await Promise.all([
    document.fonts.load("700 64px 'Space Grotesk'"),
    document.fonts.load("400 28px Inter"),
    document.fonts.load("600 22px Inter"),
  ]);
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 630;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#F4EFE6";
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = "#E5482D";
  ctx.fillRect(0, 0, 18, 630);
  ctx.strokeStyle = "#D3C9B7";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, 1120, 550);
  try {
    const mark = await loadImg("/brand/mark-light.png");
    ctx.drawImage(mark, 1010, 70, 120, 120);
  } catch { /* card still renders without the mark */ }
  ctx.fillStyle = "#1B1B1B";
  ctx.font = "700 66px 'Space Grotesk'";
  let y = 170;
  wrap(ctx, headline, 900).slice(0, 3).forEach((l) => { ctx.fillText(l, 90, y); y += 76; });
  ctx.fillStyle = "#574F46";
  ctx.font = "400 30px Inter";
  y += 10;
  wrap(ctx, subline, 960).slice(0, 2).forEach((l) => { ctx.fillText(l, 90, y); y += 42; });
  ctx.font = "600 22px Inter";
  let x = 90;
  const ky = 520;
  keywords.slice(0, 5).forEach((k) => {
    const w = ctx.measureText(k).width + 36;
    if (x + w > 1110) return;
    ctx.fillStyle = "#ECE6DA";
    ctx.beginPath();
    ctx.roundRect(x, ky - 32, w, 46, 23);
    ctx.fill();
    ctx.fillStyle = "#C93A20";
    ctx.fillText(k, x + 18, ky - 2);
    x += w + 12;
  });
  return c.toDataURL("image/png");
}
