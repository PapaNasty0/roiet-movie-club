"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ForumComposer({
  movieId,
  signedIn,
}: {
  movieId: string;
  signedIn: boolean;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  if (!signedIn) {
    return (
      <p className="text-[color:var(--muted)]">
        <a href="/account" className="text-[color:var(--accent)] hover:underline">
          Sign in
        </a>{" "}
        to join the discussion.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/forum/${movieId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not post");
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea
        className="field min-h-28"
        placeholder="Say hi, ask about carpools, or share seating plans…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        required
      />
      {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}
      <button className="btn-primary" disabled={busy} type="submit">
        Post
      </button>
    </form>
  );
}
