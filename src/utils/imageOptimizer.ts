/**
 * Image Optimizer for Cinema
 * Automatically compresses and sizes TMDB, IMDb, Metahub, and provider images
 * with optimal resolution and quality compression so pages load instantly on first open.
 */

export type ImageType = "backdrop" | "poster" | "card" | "avatar" | "thumb" | "logo";

export function optimizeImage(
  url: string | null | undefined,
  type: ImageType = "poster"
): string {
  if (!url) return "";
  const clean = url.trim();
  if (!clean) return "";

  // 1. TMDB Images (image.tmdb.org)
  if (clean.includes("image.tmdb.org/t/p/")) {
    if (type === "backdrop") {
      // w1280 gives crystal-clear 1080p/2K resolution while reducing weight from ~10MB to ~200KB
      return clean.replace(/\/t\/p\/(?:original|w\d+)\//, "/t/p/w1280/");
    }
    if (type === "poster" || type === "card" || type === "logo") {
      // w500 is optimal for high-DPI portrait cards and sharp transparent logos (~40KB)
      return clean.replace(/\/t\/p\/(?:original|w\d+)\//, "/t/p/w500/");
    }
    if (type === "avatar" || type === "thumb") {
      // w185 for cast headshots and thumbnail previews (~15KB)
      return clean.replace(/\/t\/p\/(?:original|w\d+)\//, "/t/p/w185/");
    }
  }

  // 2. IMDb / Amazon Media Images (media-amazon.com/images/M/)
  // Use IMDb's built-in QL75 (75% quality JPEG) and responsive max width constraint
  if (clean.includes("media-amazon.com/images/M/")) {
    if (type === "backdrop") {
      return clean.replace(/\._V1_.*?\.(jpg|jpeg|png)$/i, "._V1_FMjpg_QL75_UX1280_.$1");
    }
    if (type === "poster" || type === "card") {
      return clean.replace(/\._V1_.*?\.(jpg|jpeg|png)$/i, "._V1_FMjpg_QL75_UX450_.$1");
    }
    if (type === "avatar" || type === "thumb") {
      return clean.replace(/\._V1_.*?\.(jpg|jpeg|png)$/i, "._V1_FMjpg_QL75_UX200_.$1");
    }
  }

  // 3. Metahub Space Images
  if (clean.includes("images.metahub.space/")) {
    if (type === "backdrop") {
      return clean.replace(/\/background\/(?:small|medium)\//, "/background/large/");
    }
    if (type === "poster" || type === "card") {
      return clean.replace(/\/poster\/(?:small|large)\//, "/poster/medium/");
    }
  }

  return clean;
}
