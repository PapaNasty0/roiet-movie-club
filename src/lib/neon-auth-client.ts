"use client";

import { createAuthClient } from "@neon/auth/next";

/** Browser client for Neon Auth; talks to same-origin `/api/auth/*` proxy. */
export const neonAuthClient = createAuthClient();
