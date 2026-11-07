import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import type { User } from "@/lib/types";
import type { Skin } from "@/lib/types";

const links = [
  { href: "/movies", label: "Movies" },
  { href: "/forum", label: "Forum" },
  { href: "/gallery", label: "Gallery" },
];

export function SiteShell({
  brand,
  skin,
  user,
  children,
}: {
  brand: string;
  skin: Skin;
  user: User | null;
  children: ReactNode;
}) {
  const style = {
    ...skin.css_vars,
    backgroundColor: "var(--bg-deep)",
    color: "var(--ink)",
  } as CSSProperties;

  return (
    <div className="site-root min-h-screen" style={style}>
      <div className="atmosphere" aria-hidden />
      <header className="relative z-20 border-b border-[color:var(--line)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="font-display text-lg tracking-wide text-[color:var(--ink)] sm:text-xl">
            {brand}
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-[color:var(--muted)]">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="transition hover:text-[color:var(--accent-soft)]">
                {l.label}
              </Link>
            ))}
            {user?.is_admin ? (
              <Link href="/admin" className="text-[color:var(--accent)]">
                Admin
              </Link>
            ) : null}
            <Link
              href="/account"
              className="inline-flex items-center gap-2 transition hover:text-[color:var(--accent-soft)]"
            >
              <span>Account</span>
              {user ? (
                <UserAvatar
                  name={user.name}
                  email={user.email}
                  src={user.avatar_url || null}
                  size="sm"
                />
              ) : null}
            </Link>
          </nav>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
      <footer className="relative z-10 mt-20 border-t border-[color:var(--line)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-[color:var(--muted)] sm:px-6">
          <p>{brand} · Robinson Roi Et / Major Cineplex</p>
          <p>English-language screenings for foreigners, students, and teachers in RoiEt.</p>
        </div>
      </footer>
    </div>
  );
}
