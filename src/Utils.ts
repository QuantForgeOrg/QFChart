const imageCache = new Map<string, string>();

export function textToBase64Image(
  text: string,
  color: string = "#00da3c",
  fontSize: string = "64px"
): string {
  if (typeof document === "undefined") return "";

  const cacheKey = `${text}-${color}-${fontSize}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 32;
  canvas.height = 32;

  if (ctx) {
    ctx.font = "bold " + fontSize + " Arial";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 16, 16);
    const dataUrl = canvas.toDataURL("image/png");
    imageCache.set(cacheKey, dataUrl);
    return dataUrl;
  }
  return "";
}
