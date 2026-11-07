"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GalleryPhoto, Movie, SiteContent, Skin } from "@/lib/types";

type Tab = "content" | "movies" | "gallery" | "skins";

const emptyMovie = {
  title: "",
  synopsis: "",
  genre: "",
  rating: "PG",
  length_minutes: 100,
  showtime_start: "",
  showtime_end: "",
  youtube_trailer_id: "",
  reviews_summary: "",
  poster_url: "",
  cinema: "Robinson Roi Et / Major Cineplex",
  skin_id: "roiet-default",
  published: true,
  notify: true,
};

export function AdminPanel({
  content,
  movies,
  photos,
  skins,
  activeSkin,
}: {
  content: SiteContent[];
  movies: Movie[];
  photos: GalleryPhoto[];
  skins: Skin[];
  activeSkin: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("movies");
  const [items, setItems] = useState(content);
  const [draft, setDraft] = useState({ ...emptyMovie });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photo, setPhoto] = useState({
    title: "",
    caption: "",
    image_url: "",
    outing_date: "",
  });
  const [siteSkin, setSiteSkin] = useState(activeSkin);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const tabs = useMemo(
    () =>
      [
        ["movies", "Movies"],
        ["content", "Site text"],
        ["gallery", "Gallery"],
        ["skins", "Skins"],
      ] as const,
    [],
  );

  async function saveContent() {
    setBusy(true);
    const res = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ key: i.key, value: i.value })),
      }),
    });
    setBusy(false);
    setMessage(res.ok ? "Site text saved." : "Could not save text.");
    router.refresh();
  }

  async function saveMovie() {
    setBusy(true);
    const payload = {
      ...draft,
      id: editingId || undefined,
      length_minutes: Number(draft.length_minutes) || 0,
      showtime_start: draft.showtime_start || null,
      showtime_end: draft.showtime_end || null,
    };
    const res = await fetch("/api/admin/movies", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Could not save movie.");
      return;
    }
    setMessage(editingId ? "Movie updated." : "Movie added.");
    setDraft({ ...emptyMovie });
    setEditingId(null);
    router.refresh();
  }

  function editMovie(m: Movie) {
    setEditingId(m.id);
    setDraft({
      title: m.title,
      synopsis: m.synopsis,
      genre: m.genre,
      rating: m.rating,
      length_minutes: m.length_minutes,
      showtime_start: m.showtime_start ? m.showtime_start.slice(0, 16) : "",
      showtime_end: m.showtime_end ? m.showtime_end.slice(0, 16) : "",
      youtube_trailer_id: m.youtube_trailer_id,
      reviews_summary: m.reviews_summary,
      poster_url: m.poster_url,
      cinema: m.cinema,
      skin_id: m.skin_id || "roiet-default",
      published: m.published,
      notify: false,
    });
    setTab("movies");
  }

  async function deleteMovie(id: string) {
    if (!confirm("Delete this movie?")) return;
    await fetch(`/api/admin/movies?id=${id}`, { method: "DELETE" });
    setMessage("Movie deleted.");
    router.refresh();
  }

  async function addPhoto() {
    setBusy(true);
    let res: Response;
    const fileInput = document.getElementById(
      "gallery-file",
    ) as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (file) {
      const form = new FormData();
      form.set("file", file);
      form.set("title", photo.title);
      form.set("caption", photo.caption);
      if (photo.outing_date) form.set("outing_date", photo.outing_date);
      res = await fetch("/api/admin/gallery/upload", {
        method: "POST",
        body: form,
      });
    } else {
      res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...photo,
          outing_date: photo.outing_date || null,
        }),
      });
    }
    setBusy(false);
    setMessage(res.ok ? "Photo added." : "Could not add photo.");
    if (res.ok) {
      setPhoto({ title: "", caption: "", image_url: "", outing_date: "" });
      if (fileInput) fileInput.value = "";
      router.refresh();
    }
  }

  async function deletePhoto(id: string) {
    await fetch(`/api/admin/gallery?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function saveSkin() {
    setBusy(true);
    const res = await fetch("/api/admin/skins", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active_skin: siteSkin }),
    });
    setBusy(false);
    setMessage(res.ok ? "Default site skin updated." : "Could not update skin.");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "btn-primary" : "btn-ghost"}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {message ? <p className="text-sm text-[color:var(--accent-soft)]">{message}</p> : null}

      {tab === "content" ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Editable site text</h2>
          {items.map((item, idx) => (
            <label key={item.key} className="block space-y-1 text-sm">
              <span className="text-[color:var(--muted)]">{item.label || item.key}</span>
              <textarea
                className="field min-h-20"
                value={item.value}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...item, value: e.target.value };
                  setItems(next);
                }}
              />
            </label>
          ))}
          <button className="btn-primary" type="button" disabled={busy} onClick={saveContent}>
            Save text
          </button>
        </section>
      ) : null}

      {tab === "movies" ? (
        <section className="space-y-6">
          <h2 className="font-display text-2xl">
            {editingId ? "Edit movie" : "Add movie"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["title", "Title"],
                ["genre", "Genre"],
                ["rating", "Rating"],
                ["youtube_trailer_id", "YouTube trailer ID"],
                ["poster_url", "Poster image URL"],
                ["cinema", "Cinema"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block space-y-1 text-sm sm:col-span-1">
                <span className="text-[color:var(--muted)]">{label}</span>
                <input
                  className="field"
                  value={String(draft[key] ?? "")}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              </label>
            ))}
            <label className="block space-y-1 text-sm">
              <span className="text-[color:var(--muted)]">Length (minutes)</span>
              <input
                className="field"
                type="number"
                value={draft.length_minutes}
                onChange={(e) =>
                  setDraft({ ...draft, length_minutes: Number(e.target.value) })
                }
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[color:var(--muted)]">Skin</span>
              <select
                className="field"
                value={draft.skin_id}
                onChange={(e) => setDraft({ ...draft, skin_id: e.target.value })}
              >
                {skins.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[color:var(--muted)]">Showtime start</span>
              <input
                className="field"
                type="datetime-local"
                value={draft.showtime_start}
                onChange={(e) => setDraft({ ...draft, showtime_start: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[color:var(--muted)]">Showtime end</span>
              <input
                className="field"
                type="datetime-local"
                value={draft.showtime_end}
                onChange={(e) => setDraft({ ...draft, showtime_end: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm sm:col-span-2">
              <span className="text-[color:var(--muted)]">Synopsis</span>
              <textarea
                className="field min-h-24"
                value={draft.synopsis}
                onChange={(e) => setDraft({ ...draft, synopsis: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm sm:col-span-2">
              <span className="text-[color:var(--muted)]">Reviews summary</span>
              <textarea
                className="field min-h-20"
                value={draft.reviews_summary}
                onChange={(e) => setDraft({ ...draft, reviews_summary: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
              />
              Published
            </label>
            {!editingId ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.notify}
                  onChange={(e) => setDraft({ ...draft, notify: e.target.checked })}
                />
                Notify opted-in members
              </label>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" type="button" disabled={busy} onClick={saveMovie}>
              {editingId ? "Update movie" : "Add movie"}
            </button>
            {editingId ? (
              <button
                className="btn-ghost"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setDraft({ ...emptyMovie });
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
          <div className="divide-y divide-[color:var(--line)] border-t border-[color:var(--line)] pt-6">
            {movies.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-sm text-[color:var(--muted)]">{m.genre}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost" type="button" onClick={() => editMovie(m)}>
                    Edit
                  </button>
                  <button className="btn-ghost" type="button" onClick={() => deleteMovie(m.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "gallery" ? (
        <section className="space-y-6">
          <h2 className="font-display text-2xl">Gallery photos</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-[color:var(--muted)]">Title</span>
              <input
                className="field"
                value={photo.title}
                onChange={(e) => setPhoto({ ...photo, title: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[color:var(--muted)]">Outing date</span>
              <input
                className="field"
                type="date"
                value={photo.outing_date}
                onChange={(e) => setPhoto({ ...photo, outing_date: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm sm:col-span-2">
              <span className="text-[color:var(--muted)]">
                Upload to Neon Object Storage (preferred)
              </span>
              <input id="gallery-file" className="field" type="file" accept="image/*" />
            </label>
            <label className="block space-y-1 text-sm sm:col-span-2">
              <span className="text-[color:var(--muted)]">
                Or paste an image URL
              </span>
              <input
                className="field"
                value={photo.image_url}
                onChange={(e) => setPhoto({ ...photo, image_url: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm sm:col-span-2">
              <span className="text-[color:var(--muted)]">Caption</span>
              <input
                className="field"
                value={photo.caption}
                onChange={(e) => setPhoto({ ...photo, caption: e.target.value })}
              />
            </label>
          </div>
          <button className="btn-primary" type="button" disabled={busy} onClick={addPhoto}>
            Add photo
          </button>
          <div className="grid gap-4 sm:grid-cols-2">
            {photos.map((p) => (
              <figure key={p.id} className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={p.title || "Outing photo"} className="aspect-video w-full object-cover" />
                <figcaption className="flex items-start justify-between gap-3 text-sm">
                  <span>{p.title || "Untitled"}</span>
                  <button className="text-[color:var(--danger)]" type="button" onClick={() => deletePhoto(p.id)}>
                    Remove
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "skins" ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Site skin</h2>
          <p className="text-[color:var(--muted)]">
            Default look for the site. Individual movies can override with their own skin.
          </p>
          <div className="grid gap-3">
            {skins.map((s) => (
              <label key={s.id} className="flex items-start gap-3 rounded border border-[color:var(--line)] p-4">
                <input
                  type="radio"
                  name="skin"
                  checked={siteSkin === s.id}
                  onChange={() => setSiteSkin(s.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium">{s.name}</span>
                  <span className="text-sm text-[color:var(--muted)]">{s.description}</span>
                </span>
              </label>
            ))}
          </div>
          <button className="btn-primary" type="button" disabled={busy} onClick={saveSkin}>
            Save site skin
          </button>
        </section>
      ) : null}
    </div>
  );
}
