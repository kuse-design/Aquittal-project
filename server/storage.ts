import { v2 as cloudinary } from "cloudinary";
import { nanoid } from "nanoid";
import { ENV } from "./_core/env";

/**
 * Image storage backed by Cloudinary.
 *
 * `storageKey` values look like "store-products/<id>.<format>" so they round-trip
 * through storageGet/storageDelete without an extra database lookup.
 */

let configured = false;

function getConfig() {
  const { cloudName, apiKey, apiSecret } = ENV;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Storage config missing: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET",
    );
  }
  if (!configured) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    configured = true;
  }
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/** Splits "store-products/abc.webp" into the Cloudinary public id and format. */
function splitKey(relKey: string): { publicId: string; format?: string } {
  const key = normalizeKey(relKey);
  const lastDot = key.lastIndexOf(".");
  const lastSlash = key.lastIndexOf("/");
  if (lastDot > lastSlash + 1) {
    return { publicId: key.slice(0, lastDot), format: key.slice(lastDot + 1) };
  }
  return { publicId: key };
}

function withUniqueSuffix(relKey: string): string {
  const hash = nanoid(8).toLowerCase();
  const { publicId, format } = splitKey(relKey);
  return format ? `${publicId}_${hash}.${format}` : `${publicId}_${hash}`;
}

const CONTENT_TYPE_FORMATS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  getConfig();

  const { publicId } = splitKey(withUniqueSuffix(relKey));
  const format = CONTENT_TYPE_FORMATS[contentType];
  const blob = typeof data === "string" ? Buffer.from(data) : Buffer.from(data as Uint8Array);
  const payload = `data:${contentType};base64,${blob.toString("base64")}`;

  const uploaded = await cloudinary.uploader.upload(payload, {
    public_id: publicId,
    resource_type: "image",
    ...(format ? { format } : {}),
    overwrite: false,
    invalidate: true,
  });

  const storedFormat = uploaded.format ?? format;
  return {
    key: storedFormat ? `${publicId}.${storedFormat}` : publicId,
    url: uploaded.secure_url,
  };
}

export function storageGet(relKey: string): { key: string; url: string } {
  getConfig();
  const { publicId, format } = splitKey(relKey);
  return {
    key: normalizeKey(relKey),
    url: cloudinary.url(publicId, {
      resource_type: "image",
      secure: true,
      ...(format ? { format } : {}),
    }),
  };
}

export async function storageDelete(relKey: string): Promise<void> {
  getConfig();
  const { publicId } = splitKey(relKey);
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}
