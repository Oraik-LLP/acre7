import type { PanoramaMetadata } from "./types";

const acceptedFormats = new Set(["png", "jpg", "jpeg", "webp"]);

export function validatePanorama(url: string, width: number, height: number): PanoramaMetadata {
  const cleanUrl = url.split(/[?#]/, 1)[0];
  const extension = cleanUrl.split(".").pop()?.toLowerCase() ?? "";
  const ratio = height > 0 && Math.abs(width / height - 2) < 0.025;
  const dimensions = Number.isFinite(width) && Number.isFinite(height) && width >= 1024 && height >= 512;
  const format = acceptedFormats.has(extension);

  return {
    width,
    height,
    format: "equirectangular",
    coverage: { horizontal: 360, vertical: 180 },
    validation: { ratio, dimensions, format, seam: "not-checked" },
  };
}

export function isValidPanorama(metadata: PanoramaMetadata) {
  return metadata.validation.ratio && metadata.validation.dimensions && metadata.validation.format;
}
