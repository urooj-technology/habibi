/**
 * 80mm thermal receipt print helpers.
 */

export const THERMAL_PRINT_CSS = `
  @page { size: 80mm auto; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    width: 80mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
`;

export function openThermalPrint(innerHtml, title = "Print", { dir, lang } = {}) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;
  const htmlDir =
    dir ||
    (typeof document !== "undefined" ? document.documentElement.dir : "ltr") ||
    "ltr";
  const htmlLang =
    lang ||
    (typeof document !== "undefined" ? document.documentElement.lang : "en") ||
    "en";
  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html dir="${htmlDir}" lang="${htmlLang}">
<head>
  <meta charset="utf-8" />
  <title>${String(title).replace(/</g, "")}</title>
  <style>${THERMAL_PRINT_CSS}</style>
</head>
<body>${innerHtml}</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350);
  return true;
}
