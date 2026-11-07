import { NextResponse } from "next/server";
import { neonAuth, neonAuthConfigured } from "@/lib/neon-auth-server";

function unavailable() {
  return NextResponse.json(
    { error: "Neon Auth is not configured on this environment" },
    { status: 503 },
  );
}

const handlers = neonAuthConfigured() && neonAuth ? neonAuth.handler() : null;

export const GET = handlers?.GET ?? unavailable;
export const POST = handlers?.POST ?? unavailable;
export const PUT = handlers?.PUT ?? unavailable;
export const DELETE = handlers?.DELETE ?? unavailable;
export const PATCH = handlers?.PATCH ?? unavailable;
