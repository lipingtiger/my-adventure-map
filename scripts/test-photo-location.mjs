import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import ts from "typescript";

const exifrUrl = pathToFileURL(`${process.cwd()}/node_modules/exifr/dist/full.esm.mjs`).href;
const source = ts.transpileModule(readFileSync("src/utils/photoLocation.ts", "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText.replace('"exifr"', JSON.stringify(exifrUrl));
const { positionFromMetadata, readPhotoLocation, prepareHighlightFile } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

function segment(payload) {
  const length = payload.length + 2;
  return Buffer.concat([Buffer.from([0xff, 0xe1, length >> 8, length & 255]), payload]);
}
function jpeg(...segments) { return new Blob([Buffer.from([0xff, 0xd8]), ...segments, Buffer.from([0xff, 0xd9])], { type: "image/jpeg" }); }
function exif(redacted = false) {
  const tiff = Buffer.alloc(128);
  tiff.write("II"); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x8825, 10); tiff.writeUInt16LE(4, 12); tiff.writeUInt32LE(1, 14); tiff.writeUInt32LE(26, 18);
  tiff.writeUInt16LE(4, 26);
  for (const [index, tag, type, count, value] of [[0,1,2,2,78],[1,2,5,3,80],[2,3,2,2,87],[3,4,5,3,104]]) {
    const offset = 28 + index * 12;
    tiff.writeUInt16LE(tag, offset); tiff.writeUInt16LE(type, offset + 2);
    tiff.writeUInt32LE(count, offset + 4); tiff.writeUInt32LE(redacted && type === 2 ? 0 : value, offset + 8);
  }
  for (const [index, value] of [43, 30, 0, 79, 15, 0].entries()) {
    tiff.writeUInt32LE(redacted ? 0 : value, 80 + index * 8);
    tiff.writeUInt32LE(redacted ? 0 : 1, 84 + index * 8);
  }
  return segment(Buffer.concat([Buffer.from("Exif\0\0"), tiff]));
}
function xmp() {
  return segment(Buffer.from('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" exif:GPSLatitude="43,30N" exif:GPSLongitude="79,15W"/></rdf:RDF></x:xmpmeta>'));
}
test("reads GPS from an original EXIF JPEG", async () => {
  assert.deepEqual(await readPhotoLocation(jpeg(exif())), { status: "located", position: { latitude: 43.5, longitude: -79.25 } });
});
test("empty/redacted rationals are invalid, never mapped to zero", async () => {
  assert.deepEqual(await readPhotoLocation(jpeg(exif(true))), { status: "invalid" });
});
test("reads XMP-only GPS and falls back when EXIF is redacted", async () => {
  for (const file of [jpeg(xmp()), jpeg(exif(true), xmp())]) {
    assert.deepEqual(await readPhotoLocation(file), { status: "located", position: { latitude: 43.5, longitude: -79.25 } });
  }
});
test("distinguishes missing metadata from unreadable input", async () => {
  assert.deepEqual(await readPhotoLocation(jpeg()), { status: "missing" });
  assert.deepEqual(await readPhotoLocation(new Blob(["not a photo"])), { status: "unreadable" });
});
test("coordinate validation preserves zero and hemisphere and rejects incomplete values", () => {
  assert.deepEqual(positionFromMetadata({ GPSLatitude: [0,0,0], GPSLatitudeRef: "N", GPSLongitude: [0,0,0], GPSLongitudeRef: "E" }), { latitude: 0, longitude: 0 });
  assert.deepEqual(positionFromMetadata({ GPSLatitude: "33,30,0S", GPSLongitude: "151,12E" }), { latitude: -33.5, longitude: 151.2 });
  for (const tags of [{latitude:null,longitude:null}, {latitude:91,longitude:10}, {latitude:NaN,longitude:0}, {latitude:1},
    {GPSLatitude:[10,0,0],GPSLongitude:[20,0,0]}, {GPSLatitude:"43,60N",GPSLongitude:"79,0W"},
    {GPSLatitude:"43,30E",GPSLongitude:"79,0W"}, {GPSLatitude:[NaN,NaN,NaN],GPSLongitude:[NaN,NaN,NaN],latitude:0,longitude:0}]) {
    assert.equal(positionFromMetadata(tags), null);
  }
});
test("generic file picker accepts supported originals without changing bytes", async () => {
  const file = new File(["original bytes"], "PHOTO.JPG");
  const prepared = prepareHighlightFile(file);
  assert.equal(prepared.type, "image/jpeg"); assert.equal(await prepared.text(), await file.text());
  assert.throws(() => prepareHighlightFile(new File(["no"], "notes.txt")));
  assert.throws(() => prepareHighlightFile(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.jpg")));
});
