import JsBarcode from "jsbarcode";
import { escapeHtml } from "./printDocument";

/** Common thermal label stock. `roll` = continuous receipt paper (58/80mm). */
export const LABEL_PRESETS = [
  { id: "40x30", width: 40, height: 30 },
  { id: "50x30", width: 50, height: 30 },
  { id: "50x25", width: 50, height: 25 },
  { id: "38x25", width: 38, height: 25 },
  { id: "60x40", width: 60, height: 40 },
  { id: "roll58", width: 58, height: 30, roll: true },
  { id: "roll80", width: 80, height: 35, roll: true },
  { id: "custom", width: 50, height: 30 },
];

export const DEFAULT_LABEL_SETTINGS = {
  preset: "40x30",
  width: 40,
  height: 30,
  showName: true,
  showCategory: false,
  showCode: true,
};

function isValidEan13(code) {
  if (!/^\d{13}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const sum = digits
    .slice(0, 12)
    .reduce((acc, d, i) => acc + d * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === digits[12];
}

/** Barcode as a scalable SVG string (bars only; the readable code is HTML text). */
export function barcodeSvg(code) {
  const value = String(code || "").trim();
  if (!value) return "";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, value, {
      format: isValidEan13(value) ? "EAN13" : "CODE128",
      displayValue: false,
      margin: 0,
      width: 2,
      height: 80,
      background: "#ffffff",
      lineColor: "#000000",
      flat: true,
    });
  } catch {
    return "";
  }
  const w = svg.getAttribute("width")?.replace("px", "") || "200";
  const h = svg.getAttribute("height")?.replace("px", "") || "80";
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.removeAttribute("style");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("shape-rendering", "crispEdges");
  return svg.outerHTML;
}

function labelHtml(product, settings) {
  const name = settings.showName ? product.name || "" : "";
  const category = settings.showCategory ? product.category_details?.name || "" : "";
  return `
    <div class="label">
      ${name ? `<div class="name" dir="auto">${escapeHtml(name)}</div>` : ""}
      ${category ? `<div class="cat" dir="auto">${escapeHtml(category)}</div>` : ""}
      <div class="bars">${barcodeSvg(product.barcode)}</div>
      ${settings.showCode ? `<div class="code">${escapeHtml(product.barcode || "")}</div>` : ""}
    </div>`;
}

/**
 * Full HTML document of labels. `items` = [{ product, copies }].
 * Label printers get one label per page (@page = label size); receipt rolls get
 * labels stacked on a continuous page with cut lines.
 */
export function buildLabelsDocument(items, settings, { preview = false } = {}) {
  const preset = LABEL_PRESETS.find((p) => p.id === settings.preset) || LABEL_PRESETS[0];
  const roll = Boolean(preset.roll);
  const width = Number(settings.width) || preset.width;
  const height = Number(settings.height) || preset.height;
  const pad = Math.max(1, Math.min(width, height) * 0.05);
  const nameSize = Math.max(6, Math.min(11, height * 0.3));
  const codeSize = Math.max(6, Math.min(10, height * 0.26));
  const textLines = (settings.showName ? 1 : 0) + (settings.showCategory ? 1 : 0);
  const barsHeight = Math.max(
    6,
    height - pad * 2 - textLines * nameSize * 0.48 - (settings.showCode ? codeSize * 0.45 : 0) - 2
  );

  const labels = items
    .flatMap(({ product, copies }) =>
      Array.from({ length: Math.max(0, Number(copies) || 0) }, () => labelHtml(product, settings))
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Barcode labels</title>
<style>
  @page { size: ${width}mm ${roll ? "auto" : `${height}mm`}; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: ${preview ? "#f1f5f9" : "#fff"}; }
  body {
    font-family: "Segoe UI", Tahoma, Arial, sans-serif;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    ${preview ? "display:flex;align-items:center;justify-content:center;min-height:100vh;" : ""}
  }
  .label {
    width: ${width}mm;
    height: ${height}mm;
    padding: ${pad}mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.6mm;
    overflow: hidden;
    background: #fff;
    ${roll ? "border-bottom: 0.2mm dashed #000;" : "page-break-after: always; break-after: page;"}
    ${preview ? "box-shadow: 0 1px 4px rgba(0,0,0,.25);" : ""}
  }
  .label:last-child { page-break-after: auto; break-after: auto; }
  .name {
    width: 100%;
    font-size: ${nameSize}pt;
    font-weight: 700;
    line-height: 1.1;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .cat {
    width: 100%;
    font-size: ${Math.max(5, nameSize * 0.75)}pt;
    line-height: 1.1;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bars { width: 92%; height: ${barsHeight.toFixed(2)}mm; flex-shrink: 1; min-height: 5mm; }
  .bars svg { width: 100%; height: 100%; display: block; }
  .code {
    font-family: "Consolas", "Courier New", monospace;
    font-size: ${codeSize}pt;
    letter-spacing: 0.08em;
    line-height: 1;
    direction: ltr;
  }
</style>
</head>
<body>${labels}</body>
</html>`;
}

/** Print through a hidden iframe so popup blockers never interfere. */
export function printBarcodeLabels(items, settings) {
  const html = buildLabelsDocument(items, settings);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const cleanup = () => window.setTimeout(() => iframe.remove(), 1000);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  window.setTimeout(() => {
    const win = iframe.contentWindow;
    win.addEventListener("afterprint", cleanup, { once: true });
    win.focus();
    win.print();
    window.setTimeout(cleanup, 60_000);
  }, 300);
}
