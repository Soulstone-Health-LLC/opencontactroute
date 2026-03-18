/**
 * Triggers a browser CSV file download.
 * @param {string} filename - e.g. "pathway-views.csv"
 * @param {string[]} headers - column header labels
 * @param {Array<Array<string|number|null>>} rows - each element is one row
 */
export function exportToCsv(filename, headers, rows) {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
