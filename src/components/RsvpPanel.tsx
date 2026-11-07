"use client";

import { useState } from "react";
import { RSVP_LABELS } from "@/lib/format";
import type {
  Rsvp,
  RsvpAggregate,
  RsvpAttendee,
  RsvpStatus,
} from "@/lib/types";

export function RsvpPanel({
  movieId,
  signedIn,
  initial,
  aggregates: initialAggregates,
  attendees: initialAttendees,
}: {
  movieId: string;
  signedIn: boolean;
  initial: Rsvp | null;
  aggregates: RsvpAggregate[];
  attendees: RsvpAttendee[];
}) {
  const [status, setStatus] = useState<RsvpStatus>(initial?.status ?? "might_go");
  const [adults, setAdults] = useState(initial?.adults ?? 1);
  const [children, setChildren] = useState(initial?.children ?? 0);
  const [aggregates, setAggregates] = useState(initialAggregates);
  const [attendees, setAttendees] = useState(initialAttendees);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!signedIn) {
      setMessage("Sign in to RSVP.");
      return;
    }
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/movies/${movieId}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adults, children }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Could not save RSVP");
      return;
    }
    setAggregates(data.aggregates);
    if (Array.isArray(data.attendees)) setAttendees(data.attendees);
    setMessage("RSVP saved.");
  }

  async function clear() {
    setBusy(true);
    const res = await fetch(`/api/movies/${movieId}/rsvp`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setAggregates([]);
    setAttendees(Array.isArray(data.attendees) ? data.attendees : []);
    setMessage("RSVP cleared.");
  }

  return (
    <section className="space-y-5">
      <h2 className="font-display text-2xl">RSVP</h2>
      {!signedIn ? (
        <p className="text-[color:var(--muted)]">
          <a
            href="/account"
            className="text-[color:var(--accent)] underline-offset-2 hover:underline"
          >
            Sign in
          </a>{" "}
          to say if you might go, will probably go, or have booked tickets.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="text-[color:var(--muted)]">Status</span>
            <select
              className="field"
              value={status}
              onChange={(e) => setStatus(e.target.value as RsvpStatus)}
            >
              {Object.entries(RSVP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm">
              <span className="text-[color:var(--muted)]">Adults</span>
              <input
                className="field"
                type="number"
                min={0}
                max={20}
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[color:var(--muted)]">Children</span>
              <input
                className="field"
                type="number"
                min={0}
                max={20}
                value={children}
                onChange={(e) => setChildren(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button
              className="btn-primary"
              disabled={busy}
              onClick={save}
              type="button"
            >
              Save RSVP
            </button>
            {initial || message === "RSVP saved." ? (
              <button
                className="btn-ghost"
                disabled={busy}
                onClick={clear}
                type="button"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      )}
      {message ? (
        <p className="text-sm text-[color:var(--accent-soft)]">{message}</p>
      ) : null}
      <div className="space-y-2">
        <h3 className="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Club interest
        </h3>
        {aggregates.length === 0 ? (
          <p className="text-[color:var(--muted)]">
            No RSVPs yet — be the first.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {aggregates.map((a) => (
              <li key={a.status}>
                <span className="text-[color:var(--accent)]">
                  {RSVP_LABELS[a.status]}
                </span>
                {": "}
                {a.people} people across {a.parties}{" "}
                {a.parties === 1 ? "party" : "parties"}
              </li>
            ))}
          </ul>
        )}
      </div>
      {attendees.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Who’s coming
          </h3>
          <ul className="space-y-1 text-sm">
            {attendees.map((a) => (
              <li key={a.user_id}>
                <span className="text-[color:var(--accent-soft)]">
                  {a.display_name}
                </span>
                {" · "}
                {RSVP_LABELS[a.status]}
                {" · "}
                {a.adults + a.children}{" "}
                {a.adults + a.children === 1 ? "person" : "people"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
