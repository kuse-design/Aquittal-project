import { afterEach, describe, expect, it, vi } from "vitest";
import { getScaledImageDimensions, optimizeProductImage } from "../client/src/lib/imageOptimization";

describe("getScaledImageDimensions", () => {
  it("keeps small photos at their original dimensions", () => {
    expect(getScaledImageDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("bounds a large portrait photo while preserving its aspect ratio", () => {
    expect(getScaledImageDimensions(4000, 5000)).toEqual({ width: 1280, height: 1600 });
  });

  it("bounds a large landscape photo while preserving its aspect ratio", () => {
    expect(getScaledImageDimensions(3200, 1800)).toEqual({ width: 1600, height: 900 });
  });

  it("rejects invalid dimensions", () => {
    expect(() => getScaledImageDimensions(0, 200)).toThrow(RangeError);
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("optimizeProductImage", () => {
  it("resizes oversized photos and returns WebP when it is smaller", async () => {
    const drawImage = vi.fn();
    const webp = new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" });
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        imageSmoothingEnabled: false,
        imageSmoothingQuality: "low",
        drawImage,
      })),
      toBlob: vi.fn((callback: BlobCallback) => callback(webp)),
    } as unknown as HTMLCanvasElement;
    const bitmap = { width: 3200, height: 1800, close: vi.fn() };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
    const source = Object.assign(new Blob([new Uint8Array(500)], { type: "image/jpeg" }), { name: "shirt.jpg" }) as File;

    const result = await optimizeProductImage(source);

    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(900);
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1600, 900);
    expect(bitmap.close).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ fileName: "shirt.webp", contentType: "image/webp", contentBase64: "AQID" });
  });

  it("preserves and encodes the original image when browser canvas APIs are unavailable", async () => {
    vi.stubGlobal("createImageBitmap", undefined);
    vi.stubGlobal("document", undefined);
    const source = Object.assign(new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), { name: "look.png" }) as File;

    await expect(optimizeProductImage(source)).resolves.toEqual({
      fileName: "look.png",
      contentType: "image/png",
      contentBase64: "AQID",
    });
  });
});
