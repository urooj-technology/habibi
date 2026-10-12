import {
  escapeHtml,
  mastheadHtml,
  metaStripHtml,
  signaturesHtml,
  footerHtml,
  openPrintWindow,
} from "./printDocument";

/**
 * Print a simple data table (list pages) with company masthead.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {Array<{label:string,value?:string}>} [opts.meta]
 * @param {Array<{id:string,label:string,align?:string}>} opts.columns
 * @param {Array<object>} opts.rows
 * @param {(row:object,col:object)=>string} [opts.getCell]
 * @param {boolean} [opts.landscape]
 */
export function printDataTable({
  title,
  meta = [],
  columns = [],
  rows = [],
  getCell = (row, col) => row[col.id] ?? "—",
  landscape = true,
}) {
  const headers = columns
    .map(
      (col) =>
        `<th class="${col.align === "right" ? "num" : col.align === "center" ? "c" : ""}">${escapeHtml(
          col.label
        )}</th>`
    )
    .join("");

  const body =
    rows.length > 0
      ? rows
          .map((row) => {
            const cells = columns
              .map((col) => {
                const cls =
                  col.align === "right" ? "num" : col.align === "center" ? "c" : "";
                return `<td class="${cls}">${escapeHtml(getCell(row, col))}</td>`;
              })
              .join("");
            return `<tr>${cells}</tr>`;
          })
          .join("")
      : `<tr><td colspan="${Math.max(columns.length, 1)}" class="empty">No data</td></tr>`;

  const bodyHtml = `
    ${mastheadHtml(title)}
    ${metaStripHtml(meta.slice(0, 4))}
    <table class="data">
      <thead><tr>${headers}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    ${signaturesHtml()}
    ${footerHtml()}
  `;

  return openPrintWindow({ title, bodyHtml, landscape });
}

export default printDataTable;
