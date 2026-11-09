/** The bundled PDF writer uses an ASCII font. Refuse unsupported content rather than corrupt it. */
export function pdfSafeText(value: string): string {
  const text = value.replace(/[\u2010-\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"').replace(/\u00b7/g, " / ").replace(/\u00d7/g, " x ").replace(/\u00a0/g, " ");
  if (/[^\x20-\x7e\r\n\t]/.test(text)) {
    throw new Error("PDF export cannot render this text with the installed font. Unicode notes remain available in the console; an embedded Unicode font renderer is required for this PDF.");
  }
  return text;
}
