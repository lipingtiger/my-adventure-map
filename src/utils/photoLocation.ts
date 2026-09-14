import { parse } from "exifr";

export type PhotoPosition = { latitude: number; longitude: number };
export type PhotoLocation =
  | { status: "located"; position: PhotoPosition }
  | { status: "missing" | "invalid" | "unreadable" };

function coordinate(value: unknown, ref: unknown, latitude: boolean): number | null {
  const limit = latitude ? 90 : 180;
  let direction = typeof ref === "string" ? ref.trim().toUpperCase() : "";
  let result: number;
  if (typeof value === "string") {
    // XMP coordinates use degrees and decimal minutes, or degrees/minutes/seconds.
    const match = value.trim().match(/^([+-]?\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?){0,2})\s*([NSEW])?$/i);
    if (!match) return null;
    direction = match[2]?.toUpperCase() || direction;
    const parts = match[1].split(",").map(Number);
    value = parts.length === 1 ? parts[0] : parts;
  }
  if (Array.isArray(value)) {
    if (value.length < 2 || value.length > 3 || !direction ||
      !value.every((part) => typeof part === "number" && Number.isFinite(part)) ||
      value[0] < 0 || value[1] < 0 || value[1] >= 60 || (value[2] ?? 0) < 0 || (value[2] ?? 0) >= 60) return null;
    result = value[0] + value[1] / 60 + (value[2] ?? 0) / 3600;
  } else if (typeof value === "number" && Number.isFinite(value)) result = value;
  else return null;
  if (direction) {
    if (!(latitude ? ["N", "S"] : ["E", "W"]).includes(direction)) return null;
    result = Math.abs(result) * (["S", "W"].includes(direction) ? -1 : 1);
  }
  return Math.abs(result) <= limit ? result : null;
}

export function positionFromMetadata(tags: Record<string, unknown> | undefined): PhotoPosition | null {
  if (!tags) return null;
  const raw = "GPSLatitude" in tags || "GPSLongitude" in tags;
  const latitude = coordinate(raw ? tags.GPSLatitude : tags.latitude, tags.GPSLatitudeRef, true);
  const longitude = coordinate(raw ? tags.GPSLongitude : tags.longitude, tags.GPSLongitudeRef, false);
  return latitude === null || longitude === null ? null : { latitude, longitude };
}

export async function readPhotoLocation(file: Blob): Promise<PhotoLocation> {
  let bytes: ArrayBuffer;
  try { bytes = await file.arrayBuffer(); } catch { return { status: "unreadable" }; }
  let parsed = false, hasGps = false;
  // Read EXIF and XMP separately so empty EXIF tags cannot hide valid XMP coordinates.
  for (const options of [{ tiff: true, xmp: false }, { tiff: false, xmp: true }]) {
    try {
      const tags = await parse(bytes, options);
      parsed = true;
      hasGps ||= Object.keys(tags ?? {}).some((key) => /^(GPSLatitude|GPSLongitude|latitude|longitude)/.test(key));
      const position = positionFromMetadata(tags);
      if (position) return { status: "located", position };
    } catch { /* A damaged metadata block must not prevent reading the other format. */ }
  }
  return { status: hasGps ? "invalid" : parsed ? "missing" : "unreadable" };
}

export function photoLocationMessage(status: Exclude<PhotoLocation["status"], "located">): string {
  if (status === "invalid") return "GPS fields are empty or invalid; location may have been removed before upload.";
  if (status === "unreadable") return "Location metadata could not be read from this file.";
  return "This file has no embedded GPS location.";
}

export function prepareHighlightFile(file: File): File {
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose an image under 10 MB.");
  const formats: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
  const type = file.type || formats[file.name.split(".").pop()?.toLowerCase() ?? ""];
  if (!Object.values(formats).includes(type)) throw new Error("Choose a JPG, PNG, WebP or GIF image.");
  return file.type ? file : new File([file], file.name, { type, lastModified: file.lastModified });
}
