/**
 * Backfill missing thumbnail images for PDF resources in Sanity.
 * Uses only Node built-ins and Poppler's pdftoppm.
 * Existing cover images are never replaced.
 */
import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {promisify} from "node:util";
import {execFile} from "node:child_process";

const exec = promisify(execFile);
const projectId = "u5d5zn7n";
const dataset = "schoolv2";
const api = `https://${projectId}.api.sanity.io/v2026-11-01`;
const token = process.env.SANITY_AUTH_TOKEN;
if (!token) throw new Error("SANITY_AUTH_TOKEN is required");

async function sanity(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {Authorization: `Bearer ${token}`, ...options.headers},
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Sanity HTTP ${res.status}: ${(await res.text()).slice(0, 800)}`);
  return res.json();
}

const query = `*[_type == "chapter" && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && count(pdfResources) > 0] {
  _id, _rev,
  pdfResources[]{
    _key, title,
    "hasCover": defined(coverImage.asset._ref),
    "url": file.asset->url
  }
}`;
const {result: chapters = []} = await sanity(
  `${api}/data/query/${dataset}?query=${encodeURIComponent(query)}`
);
let saved = 0;
let failed = 0;

for (const chapter of chapters) {
  const missing = (chapter.pdfResources || []).filter(
    (pdf) => !pdf.hasCover &&
      /^[a-zA-Z0-9_-]{1,128}$/.test(pdf._key || "") &&
      typeof pdf.url === "string" &&
      pdf.url.startsWith(`https://cdn.sanity.io/files/${projectId}/${dataset}/`) &&
      pdf.url.split("?")[0].toLowerCase().endsWith(".pdf")
  );
  if (!missing.length) continue;
  const updates = {};
  for (const pdf of missing) {
    const temp = await mkdtemp(join(tmpdir(), "school-pdf-cover-"));
    try {
      const response = await fetch(pdf.url, {signal: AbortSignal.timeout(120000)});
      if (!response.ok) throw new Error(`PDF HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 8 || bytes.length > 100 * 1024 * 1024 || bytes.subarray(0, 5).toString() !== "%PDF-") {
        throw new Error("Invalid PDF or file too large");
      }
      const source = join(temp, "source.pdf");
      const cover = join(temp, "cover");
      await writeFile(source, bytes);
      await exec("pdftoppm", [
        "-f", "1", "-l", "1", "-singlefile", "-scale-to", "900",
        "-jpeg", "-jpegopt", "quality=82", source, cover,
      ], {timeout: 120000});
      const image = await readFile(`${cover}.jpg`);
      const filename = `chapter-${chapter._id}-${pdf._key}-cover.jpg`;
      const uploaded = await sanity(
        `${api}/assets/images/${dataset}?filename=${encodeURIComponent(filename)}`,
        {method: "POST", headers: {"Content-Type": "image/jpeg"}, body: image}
      );
      const imageId = uploaded.document?._id;
      if (!/^image-[a-z0-9]+-\d+x\d+-[a-z]+$/.test(imageId || "")) {
        throw new Error("Invalid image asset ID returned by Sanity");
      }
      updates[`pdfResources[_key=="${pdf._key}"].coverImage`] = {
        _type: "image", asset: {_type: "reference", _ref: imageId}
      };
      console.log(`Created preview for ${chapter._id} / ${pdf._key}`);
    } catch (err) {
      failed++;
      console.error(`Failed: ${chapter._id} / ${pdf._key}: ${err.message}`);
    } finally {
      await rm(temp, {recursive: true, force: true});
    }
  }
  if (!Object.keys(updates).length) continue;
  try {
    await sanity(`${api}/data/mutate/${dataset}?visibility=sync`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        mutations: [{patch: {id: chapter._id, ifRevisionID: chapter._rev, set: updates}}],
        returnDocuments: false
      })
    });
    saved += Object.keys(updates).length;
  } catch (err) {
    failed += Object.keys(updates).length;
    console.error(`Failed to save covers for ${chapter._id}: ${err.message}`);
  }
}
console.log(`Saved ${saved} previews; failures: ${failed}`);
if (failed) process.exitCode = 1;
