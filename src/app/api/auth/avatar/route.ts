import { NextResponse } from "next/server";
import {
  getStoredAvatarUrl,
  requireUser,
  updateAvatarUrl,
} from "@/lib/auth";
import {
  dataUrlFromUpload,
  deleteStoredImage,
  resolveImageUrl,
  storageConfigured,
  uploadAvatarObject,
} from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_DATA_URL_BYTES = 400 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected a photo upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a photo first" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, WebP, or GIF photo" },
      { status: 400 },
    );
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Photo is too large (max 2MB)" },
      { status: 400 },
    );
  }

  const body = Buffer.from(await file.arrayBuffer());
  let nextRef: string;

  if (storageConfigured()) {
    const uploaded = await uploadAvatarObject({
      userId: user.id,
      body,
      contentType: file.type,
      filename: file.name,
    });
    nextRef = uploaded.ref;
  } else {
    if (body.length > MAX_DATA_URL_BYTES) {
      return NextResponse.json(
        {
          error:
            "Photo is too large for local storage (max 400KB). Ask an admin to enable Object Storage, or pick a smaller photo.",
        },
        { status: 503 },
      );
    }
    nextRef = dataUrlFromUpload({ body, contentType: file.type });
  }

  const previous = await getStoredAvatarUrl(user.id);
  const updated = await updateAvatarUrl(user.id, nextRef);
  if (!updated) {
    return NextResponse.json({ error: "Could not save photo" }, { status: 500 });
  }

  if (previous && previous !== nextRef) {
    await deleteStoredImage(previous).catch(() => undefined);
  }

  return NextResponse.json(
    {
      user: {
        ...updated,
        avatar_url: await resolveImageUrl(updated.avatar_url),
      },
    },
    { status: 200, headers: { "cache-control": "private, no-store" } },
  );
}

export async function DELETE() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const previous = await getStoredAvatarUrl(user.id);
  const updated = await updateAvatarUrl(user.id, "");
  if (!updated) {
    return NextResponse.json({ error: "Could not remove photo" }, { status: 500 });
  }
  if (previous) {
    await deleteStoredImage(previous).catch(() => undefined);
  }

  return NextResponse.json(
    { user: { ...updated, avatar_url: "" } },
    { headers: { "cache-control": "private, no-store" } },
  );
}
