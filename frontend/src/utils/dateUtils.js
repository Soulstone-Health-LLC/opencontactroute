/**
 * Converts a JS Date to a "YYYY-MM-DD" string in the browser's LOCAL timezone.
 * Use this for <input type="date"> default values so the picker shows the
 * user's local date rather than the UTC date.
 */
export function toLocalDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Converts a "YYYY-MM-DD" date-picker string to the start of that day
 * (00:00:00.000) in the user's LOCAL timezone, returned as a UTC ISO string.
 * e.g. "2026-03-18" in Pacific (UTC-7) → "2026-03-18T07:00:00.000Z"
 */
export function localDayStartISO(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

/**
 * Converts a "YYYY-MM-DD" date-picker string to the end of that day
 * (23:59:59.999) in the user's LOCAL timezone, returned as a UTC ISO string.
 * e.g. "2026-03-18" in Pacific (UTC-7) → "2026-03-19T06:59:59.999Z"
 */
export function localDayEndISO(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}
