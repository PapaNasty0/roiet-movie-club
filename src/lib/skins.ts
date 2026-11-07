import type { CSSProperties } from "react";
import type { Skin } from "./types";

export const DEFAULT_SKIN: Skin = {
  id: "roiet-default",
  name: "RoiEt Night Out",
  description: "Midnight teal cinema lobby with warm gold accents.",
  css_vars: {
    "--bg-deep": "#07141a",
    "--bg-mid": "#0f2a33",
    "--bg-glow": "#1a4a52",
    "--ink": "#f4efe6",
    "--muted": "#b7c5c8",
    "--accent": "#e6b35a",
    "--accent-soft": "#f0d29a",
    "--line": "rgba(244, 239, 230, 0.14)",
    "--danger": "#e07a6a",
  },
  hero_overlay:
    "radial-gradient(ellipse 80% 60% at 70% 20%, rgba(230,179,90,0.22), transparent 55%), radial-gradient(ellipse 70% 50% at 15% 80%, rgba(26,74,82,0.55), transparent 50%), linear-gradient(180deg, rgba(7,20,26,0.35), rgba(7,20,26,0.92))",
  is_default: true,
};

export const NOIR_SKIN: Skin = {
  id: "amber-noir",
  name: "Amber Noir",
  description: "Example per-movie skin — charcoal base with copper highlights.",
  css_vars: {
    "--bg-deep": "#0c0a09",
    "--bg-mid": "#1c1410",
    "--bg-glow": "#3a2418",
    "--ink": "#f7f1ea",
    "--muted": "#cbb8a8",
    "--accent": "#d4894a",
    "--accent-soft": "#e8b48a",
    "--line": "rgba(247, 241, 234, 0.12)",
    "--danger": "#d76b5c",
  },
  hero_overlay:
    "radial-gradient(ellipse 70% 55% at 80% 10%, rgba(212,137,74,0.28), transparent 50%), linear-gradient(160deg, rgba(12,10,9,0.2), rgba(12,10,9,0.9))",
  is_default: false,
};

export function skinStyle(skin: Skin | null | undefined): CSSProperties {
  const vars = skin?.css_vars ?? DEFAULT_SKIN.css_vars;
  return vars as CSSProperties;
}
