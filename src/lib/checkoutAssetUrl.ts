/**
 * URL for displaying seller payment QR in the browser.
 * Prefer the API’s absolute `payment_qr_url` (streams via Laravel, avoids CDN 422 on static paths).
 * Root-relative URLs are resolved against `window.location.origin` for local dev; avoid `next/image` for these.
 */
export function checkoutQrImageSrc(url: string | null | undefined): string {
  if (url == null || typeof url !== "string") return "";
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (typeof window !== "undefined" && u.startsWith("/")) {
    return `${window.location.origin}${u}`;
  }
  return u;
}
