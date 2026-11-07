export function formatShowtime(iso: string | null | undefined): string {
  if (!iso) return "TBA";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatLength(minutes: number): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export const RSVP_LABELS: Record<string, string> = {
  might_go: "Might go",
  probably_go: "Will probably go",
  booked: "Booked tickets",
};
