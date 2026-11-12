export const PDF_OMITTED_NOTE = "[non-Latin text omitted here - use Print / Save as PDF in the console for the full text]";

/** The bundled PDF writer uses an ASCII font. Never emit corrupted glyphs: drop unsupported text and mark the omission. */
export function pdfSafeText(value: string): string {
  const text = value.replace(/[\u2010-\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"').replace(/\u00b7/g, " / ").replace(/\u00d7/g, " x ").replace(/\u00a0/g, " ");
  if (!/[^\x20-\x7e\r\n\t]/.test(text)) return text;
  return `${text.replace(/[^\x20-\x7e\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim()} ${PDF_OMITTED_NOTE}`.trim();
}
