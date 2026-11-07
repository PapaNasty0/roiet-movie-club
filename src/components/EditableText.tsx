"use client";

import {
  useEffect,
  useId,
  useState,
  type ElementType,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";

type EditableTextProps = {
  contentKey: string;
  value: string;
  isAdmin: boolean;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  inline?: boolean;
  /** When set, render the text as a Next.js Link (safe from Server Components). */
  href?: string;
  linkClassName?: string;
  children?: ReactNode;
};

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function EditableText({
  contentKey,
  value,
  isAdmin,
  as: Tag = "span",
  className,
  multiline = false,
  inline,
  href,
  linkClassName,
  children,
}: EditableTextProps) {
  const router = useRouter();
  const titleId = useId();
  const [display, setDisplay] = useState(value);
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setDisplay(value);
    setDraft(value);
  }, [value]);

  const useInline = inline ?? (Tag === "span" || Boolean(href));
  const Wrapper: ElementType = useInline ? "span" : "div";

  let contentNode: ReactNode;
  if (href) {
    contentNode = (
      <Link href={href} className={linkClassName || className}>
        {display}
      </Link>
    );
  } else if (children != null) {
    contentNode = <Tag className={className}>{children}</Tag>;
  } else {
    contentNode = <Tag className={className}>{display}</Tag>;
  }

  if (!isAdmin) {
    return <>{contentNode}</>;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ key: contentKey, value: draft }],
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Could not save. Try again.");
      return;
    }
    setDisplay(draft);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Wrapper className={`editable is-admin${useInline ? " editable-inline" : ""}`}>
        <button
          type="button"
          className="pencil"
          aria-label={`Edit ${contentKey}`}
          title="Edit text"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDraft(display);
            setError("");
            setOpen(true);
          }}
        >
          <PencilIcon />
        </button>
        {contentNode}
      </Wrapper>

      {mounted && open
        ? createPortal(
            <div
              className="editable-sheet-backdrop"
              role="presentation"
              onClick={() => !busy && setOpen(false)}
            >
              <form
                className="editable-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(e) => e.stopPropagation()}
                onSubmit={save}
              >
                <h2 id={titleId} className="font-display text-xl">
                  Edit text
                </h2>
                <p className="mt-1 text-xs text-[color:var(--muted)]">{contentKey}</p>
                {multiline ? (
                  <textarea
                    className="field mt-4 min-h-32"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <input
                    className="field mt-4"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    autoFocus
                  />
                )}
                {error ? (
                  <p className="mt-2 text-sm text-[color:var(--danger)]">{error}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button className="btn-primary" type="submit" disabled={busy}>
                    {busy ? "Saving…" : "Save"}
                  </button>
                  <button
                    className="btn-ghost"
                    type="button"
                    disabled={busy}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
