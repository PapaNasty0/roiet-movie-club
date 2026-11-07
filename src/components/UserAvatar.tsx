type Size = "sm" | "md" | "lg";

const sizeClass: Record<Size, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
};

function initialsFor(name: string, email?: string): string {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

export function UserAvatar({
  name,
  email,
  src,
  size = "sm",
  className = "",
}: {
  name: string;
  email?: string;
  src?: string | null;
  size?: Size;
  className?: string;
}) {
  const label = name || email || "Member";
  const classes = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--line)] bg-[color:var(--bg-mid)] font-medium text-[color:var(--accent-soft)] ${sizeClass[size]} ${className}`;

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        title={label}
        className={`${classes} object-cover`}
      />
    );
  }

  return (
    <span className={classes} title={label} aria-hidden={!name}>
      {initialsFor(name, email)}
    </span>
  );
}
