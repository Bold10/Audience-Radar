import JSZip from "jszip";

const save = (blob, name) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

export const downloadText = (text, name, type = "text/plain") => save(new Blob([text], { type: `${type};charset=utf-8` }), name);

export const downloadDataUrl = async (dataUrl, name) => save(await (await fetch(dataUrl)).blob(), name);

export const scriptText = (beats) => beats.map((b) => `[${b.time}] ${b.line}`).join("\n");

export async function downloadZip(kit, cardUrl, cardSvg) {
  const zip = new JSZip();
  zip.file("x-post.txt", kit.x_post);
  zip.file("telegram-message.txt", kit.telegram_message);
  zip.file("video-script-30s.txt", scriptText(kit.video_script));
  zip.file("hot-keywords.txt", kit.keywords.join("\n"));
  if (cardUrl) zip.file("launch-card.png", cardUrl.split(",")[1], { base64: true });
  if (cardSvg) zip.file("launch-card-editable.svg", cardSvg);
  save(await zip.generateAsync({ type: "blob" }), "audience-radar-launch-kit.zip");
}
