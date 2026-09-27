export type SupportedImageContentType = "image/jpeg" | "image/png" | "image/webp";

export interface ImageUploadPayload {
  fileName: string;
  contentType: SupportedImageContentType;
  contentBase64: string;
}

const supportedTypes = new Set<SupportedImageContentType>(["image/jpeg", "image/png", "image/webp"]);
export const MAX_PRODUCT_IMAGE_EDGE = 1600;

export function getScaledImageDimensions(width: number, height: number, maxEdge = MAX_PRODUCT_IMAGE_EDGE) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError("Image dimensions must be positive finite numbers.");
  }
  if (!Number.isFinite(maxEdge) || maxEdge <= 0) {
    throw new RangeError("Maximum image edge must be a positive finite number.");
  }

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    const end = Math.min(bytes.length, offset + 0x8000);
    let chunk = "";
    for (let index = offset; index < end; index += 1) chunk += String.fromCharCode(bytes[index]);
    chunks.push(chunk);
  }
  return btoa(chunks.join(""));
}

async function encodeOriginal(file: File): Promise<ImageUploadPayload> {
  if (!supportedTypes.has(file.type as SupportedImageContentType)) {
    throw new Error("Use a JPEG, PNG, or WebP image.");
  }
  return {
    fileName: file.name,
    contentType: file.type as SupportedImageContentType,
    contentBase64: await blobToBase64(file),
  };
}

/** Downscales oversized photos and uses WebP only when the browser produces a smaller file. */
export async function optimizeProductImage(file: File): Promise<ImageUploadPayload> {
  if (!supportedTypes.has(file.type as SupportedImageContentType)) {
    throw new Error("Use a JPEG, PNG, or WebP image.");
  }
  if (typeof createImageBitmap === "undefined" || typeof document === "undefined") {
    return encodeOriginal(file);
  }

  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const dimensions = getScaledImageDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext("2d");
    if (!context) return encodeOriginal(file);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

    const webp = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!webp || webp.type !== "image/webp" || webp.size >= file.size) return encodeOriginal(file);

    const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "product-image";
    return {
      fileName: `${baseName}.webp`,
      contentType: "image/webp",
      contentBase64: await blobToBase64(webp),
    };
  } catch {
    return encodeOriginal(file);
  } finally {
    bitmap?.close();
  }
}
