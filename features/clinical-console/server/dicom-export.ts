import type { CaseRecord } from "../types";

const encoder = new TextEncoder();
const secondaryCaptureSopClass = "1.2.840.10008.5.1.4.1.1.7";
const explicitVrLittleEndian = "1.2.840.10008.1.2.1";

export function buildDicomExport(caseRecord: CaseRecord) {
  const uid = createUid(caseRecord.id);
  const metaElements = [
    element("0002", "0001", "OB", new Uint8Array([0, 1])),
    element("0002", "0002", "UI", secondaryCaptureSopClass),
    element("0002", "0003", "UI", uid),
    element("0002", "0010", "UI", explicitVrLittleEndian),
    element("0002", "0012", "UI", "2.25.2408303001"),
  ];
  const metaBody = concat(metaElements);
  const meta = concat([
    element("0002", "0000", "UL", uint32(metaBody.length)),
    metaBody,
  ]);

  const dataset = concat([
    element("0008", "0016", "UI", secondaryCaptureSopClass),
    element("0008", "0018", "UI", uid),
    element("0008", "0060", "CS", "OT"),
    element("0008", "1030", "LO", "Thermoeye de-identified OCTA screening export"),
    element("0010", "0010", "PN", "ANONYMIZED"),
    element("0010", "0020", "LO", `TE-${caseRecord.id.replace(/[^0-9]/g, "")}`),
    element("0010", "0030", "DA", "19000101"),
    element("0020", "000D", "UI", createUid(`${caseRecord.id}-study`)),
    element("0020", "000E", "UI", createUid(`${caseRecord.id}-series`)),
    element("0020", "0013", "IS", "1"),
    element("0028", "0002", "US", uint16(1)),
    element("0028", "0004", "CS", "MONOCHROME2"),
    element("0028", "0010", "US", uint16(caseRecord.analysisMetrics?.imageHeight ?? 0)),
    element("0028", "0011", "US", uint16(caseRecord.analysisMetrics?.imageWidth ?? 0)),
    element("0028", "0100", "US", uint16(8)),
    element("0028", "0101", "US", uint16(8)),
    element("0028", "0102", "US", uint16(7)),
    element("0028", "0103", "US", uint16(0)),
    element("0040", "A160", "UT", "De-identified metadata export. Pixel data is not included; use the source scan for image review."),
  ]);

  const bytes = concat([new Uint8Array(128), encoder.encode("DICM"), meta, dataset]);
  return {
    bytes,
    fileName: `Thermoeye-${caseRecord.id.replace(/[^A-Za-z0-9-]/g, "-")}.dcm`,
  };
}

function createUid(seed: string) {
  const digits = seed.replace(/[^0-9]/g, "") || "1";
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) % 1000000000;
  return `2.25.${digits}${hash}`.slice(0, 63);
}

function element(group: string, item: string, vr: string, value: string | Uint8Array) {
  const payload = typeof value === "string" ? encodeValue(vr, value) : value;
  const groupNumber = Number.parseInt(group, 16);
  const itemNumber = Number.parseInt(item, 16);
  const tag = new Uint8Array([groupNumber & 0xff, groupNumber >>> 8, itemNumber & 0xff, itemNumber >>> 8]);
  const vrBytes = encoder.encode(vr);
  const longVr = vr === "OB" || vr === "OW" || vr === "OF" || vr === "SQ" || vr === "UT" || vr === "UN";
  const header = longVr ? concat([tag, vrBytes, new Uint8Array(2), uint32(payload.length)]) : concat([tag, vrBytes, uint16(payload.length)]);
  return concat([header, payload]);
}

function encodeValue(vr: string, value: string) {
  const padded = value.length % 2 === 0 ? value : `${value}${vr === "UI" ? "\0" : " "}`;
  return encoder.encode(padded);
}

function uint16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
