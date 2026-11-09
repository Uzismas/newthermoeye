const encoder = new TextEncoder();
import { pdfSafeText } from "../pdf-text";

export type PdfImage = { bytes: Uint8Array; width: number; height: number };

// A fixed line budget per page prevents safety text and provenance from being truncated.
export function createResearchPdf(title: string, sourceLines: string[], image?: PdfImage) {
  const lines = wrapLines(sourceLines.map(pdfSafeText), 88);
  const pages: string[][] = [];
  for (let start = 0; start < lines.length; start += 43) pages.push(lines.slice(start, start + 43));
  if (!pages.length) pages.push([]);
  const objects: Uint8Array[] = [ascii("<< /Type /Catalog /Pages 2 0 R >>"), new Uint8Array(), ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"), ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")];
  const pageIds: number[] = [];
  const pageCount = pages.length + (image ? 1 : 0);
  for (const [index, page] of pages.entries()) {
    const pageId = objects.length + 1;
    pageIds.push(pageId);
    objects.push(ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`));
    const commands = ["BT", "/F2 16 Tf", "48 744 Td", `(${escapeText(title)}) Tj`, "/F1 10 Tf", "0 -28 Td"];
    for (const line of page) commands.push(`(${escapeText(line)}) Tj`, "0 -14 Td");
    commands.push("ET", `BT /F1 9 Tf 48 36 Td (Research only | Page ${index + 1} of ${pageCount}) Tj ET`);
    objects.push(stream(ascii(commands.join("\n"))));
  }
  if (image) {
    const pageId = objects.length + 1;
    pageIds.push(pageId);
    objects.push(ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Im1 ${pageId + 2} 0 R >> >> /Contents ${pageId + 1} 0 R >>`));
    const scale = Math.min(516 / image.width, 640 / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    objects.push(stream(ascii(`BT /F2 16 Tf 48 744 Td (Source image - research only) Tj ET\nq\n${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${((612 - width) / 2).toFixed(2)} ${(60 + (640 - height) / 2).toFixed(2)} cm\n/Im1 Do\nQ\nBT /F1 9 Tf 48 36 Td (Research only | Page ${pageCount} of ${pageCount}) Tj ET`)));
    objects.push(concat([ascii(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`), image.bytes, ascii("\nendstream")]));
  }
  objects[1] = ascii(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`);
  const chunks = [ascii("%PDF-1.4\n")];
  const offsets = [0];
  let total = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(total);
    const header = ascii(`${index + 1} 0 obj\n`);
    const footer = ascii("\nendobj\n");
    chunks.push(header, object, footer);
    total += header.length + object.length + footer.length;
  });
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  chunks.push(ascii(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${total}\n%%EOF`));
  return concat(chunks);
}

export function parseJpegDataUrl(value?: string): PdfImage | undefined {
  if (!value?.startsWith("data:image/jpeg;base64,")) return undefined;
  const bytes = Uint8Array.from(Buffer.from(value.slice(23), "base64"));
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;
  for (let offset = 2; offset + 8 < bytes.length;) {
    if (bytes[offset] !== 0xff) return undefined;
    const marker = bytes[offset + 1];
    const length = bytes[offset + 2] * 256 + bytes[offset + 3];
    if (length < 2 || offset + length + 2 > bytes.length) return undefined;
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      const height = bytes[offset + 5] * 256 + bytes[offset + 6];
      const width = bytes[offset + 7] * 256 + bytes[offset + 8];
      // The browser export is RGB; other JPEG colorspaces are not embedded incorrectly.
      return width > 0 && height > 0 && bytes[offset + 9] === 3 ? { bytes, width, height } : undefined;
    }
    offset += length + 2;
  }
  return undefined;
}

function wrapLines(lines: string[], length: number) {
  return lines.flatMap((line) => {
    const tokens = line.replace(/\s+/g, " ").match(new RegExp(`.{1,${length}}(?:\\s|$)|.{1,${length}}`, "g"));
    return tokens?.map((token) => token.trim()) ?? [""];
  });
}
function escapeText(value: string) {
  return pdfSafeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function ascii(value: string) { return encoder.encode(value); }
function stream(content: Uint8Array) { return concat([ascii(`<< /Length ${content.length} >>\nstream\n`), content, ascii("\nendstream")]); }
function concat(chunks: Uint8Array[]) {
  const bytes = new Uint8Array(chunks.reduce((sum, item) => sum + item.length, 0));
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
