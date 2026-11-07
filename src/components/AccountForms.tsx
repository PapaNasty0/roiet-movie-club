"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { neonAuthClient } from "@/lib/neon-auth-client";

export function AccountForms({
  user,
  googleReady,
  neonAuthReady = false,
  banner,
}: {
  user: User | null;
  googleReady: boolean;
  neonAuthReady?: boolean;
  banner?: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(banner || "");
  const [nameMessage, setNameMessage] = useState("");
  const [notify, setNotify] = useState(user?.notify_new_movies ?? false);
  const [busy, setBusy] = useState(false);

  async function authSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    const res = await fetch(
      `/api/auth/${mode === "login" ? "login" : "register"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login" ? { email, password } : { email, password, name },
        ),
      },
    );
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    if (data.pendingVerification) {
      setInfo(
        data.verifyUrl
          ? `Confirm your email to finish. Local link: ${data.verifyUrl}`
          : data.message ||
              "Check your email for a confirmation link before signing in.",
      );
      setMode("login");
      return;
    }
    router.refresh();
  }

  async function neonAuthSubmit() {
    if (!neonAuthReady) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        const { error: signUpError } = await neonAuthClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        });
        if (signUpError) {
          setError(signUpError.message || "Neon Auth sign-up failed");
          setBusy(false);
          return;
        }
      } else {
        const { error: signInError } = await neonAuthClient.signIn.email({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message || "Neon Auth sign-in failed");
          setBusy(false);
          return;
        }
      }
      const bridge = await fetch("/api/auth/neon/bridge", { method: "POST" });
      const bridgeData = await bridge.json().catch(() => ({}));
      if (!bridge.ok) {
        setError(bridgeData.error || "Could not link Neon Auth session");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neon Auth failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  async function saveNotify(next: boolean) {
    setNotify(next);
    await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notify_new_movies: next }),
    });
  }

  async function saveDisplayName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNameMessage("");
    setError("");
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: displayName }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save display name");
      return;
    }
    if (data.user?.name) setDisplayName(data.user.name);
    setNameMessage("Display name saved. Forum posts and RSVPs will show it.");
    router.refresh();
  }

  if (user) {
    return (
      <div className="mx-auto max-w-lg space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">
            Account
          </p>
          <h1 className="font-display mt-2 text-4xl">
            {user.name || user.email}
          </h1>
          <p className="mt-2 text-[color:var(--muted)]">{user.email}</p>
          {user.is_admin ? (
            <p className="mt-3 text-[color:var(--accent)]">
              Admin access enabled
            </p>
          ) : null}
          {info ? (
            <p className="mt-3 text-sm text-[color:var(--accent-soft)]">{info}</p>
          ) : null}
        </div>

        <form onSubmit={saveDisplayName} className="space-y-3">
          <h2 className="font-display text-2xl">Display name</h2>
          <p className="text-sm text-[color:var(--muted)]">
            This name shows on forum posts and RSVP lists.
          </p>
          <label className="block space-y-1 text-sm">
            <span className="text-[color:var(--muted)]">Name</span>
            <input
              className="field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              required
            />
          </label>
          {nameMessage ? (
            <p className="text-sm text-[color:var(--accent-soft)]">
              {nameMessage}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-[color:var(--danger)]">{error}</p>
          ) : null}
          <button className="btn-primary" disabled={busy} type="submit">
            Save name
          </button>
        </form>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => saveNotify(e.target.checked)}
            className="mt-1"
          />
          <span>
            Email me when a new English movie is posted
            <span className="mt-1 block text-[color:var(--muted)]">
              Preference is saved now. Delivery needs Resend set up (see email
              confirmation guide).
            </span>
          </span>
        </label>

        {!googleReady && user.is_admin ? (
          <div className="space-y-2 border-t border-[color:var(--line)] pt-6 text-sm text-[color:var(--muted)]">
            <p className="text-[color:var(--accent)]">Admin: Google sign-in</p>
            <p>
              Google sign-in is off until you add{" "}
              <code className="text-[color:var(--accent-soft)]">
                GOOGLE_CLIENT_ID
              </code>{" "}
              and{" "}
              <code className="text-[color:var(--accent-soft)]">
                GOOGLE_CLIENT_SECRET
              </code>{" "}
              in Firebase App Hosting secrets. Step-by-step guide:{" "}
              <span className="text-[color:var(--ink)]">
                docs/google-signin-setup.md
              </span>{" "}
              in the project notes.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {user.is_admin ? (
            <a href="/admin" className="btn-primary">
              Open admin
            </a>
          ) : null}
          <button type="button" className="btn-ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-display text-4xl">Join the club</h1>
        <p className="mt-2 text-[color:var(--muted)]">
          {googleReady
            ? "Email + password, or Google. RSVPs and forum posts require an account."
            : "Email + password. RSVPs and forum posts require an account."}
        </p>
      </div>
      {info ? (
        <p className="text-sm text-[color:var(--accent-soft)]">{info}</p>
      ) : null}
      <div className="flex gap-3 text-sm">
        <button
          type="button"
          className={
            mode === "login"
              ? "text-[color:var(--accent)]"
              : "text-[color:var(--muted)]"
          }
          onClick={() => setMode("login")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={
            mode === "register"
              ? "text-[color:var(--accent)]"
              : "text-[color:var(--muted)]"
          }
          onClick={() => setMode("register")}
        >
          Register
        </button>
      </div>
      <form onSubmit={authSubmit} className="space-y-3">
        {mode === "register" ? (
          <label className="block space-y-1 text-sm">
            <span className="text-[color:var(--muted)]">Name</span>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        ) : null}
        <label className="block space-y-1 text-sm">
          <span className="text-[color:var(--muted)]">Email</span>
          <input
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-[color:var(--muted)]">Password</span>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={mode === "register" ? 8 : 1}
            required
          />
        </label>
        {error ? (
          <p className="text-sm text-[color:var(--danger)]">{error}</p>
        ) : null}
        <button className="btn-primary w-full" disabled={busy} type="submit">
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
      {neonAuthReady ? (
        <button
          type="button"
          className="btn-ghost w-full"
          disabled={busy}
          onClick={() => void neonAuthSubmit()}
        >
          {mode === "login"
            ? "Sign in with Neon Auth"
            : "Register with Neon Auth"}
        </button>
      ) : null}
      {googleReady ? (
        <a
          href="/api/auth/google"
          className="btn-ghost flex w-full items-center justify-center"
        >
          Continue with Google
        </a>
      ) : (
        <p className="text-center text-sm text-[color:var(--muted)]">
          Google sign-in coming soon
        </p>
      )}
    </div>
  );
}
