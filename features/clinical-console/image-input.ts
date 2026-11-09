export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// Token boundaries avoid rejecting 'surface' or 'interface' exports.
export const NON_OCT_FILENAME = /(?:^|[^a-z])(acne|skin|face|portrait|selfie|person|people|fundus)(?:[^a-z]|$)/i;

export function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if ([137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v)) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if ((bytes[0] === 73 && bytes[1] === 73 && bytes[2] === 42 && bytes[3] === 0) || (bytes[0] === 77 && bytes[1] === 77 && bytes[2] === 0 && bytes[3] === 42)) return "image/tiff";
  return null;
}
export function mimeMatches(declared: string, detected: string): boolean {
  const mime = declared.toLowerCase().split(";", 1)[0];
  return !mime || mime === "application/octet-stream" || mime === detected || (detected === "image/tiff" && ["image/tif", "image/x-tiff"].includes(mime));
}
