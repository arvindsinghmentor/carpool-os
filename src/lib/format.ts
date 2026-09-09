export const inr = (n: number | string) =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatTime(t: string | null | undefined) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${suffix}`;
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatDays(days: number[] | null | undefined) {
  if (!days || days.length === 0) return "One-off";
  return [...days].sort().map((d) => DAY_LABELS[d]).join(", ");
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function errorMessage(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as Error).message);
  return "Something went wrong. Please try again.";
}
