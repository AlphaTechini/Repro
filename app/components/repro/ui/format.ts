/** Pure formatters shared by Repro screens. No locale data, no I/O. */

/** 7000 -> "0:07", 65000 -> "1:05", 3723000 -> "1:02:03". */
export function formatClipTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

/** Whole seconds for the Clips `?t=` (embed) and `?at=` (share) params. */
export function clipSeconds(ms: number): number {
  return Math.max(0, Math.floor(ms / 1000));
}

/** Compact elapsed time: "48s", "4m 12s", "1h 05m", "2d 3h". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return s === 0 ? `${m}m` : `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h < 24) return `${h}h ${String(mm).padStart(2, "0")}m`;
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return hh === 0 ? `${d}d` : `${d}d ${hh}h`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Inbox "created" column: "now", "5m", "3h", "2d", then "Oct 28". */
export function formatRelative(
  date: Date | string | number,
  now: number = Date.now(),
): string {
  const t = new Date(date).getTime();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const dt = new Date(t);
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
}
