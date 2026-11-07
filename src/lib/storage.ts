import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

/** Neon Object Storage bucket declared in neon.ts */
export const GALLERY_BUCKET = "assets";

const STORAGE_PREFIX = "neon:assets/";

let client: S3Client | null = null;

export function storageConfigured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID?.trim() &&
      process.env.AWS_SECRET_ACCESS_KEY?.trim() &&
      process.env.AWS_ENDPOINT_URL_S3?.trim() &&
      process.env.AWS_REGION?.trim(),
  );
}

function getClient(): S3Client {
  if (!storageConfigured()) {
    throw new Error("Neon Object Storage env vars are not configured");
  }
  client ??= new S3Client({
    region: process.env.AWS_REGION!.trim(),
    endpoint: process.env.AWS_ENDPOINT_URL_S3!.trim(),
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
    },
  });
  return client;
}

export function isNeonStorageRef(value: string): boolean {
  return value.startsWith(STORAGE_PREFIX);
}

export function storageKeyFromRef(value: string): string | null {
  if (!isNeonStorageRef(value)) return null;
  return value.slice(STORAGE_PREFIX.length);
}

export function storageRefFromKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export async function uploadGalleryObject(input: {
  body: Buffer;
  contentType: string;
  filename?: string;
}): Promise<{ key: string; ref: string }> {
  const ext = guessExt(input.contentType, input.filename);
  const key = `gallery/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;
  await getClient().send(
    new PutObjectCommand({
      Bucket: GALLERY_BUCKET,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: "private, max-age=3600",
    }),
  );
  return { key, ref: storageRefFromKey(key) };
}

export async function presignGalleryObject(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: GALLERY_BUCKET, Key: key }),
    { expiresIn },
  );
}

export async function deleteGalleryObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: GALLERY_BUCKET, Key: key }),
  );
}

export async function resolveImageUrl(imageUrl: string): Promise<string> {
  const key = storageKeyFromRef(imageUrl);
  if (!key) return imageUrl;
  if (!storageConfigured()) return imageUrl;
  return presignGalleryObject(key);
}

function guessExt(contentType: string, filename?: string): string {
  if (filename && /\.[a-z0-9]+$/i.test(filename)) {
    return filename.slice(filename.lastIndexOf(".")).toLowerCase();
  }
  switch (contentType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".jpg";
  }
}
